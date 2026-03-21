import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public routes that don't require authentication
  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/stripe/webhook");

  // If not authenticated and trying to access protected route, redirect to login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // If authenticated, enforce role-based routing
  if (user) {
    const role = user.user_metadata?.role as string | undefined;

    // Redirect authenticated users away from auth pages
    if (
      pathname === "/login" ||
      pathname === "/signup" ||
      pathname === "/forgot-password"
    ) {
      const url = request.nextUrl.clone();
      url.pathname = getRoleHomePath(role);
      return NextResponse.redirect(url);
    }

    // Enforce portal access based on role
    if (pathname.startsWith("/practitioner") && role !== "practitioner") {
      const url = request.nextUrl.clone();
      url.pathname = getRoleHomePath(role);
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/naturopath") && role !== "naturopath") {
      const url = request.nextUrl.clone();
      url.pathname = getRoleHomePath(role);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

function getRoleHomePath(role: string | undefined): string {
  switch (role) {
    case "practitioner":
      return "/practitioner/dashboard";
    case "naturopath":
      return "/naturopath/dashboard";
    default:
      return "/dashboard";
  }
}
