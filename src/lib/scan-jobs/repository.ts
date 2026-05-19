import "server-only";

import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import { sanitizeScanJobMessage } from "./sanitize";
import {
  createScanJobMemory,
  getScanJobMemory,
  listScanJobsMemory,
} from "./memory-store";
import {
  createScanJobSupabase,
  getScanJobSupabase,
  listScanJobsSupabase,
  probeSupabaseScanJobsTables,
} from "./supabase-store";
import type {
  CreateScanJobInput,
  GetScanJobResult,
  ListScanJobsResult,
  PersistScanJobResult,
  ScanJobsOperationMeta,
} from "./types";

const DEFAULT_LIST_LIMIT = 25;
const MAX_LIST_LIMIT = 100;

export function isSupabaseScanJobsConfigured(): boolean {
  return hasSupabaseServiceRoleEnv();
}

type ResolvedScanJobsStorage = {
  useSupabase: boolean;
} & ScanJobsOperationMeta;

async function resolveScanJobsStorage(): Promise<ResolvedScanJobsStorage> {
  if (!isSupabaseScanJobsConfigured()) {
    return {
      useSupabase: false,
      scanStorage: "memory",
      scanStorageReason: "not_configured",
    };
  }

  const tableOk = await probeSupabaseScanJobsTables();
  if (tableOk) {
    return { useSupabase: true, scanStorage: "supabase" };
  }

  return {
    useSupabase: false,
    scanStorage: "memory",
    scanStorageFallback: true,
    scanStorageReason: "table_missing",
  };
}

function tableMissingFallbackMeta(): ScanJobsOperationMeta {
  return {
    scanStorage: "memory",
    scanStorageFallback: true,
    scanStorageReason: "table_missing",
  };
}

function writeFailedMeta(): ScanJobsOperationMeta {
  return {
    scanStorage: "memory",
    scanStorageFallback: true,
    scanStorageReason: "write_failed",
  };
}

function isTableMissingError(e: unknown): boolean {
  return e instanceof Error && e.message === "supabase_table_missing";
}

function normalizeLimit(limit: number | undefined): number {
  if (!Number.isInteger(limit)) return DEFAULT_LIST_LIMIT;
  return Math.max(1, Math.min(limit as number, MAX_LIST_LIMIT));
}

function sanitizeInput(input: CreateScanJobInput): CreateScanJobInput {
  return {
    ...input,
    errorMessage: input.errorMessage ? sanitizeScanJobMessage(input.errorMessage) : undefined,
  };
}

export async function createScanJob(
  input: CreateScanJobInput,
): Promise<PersistScanJobResult> {
  const safeInput = sanitizeInput(input);
  const resolved = await resolveScanJobsStorage();

  if (resolved.useSupabase) {
    try {
      const job = await createScanJobSupabase(safeInput);
      return { job, scanStorage: "supabase" };
    } catch (e) {
      const job = createScanJobMemory(safeInput);
      if (isTableMissingError(e)) {
        return { job, ...tableMissingFallbackMeta() };
      }
      return { job, ...writeFailedMeta() };
    }
  }

  const job = createScanJobMemory(safeInput);
  return {
    job,
    scanStorage: resolved.scanStorage,
    ...(resolved.scanStorageFallback ? { scanStorageFallback: true } : {}),
    ...(resolved.scanStorageReason ? { scanStorageReason: resolved.scanStorageReason } : {}),
  };
}

export async function listScanJobs(
  userId: string,
  limit?: number,
): Promise<ListScanJobsResult> {
  const safeLimit = normalizeLimit(limit);
  const resolved = await resolveScanJobsStorage();

  if (resolved.useSupabase) {
    try {
      const jobs = await listScanJobsSupabase(userId, safeLimit);
      return { jobs, scanStorage: "supabase" };
    } catch (e) {
      if (isTableMissingError(e)) {
        return {
          jobs: listScanJobsMemory(userId, safeLimit),
          ...tableMissingFallbackMeta(),
        };
      }
      return {
        jobs: listScanJobsMemory(userId, safeLimit),
        ...writeFailedMeta(),
      };
    }
  }

  return {
    jobs: listScanJobsMemory(userId, safeLimit),
    scanStorage: resolved.scanStorage,
    ...(resolved.scanStorageFallback ? { scanStorageFallback: true } : {}),
    ...(resolved.scanStorageReason ? { scanStorageReason: resolved.scanStorageReason } : {}),
  };
}

export async function getScanJob(
  userId: string,
  jobId: string,
): Promise<GetScanJobResult> {
  const resolved = await resolveScanJobsStorage();

  if (resolved.useSupabase) {
    try {
      const result = await getScanJobSupabase(userId, jobId);
      return { ...result, scanStorage: "supabase" };
    } catch (e) {
      if (isTableMissingError(e)) {
        const result = getScanJobMemory(userId, jobId);
        return { ...result, ...tableMissingFallbackMeta() };
      }
      const result = getScanJobMemory(userId, jobId);
      return { ...result, ...writeFailedMeta() };
    }
  }

  const result = getScanJobMemory(userId, jobId);
  return {
    ...result,
    scanStorage: resolved.scanStorage,
    ...(resolved.scanStorageFallback ? { scanStorageFallback: true } : {}),
    ...(resolved.scanStorageReason ? { scanStorageReason: resolved.scanStorageReason } : {}),
  };
}
