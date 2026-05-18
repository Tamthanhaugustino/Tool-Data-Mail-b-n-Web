// POST /api/discovery/keyword — Phase 07 (mock) + Phase 08A (SerpAPI).
//
// Validates a Keyword Discovery request, resolves the provider, and
// returns the run summary + result list.
//
// Provider resolution (server-controlled):
//   1. If the request body sets `provider`, that hint is used IF the
//      server permits it (any provider is permitted today, but env
//      must back the choice — e.g. SerpAPI needs SERPAPI_API_KEY).
//   2. Else fall back to env DISCOVERY_PROVIDER (`mock` | `serpapi`).
//   3. Else "mock".
//
// Quota-safe rules:
//   - SerpAPI provider is dynamically imported only when needed, so a
//     mock-only deployment never pulls the network code.
//   - When SerpAPI is requested but `SERPAPI_API_KEY` is missing, we
//     return 503 `provider_unavailable` — we DO NOT silently downgrade
//     to mock (the caller asked for serpapi; surprising them with mock
//     would be worse than a clear error).
//   - Limit upper bound depends on provider (mock: 50, serpapi: 30) to
//     keep paid-call ceilings tight.

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { mockDiscoveryProvider } from "@/lib/discovery/mock-provider";
import type {
  DiscoveryProvider,
  DiscoveryProviderName,
  DiscoveryResponse,
} from "@/lib/discovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_KEYWORD = 200;
const ALLOWED_COUNTRIES = new Set(["vn", "us"]);
const ALLOWED_PROVIDERS = new Set<DiscoveryProviderName>(["mock", "serpapi"]);
const MIN_LIMIT = 1;
const MAX_LIMIT_MOCK = 50;
const MAX_LIMIT_SERPAPI = 30;
const DEFAULT_LIMIT = 10;

function jsonError(status: number, error: string, message?: string, extras?: Record<string, unknown>) {
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

function isAllowedProvider(v: unknown): v is DiscoveryProviderName {
  return typeof v === "string" && ALLOWED_PROVIDERS.has(v as DiscoveryProviderName);
}

class ProviderUnavailableError extends Error {
  constructor(public providerName: DiscoveryProviderName, message: string) {
    super(message);
    this.name = "ProviderUnavailableError";
  }
}

function resolveDefaultProvider(): DiscoveryProviderName {
  const fromEnv = process.env.DISCOVERY_PROVIDER;
  if (fromEnv === "serpapi") return "serpapi";
  return "mock";
}

async function resolveProvider(
  requested: DiscoveryProviderName | undefined,
): Promise<DiscoveryProvider> {
  const effective: DiscoveryProviderName = requested ?? resolveDefaultProvider();

  if (effective === "serpapi") {
    if (!process.env.SERPAPI_API_KEY) {
      throw new ProviderUnavailableError(
        "serpapi",
        "SerpAPI provider is selected but SERPAPI_API_KEY is not configured on the server.",
      );
    }
    // Dynamic import keeps the SerpAPI module (server-only) out of any
    // graph where it could be tree-pulled into the client bundle.
    const mod = await import("@/lib/discovery/serpapi-provider");
    return mod.serpapiDiscoveryProvider;
  }

  return mockDiscoveryProvider;
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

  const { keyword: kw, country: c, limit: l, provider: p } = body as Record<string, unknown>;

  if (typeof kw !== "string") return jsonError(400, "invalid_input", "keyword is required (string)");
  const keyword = kw.trim();
  if (keyword.length < 1 || keyword.length > MAX_KEYWORD) {
    return jsonError(400, "invalid_input", `keyword length must be 1..${MAX_KEYWORD}`);
  }

  let country = "vn";
  if (c !== undefined) {
    if (typeof c !== "string") return jsonError(400, "invalid_input", "country must be a string");
    if (!ALLOWED_COUNTRIES.has(c)) return jsonError(400, "invalid_input", "country must be one of: vn, us");
    country = c;
  }

  let requestedProvider: DiscoveryProviderName | undefined;
  if (p !== undefined) {
    if (!isAllowedProvider(p)) {
      return jsonError(400, "invalid_input", `provider must be one of: ${[...ALLOWED_PROVIDERS].join(", ")}`);
    }
    requestedProvider = p;
  }

  // Resolve provider FIRST so we know the max limit ceiling.
  let provider: DiscoveryProvider;
  try {
    provider = await resolveProvider(requestedProvider);
  } catch (e) {
    if (e instanceof ProviderUnavailableError) {
      return jsonError(503, "provider_unavailable", e.message, { provider: e.providerName });
    }
    return jsonError(500, "internal", sanitize(e instanceof Error ? e.message : "unknown"));
  }

  const maxLimit = provider.name === "serpapi" ? MAX_LIMIT_SERPAPI : MAX_LIMIT_MOCK;
  let limit = DEFAULT_LIMIT;
  if (l !== undefined) {
    if (typeof l !== "number" || !Number.isInteger(l)) {
      return jsonError(400, "invalid_input", "limit must be an integer");
    }
    if (l < MIN_LIMIT || l > maxLimit) {
      return jsonError(400, "invalid_input", `limit must be ${MIN_LIMIT}..${maxLimit} for provider ${provider.name}`);
    }
    limit = l;
  }

  const startedAt = Date.now();
  try {
    const items = await provider.run({ keyword, country, limit });
    const durationMs = Date.now() - startedAt;
    const response: DiscoveryResponse = {
      run: {
        id: crypto.randomUUID(),
        keyword,
        country,
        status: "completed",
        provider: provider.name,
        resultCount: items.length,
        createdAt: new Date(startedAt).toISOString(),
        durationMs,
      },
      results: items,
    };
    return NextResponse.json(response, {
      headers: { "cache-control": "no-store" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return jsonError(500, "internal", sanitize(msg), { provider: provider.name });
  }
}
