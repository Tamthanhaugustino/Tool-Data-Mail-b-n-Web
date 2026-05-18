// Supabase browser client factory.
//
// Use from Client Components ("use client") and from browser-only code.
// Returns null when Supabase env vars are missing so the prototype build
// keeps working before a real project is provisioned.

import { createBrowserClient } from "@supabase/ssr";
import { hasSupabasePublicEnv, publicSupabaseConfig } from "./env";

export type SupabaseBrowserClient = ReturnType<typeof createBrowserClient>;

/**
 * Create a Supabase client suitable for the browser bundle.
 *
 * @returns SupabaseBrowserClient when env vars are configured, otherwise null.
 *          Callers must handle the null case — typically by showing a
 *          "not configured" empty state or skipping the data fetch.
 */
export function createSupabaseBrowserClient(): SupabaseBrowserClient | null {
  if (!hasSupabasePublicEnv()) return null;
  return createBrowserClient(
    publicSupabaseConfig.url,
    publicSupabaseConfig.anonKey,
  );
}
