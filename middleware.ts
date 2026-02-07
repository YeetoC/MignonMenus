import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/env";

function isProtectedRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/favorites")) return true;
  if (pathname.startsWith("/archive")) return true;
  if (pathname.startsWith("/trash")) return true;
  if (pathname.startsWith("/dev")) return true;
  return false;
}

export default async function middleware(request: NextRequest) {
  const { url, anonKey } = getSupabaseEnv();

  const response = NextResponse.next({
    request,
  });

  const cookiesToSet: { name: string; value: string; options?: CookieOptions }[] = [];

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies: { name: string; value: string; options?: CookieOptions }[]) {
        cookies.forEach((cookie) => cookiesToSet.push(cookie));
        cookies.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (pathname === "/signin" && user) {
    const redirectResponse = NextResponse.redirect(new URL("/", request.url));
    cookiesToSet.forEach(({ name, value, options }) => {
      redirectResponse.cookies.set(name, value, options);
    });
    return redirectResponse;
  }

  if (isProtectedRoute(pathname) && !user) {
    const redirectResponse = NextResponse.redirect(
      new URL("/signin", request.url),
    );
    cookiesToSet.forEach(({ name, value, options }) => {
      redirectResponse.cookies.set(name, value, options);
    });
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
