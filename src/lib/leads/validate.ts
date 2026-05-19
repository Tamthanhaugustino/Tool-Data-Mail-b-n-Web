import type { SaveLeadInput, SavedLeadVerificationStatus } from "./types";

const STATUSES = new Set<SavedLeadVerificationStatus>([
  "verified",
  "accept_all",
  "webmail",
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseSaveLeadInput(raw: unknown): SaveLeadInput | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const email = typeof o.email === "string" ? o.email.trim() : "";
  const domain = typeof o.domain === "string" ? o.domain.trim() : "";
  if (!email || !EMAIL_RE.test(email) || !domain) return null;

  const confidence =
    typeof o.confidence === "number" && Number.isFinite(o.confidence)
      ? Math.round(Math.min(100, Math.max(0, o.confidence)))
      : null;
  if (confidence === null) return null;

  const status = o.status;
  if (typeof status !== "string" || !STATUSES.has(status as SavedLeadVerificationStatus)) {
    return null;
  }

  return {
    email,
    domain,
    confidence,
    status: status as SavedLeadVerificationStatus,
    name: typeof o.name === "string" ? o.name : "—",
    title: typeof o.title === "string" ? o.title : "—",
    company: typeof o.company === "string" ? o.company : "—",
    source: typeof o.source === "string" ? o.source.slice(0, 32) : undefined,
  };
}
