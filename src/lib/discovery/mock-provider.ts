// Mock provider for Keyword Discovery — Phase 07.
//
// Does NOT call SerpAPI or any external service. Does NOT consume any
// quota. Generates deterministic-ish results based on the keyword +
// country so the /discover page can be exercised end-to-end while the
// real provider is still being scoped.

import type {
  DiscoveryProvider,
  DiscoveryResultItem,
  DiscoveryResultStatus,
} from "./types";

const TLDS = ["vn", "com.vn", "com", "net", "io"] as const;
const PREFIXES = [
  "viet",
  "global",
  "smart",
  "real",
  "pro",
  "tech",
  "group",
  "world",
  "nova",
  "asia",
] as const;
const STATUSES: readonly DiscoveryResultStatus[] = [
  "verified",
  "accept_all",
  "webmail",
  "unknown",
];

function slugify(input: string): string {
  const normalized = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");
  const slug = normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return slug || "demo";
}

function hash(input: string): number {
  let h = 2166136261; // FNV-1a 32-bit
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const mockDiscoveryProvider: DiscoveryProvider = {
  name: "mock",
  async run({ keyword, country, limit }) {
    const base = slugify(keyword);
    const seed = hash(`${keyword}|${country}`);

    const items: DiscoveryResultItem[] = [];
    for (let i = 0; i < limit; i++) {
      const prefix = PREFIXES[(seed + i * 5) % PREFIXES.length];
      const tld = TLDS[(seed + i * 3) % TLDS.length];
      const numeric = ((seed % 900) + i * 7) % 999;
      const domain = `${prefix}-${base}-${numeric}.${tld}`;
      const companyTitle = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      const company = `${companyTitle} ${keyword} ${i + 1}`;
      const status = STATUSES[(seed + i * 11) % STATUSES.length];
      const confidenceRaw = 0.55 + (((seed + i * 13) % 41) / 100); // 0.55 — 0.96
      items.push({
        domain,
        company_name: company,
        title: `${company} — ${keyword}`,
        snippet: `${company} cung cấp dịch vụ liên quan đến "${keyword}" tại ${country.toUpperCase()} (mock provider, không gọi SerpAPI).`,
        source: "mock",
        confidence: Math.round(confidenceRaw * 100) / 100,
        status,
      });
    }
    return items;
  },
};
