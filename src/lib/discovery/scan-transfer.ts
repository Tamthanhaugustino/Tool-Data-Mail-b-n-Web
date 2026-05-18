/** Chuyển danh sách domain từ Keyword Discovery sang Domain Scan (client-only, không backend). */

export function uniqueDomainsFromRows(rows: { domain: string }[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of rows) {
    const raw = row.domain.trim();
    if (!raw || raw === "—" || raw === "-") continue;
    const key = raw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(raw);
  }
  return out;
}

export function buildScanHref(domains: string[]): string | null {
  if (domains.length === 0) return null;
  return `/scan?domains=${encodeURIComponent(domains.join(","))}`;
}

export function parseDomainsQueryParam(param: string | undefined): string | undefined {
  if (!param?.trim()) return undefined;
  const lines = param
    .split(",")
    .map((s) => {
      try {
        return decodeURIComponent(s.trim());
      } catch {
        return s.trim();
      }
    })
    .filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : undefined;
}
