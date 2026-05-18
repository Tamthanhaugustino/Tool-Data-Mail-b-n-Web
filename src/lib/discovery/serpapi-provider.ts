// SerpAPI Keyword Discovery provider — Phase 08A.
//
// Server-only. `import "server-only"` poisons this module if it ever
// ends up in a client bundle. The API key is read inline (process.env)
// and is NEVER returned to the caller or thrown back in error.message —
// the API route layer additionally masks `api_key=` patterns in any
// error string before sending it to the client.
//
// Quota-safe rules implemented here:
//   - One outbound fetch per discovery run (no pagination, no retry).
//   - 10-second timeout via AbortController.
//   - `num` is clamped to limit + small buffer (max 30) so a junk input
//     can't escalate quota use beyond a single small call.
//   - Mega-domains (facebook, youtube, linkedin, ...) are filtered out
//     before counting against `limit` — surfaces business-relevant
//     domains for the downstream Domain Scan step.
//   - Results are deduplicated by hostname.
//
// This module makes ONE HTTP call to https://serpapi.com/search.json
// per invocation. It does not call Hunter, does not write to the DB,
// and does not look up user_api_keys (Phase 08A keeps SerpAPI key in
// process.env; user-scoped keys are deferred to Phase 09).

import "server-only";

import type { DiscoveryProvider, DiscoveryResultItem } from "./types";

/**
 * Failure modes the SerpAPI provider can produce. The API route maps
 * each code to a sensible HTTP status + user-facing message instead of
 * letting raw upstream errors leak.
 */
export type SerpapiErrorCode =
  | "missing_key"      // SERPAPI_API_KEY env not set
  | "invalid_key"      // Upstream returned 401/403
  | "rate_limited"     // Upstream returned 429
  | "timeout"          // AbortController fired
  | "network"          // fetch threw (DNS/TLS/etc)
  | "parse"            // Non-JSON or unexpected payload
  | "upstream";        // Other non-2xx HTTP from SerpAPI

export class SerpapiProviderError extends Error {
  readonly code: SerpapiErrorCode;
  readonly upstreamStatus?: number;

  constructor(code: SerpapiErrorCode, message: string, upstreamStatus?: number) {
    super(message);
    this.name = "SerpapiProviderError";
    this.code = code;
    this.upstreamStatus = upstreamStatus;
  }
}

const SERPAPI_ENDPOINT = "https://serpapi.com/search.json";
const TIMEOUT_MS = 10_000;

const EXCLUDED_DOMAINS = new Set([
  "facebook.com",
  "m.facebook.com",
  "youtube.com",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "wikipedia.org",
  "reddit.com",
  "instagram.com",
  "tiktok.com",
  "pinterest.com",
  "google.com",
  "googleusercontent.com",
  "amazon.com",
  "apple.com",
  "microsoft.com",
  "bing.com",
  "quora.com",
]);

interface SerpApiOrganicResult {
  position?: number;
  title?: string;
  link?: string;
  displayed_link?: string;
  snippet?: string;
  source?: string;
}

interface SerpApiResponse {
  organic_results?: SerpApiOrganicResult[];
  error?: string;
  search_information?: { total_results?: number };
}

function extractDomain(link: string | undefined): string | null {
  if (!link) return null;
  try {
    const u = new URL(link);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (!host || !host.includes(".")) return null;
    return host;
  } catch {
    return null;
  }
}

function isExcluded(domain: string): boolean {
  if (EXCLUDED_DOMAINS.has(domain)) return true;
  for (const excluded of EXCLUDED_DOMAINS) {
    if (domain.endsWith(`.${excluded}`)) return true;
  }
  return false;
}

function confidenceFor(position: number | undefined, fallbackIdx: number): number {
  const p = typeof position === "number" && position > 0 ? position : fallbackIdx + 1;
  // 0.95 at position 1, ~0.55 at position 10, floor 0.30.
  const raw = 1.0 - Math.min(p, 20) * 0.04;
  const clamped = Math.max(0.3, Math.min(0.95, raw));
  return Math.round(clamped * 100) / 100;
}

function languageFor(country: string): string {
  return country === "vn" ? "vi" : "en";
}

function buildUrl(keyword: string, country: string, limit: number, apiKey: string): URL {
  const url = new URL(SERPAPI_ENDPOINT);
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", keyword);
  url.searchParams.set("gl", country);
  url.searchParams.set("hl", languageFor(country));
  // Buffer ~10 over `limit` so excluded-domain filtering doesn't starve us,
  // but never exceed 30 to keep quota bounded.
  url.searchParams.set("num", String(Math.min(Math.max(limit + 5, limit), 30)));
  url.searchParams.set("api_key", apiKey);
  return url;
}

function scrubMessage(message: string): string {
  // Last-resort scrubbing inside the provider — the route also scrubs
  // again before the message reaches the client.
  return message
    .replace(/api_key=[^&\s"]+/gi, "api_key=[redacted]")
    .replace(/https?:\/\/\S+/g, "[url]")
    .slice(0, 200);
}

export const serpapiDiscoveryProvider: DiscoveryProvider = {
  name: "serpapi",
  async run({ keyword, country, limit }) {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      throw new SerpapiProviderError("missing_key", "SERPAPI_API_KEY is not configured");
    }

    const url = buildUrl(keyword, country, limit, apiKey);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        method: "GET",
        signal: controller.signal,
        cache: "no-store",
      });
    } catch (e) {
      clearTimeout(timer);
      if (e instanceof Error && e.name === "AbortError") {
        throw new SerpapiProviderError("timeout", "SerpAPI request timed out");
      }
      throw new SerpapiProviderError(
        "network",
        `SerpAPI network error: ${scrubMessage(e instanceof Error ? e.message : "unknown")}`,
      );
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
      if (res.status === 401 || res.status === 403) {
        throw new SerpapiProviderError("invalid_key", `SerpAPI rejected the API key (HTTP ${res.status})`, res.status);
      }
      if (res.status === 429) {
        throw new SerpapiProviderError("rate_limited", "SerpAPI quota exhausted or rate limited", res.status);
      }
      throw new SerpapiProviderError("upstream", `SerpAPI HTTP ${res.status}: ${scrubbed}`, res.status);
    }

    let payload: SerpApiResponse;
    try {
      payload = (await res.json()) as SerpApiResponse;
    } catch {
      throw new SerpapiProviderError("parse", "SerpAPI returned non-JSON response");
    }

    if (payload.error) {
      // SerpAPI returns 200 with `error` field for some auth/quota issues.
      const msg = String(payload.error);
      const lower = msg.toLowerCase();
      if (lower.includes("invalid api key") || lower.includes("missing api key") || lower.includes("api key")) {
        throw new SerpapiProviderError("invalid_key", "SerpAPI rejected the API key");
      }
      if (lower.includes("run out of searches") || lower.includes("plan") || lower.includes("rate")) {
        throw new SerpapiProviderError("rate_limited", "SerpAPI quota exhausted or rate limited");
      }
      throw new SerpapiProviderError("upstream", `SerpAPI error: ${scrubMessage(msg)}`);
    }

    const organic = payload.organic_results ?? [];
    const seen = new Set<string>();
    const items: DiscoveryResultItem[] = [];

    for (let i = 0; i < organic.length && items.length < limit; i++) {
      const row = organic[i];
      const domain = extractDomain(row.link);
      if (!domain) continue;
      if (isExcluded(domain)) continue;
      if (seen.has(domain)) continue;
      seen.add(domain);

      const title = (row.title ?? domain).slice(0, 200);
      const snippet = (row.snippet ?? "").slice(0, 400);
      items.push({
        domain,
        company_name: row.source ?? null,
        title,
        snippet,
        source: "serpapi",
        confidence: confidenceFor(row.position, i),
        status: "unknown",
      });
    }

    return items;
  },
};
