import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { leadDedupeKey } from "./memory-store";
import type { SaveLeadInput, SaveLeadsResult, SavedLeadRecord } from "./types";

const TABLE = "app_saved_leads";

type AppSavedLeadRow = {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  title: string | null;
  company: string | null;
  domain: string;
  confidence: number | null;
  status: string;
  source: string | null;
  created_at: string;
};

function rowToRecord(row: AppSavedLeadRow): SavedLeadRecord {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    name: row.name?.trim() || "—",
    title: row.title?.trim() || "—",
    company: row.company?.trim() || "—",
    domain: row.domain,
    confidence: row.confidence != null ? Math.round(Number(row.confidence)) : 0,
    status: row.status as SavedLeadRecord["status"],
    source: row.source?.trim() || "unknown",
    savedAt: row.created_at,
  };
}

export function isSupabaseLeadsTableMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (msg.includes("app_saved_leads") &&
      (msg.includes("does not exist") ||
        msg.includes("could not find") ||
        msg.includes("schema cache")))
  );
}

/** Cache probe OK vĩnh viễn; cache thiếu bảng chỉ TTL ngắn để nhận migration mới. */
let probeCacheOk: boolean | undefined;
let probeMissingUntilMs = 0;

const PROBE_MISSING_TTL_MS = 30_000;

export async function probeSupabaseLeadsTable(): Promise<boolean> {
  const now = Date.now();
  if (probeCacheOk === true) return true;
  if (probeMissingUntilMs > now) return false;

  const client = getSupabaseAdminClient();
  if (!client) {
    probeMissingUntilMs = now + PROBE_MISSING_TTL_MS;
    return false;
  }

  const { error } = await client.from(TABLE).select("id").limit(1);
  if (!error) {
    probeCacheOk = true;
    probeMissingUntilMs = 0;
    return true;
  }

  if (isSupabaseLeadsTableMissing(error)) {
    probeCacheOk = undefined;
    probeMissingUntilMs = now + PROBE_MISSING_TTL_MS;
    return false;
  }

  // Lỗi khác (mạng, quyền…) — coi như đã cấu hình, để tầng gọi xử lý.
  probeCacheOk = true;
  probeMissingUntilMs = 0;
  return true;
}

export async function listSavedLeadsSupabase(userId: string): Promise<SavedLeadRecord[]> {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw new Error("supabase_not_configured");
  }

  const { data, error } = await client
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isSupabaseLeadsTableMissing(error)) {
      throw new Error("supabase_table_missing");
    }
    throw error;
  }

  return (data as AppSavedLeadRow[]).map(rowToRecord);
}

export async function saveLeadsSupabase(
  userId: string,
  inputs: SaveLeadInput[],
): Promise<SaveLeadsResult> {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw new Error("supabase_not_configured");
  }

  const { data: existingRows, error: listError } = await client
    .from(TABLE)
    .select("email, domain")
    .eq("user_id", userId);

  if (listError) {
    if (isSupabaseLeadsTableMissing(listError)) {
      throw new Error("supabase_table_missing");
    }
    throw listError;
  }

  const existingFromDb = new Set(
    (existingRows ?? []).map((r: { email: string; domain: string }) =>
      leadDedupeKey(r.email, r.domain),
    ),
  );

  const saved: SavedLeadRecord[] = [];
  const duplicates: Array<{ email: string; domain: string }> = [];
  const seenInBatch = new Set<string>();
  const toInsert: Record<string, unknown>[] = [];

  for (const input of inputs) {
    const key = leadDedupeKey(input.email, input.domain);
    if (existingFromDb.has(key)) {
      duplicates.push({ email: input.email.trim(), domain: input.domain.trim() });
      continue;
    }
    if (seenInBatch.has(key)) {
      duplicates.push({ email: input.email.trim(), domain: input.domain.trim() });
      continue;
    }
    seenInBatch.add(key);
    toInsert.push({
      user_id: userId,
      email: input.email.trim(),
      name: input.name.trim() || "—",
      title: input.title.trim() || "—",
      company: input.company.trim() || "—",
      domain: input.domain.trim().toLowerCase(),
      confidence: input.confidence,
      status: input.status,
      source: (input.source ?? "unknown").trim() || "unknown",
    });
  }

  if (toInsert.length === 0) {
    return { saved, duplicates };
  }

  const { data: inserted, error: insertError } = await client
    .from(TABLE)
    .insert(toInsert)
    .select("*");

  if (insertError) {
    if (insertError.code === "23505") {
      return saveLeadsSupabaseOneByOne(userId, inputs, existingFromDb);
    }
    if (isSupabaseLeadsTableMissing(insertError)) {
      throw new Error("supabase_table_missing");
    }
    throw insertError;
  }

  for (const row of (inserted ?? []) as AppSavedLeadRow[]) {
    saved.push(rowToRecord(row));
  }

  return { saved, duplicates };
}

async function saveLeadsSupabaseOneByOne(
  userId: string,
  inputs: SaveLeadInput[],
  existingFromDb: Set<string>,
): Promise<SaveLeadsResult> {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw new Error("supabase_not_configured");
  }

  const saved: SavedLeadRecord[] = [];
  const duplicates: Array<{ email: string; domain: string }> = [];
  const seenInRetry = new Set<string>();

  for (const input of inputs) {
    const key = leadDedupeKey(input.email, input.domain);
    if (existingFromDb.has(key)) {
      duplicates.push({ email: input.email.trim(), domain: input.domain.trim() });
      continue;
    }
    if (seenInRetry.has(key)) {
      duplicates.push({ email: input.email.trim(), domain: input.domain.trim() });
      continue;
    }
    seenInRetry.add(key);

    const { data, error } = await client
      .from(TABLE)
      .insert({
        user_id: userId,
        email: input.email.trim(),
        name: input.name.trim() || "—",
        title: input.title.trim() || "—",
        company: input.company.trim() || "—",
        domain: input.domain.trim().toLowerCase(),
        confidence: input.confidence,
        status: input.status,
        source: (input.source ?? "unknown").trim() || "unknown",
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        duplicates.push({ email: input.email.trim(), domain: input.domain.trim() });
        existingFromDb.add(key);
        continue;
      }
      throw error;
    }

    existingFromDb.add(key);
    saved.push(rowToRecord(data as AppSavedLeadRow));
  }

  return { saved, duplicates };
}

export async function deleteSavedLeadSupabase(userId: string, leadId: string): Promise<boolean> {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw new Error("supabase_not_configured");
  }

  const { data, error } = await client
    .from(TABLE)
    .delete()
    .eq("id", leadId)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    if (isSupabaseLeadsTableMissing(error)) {
      throw new Error("supabase_table_missing");
    }
    throw error;
  }

  return Array.isArray(data) && data.length > 0;
}
