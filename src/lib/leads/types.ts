/** Email verification status từ Domain Scan (khớp ScanResultRow). */
export type SavedLeadVerificationStatus = "verified" | "accept_all" | "webmail";

/** Bản ghi Saved Leads Phase 09C — in-memory per user, chưa Supabase. */
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
