export const USAGE_EVENT_TYPES = [
  "discovery_search",
  "domain_scan",
  "hunter_search",
  "serpapi_search",
  "saved_lead",
  "csv_export",
] as const;

export type UsageEventType = (typeof USAGE_EVENT_TYPES)[number];
export type UsageStorageBackend = "supabase" | "none";
export type UsageStorageReason =
  | "not_configured"
  | "table_missing"
  | "write_failed"
  | "read_failed";

export type UsageEventInput = {
  userId: string;
  eventType: UsageEventType;
  provider?: string;
  quantity?: number;
  subjectType?: string;
  subjectId?: string;
  metadata?: Record<string, unknown>;
};

export type UsageOperationMeta = {
  usageStorage: UsageStorageBackend;
  usageStorageFallback?: boolean;
  usageStorageReason?: UsageStorageReason;
};

export type UsageSummaryItem = {
  eventType: UsageEventType;
  quantity: number;
  count: number;
};

export type UsageSummaryResult = UsageOperationMeta & {
  days: number;
  totals: UsageSummaryItem[];
};

export function isUsageEventType(value: unknown): value is UsageEventType {
  return (
    typeof value === "string" &&
    (USAGE_EVENT_TYPES as readonly string[]).includes(value)
  );
}

export function serializeUsageStorageMeta(
  meta: UsageOperationMeta,
): UsageOperationMeta {
  return {
    usageStorage: meta.usageStorage,
    ...(meta.usageStorageFallback ? { usageStorageFallback: true } : {}),
    ...(meta.usageStorageReason ? { usageStorageReason: meta.usageStorageReason } : {}),
  };
}
