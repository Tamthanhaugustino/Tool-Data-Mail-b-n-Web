// Supabase server client factory — RSC / Server Action / Route Handler.
//
// `import "server-only"` poisons this module if it ever ends up in the
// client bundle. The Supabase cookie store reads/writes the auth cookie
// set by Supabase Auth; the Phase 03 HMAC `tdm_session` cookie is left
// untouched.
//
// Bridge to Phase 03 demo auth:
// While the app still uses cookie HMAC auth (`src/lib/auth/*`), this
// client is a NO-OP for auth — it can only run anonymous queries (RLS
// will reject anything user-scoped). When we swap demo auth for Supabase
// Auth, `signInAction` will start setting Supabase cookies and this
// client's `auth.getUser()` will return the real session.

import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { hasSupabasePublicEnv, publicSupabaseConfig } from "./env";

type CreateServerClientReturn = ReturnType<typeof createServerClient>;
export type SupabaseServerClient = CreateServerClientReturn;

/**
 * Create a Supabase client bound to the current request's cookie store.
 *
 * Call from RSC, server actions, or route handlers. Returns null when
 * env vars are missing. Cookie writes are best-effort — writes attempted
 * inside a pure RSC render are silently dropped (no response object).
 */
export async function createSupabaseServerClient(): Promise<SupabaseServerClient | null> {
  if (!hasSupabasePublicEnv()) return null;

  const cookieStore = await cookies();

  return createServerClient(
    publicSupabaseConfig.url,
    publicSupabaseConfig.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component render — response cookies
            // are not writable here. Middleware/route handlers handle
            // refresh correctly; safe to swallow.
          }
        },
      },
    },
  );
}
