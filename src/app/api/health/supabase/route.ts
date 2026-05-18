// Supabase health check — Phase 06.
//
// GET /api/health/supabase
//
// Public (excluded from middleware via the /api matcher). Returns a
// small JSON envelope describing whether Supabase env vars are wired
// and whether the project is reachable. Never returns URLs, keys, or
// other secret-shaped data — the underlying checker only reads boolean
// flags from src/lib/supabase/env.ts.
//
// Response shapes (always HTTP 200):
//
//   { service: "supabase", configured: false, reason: "missing_public_env" }
//   { service: "supabase", configured: false, reason: "missing_service_role_env" }
//   { service: "supabase", configured: true,  ok: true,  latencyMs: 123 }
//   { service: "supabase", configured: true,  ok: false, latencyMs?, error: "<short>" }
//
// Errors are sanitized: stack traces stripped, message truncated to 200
// chars. Schema-not-applied returns ok=false with the Postgres error
// (e.g. "relation \"profiles\" does not exist") so the operator can tell
// at a glance whether the migration was run.

import { NextResponse } from "next/server";
import { checkSupabaseHealth } from "@/lib/supabase/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ERROR_LENGTH = 200;

function sanitizeError(msg: string): string {
  // Strip any newline/CR (would split message across log lines), drop any
  // accidental URLs/JWTs, then truncate.
  const oneLine = msg.replace(/\s+/g, " ").trim();
  const noUrls = oneLine.replace(/https?:\/\/\S+/g, "[url]");
  const noJwts = noUrls.replace(/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, "[jwt]");
  return noJwts.slice(0, MAX_ERROR_LENGTH);
}

export async function GET() {
  const health = await checkSupabaseHealth();

  const body = (() => {
    if (!health.configured) {
      return {
        service: "supabase" as const,
        configured: false as const,
        reason: health.reason,
      };
    }
    if (health.reachable) {
      return {
        service: "supabase" as const,
        configured: true as const,
        ok: true as const,
        latencyMs: health.latencyMs,
      };
    }
    return {
      service: "supabase" as const,
      configured: true as const,
      ok: false as const,
      ...(health.latencyMs !== undefined ? { latencyMs: health.latencyMs } : {}),
      error: sanitizeError(health.error),
    };
  })();

  return NextResponse.json(body, {
    headers: {
      "cache-control": "no-store",
    },
  });
}
