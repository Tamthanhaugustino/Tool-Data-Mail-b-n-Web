// Domain model for Keyword Discovery — Phase 07.
//
// The shapes here are the canonical contract between the API route, the
// provider implementations, and the /discover client page. They are
// intentionally narrower than the DB schema in src/lib/db/types.ts —
// the API surface is what the browser sees, not the raw row shape.
//
// Provider plug-in plan:
//   - Phase 07: `mock` provider only (no external calls, no quota).
//   - Phase 08+: `serpapi` provider behind the same `DiscoveryProvider`
//     interface. Switching happens in src/lib/discovery/index.ts.

export type DiscoveryProviderName = "mock" | "serpapi";

export type DiscoveryRunStatus = "pending" | "running" | "completed" | "failed";

export type DiscoveryResultStatus =
  | "verified"
  | "accept_all"
  | "webmail"
  | "unknown";

export interface DiscoveryRequest {
  keyword: string;
  /** ISO 3166-1 alpha-2 lowercase, e.g. "vn" / "us". Defaults handled by the route. */
  country?: string;
  /** 1..50, default 10. */
  limit?: number;
}

export interface DiscoveryResultItem {
  domain: string;
  company_name: string | null;
  title: string;
  snippet: string;
  source: string;
  /** 0..1 inclusive, two-decimal precision recommended. */
  confidence: number;
  status: DiscoveryResultStatus;
}

export interface DiscoveryRunSummary {
  id: string;
  keyword: string;
  country: string;
  status: DiscoveryRunStatus;
  provider: DiscoveryProviderName;
  resultCount: number;
  /** ISO-8601 timestamp from the server. */
  createdAt: string;
  /** Server-measured runtime in ms (provider call only). */
  durationMs: number;
}

export interface DiscoveryResponse {
  run: DiscoveryRunSummary;
  results: DiscoveryResultItem[];
}

export interface DiscoveryProvider {
  readonly name: DiscoveryProviderName;
  run(request: Required<Pick<DiscoveryRequest, "keyword" | "country" | "limit">>): Promise<DiscoveryResultItem[]>;
}
