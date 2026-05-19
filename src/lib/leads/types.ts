/** Email verification status từ Domain Scan (khớp ScanResultRow). */
export type SavedLeadVerificationStatus = "verified" | "accept_all" | "webmail";

export type LeadsStorageBackend = "supabase" | "memory";

/** Lý do dùng memory thay vì Supabase (khi `storage` = `memory`). */
export type LeadsStorageReason = "not_configured" | "table_missing";

export type SavedLeadsOperationMeta = {
  storage: LeadsStorageBackend;
  /** true chỉ khi env Supabase có nhưng bảng chưa sẵn sàng — đã fallback memory */
  storageFallback?: boolean;
  storageReason?: LeadsStorageReason;
};

/** JSON fields cho API response (không lộ secret). */
export function serializeLeadsStorageMeta(meta: SavedLeadsOperationMeta): {
  storage: LeadsStorageBackend;
  storageFallback?: true;
  storageReason?: LeadsStorageReason;
} {
  return {
    storage: meta.storage,
    ...(meta.storageFallback ? { storageFallback: true as const } : {}),
    ...(meta.storageReason ? { storageReason: meta.storageReason } : {}),
  };
}

/** Bản ghi Saved Leads — shape ổn định cho UI (memory hoặc Supabase). */
export type SavedLeadRecord = {
  id: string;
  userId: string;
  email: string;
  name: string;
  title: string;
  company: string;
  domain: string;
  confidence: number;
  status: SavedLeadVerificationStatus;
  source: string;
  savedAt: string;
};

export type SaveLeadInput = {
  email: string;
  name: string;
  title: string;
  company: string;
  domain: string;
  confidence: number;
  status: SavedLeadVerificationStatus;
  source?: string;
};

export type SaveLeadsResult = {
  saved: SavedLeadRecord[];
  duplicates: Array<{ email: string; domain: string }>;
};
