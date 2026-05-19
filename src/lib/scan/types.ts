// Domain model for Domain Scan — Phase 08C.
//
// Mirrors src/lib/discovery/types.ts for keyword discovery. The shapes
// here are the canonical contract between the API route, the provider
// implementations (mock now, hunter later), and the /scan client page.
//
// Provider plug-in plan:
//   - 08C: `mock` only (no Hunter, no quota).
//   - 09:  `hunter` via the same `ScanProvider` interface — swapped in
//          src/lib/scan/provider.ts (server-only resolver).

export type ScanProviderName = "mock" | "hunter";

export type ScanRunStatus = "pending" | "running" | "completed" | "failed";

export type ScanResultStatus =
  | "verified"
  | "accept_all"
  | "webmail"
  | "invalid"
  | "unknown";

export interface ScanRequest {
  domains: string[];
  /** 1..100, default 10. Per-provider cap enforced by the route. */
  emailLimitPerDomain?: number;
  provider?: ScanProviderName;
}

export interface ScanResultItem {
  domain: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  company: string | null;
  /** 0..1 inclusive, two-decimal precision recommended. */
  confidence: number;
  source: string;
  status: ScanResultStatus;
}

export interface ScanDomainSummary {
  domain: string;
  email_count: number;
  /** True nếu domain hợp lệ nhưng không tìm được email nào. */
  empty: boolean;
  /** Lỗi cụ thể cho domain này (ví dụ DNS, Hunter rate-limit). */
  error?: string;
}

export interface ScanRunSummary {
  id: string;
  provider: ScanProviderName;
  status: ScanRunStatus;
  requestedDomains: number;
  scannedDomains: number;
  totalEmails: number;
  durationMs: number;
  /** ISO-8601 timestamp from the server. */
  createdAt: string;
  /** Domain-level warnings: invalid input, duplicates dropped, provider errors. */
  warnings: string[];
}

export interface ScanResponse {
  run: ScanRunSummary;
  domains: ScanDomainSummary[];
  results: ScanResultItem[];
  scanJobId?: string;
  scanStorage?: "supabase" | "memory" | "none";
  scanStorageFallback?: boolean;
  scanStorageReason?: "not_configured" | "table_missing" | "write_failed";
}

export interface ScanProvider {
  readonly name: ScanProviderName;
  run(request: {
    domains: string[];
    emailLimitPerDomain: number;
    apiKey?: string;
  }): Promise<{
    domains: ScanDomainSummary[];
    results: ScanResultItem[];
  }>;
}
