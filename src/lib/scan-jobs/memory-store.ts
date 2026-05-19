import "server-only";

import type {
  CreateScanJobInput,
  ScanJobRecord,
  ScanJobResultRecord,
} from "./types";

type MemoryJobBundle = {
  job: ScanJobRecord;
  results: ScanJobResultRecord[];
};

const jobsByUser = new Map<string, MemoryJobBundle[]>();
const MAX_MEMORY_JOBS_PER_USER = 50;

function safeName(first: string | null, last: string | null): string {
  return [first, last].filter(Boolean).join(" ").trim() || "-";
}

export function createScanJobMemory(input: CreateScanJobInput): ScanJobRecord {
  const now = new Date().toISOString();
  const job: ScanJobRecord = {
    id: crypto.randomUUID(),
    userId: input.userId,
    provider: input.provider,
    status: input.status,
    inputDomains: input.inputDomains,
    emailLimitPerDomain: input.emailLimitPerDomain ?? null,
    totalDomains: input.totalDomains,
    scannedDomains: input.scannedDomains,
    totalEmails: input.totalEmails,
    durationMs: input.durationMs ?? null,
    errorMessage: input.errorMessage ?? null,
    createdAt: now,
    updatedAt: now,
  };

  const results: ScanJobResultRecord[] = input.results.map((result) => ({
    id: crypto.randomUUID(),
    jobId: job.id,
    userId: input.userId,
    email: result.email,
    name: safeName(result.first_name, result.last_name),
    title: result.position ?? "-",
    company: result.company ?? "-",
    domain: result.domain,
    confidence: Math.round(result.confidence * 100),
    status: result.status,
    source: result.source,
    provider: input.provider,
    createdAt: now,
  }));

  const current = jobsByUser.get(input.userId) ?? [];
  jobsByUser.set(input.userId, [{ job, results }, ...current].slice(0, MAX_MEMORY_JOBS_PER_USER));
  return job;
}

export function listScanJobsMemory(userId: string, limit: number): ScanJobRecord[] {
  return (jobsByUser.get(userId) ?? []).slice(0, limit).map((bundle) => bundle.job);
}

export function getScanJobMemory(
  userId: string,
  jobId: string,
): { job: ScanJobRecord | null; results: ScanJobResultRecord[] } {
  const bundle = (jobsByUser.get(userId) ?? []).find((item) => item.job.id === jobId);
  if (!bundle) return { job: null, results: [] };
  return { job: bundle.job, results: bundle.results };
}
