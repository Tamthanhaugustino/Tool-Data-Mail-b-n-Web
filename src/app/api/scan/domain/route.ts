// POST /api/scan/domain — Phase 08C.
//
// Validates a Domain Scan request, normalizes + dedups the input list,
// dispatches to the configured provider (mock for now), and returns the
// run summary + per-domain summary + email rows.
//
// Phase 08C ships mock only. Hunter provider is deferred to Phase 09
// and will plug into the same `ScanProvider` interface via dynamic
// import (mirroring how SerpAPI was added in Phase 08A).
//
// Quota-safe constraints:
// - MAX_DOMAINS hard-capped at 50 in 08C.
// - Per-domain email limit capped at 100 (mock) / 10 (hunter, future).
// - No retry, no external network call in mock mode.

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { normalizeDomains } from "@/lib/scan/domain-utils";
import { mockScanProvider } from "@/lib/scan/mock-provider";
import type {
  ScanProvider,
  ScanProviderName,
  ScanResponse,
} from "@/lib/scan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_DOMAINS = 50;
const MIN_EMAIL_LIMIT = 1;
const DEFAULT_EMAIL_LIMIT = 10;
const MAX_EMAIL_LIMIT_MOCK = 100;
const ALLOWED_PROVIDERS = new Set<ScanProviderName>(["mock", "hunter"]);

function jsonError(
  status: number,
  error: string,
  message?: string,
  extras?: Record<string, unknown>,
) {
  return NextResponse.json(
    { error, ...(message ? { message } : {}), ...(extras ?? {}) },
    { status, headers: { "cache-control": "no-store" } },
  );
}

function sanitize(message: string): string {
  return message
    .replace(/\s+/g, " ")
    .replace(/api_key=[^&\s"]+/gi, "api_key=[redacted]")
    .replace(/https?:\/\/\S+/g, "[url]")
    .replace(/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, "[jwt]")
    .trim()
    .slice(0, 200);
}

function isAllowedProvider(v: unknown): v is ScanProviderName {
  return typeof v === "string" && ALLOWED_PROVIDERS.has(v as ScanProviderName);
}

async function resolveProvider(
  requested: ScanProviderName | undefined,
): Promise<ScanProvider> {
  // Phase 08C: mock only. When Hunter lands in Phase 09 this branch
  // will dynamic-import `hunter-provider.ts` and check env presence.
  if (requested === "hunter") {
    return Promise.reject(
      new Error("provider_unavailable: hunter provider chưa được wire ở Phase 08C"),
    );
  }
  return mockScanProvider;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return jsonError(401, "unauthorized");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "invalid_input", "body must be valid JSON");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError(400, "invalid_input", "body must be a JSON object");
  }

  const { domains: ds, emailLimitPerDomain: el, provider: p } = body as Record<string, unknown>;

  if (!Array.isArray(ds)) {
    return jsonError(400, "invalid_input", "domains must be an array of strings");
  }
  if (ds.length === 0) {
    return jsonError(400, "invalid_input", "domains is empty");
  }
  if (ds.length > MAX_DOMAINS) {
    return jsonError(
      400,
      "invalid_input",
      `too many domains: ${ds.length} > ${MAX_DOMAINS}. Chia nhỏ batch hoặc giảm số domain.`,
      { max: MAX_DOMAINS },
    );
  }
  if (ds.some((d) => typeof d !== "string")) {
    return jsonError(400, "invalid_input", "every domain must be a string");
  }

  let requestedProvider: ScanProviderName | undefined;
  if (p !== undefined) {
    if (!isAllowedProvider(p)) {
      return jsonError(
        400,
        "invalid_input",
        `provider must be one of: ${[...ALLOWED_PROVIDERS].join(", ")}`,
      );
    }
    requestedProvider = p;
  }

  // Normalize first so the user sees what the server actually scanned.
  const { domains: normalized, warnings: normalizeWarnings } = normalizeDomains(ds as string[]);
  if (normalized.length === 0) {
    return jsonError(400, "invalid_input", "không có domain hợp lệ sau khi normalize", {
      warnings: normalizeWarnings,
    });
  }

  let provider: ScanProvider;
  try {
    provider = await resolveProvider(requestedProvider);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    if (msg.startsWith("provider_unavailable")) {
      return jsonError(503, "provider_unavailable", sanitize(msg), {
        provider: requestedProvider,
      });
    }
    return jsonError(500, "internal", sanitize(msg));
  }

  const maxEmailLimit = provider.name === "mock" ? MAX_EMAIL_LIMIT_MOCK : 10;
  let emailLimitPerDomain = DEFAULT_EMAIL_LIMIT;
  if (el !== undefined) {
    if (typeof el !== "number" || !Number.isInteger(el)) {
      return jsonError(400, "invalid_input", "emailLimitPerDomain must be an integer");
    }
    if (el < MIN_EMAIL_LIMIT || el > maxEmailLimit) {
      return jsonError(
        400,
        "invalid_input",
        `emailLimitPerDomain must be ${MIN_EMAIL_LIMIT}..${maxEmailLimit} for provider ${provider.name}`,
      );
    }
    emailLimitPerDomain = el;
  }

  const startedAt = Date.now();
  try {
    const { domains: summaries, results } = await provider.run({
      domains: normalized,
      emailLimitPerDomain,
    });
    const durationMs = Date.now() - startedAt;
    const warnings = normalizeWarnings.map(
      (w) => `[${w.reason}] ${w.input}`,
    );

    const response: ScanResponse = {
      run: {
        id: crypto.randomUUID(),
        provider: provider.name,
        status: "completed",
        requestedDomains: (ds as string[]).length,
        scannedDomains: normalized.length,
        totalEmails: results.length,
        durationMs,
        createdAt: new Date(startedAt).toISOString(),
        warnings,
      },
      domains: summaries,
      results,
    };
    return NextResponse.json(response, {
      headers: { "cache-control": "no-store" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return jsonError(500, "internal", sanitize(msg), { provider: provider.name });
  }
}
