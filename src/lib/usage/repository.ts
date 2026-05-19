import "server-only";

import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import { sanitizeUsageMetadata } from "./sanitize";
import {
  getUsageSummarySupabase,
  insertUsageEventSupabase,
  probeSupabaseUsageTable,
} from "./supabase-store";
import {
  USAGE_EVENT_TYPES,
  type UsageEventInput,
  type UsageOperationMeta,
  type UsageSummaryResult,
} from "./types";

const DEFAULT_SUMMARY_DAYS = 30;
const MAX_SUMMARY_DAYS = 366;

type ResolvedUsageStorage = {
  useSupabase: boolean;
} & UsageOperationMeta;

export function isSupabaseUsageConfigured(): boolean {
  return hasSupabaseServiceRoleEnv();
}

async function resolveUsageStorage(): Promise<ResolvedUsageStorage> {
  if (!isSupabaseUsageConfigured()) {
    return {
      useSupabase: false,
      usageStorage: "none",
      usageStorageFallback: true,
      usageStorageReason: "not_configured",
    };
  }

  const tableOk = await probeSupabaseUsageTable();
  if (tableOk) {
    return { useSupabase: true, usageStorage: "supabase" };
  }

  return {
    useSupabase: false,
    usageStorage: "none",
    usageStorageFallback: true,
    usageStorageReason: "table_missing",
  };
}

function normalizeQuantity(quantity: number | undefined): number {
  if (!Number.isFinite(quantity) || !Number.isInteger(quantity)) return 1;
  return Math.max(1, quantity as number);
}

function normalizeDays(days: number | undefined): number {
  if (!Number.isFinite(days) || !Number.isInteger(days)) return DEFAULT_SUMMARY_DAYS;
  return Math.max(1, Math.min(days as number, MAX_SUMMARY_DAYS));
}

export async function recordUsageEvent(input: UsageEventInput): Promise<UsageOperationMeta> {
  try {
    const resolved = await resolveUsageStorage();
    if (!resolved.useSupabase) {
      return {
        usageStorage: resolved.usageStorage,
        ...(resolved.usageStorageFallback ? { usageStorageFallback: true } : {}),
        ...(resolved.usageStorageReason ? { usageStorageReason: resolved.usageStorageReason } : {}),
      };
    }

    await insertUsageEventSupabase({
      ...input,
      quantity: normalizeQuantity(input.quantity),
      metadata: sanitizeUsageMetadata(input.metadata) ?? undefined,
    });
    return { usageStorage: "supabase" };
  } catch {
    return {
      usageStorage: "none",
      usageStorageFallback: true,
      usageStorageReason: "write_failed",
    };
  }
}

export async function getUsageSummary(
  userId: string,
  days?: number,
): Promise<UsageSummaryResult> {
  const safeDays = normalizeDays(days);
  const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000).toISOString();
  const emptyTotals = USAGE_EVENT_TYPES.map((eventType) => ({
    eventType,
    quantity: 0,
    count: 0,
  }));

  try {
    const resolved = await resolveUsageStorage();
    if (!resolved.useSupabase) {
      return {
        days: safeDays,
        totals: emptyTotals,
        usageStorage: resolved.usageStorage,
        ...(resolved.usageStorageFallback ? { usageStorageFallback: true } : {}),
        ...(resolved.usageStorageReason ? { usageStorageReason: resolved.usageStorageReason } : {}),
      };
    }

    const totals = await getUsageSummarySupabase(userId, since);
    return {
      days: safeDays,
      totals,
      usageStorage: "supabase",
    };
  } catch {
    return {
      days: safeDays,
      totals: emptyTotals,
      usageStorage: "none",
      usageStorageFallback: true,
      usageStorageReason: "read_failed",
    };
  }
}
