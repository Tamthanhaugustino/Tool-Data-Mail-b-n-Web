// Mock provider for Domain Scan — Phase 08C.
//
// Does NOT call Hunter or any external service. Does NOT consume quota.
// Deterministic per (domain, emailLimitPerDomain) so re-running the same
// scan gives stable results for testing.
//
// Behavior:
// - ~20% of domains intentionally return 0 emails (UI must handle empty).
// - 1..emailLimitPerDomain emails per domain otherwise.
// - Roles cycle through common Vietnamese B2B titles for variety.

import type {
  ScanDomainSummary,
  ScanProvider,
  ScanResultItem,
  ScanResultStatus,
} from "./types";

const FIRST_NAMES = ["Trang", "Hùng", "Linh", "Minh", "Phương", "Quân", "Thảo", "Anh", "Nam", "Hà"];
const LAST_NAMES = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô"];
const POSITIONS = [
  "CEO",
  "Marketing Manager",
  "Sales Director",
  "HR Director",
  "CTO",
  "Operations Manager",
  "Customer Success",
  "Business Development",
];
const ROLE_LOCAL_PARTS = ["contact", "info", "sales", "hello", "support", "business"];
const STATUSES: readonly ScanResultStatus[] = [
  "verified",
  "verified",
  "accept_all",
  "webmail",
  "unknown",
];

function hash(input: string): number {
  let h = 2166136261; // FNV-1a 32-bit
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: readonly T[], seed: number, offset: number): T {
  return arr[(seed + offset) % arr.length] as T;
}

function buildEmailsForDomain(
  domain: string,
  emailLimit: number,
): { results: ScanResultItem[]; empty: boolean } {
  const seed = hash(domain);

  // ~20% of domains return zero emails so the UI must handle empty.
  if (seed % 5 === 0) {
    return { results: [], empty: true };
  }

  const count = Math.max(1, (seed % emailLimit) + 1);
  const results: ScanResultItem[] = [];
  // Optionally include a role-based generic mailbox (~50% of the time).
  if (seed % 2 === 0) {
    const role = pick(ROLE_LOCAL_PARTS, seed, 0);
    results.push({
      domain,
      email: `${role}@${domain}`,
      first_name: null,
      last_name: null,
      position: null,
      company: null,
      confidence: 0.6 + ((seed % 30) / 100),
      source: "mock",
      status: "accept_all",
    });
  }

  for (let i = 0; i < count && results.length < emailLimit; i++) {
    const first = pick(FIRST_NAMES, seed, i * 3);
    const last = pick(LAST_NAMES, seed, i * 5);
    const position = pick(POSITIONS, seed, i * 7);
    const status = STATUSES[(seed + i * 11) % STATUSES.length] as ScanResultStatus;
    const localPart = `${last.toLowerCase()}.${first.toLowerCase().replace(/[^a-z]/g, "")}${i > 0 ? i + 1 : ""}`;
    const confidenceRaw = 0.55 + (((seed + i * 13) % 41) / 100);
    results.push({
      domain,
      email: `${localPart}@${domain}`,
      first_name: first,
      last_name: last,
      position,
      company: domainToCompanyName(domain),
      confidence: Math.round(confidenceRaw * 100) / 100,
      source: "mock",
      status,
    });
  }

  return { results, empty: false };
}

function domainToCompanyName(domain: string): string {
  const root = domain.split(".")[0] ?? domain;
  return root
    .split(/[-_]/)
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
}

export const mockScanProvider: ScanProvider = {
  name: "mock",
  async run({ domains, emailLimitPerDomain }) {
    const limit = Math.max(1, Math.min(emailLimitPerDomain, 100));
    const summaries: ScanDomainSummary[] = [];
    const allResults: ScanResultItem[] = [];

    for (const domain of domains) {
      const { results, empty } = buildEmailsForDomain(domain, limit);
      summaries.push({
        domain,
        email_count: results.length,
        empty,
      });
      allResults.push(...results);
    }

    return { domains: summaries, results: allResults };
  },
};
