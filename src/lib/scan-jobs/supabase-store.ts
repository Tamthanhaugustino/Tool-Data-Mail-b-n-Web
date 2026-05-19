import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  CreateScanJobInput,
  ScanJobRecord,
  ScanJobResultRecord,
} from "./types";

const JOBS_TABLE = "app_scan_jobs";
const RESULTS_TABLE = "app_scan_results";

type AppScanJobRow = {
  id: string;
  user_id: string;
  provider: string;
  status: string;
  input_domains: unknown;
  email_limit_per_domain: number | null;
  total_domains: number;
  scanned_domains: number;
  total_emails: number;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type AppScanResultRow = {
  id: string;
  job_id: string;
  user_id: string;
  email: string;
  name: string | null;
  title: string | null;
  company: string | null;
  domain: string;
  confidence: number | null;
  status: string | null;
  source: string | null;
  provider: string | null;
  created_at: string;
};

function rowToJob(row: AppScanJobRow): ScanJobRecord {
  const inputDomains = Array.isArray(row.input_domains)
    ? row.input_domains.filter((item): item is string => typeof item === "string")
    : [];

  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider as ScanJobRecord["provider"],
    status: row.status as ScanJobRecord["status"],
    inputDomains,
    emailLimitPerDomain: row.email_limit_per_domain,
    totalDomains: row.total_domains,
    scannedDomains: row.scanned_domains,
    totalEmails: row.total_emails,
    durationMs: row.duration_ms,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToResult(row: AppScanResultRow): ScanJobResultRecord {
  return {
    id: row.id,
    jobId: row.job_id,
    userId: row.user_id,
    email: row.email,
    name: row.name?.trim() || "-",
    title: row.title?.trim() || "-",
    company: row.company?.trim() || "-",
    domain: row.domain,
    confidence: row.confidence != null ? Math.round(Number(row.confidence)) : 0,
    status: (row.status ?? "unknown") as ScanJobResultRecord["status"],
    source: row.source?.trim() || "unknown",
    provider: (row.provider ?? "mock") as ScanJobResultRecord["provider"],
    createdAt: row.created_at,
  };
}

export function isSupabaseScanJobsTableMissing(
  error: { code?: string; message?: string } | null,
): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    ((msg.includes(JOBS_TABLE) || msg.includes(RESULTS_TABLE)) &&
      (msg.includes("does not exist") ||
        msg.includes("could not find") ||
        msg.includes("schema cache")))
  );
}

let probeCacheOk: boolean | undefined;
let probeMissingUntilMs = 0;

const PROBE_MISSING_TTL_MS = 30_000;

export async function probeSupabaseScanJobsTables(): Promise<boolean> {
  const now = Date.now();
  if (probeCacheOk === true) return true;
  if (probeMissingUntilMs > now) return false;

  const client = getSupabaseAdminClient();
  if (!client) {
    probeMissingUntilMs = now + PROBE_MISSING_TTL_MS;
    return false;
  }

  const { error } = await client.from(JOBS_TABLE).select("id").limit(1);
  if (!error) {
    probeCacheOk = true;
    probeMissingUntilMs = 0;
    return true;
  }

  if (isSupabaseScanJobsTableMissing(error)) {
    probeCacheOk = undefined;
    probeMissingUntilMs = now + PROBE_MISSING_TTL_MS;
    return false;
  }

  probeCacheOk = true;
  probeMissingUntilMs = 0;
  return true;
}

function safeName(first: string | null, last: string | null): string {
  return [first, last].filter(Boolean).join(" ").trim() || "-";
}

export async function createScanJobSupabase(input: CreateScanJobInput): Promise<ScanJobRecord> {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("supabase_not_configured");

  const { data: jobRow, error: jobError } = await client
    .from(JOBS_TABLE)
    .insert({
      user_id: input.userId,
      provider: input.provider,
      status: input.status,
      input_domains: input.inputDomains,
      email_limit_per_domain: input.emailLimitPerDomain ?? null,
      total_domains: input.totalDomains,
      scanned_domains: input.scannedDomains,
      total_emails: input.totalEmails,
      duration_ms: input.durationMs ?? null,
      error_message: input.errorMessage ?? null,
    })
    .select("*")
    .single();

  if (jobError) {
    if (isSupabaseScanJobsTableMissing(jobError)) {
      throw new Error("supabase_table_missing");
    }
    throw jobError;
  }

  const job = rowToJob(jobRow as AppScanJobRow);
  if (input.results.length === 0) return job;

  const rows = input.results.map((result) => ({
    job_id: job.id,
    user_id: input.userId,
    email: result.email,
    name: safeName(result.first_name, result.last_name),
    title: result.position ?? "-",
    company: result.company ?? "-",
    domain: result.domain,
    confidence: Math.round(result.confidence * 100),
    status: result.status,
    source: result.source,
    provider: input.provider,
    raw: null,
  }));

  const { error: resultsError } = await client.from(RESULTS_TABLE).insert(rows);
  if (resultsError) {
    if (isSupabaseScanJobsTableMissing(resultsError)) {
      throw new Error("supabase_table_missing");
    }
    throw resultsError;
  }

  return job;
}

export async function listScanJobsSupabase(
  userId: string,
  limit: number,
): Promise<ScanJobRecord[]> {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("supabase_not_configured");

  const { data, error } = await client
    .from(JOBS_TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isSupabaseScanJobsTableMissing(error)) {
      throw new Error("supabase_table_missing");
    }
    throw error;
  }

  return ((data ?? []) as AppScanJobRow[]).map(rowToJob);
}

export async function getScanJobSupabase(
  userId: string,
  jobId: string,
): Promise<{ job: ScanJobRecord | null; results: ScanJobResultRecord[] }> {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("supabase_not_configured");

  const { data: jobRow, error: jobError } = await client
    .from(JOBS_TABLE)
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle();

  if (jobError) {
    if (isSupabaseScanJobsTableMissing(jobError)) {
      throw new Error("supabase_table_missing");
    }
    throw jobError;
  }
  if (!jobRow) return { job: null, results: [] };

  const { data: resultRows, error: resultsError } = await client
    .from(RESULTS_TABLE)
    .select("id, job_id, user_id, email, name, title, company, domain, confidence, status, source, provider, created_at")
    .eq("job_id", jobId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (resultsError) {
    if (isSupabaseScanJobsTableMissing(resultsError)) {
      throw new Error("supabase_table_missing");
    }
    throw resultsError;
  }

  return {
    job: rowToJob(jobRow as AppScanJobRow),
    results: ((resultRows ?? []) as AppScanResultRow[]).map(rowToResult),
  };
}
