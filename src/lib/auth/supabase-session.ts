import type { User } from "@supabase/supabase-js";
import type { Plan, Role, Session } from "./types";

function normalizeRole(value: unknown): Role {
  return value === "admin" ? "admin" : "user";
}

function normalizePlan(value: unknown): Plan {
  if (value === "PRO" || value === "BASIC" || value === "TRIAL") return value;
  if (typeof value === "string") {
    const upper = value.toUpperCase();
    if (upper === "PRO" || upper === "BASIC" || upper === "TRIAL") return upper;
  }
  return "TRIAL";
}

function getDisplayName(user: User): string {
  const meta = user.user_metadata ?? {};
  const fromMeta =
    typeof meta.name === "string"
      ? meta.name
      : typeof meta.full_name === "string"
        ? meta.full_name
        : typeof meta.display_name === "string"
          ? meta.display_name
          : "";
  return fromMeta.trim() || user.email?.split("@")[0] || "Supabase User";
}

function makeInitials(name: string, email?: string): string {
  const parts = name
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (email?.slice(0, 2) || "SU").toUpperCase();
}

export function sessionFromSupabaseUser(user: User): Session {
  const appMeta = user.app_metadata ?? {};
  const userMeta = user.user_metadata ?? {};
  const name = getDisplayName(user);
  return {
    id: user.id,
    email: user.email ?? `${user.id}@supabase.local`,
    name,
    initials: makeInitials(name, user.email),
    plan: normalizePlan(userMeta.plan ?? appMeta.plan),
    role: normalizeRole(appMeta.role ?? userMeta.role),
    authProvider: "supabase",
  };
}
