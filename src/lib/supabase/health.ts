// Server-only Supabase health probe.
//
// Used by admin diagnostics — never exposes connection strings or keys.
// Returns a small enum-ish shape that callers can log or display.

import "server-only";

import { getSupabaseAdminClient } from "./admin";
import {
  hasSupabasePublicEnv,
  hasSupabaseServiceRoleEnv,
} from "./env";

export type SupabaseHealth =
  | { configured: false; reason: "missing_public_env" | "missing_service_role_env" }
  | { configured: true; reachable: true; latencyMs: number }
  | { configured: true; reachable: false; latencyMs?: number; error: string };

/**
 * Lightweight reachability check. Issues a single `head` count against
 * `profiles` via the admin client.
 *
 * Returns `configured: false` when env vars aren't set (build-safe).
 * Returns `reachable: false` with the Postgres error message when the
 * project exists but the schema/migration has not been applied yet.
 */
export async function checkSupabaseHealth(): Promise<SupabaseHealth> {
  if (!hasSupabasePublicEnv()) {
    return { configured: false, reason: "missing_public_env" };
  }
  if (!hasSupabaseServiceRoleEnv()) {
    return { configured: false, reason: "missing_service_role_env" };
  }
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return { configured: false, reason: "missing_service_role_env" };
  }

  const started = Date.now();
  try {
    const { error } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true });
    const latencyMs = Date.now() - started;
    if (error) {
      return { configured: true, reachable: false, latencyMs, error: error.message };
    }
    return { configured: true, reachable: true, latencyMs };
  } catch (e) {
    return {
      configured: true,
      reachable: false,
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}
