// Public surface for Supabase wiring.
//
// Re-exports are split so that bundlers can tree-shake server-only code
// out of client chunks. Client code MUST import from `./client` or this
// index file's client-safe exports below — never from `./server` or
// `./admin`, which are `import "server-only"` poisoned.

export {
  publicSupabaseConfig,
  hasSupabasePublicEnv,
  hasSupabaseServiceRoleEnv,
} from "./env";

export {
  createSupabaseBrowserClient,
  type SupabaseBrowserClient,
} from "./client";

// Note: server.ts, admin.ts and health.ts are intentionally NOT
// re-exported here. Import them directly from their own module paths
// so that an accidental client import surfaces a clear `server-only`
// build-time error rather than a silent runtime failure.
