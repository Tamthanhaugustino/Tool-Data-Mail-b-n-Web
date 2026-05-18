// POST /api/discovery/keyword — Phase 07.
//
// Validates a Keyword Discovery request, dispatches to the configured
// provider (mock for now), and returns the run summary + result list.
//
// Notes:
// - Requires a valid Phase 03 demo session (HMAC cookie). Middleware
//   excludes /api/* so we check session manually.
// - Does NOT call SerpAPI / Hunter / any external service.
// - Does NOT consume quota.
// - Does NOT touch the database. Persistence into discovery_runs /
//   scan_results is deferred until Supabase Auth migration so we can
//   tie rows to a real auth.users row (see docs/DISCOVERY.md §4).
// - Error messages are sanitized before returning to the client.

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDiscoveryProvider, type DiscoveryResponse } from "@/lib/discovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_KEYWORD = 200;
const ALLOWED_COUNTRIES = new Set(["vn", "us"]);
const MIN_LIMIT = 1;
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;

function invalid(message: string) {
  return NextResponse.json(
    { error: "invalid_input", message },
    { status: 400, headers: { "cache-control": "no-store" } },
  );
}

function sanitize(message: string): string {
  return message
    .replace(/\s+/g, " ")
    .replace(/https?:\/\/\S+/g, "[url]")
    .replace(/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, "[jwt]")
    .trim()
    .slice(0, 200);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return invalid("body must be valid JSON");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return invalid("body must be a JSON object");
  }

  const { keyword: kw, country: c, limit: l } = body as Record<string, unknown>;

  if (typeof kw !== "string") return invalid("keyword is required (string)");
  const keyword = kw.trim();
  if (keyword.length < 1 || keyword.length > MAX_KEYWORD) {
    return invalid(`keyword length must be 1..${MAX_KEYWORD}`);
  }

  let country = "vn";
  if (c !== undefined) {
    if (typeof c !== "string") return invalid("country must be a string");
    if (!ALLOWED_COUNTRIES.has(c)) return invalid("country must be one of: vn, us");
    country = c;
  }

  let limit = DEFAULT_LIMIT;
  if (l !== undefined) {
    if (typeof l !== "number" || !Number.isInteger(l)) {
      return invalid("limit must be an integer");
    }
    if (l < MIN_LIMIT || l > MAX_LIMIT) {
      return invalid(`limit must be ${MIN_LIMIT}..${MAX_LIMIT}`);
    }
    limit = l;
  }

  const provider = getDiscoveryProvider();
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
    return NextResponse.json(
      { error: "internal", message: sanitize(msg) },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}
