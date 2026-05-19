/** Email verification status từ Domain Scan (khớp ScanResultRow). */
export type SavedLeadVerificationStatus = "verified" | "accept_all" | "webmail";

export type LeadsStorageBackend = "supabase" | "memory";

export type SavedLeadsOperationMeta = {
  storage: LeadsStorageBackend;
  /** Supabase env có nhưng bảng `app_saved_leads` chưa migrate — đã dùng memory */
  storageFallback?: boolean;
};

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
