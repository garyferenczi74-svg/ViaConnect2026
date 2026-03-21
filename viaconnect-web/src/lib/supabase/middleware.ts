import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey,
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
    // Normalize role: DB uses patient/admin, app uses consumer/practitioner/naturopath
    const rawRole = user.user_metadata?.role as string | undefined;
    const role = normalizeRole(rawRole);

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

    // Enforce portal access based on role — block cross-portal access
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

    // Consumer routes (non-prefixed app routes) are only for consumers
    const consumerRoutes = ["/dashboard", "/genetics", "/supplements", "/tokens", "/profile", "/messages"];
    const isConsumerRoute = consumerRoutes.some(
      (route) => pathname === route || pathname.startsWith(route + "/")
    );
    if (isConsumerRoute && role !== "consumer" && role !== undefined) {
      const url = request.nextUrl.clone();
      url.pathname = getRoleHomePath(role);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

/** Normalize DB roles (patient/admin) to app roles (consumer/practitioner/naturopath) */
function normalizeRole(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  if (raw === "patient") return "consumer";
  if (raw === "admin") return "practitioner";
  return raw; // consumer, practitioner, naturopath pass through
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
