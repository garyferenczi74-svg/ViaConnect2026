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
    pathname.startsWith("/pricing") ||
    pathname === "/practitioners" ||
    pathname.startsWith("/practitioners/") ||
    pathname === "/patients/invited" ||
    pathname.startsWith("/patients/invited/") ||
    pathname.startsWith("/api/waitlist/") ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/stripe/webhook") ||
    pathname.startsWith("/api/webhooks/") ||
    pathname.startsWith("/api/pricing/");

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

    // Admin role has access to ALL portals (consumer, practitioner, naturopath, admin)
    const isAdmin = rawRole === "admin";

    // Detect if the user is crossing portal boundaries so the client can
    // clear stale cached data (auth store + React Query) on arrival.
    // Note the trailing slash on /practitioner/ — without it, this would
    // also match /practitioners (the public landing/waitlist page).
    const currentPortal = pathname.startsWith("/practitioner/")
      ? "practitioner"
      : pathname.startsWith("/naturopath/")
      ? "naturopath"
      : pathname.startsWith("/admin")
      ? "admin"
      : "consumer";

    // Admin-only routes
    if (pathname.startsWith("/admin") && !isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = getRoleHomePath(role);
      url.searchParams.set("portal_switch", "1");
      return NextResponse.redirect(url);
    }

    // Enforce portal access based on role — block cross-portal access.
    // Trailing slash matters: /practitioner/ is the practitioner portal,
    // /practitioners is the public marketing/waitlist page.
    if (pathname.startsWith("/practitioner/") && role !== "practitioner" && !isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = getRoleHomePath(role);
      url.searchParams.set("portal_switch", "1");
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/naturopath/") && role !== "naturopath" && !isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = getRoleHomePath(role);
      url.searchParams.set("portal_switch", "1");
      return NextResponse.redirect(url);
    }

    // Consumer routes (non-prefixed app routes) are only for consumers (and admins)
    const consumerRoutes = ["/dashboard", "/genetics", "/supplements", "/tokens", "/profile", "/messages", "/ai"];
    const isConsumerRoute = consumerRoutes.some(
      (route) => pathname === route || pathname.startsWith(route + "/")
    );
    if (isConsumerRoute && role !== "consumer" && !isAdmin && role !== undefined) {
      const url = request.nextUrl.clone();
      url.pathname = getRoleHomePath(role);
      url.searchParams.set("portal_switch", "1");
      return NextResponse.redirect(url);
    }
  }

  return response;
}

/** Normalize DB roles (patient/admin) to app roles (consumer/practitioner/naturopath) */
function normalizeRole(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  if (raw === "patient") return "consumer";
  if (raw === "admin") return "consumer"; // Admin defaults to consumer portal; has access to all
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
