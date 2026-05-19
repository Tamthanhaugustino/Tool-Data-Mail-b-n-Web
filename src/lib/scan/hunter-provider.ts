// Hunter.io Domain Scan provider — Phase 09A.
//
// Server-only. `import "server-only"` poisons this module if it ever
// ends up in a client bundle. The API key is read inline (process.env)
// and is NEVER returned to the caller or thrown back in error.message —
// the API route layer additionally masks `api_key=` patterns in any
// error string before sending it to the client.
//
// Quota-safe rules implemented here:
//   - Sequential per-domain fetch (no parallelism) — easier to reason
//     about, never blasts more than 1 in-flight request to Hunter.
//   - 10-second timeout per domain via AbortController.
//   - `limit` is clamped at 10 (Hunter's per-search ceiling for the
//     free plan; matches the route ceiling).
//   - On the first hard failure (invalid key / rate limit) we abort the
//     loop — no point continuing if the key is rejected mid-batch.
//   - Per-domain failures (DNS, 404, parse) are recorded in the
//     domain summary with an `error` field; the run still completes
//     so the user sees partial results.
//
// This module makes up to N HTTP calls to https://api.hunter.io/v2
// per invocation where N = domains.length (route caps at 5 in 09A).
// It does not call SerpAPI, does not write to the DB, and does not
// look up user_api_keys (Phase 10+ will scope keys per user).

import "server-only";

import type {
  ScanDomainSummary,
  ScanProvider,
  ScanResultItem,
  ScanResultStatus,
} from "./types";

const HUNTER_ENDPOINT = "https://api.hunter.io/v2/domain-search";
const TIMEOUT_MS = 10_000;
/** Hunter's free plan caps Domain Search at 10 emails per call. */
const HUNTER_MAX_LIMIT = 10;

/**
 * Failure modes the Hunter provider can produce. Mirrors
 * SerpapiErrorCode from src/lib/discovery/serpapi-provider.ts so the
 * API route can reuse the same mapping pattern.
 */
export type HunterErrorCode =
  | "missing_key"      // HUNTER_API_KEY env not set
  | "invalid_key"      // Upstream returned 401/403
  | "rate_limited"     // Upstream returned 429
  | "timeout"          // AbortController fired
  | "network"          // fetch threw (DNS/TLS/etc)
  | "parse"            // Non-JSON or unexpected payload
  | "upstream";        // Other non-2xx HTTP from Hunter

export class HunterProviderError extends Error {
  readonly code: HunterErrorCode;
  readonly upstreamStatus?: number;

  constructor(code: HunterErrorCode, message: string, upstreamStatus?: number) {
    super(message);
    this.name = "HunterProviderError";
    this.code = code;
    this.upstreamStatus = upstreamStatus;
  }
}

interface HunterEmailRow {
  value?: string;
  type?: string;
  confidence?: number;
  first_name?: string | null;
  last_name?: string | null;
  position?: string | null;
  department?: string | null;
  verification?: { status?: string | null; result?: string | null };
}

interface HunterDomainResponse {
  data?: {
    domain?: string;
    organization?: string | null;
    emails?: HunterEmailRow[];
  };
  errors?: { id?: string; code?: number; details?: string }[];
}

function scrubMessage(message: string): string {
  return message
    .replace(/api_key=[^&\s"]+/gi, "api_key=[redacted]")
    .replace(/https?:\/\/\S+/g, "[url]")
    .slice(0, 200);
}

function mapHunterStatus(raw: string | null | undefined): ScanResultStatus {
  if (!raw) return "unknown";
  const lower = raw.toLowerCase();
  if (lower === "valid" || lower === "verified" || lower === "deliverable") return "verified";
  if (lower === "accept_all" || lower === "catch_all" || lower === "accept-all") return "accept_all";
  if (lower === "webmail") return "webmail";
  if (lower === "invalid" || lower === "undeliverable" || lower === "disposable") return "invalid";
  return "unknown";
}

function mapEmailType(type: string | undefined): ScanResultStatus | null {
  // Hunter sometimes returns `type: "personal" | "generic"` instead of
  // verification. Use it as a fallback if verification is missing.
  if (type === "personal") return "verified";
  if (type === "generic") return "accept_all";
  return null;
}

function buildUrl(domain: string, limit: number, apiKey: string): URL {
  const url = new URL(HUNTER_ENDPOINT);
  url.searchParams.set("domain", domain);
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), HUNTER_MAX_LIMIT)));
  url.searchParams.set("api_key", apiKey);
  return url;
}

async function fetchOneDomain(
  domain: string,
  limit: number,
  apiKey: string,
): Promise<{
  results: ScanResultItem[];
  empty: boolean;
  organization: string | null;
  hardError?: HunterProviderError;
  softError?: string;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(buildUrl(domain, limit, apiKey).toString(), {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
      headers: { accept: "application/json" },
    });
  } catch (e) {
    clearTimeout(timer);
    if (e instanceof Error && e.name === "AbortError") {
      return { results: [], empty: true, organization: null, softError: "timeout" };
    }
    return {
      results: [],
      empty: true,
      organization: null,
      softError: `network: ${scrubMessage(e instanceof Error ? e.message : "unknown")}`,
    };
  }
  clearTimeout(timer);

  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      // ignore
    }
    const scrubbed = scrubMessage(detail || res.statusText);
    // Auth/quota issues are HARD errors — abort the whole batch.
    if (res.status === 401 || res.status === 403) {
      return {
        results: [],
        empty: true,
        organization: null,
        hardError: new HunterProviderError(
          "invalid_key",
          `Hunter rejected the API key (HTTP ${res.status})`,
          res.status,
        ),
      };
    }
    if (res.status === 429) {
      return {
        results: [],
        empty: true,
        organization: null,
        hardError: new HunterProviderError(
          "rate_limited",
          "Hunter quota exhausted or rate limited",
          res.status,
        ),
      };
    }
    // Per-domain 4xx/5xx — record as soft error and continue.
    return {
      results: [],
      empty: true,
      organization: null,
      softError: `upstream HTTP ${res.status}: ${scrubbed}`,
    };
  }

  let payload: HunterDomainResponse;
  try {
    payload = (await res.json()) as HunterDomainResponse;
  } catch {
    return {
      results: [],
      empty: true,
      organization: null,
      softError: "parse: non-JSON response",
    };
  }

  if (payload.errors && payload.errors.length > 0) {
    const first = payload.errors[0];
    const detail = scrubMessage(first?.details || first?.id || "unknown");
    const lower = detail.toLowerCase();
    if (lower.includes("invalid") && lower.includes("api key")) {
      return {
        results: [],
        empty: true,
        organization: null,
        hardError: new HunterProviderError("invalid_key", `Hunter: ${detail}`),
      };
    }
    if (lower.includes("quota") || lower.includes("rate")) {
      return {
        results: [],
        empty: true,
        organization: null,
        hardError: new HunterProviderError("rate_limited", `Hunter: ${detail}`),
      };
    }
    return {
      results: [],
      empty: true,
      organization: null,
      softError: `hunter: ${detail}`,
    };
  }

  const data = payload.data;
  const emails = data?.emails ?? [];
  const organization = data?.organization ?? null;
  const seen = new Set<string>();
  const results: ScanResultItem[] = [];

  for (const row of emails) {
    const email = (row.value ?? "").trim().toLowerCase();
    if (!email) continue;
    if (seen.has(email)) continue;
    seen.add(email);

    const verificationStatus =
      mapHunterStatus(row.verification?.status ?? row.verification?.result ?? null);
    const fallbackStatus = mapEmailType(row.type);
    const status =
      verificationStatus !== "unknown"
        ? verificationStatus
        : fallbackStatus ?? "unknown";

    const confidenceRaw =
      typeof row.confidence === "number" ? row.confidence : 0;
    // Hunter returns 0-100. Clamp + convert to 0-1.
    const confidence = Math.max(0, Math.min(100, confidenceRaw)) / 100;

    results.push({
      domain,
      email,
      first_name: row.first_name ?? null,
      last_name: row.last_name ?? null,
      position: row.position ?? row.department ?? null,
      company: organization,
      confidence: Math.round(confidence * 100) / 100,
      source: "hunter",
      status,
    });

    if (results.length >= limit) break;
  }

  return {
    results,
    empty: results.length === 0,
    organization,
  };
}

export const hunterScanProvider: ScanProvider = {
  name: "hunter",
  async run({ domains, emailLimitPerDomain, apiKey: providedApiKey }) {
    const apiKey = providedApiKey ?? process.env.HUNTER_API_KEY;
    if (!apiKey) {
      throw new HunterProviderError("missing_key", "HUNTER_API_KEY is not configured");
    }

    const limit = Math.max(1, Math.min(emailLimitPerDomain, HUNTER_MAX_LIMIT));
    const summaries: ScanDomainSummary[] = [];
    const allResults: ScanResultItem[] = [];

    for (const domain of domains) {
      const result = await fetchOneDomain(domain, limit, apiKey);

      if (result.hardError) {
        // Stop the batch. Caller (route) will surface the typed error.
        throw result.hardError;
      }

      summaries.push({
        domain,
        email_count: result.results.length,
        empty: result.empty,
        ...(result.softError ? { error: result.softError } : {}),
      });
      allResults.push(...result.results);
    }

    return { domains: summaries, results: allResults };
  },
};
