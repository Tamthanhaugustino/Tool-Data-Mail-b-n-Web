// App-level database types mirroring supabase/migrations/0001_initial_schema.sql.
//
// These are hand-written for Phase 04 — there is no Supabase project yet, so
// we do not run `supabase gen types typescript` here. When the real project
// is provisioned, replace this file with generated types and keep the same
// public shapes (or re-export them).
//
// Convention: each table T has a `T` row interface; `New<T>` is the insert
// shape (server-supplied defaults omitted); `Update<T>` is the partial
// patch shape.

// ----- Enums (keep in sync with SQL types) -----

export type MembershipRole = "owner" | "admin" | "member";
export type ProfileRole = "user" | "admin";
export type ApiProvider = "hunter" | "serpapi";
export type RunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";
export type ResultStatus =
  | "verified"
  | "accept_all"
  | "webmail"
  | "invalid"
  | "unknown";
export type LeadStatus =
  | "new"
  | "contacted"
  | "interested"
  | "customer"
  | "not_relevant";
export type ExportKind =
  | "scan_results"
  | "saved_leads"
  | "discovery_results";
export type ExportFormat = "csv" | "json";
export type ExportStatus = "pending" | "ready" | "failed" | "expired";
export type PlanTier = "trial" | "basic" | "pro" | "agency";
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "cancelled"
  | "expired";

// ISO-8601 timestamp string (Supabase returns timestamptz as string).
export type Timestamp = string;
// JSON column shape.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

// ----- Row interfaces -----

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  initials: string | null;
  role: ProfileRole;
  locale: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Workspace {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Membership {
  id: string;
  workspace_id: string;
  user_id: string;
  role: MembershipRole;
  created_at: Timestamp;
}

export interface UserApiKey {
  id: string;
  user_id: string;
  provider: ApiProvider;
  // Server-only: never expose ciphertext to the browser. Routes return
  // only `key_hint`, `is_active`, `last_validated_at`.
  encrypted_key: Uint8Array;
  key_hint: string;
  is_active: boolean;
  last_validated_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface DiscoveryRun {
  id: string;
  workspace_id: string;
  created_by: string;
  status: RunStatus;
  keyword: string;
  country: string;
  options: Json;
  result_count: number;
  error_message: string | null;
  started_at: Timestamp | null;
  finished_at: Timestamp | null;
  created_at: Timestamp;
}

export interface ScanJob {
  id: string;
  workspace_id: string;
  created_by: string;
  status: RunStatus;
  domains: string[];
  options: Json;
  result_count: number;
  error_message: string | null;
  started_at: Timestamp | null;
  finished_at: Timestamp | null;
  created_at: Timestamp;
}

export interface ScanResult {
  id: string;
  workspace_id: string;
  // Exactly one of these two is non-null (CHECK constraint in SQL).
  discovery_run_id: string | null;
  scan_job_id: string | null;
  domain: string | null;
  company_name: string | null;
  email: string | null;
  contact_name: string | null;
  title: string | null;
  source: string | null;
  confidence: number | null;
  status: ResultStatus;
  raw_payload: Json | null;
  created_at: Timestamp;
}

export interface SavedLead {
  id: string;
  workspace_id: string;
  scan_result_id: string | null;
  email: string;
  domain: string | null;
  company_name: string | null;
  contact_name: string | null;
  title: string | null;
  confidence: number | null;
  status: LeadStatus;
  tags: string[];
  notes: string | null;
  saved_by: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ExportJob {
  id: string;
  workspace_id: string;
  created_by: string;
  kind: ExportKind;
  format: ExportFormat;
  status: ExportStatus;
  filters: Json;
  row_count: number | null;
  storage_path: string | null;
  expires_at: Timestamp | null;
  error_message: string | null;
  created_at: Timestamp;
  finished_at: Timestamp | null;
}

export interface BillingSubscription {
  id: string;
  workspace_id: string;
  plan: PlanTier;
  status: SubscriptionStatus;
  current_period_start: Timestamp | null;
  current_period_end: Timestamp | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  activation_code: string | null;
  metadata: Json;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface AuditLog {
  id: string;
  workspace_id: string | null;
  actor_user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Json;
  ip_address: string | null;
  created_at: Timestamp;
}

// ----- Insert / Update helpers -----
//
// Columns with DB defaults (id, created_at, updated_at, status defaults)
// are optional on insert. Update shapes are all-partial except id is
// always known by the caller.

type WithDefaults = "id" | "created_at" | "updated_at";

export type New<T> = Omit<T, WithDefaults> & Partial<Pick<T, Extract<keyof T, WithDefaults>>>;
export type Update<T> = Partial<Omit<T, "id" | "created_at">>;

// ----- DTO shapes used at the API boundary -----
//
// What the browser sees is always a subset — never raw ciphertext or raw
// provider payloads. These DTOs are not enforced by the DB; they are the
// contract that route handlers / server actions implement.

export interface ApiKeyDto {
  provider: ApiProvider;
  key_hint: string;
  is_active: boolean;
  last_validated_at: Timestamp | null;
}

export interface ScanResultDto {
  id: string;
  email: string | null;
  contact_name: string | null;
  title: string | null;
  company_name: string | null;
  domain: string | null;
  confidence: number | null;
  status: ResultStatus;
  source: string | null;
  saved: boolean; // joined from saved_leads
}

export interface WorkspaceContext {
  workspace: Workspace;
  membership: Membership;
  subscription: BillingSubscription | null;
}
