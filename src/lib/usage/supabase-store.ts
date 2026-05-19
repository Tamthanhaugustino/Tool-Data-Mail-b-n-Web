import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { USAGE_EVENT_TYPES, type UsageEventInput, type UsageSummaryItem } from "./types";

const TABLE = "app_usage_events";

type UsageEventRow = {
  event_type: string;
  quantity: number;
};

export function isSupabaseUsageTableMissing(
  error: { code?: string; message?: string } | null,
): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (msg.includes(TABLE) &&
      (msg.includes("does not exist") ||
        msg.includes("could not find") ||
        msg.includes("schema cache")))
  );
}

let probeCacheOk: boolean | undefined;
let probeMissingUntilMs = 0;

const PROBE_MISSING_TTL_MS = 30_000;

export async function probeSupabaseUsageTable(): Promise<boolean> {
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

  if (isSupabaseUsageTableMissing(error)) {
    probeCacheOk = undefined;
    probeMissingUntilMs = now + PROBE_MISSING_TTL_MS;
    return false;
  }

  probeCacheOk = true;
  probeMissingUntilMs = 0;
  return true;
}

export async function insertUsageEventSupabase(input: UsageEventInput): Promise<void> {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("supabase_not_configured");

  const { error } = await client.from(TABLE).insert({
    user_id: input.userId,
    event_type: input.eventType,
    provider: input.provider ?? null,
    quantity: input.quantity ?? 1,
    subject_type: input.subjectType ?? null,
    subject_id: input.subjectId ?? null,
    metadata: input.metadata ?? null,
  });

  if (error) {
    if (isSupabaseUsageTableMissing(error)) {
      throw new Error("supabase_table_missing");
    }
    throw error;
  }
}

export async function getUsageSummarySupabase(
  userId: string,
  sinceIso: string,
): Promise<UsageSummaryItem[]> {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("supabase_not_configured");

  const { data, error } = await client
    .from(TABLE)
    .select("event_type, quantity")
    .eq("user_id", userId)
    .gte("created_at", sinceIso);

  if (error) {
    if (isSupabaseUsageTableMissing(error)) {
      throw new Error("supabase_table_missing");
    }
    throw error;
  }

  const totals = new Map<string, { quantity: number; count: number }>();
  for (const type of USAGE_EVENT_TYPES) {
    totals.set(type, { quantity: 0, count: 0 });
  }

  for (const row of (data ?? []) as UsageEventRow[]) {
    const current = totals.get(row.event_type);
    if (!current) continue;
    current.quantity += Number(row.quantity) || 0;
    current.count += 1;
  }

  return USAGE_EVENT_TYPES.map((eventType) => ({
    eventType,
    quantity: totals.get(eventType)?.quantity ?? 0,
    count: totals.get(eventType)?.count ?? 0,
  }));
}
