// POST /api/scan/domain — Phase 08C (mock) + Phase 09A (Hunter).
//
// Validates a Domain Scan request, normalizes + dedups the input list,
// resolves the provider (mock | hunter), and returns run + per-domain
// summary + email rows.
//
// Provider resolution (server-controlled):
//   1. If the request body sets `provider`, that hint is used IF the
//      server permits it (any provider is permitted today, but env
//      must back the choice — user key first, then HUNTER_API_KEY env.
//   2. Else fall back to env SCAN_PROVIDER (`mock` | `hunter`).
//   3. Else "mock".
//
// Quota-safe rules:
//   - MAX_DOMAINS depends on provider: mock=50, hunter=5 in Phase 09A.
//   - Per-domain email limit depends on provider: mock 1..100, hunter 1..10.
//   - Hunter provider is dynamically imported only when needed, so a
//     mock-only deployment never pulls Hunter network code.
//   - When Hunter is requested but no user/env key is available, we
//     return 503 `provider_unavailable` — never silent fallback to mock.
//   - HunterProviderError typed codes map 1:1 to HTTP status (mirrors
//     the SerpAPI mapping in /api/discovery/keyword).

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  ApiKeyConfigError,
  resolveProviderApiKey,
} from "@/lib/api-keys/repository";
import { normalizeDomains } from "@/lib/scan/domain-utils";
import { mockScanProvider } from "@/lib/scan/mock-provider";
import {
  HunterProviderError,
  type HunterErrorCode,
} from "@/lib/scan/hunter-provider";
import type {
  ScanProvider,
  ScanProviderName,
  ScanResponse,
} from "@/lib/scan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_PROVIDERS = new Set<ScanProviderName>(["mock", "hunter"]);
const MAX_DOMAINS_MOCK = 50;
const MAX_DOMAINS_HUNTER = 5;
const MIN_EMAIL_LIMIT = 1;
const DEFAULT_EMAIL_LIMIT = 10;
const MAX_EMAIL_LIMIT_MOCK = 100;
const MAX_EMAIL_LIMIT_HUNTER = 10;

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

class ProviderUnavailableError extends Error {
  constructor(public providerName: ScanProviderName, message: string) {
    super(message);
    this.name = "ProviderUnavailableError";
  }
}

function resolveDefaultProvider(): ScanProviderName {
  const fromEnv = process.env.SCAN_PROVIDER;
  if (fromEnv === "hunter") return "hunter";
  return "mock";
}

async function resolveProvider(
  userId: string,
  requested: ScanProviderName | undefined,
): Promise<{ provider: ScanProvider; apiKey?: string; userKeyError?: string }> {
  const effective: ScanProviderName = requested ?? resolveDefaultProvider();

  if (effective === "hunter") {
    const key = await resolveProviderApiKey(userId, "hunter");
    if (!key.apiKey) {
      throw new ProviderUnavailableError(
        "hunter",
        "Hunter provider is selected but no user key or HUNTER_API_KEY is configured.",
      );
    }
    // Dynamic import keeps the Hunter module (server-only) out of any
    // bundle graph touched by mock-only deployments.
    const mod = await import("@/lib/scan/hunter-provider");
    return {
      provider: mod.hunterScanProvider,
      apiKey: key.apiKey,
      userKeyError: key.userKeyError,
    };
  }

  return { provider: mockScanProvider };
}

const HUNTER_ERROR_MAP: Record<HunterErrorCode, { status: number; error: string; message: string }> = {
  missing_key:    { status: 503, error: "provider_unavailable", message: "Hunter chưa được cấu hình trên server (HUNTER_API_KEY)." },
  invalid_key:    { status: 502, error: "provider_invalid_key", message: "Hunter từ chối API key. Kiểm tra giá trị HUNTER_API_KEY." },
  rate_limited:   { status: 429, error: "provider_rate_limited", message: "Hunter báo hết quota hoặc bị rate limit. Thử lại sau hoặc nâng cấp gói." },
  timeout:        { status: 504, error: "provider_timeout", message: "Hunter không phản hồi kịp 10s. Thử lại sau." },
  network:        { status: 502, error: "provider_network", message: "Không kết nối được tới Hunter." },
  parse:          { status: 502, error: "provider_parse", message: "Hunter trả về dữ liệu không hợp lệ." },
  upstream:       { status: 502, error: "provider_upstream", message: "Hunter báo lỗi không xác định." },
};

function mapHunterError(e: HunterProviderError) {
  return HUNTER_ERROR_MAP[e.code] ?? HUNTER_ERROR_MAP.upstream;
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

  // Resolve provider FIRST so we know the per-provider domain ceiling
  // and email ceiling.
  let provider: ScanProvider;
  let providerApiKey: string | undefined;
  let userKeyError: string | undefined;
  try {
    const resolved = await resolveProvider(session.id, requestedProvider);
    provider = resolved.provider;
    providerApiKey = resolved.apiKey;
    userKeyError = resolved.userKeyError;
  } catch (e) {
    if (e instanceof ProviderUnavailableError) {
      return jsonError(503, "provider_unavailable", e.message, { provider: e.providerName });
    }
    if (e instanceof ApiKeyConfigError && e.code === "api_key_decrypt_failed") {
      return jsonError(
        409,
        "provider_key_unreadable",
        "Không đọc được Hunter API key đã mã hóa. Hãy xóa và lưu lại key.",
        { provider: "hunter" },
      );
    }
    return jsonError(500, "internal", sanitize(e instanceof Error ? e.message : "unknown"));
  }

  const maxDomains = provider.name === "hunter" ? MAX_DOMAINS_HUNTER : MAX_DOMAINS_MOCK;
  if (ds.length > maxDomains) {
    return jsonError(
      400,
      "invalid_input",
      `too many domains: ${ds.length} > ${maxDomains} for provider ${provider.name}. Chia nhỏ batch.`,
      { max: maxDomains, provider: provider.name },
    );
  }

  // Normalize first so the user sees what the server actually scanned.
  const { domains: normalized, warnings: normalizeWarnings } = normalizeDomains(ds as string[]);
  if (normalized.length === 0) {
    return jsonError(400, "invalid_input", "không có domain hợp lệ sau khi normalize", {
      warnings: normalizeWarnings,
    });
  }

  const maxEmailLimit =
    provider.name === "hunter" ? MAX_EMAIL_LIMIT_HUNTER : MAX_EMAIL_LIMIT_MOCK;
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
  } else if (provider.name === "hunter") {
    // Default 10 is at the Hunter ceiling; leave it.
    emailLimitPerDomain = Math.min(DEFAULT_EMAIL_LIMIT, MAX_EMAIL_LIMIT_HUNTER);
  }

  const startedAt = Date.now();
  try {
    const { domains: summaries, results } = await provider.run({
      domains: normalized,
      emailLimitPerDomain,
      apiKey: providerApiKey,
    });
    const durationMs = Date.now() - startedAt;
    const warnings = normalizeWarnings.map((w) => `[${w.reason}] ${w.input}`);
    if (userKeyError) {
      warnings.push("[api_key_fallback] Không đọc được key cá nhân, đã dùng server env fallback.");
    }

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
    if (e instanceof HunterProviderError) {
      const { status, error, message } = mapHunterError(e);
      return jsonError(status, error, message, { provider: provider.name, code: e.code });
    }
    const msg = e instanceof Error ? e.message : "unknown error";
    return jsonError(500, "internal", sanitize(msg), { provider: provider.name });
  }
}
