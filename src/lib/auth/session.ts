import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { verifySession } from "./jwt";
import { sessionFromSupabaseUser } from "./supabase-session";
import { AUTH_COOKIE, type Session } from "./types";

export async function getSession(): Promise<Session | null> {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) {
      return sessionFromSupabaseUser(data.user);
    }
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  return session ? { ...session, authProvider: session.authProvider ?? "demo" } : null;
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (session.role !== "admin") redirect("/dashboard");
  return session;
}
