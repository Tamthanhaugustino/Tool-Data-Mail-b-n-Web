// Supabase admin client — service-role, BYPASSES RLS.
//
// `import "server-only"` ensures this module can never end up in the
// client bundle. The `SUPABASE_SERVICE_ROLE_KEY` value is read inside
// this file ONLY — never re-exported and never logged.
//
// Use cases (always server-side):
// - Audit log inserts
// - Admin user management (`/admin/*` route handlers, Phase 09)
// - Stripe webhook handlers (Phase 08)
// - Bootstrap / seed scripts
//
// Do NOT use the admin client for normal user-scoped reads/writes —
// always prefer `createSupabaseServerClient()` so RLS applies.

import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hasSupabaseServiceRoleEnv, publicSupabaseConfig } from "./env";

let cached: SupabaseClient | null = null;

/**
 * Returns the singleton admin client, or null when env vars are missing.
 *
 * Caching is fine here: service-role clients are stateless wrt request
 * cookies (no user session attached).
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  if (cached) return cached;
  if (!hasSupabaseServiceRoleEnv()) return null;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return null;

  cached = createClient(publicSupabaseConfig.url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  return cached;
}
