"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { findDemoUser } from "./demo-users";
import { signSession } from "./jwt";
import { AUTH_COOKIE, SESSION_MAX_AGE } from "./types";

export type SignInState = {
  error?: string;
};

export async function signInAction(
  _prev: SignInState | null,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const from = String(formData.get("from") ?? "/dashboard");
  const safeFrom = from.startsWith("/") && !from.startsWith("//") ? from : "/dashboard";

  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (!error) {
      redirect(safeFrom);
    }
  }

  const user = findDemoUser(email, password);
  if (!user) {
    return {
      error:
        "Email hoặc mật khẩu không đúng. Thử demo: trang.nguyen@vietsoftware.com.vn / demo123",
    };
  }

  const { password: _pw, ...session } = user;
  const token = await signSession(session);
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  redirect(safeFrom);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
  redirect("/login");
}
