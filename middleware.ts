import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { verifySession } from "@/lib/auth/jwt";
import { sessionFromSupabaseUser } from "@/lib/auth/supabase-session";
import { AUTH_COOKIE } from "@/lib/auth/types";
import { hasSupabasePublicEnv, publicSupabaseConfig } from "@/lib/supabase/env";

const PUBLIC_PATHS = ["/login"];

function isPublic(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

async function getSupabaseMiddlewareSession(req: NextRequest) {
  if (!hasSupabasePublicEnv()) return null;

  let response = NextResponse.next({ request: req });
  const supabase = createServerClient(
    publicSupabaseConfig.url,
    publicSupabaseConfig.anonKey,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            req.cookies.set(name, value);
          }
          response = NextResponse.next({ request: req });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { session: sessionFromSupabaseUser(data.user), response };
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const demoSession = token ? await verifySession(token) : null;
  const supabaseResult = demoSession ? null : await getSupabaseMiddlewareSession(req);
  const session = demoSession ?? supabaseResult?.session ?? null;

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/dashboard") url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && session.role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResult?.response ?? NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
