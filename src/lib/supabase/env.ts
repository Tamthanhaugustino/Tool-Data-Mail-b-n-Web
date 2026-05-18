// Supabase environment variables — Phase 05 wiring.
//
// This module is safe to import from BOTH client and server code:
// - `NEXT_PUBLIC_*` vars are inlined into the client bundle by Next.js.
// - `SUPABASE_SERVICE_ROLE_KEY` is NOT read here; it is read only by
//   `src/lib/supabase/admin.ts` (which is `import "server-only"` guarded).
//
// Behavior when env vars are missing:
// - Factories in client.ts / server.ts / admin.ts return `null`. Callers
//   MUST check before using. This keeps `npm run build` working before
//   a Supabase project is provisioned.

export const publicSupabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
} as const;

/** True when the browser-safe Supabase config is present. */
export function hasSupabasePublicEnv(): boolean {
  return Boolean(publicSupabaseConfig.url && publicSupabaseConfig.anonKey);
}

/**
 * Server-only check for service-role config.
 *
 * We intentionally do NOT export the service role key from this module —
 * the value is read inside `src/lib/supabase/admin.ts`. This function is
 * a no-secret presence flag that can be called from server code without
 * pulling the key into any module graph that a client component imports.
 */
export function hasSupabaseServiceRoleEnv(): boolean {
  return Boolean(
    publicSupabaseConfig.url && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
