// Domain normalization + validation — Phase 08C.
//
// Used by the API route to clean the input list BEFORE handing it to a
// provider, and exposed to client code that wants to preview the same
// normalization (no provider calls).

/** Conservative DNS-style hostname check (RFC-ish). */
const DOMAIN_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i;

export interface NormalizeOutcome {
  /** Final, deduplicated, normalized domains in original order. */
  domains: string[];
  /** Lines that were skipped, with the reason. Kept in order of appearance. */
  warnings: { input: string; reason: string }[];
}

/**
 * Normalize one user-supplied line into a bare hostname or null.
 *
 * Strips scheme, path, query, port, trailing dot, and `www.`. Returns
 * null when the line is empty, looks like an email, or fails the
 * hostname regex.
 */
export function normalizeDomain(input: string): { domain: string | null; reason?: string } {
  const trimmed = input.trim();
  if (!trimmed) return { domain: null, reason: "empty" };
  if (trimmed === "—" || trimmed === "-") return { domain: null, reason: "placeholder" };
  if (trimmed.includes("@")) return { domain: null, reason: "looks_like_email" };

  let candidate = trimmed;

  // Strip scheme + path/query via URL parser when possible.
  if (/^https?:\/\//i.test(candidate)) {
    try {
      candidate = new URL(candidate).hostname;
    } catch {
      return { domain: null, reason: "invalid_url" };
    }
  } else {
    // No scheme — chop anything after the first slash so "example.com/foo"
    // becomes "example.com".
    candidate = candidate.split(/[\s/?#]/)[0] ?? "";
  }

  candidate = candidate.toLowerCase();
  // Strip trailing dot and a possible port.
  candidate = candidate.replace(/\.$/, "").replace(/:\d+$/, "");
  // Strip www. — multi-stage subdomains stay (e.g. mail.example.com kept).
  if (candidate.startsWith("www.")) {
    candidate = candidate.slice(4);
  }

  if (!candidate) return { domain: null, reason: "empty_after_normalize" };
  if (!DOMAIN_RE.test(candidate)) return { domain: null, reason: "invalid_format" };

  return { domain: candidate };
}

/**
 * Normalize and deduplicate a list of user-supplied domain lines.
 *
 * Preserves first-occurrence order. Returns warnings for every dropped
 * line (invalid input, duplicates) so the caller can show "X dòng bị bỏ"
 * messages in the UI.
 */
export function normalizeDomains(input: string[]): NormalizeOutcome {
  const seen = new Set<string>();
  const domains: string[] = [];
  const warnings: { input: string; reason: string }[] = [];

  for (const raw of input) {
    const { domain, reason } = normalizeDomain(raw);
    if (!domain) {
      if (raw.trim()) warnings.push({ input: raw.trim(), reason: reason ?? "invalid" });
      continue;
    }
    if (seen.has(domain)) {
      warnings.push({ input: raw.trim(), reason: "duplicate" });
      continue;
    }
    seen.add(domain);
    domains.push(domain);
  }

  return { domains, warnings };
}
