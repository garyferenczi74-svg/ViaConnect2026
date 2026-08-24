import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { unauthenticatedClinicianPortalRedirect } from "@/lib/practitioner/waitlist-honesty";

// Prompt #140a Layer 1 hardening. Every Supabase auth + data call is wrapped
// with withTimeout. On timeout: treat as unauthenticated and let the public-
// route allowlist decide whether to allow or redirect. On unexpected error:
// log via safeLog and same fallback behavior. Role lookup uses fallback chain
// (user_metadata.role) when the profiles query fails.
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

  // Auth check. Prompt 208 incident (2026-06-26): getUser() makes a network
  // round-trip to the Auth server on EVERY request, so a brief Supabase Auth
  // latency spike pushed it past the 2000ms timeout and the fail-open treated
  // signed-in users as unauthenticated, 307-redirecting every authenticated
  // request (including POST /api/nutrition/analyze-text) to /login. getClaims()
  // verifies the JWT signature LOCALLY against the project's asymmetric ES256
  // signing keys via the WebCrypto API, with no per-request network call, so a
  // transient Auth latency spike can no longer log everyone out. It still
  // refreshes an expired token through the configured cookie handlers above (the
  // documented Next.js SSR pattern; removing it would randomly log users out).
  // Tradeoff: getClaims does not detect a server-side logout/revocation until
  // the access token expires; admin gating below still reads profiles and
  // sensitive API routes re-check with getUser. The timeout is kept only as a
  // safety net for the rare token-refresh path; on timeout/error treat as
  // unauthenticated and let the public-route allowlist decide.
  let claims:
    | NonNullable<Awaited<ReturnType<typeof supabase.auth.getClaims>>["data"]>["claims"]
    | null = null;
  try {
    const { data, error } = await withTimeout(
      supabase.auth.getClaims(),
      2000,
      "middleware.auth.getClaims"
    );
    if (error) {
      safeLog.warn("middleware.auth", "getClaims returned error", {
        path: request.nextUrl.pathname,
        error,
      });
    } else {
      claims = data?.claims ?? null;
    }
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.warn("middleware.auth", "getClaims timed out, treating as unauthenticated", {
        path: request.nextUrl.pathname,
        error,
      });
    } else {
      safeLog.error("middleware.auth", "getClaims failed unexpectedly", {
        path: request.nextUrl.pathname,
        error,
      });
    }
  }

  const pathname = request.nextUrl.pathname;

  // Public routes that don't require authentication
  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/pricing") ||
    // Prompt 204: public legal pages plus their redirect sources. These must be
    // public so the middleware never sends a logged-out visitor to /login, and
    // so the next.config redirects can resolve. Required for the app-store
    // privacy policy URL submission.
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/privacy-policy" ||
    pathname === "/terms-of-service" ||
    pathname === "/tos" ||
    pathname === "/practitioners" ||
    pathname.startsWith("/practitioners/") ||
    pathname === "/patients/invited" ||
    pathname.startsWith("/patients/invited/") ||
    // Public acquisition + brand-protection surfaces (pre-auth).
    pathname === "/waitlist" ||
    pathname.startsWith("/waitlist/") ||
    pathname === "/report-counterfeit" ||
    pathname.startsWith("/report-counterfeit/") ||
    pathname === "/dispensary" ||
    pathname.startsWith("/dispensary/") ||
    pathname.startsWith("/api/waitlist/") ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/stripe/webhook") ||
    // Via Cura shop Stripe webhook (order finalize / refund / dispute).
    // Authorizes via Stripe signature inside the handler — must not 307 to /login.
    pathname.startsWith("/api/shop/webhook") ||
    pathname.startsWith("/api/webhooks/") ||
    pathname.startsWith("/api/pricing/") ||
    // Anonymous public APIs (referral click, brand storefront, etc.)
    pathname.startsWith("/api/public/") ||
    // Prompt 223: signup location typeahead. Auth is not required because
    // signup is logged out. Do not move this under /api/public/.
    pathname.startsWith("/api/location/") ||
    // Marshall compliance surfaces (Prompt #119): public DSAR form, trust
    // page, incident history, and the DSAR submit endpoint.
    pathname === "/trust-compliance" ||
    pathname.startsWith("/trust-compliance/") ||
    pathname === "/dsar" ||
    pathname.startsWith("/compliance-hold") ||
    pathname === "/api/marshall/dsar" ||
    // Hounddog bridge cron (Prompt #120). Authorized via CRON_SECRET inside
    // the handler; must bypass the session redirect so Vercel Cron can reach it.
    pathname === "/api/hounddog/collectors/tick" ||
    // Vercel cron endpoints (Prompt 196b, 2026-06-14). Both authorize via
    // CRON_SECRET inside their handlers, so they must bypass the session
    // redirect for Vercel Cron to reach them. Without this entry the middleware
    // 307-redirected every cron invocation to /login: the BOS worker never
    // drained bos_compute_queue (no Bio Optimization score ever recomputed) and
    // the weekly body-goal recalibration never ran.
    pathname === "/api/bos/worker" ||
    pathname === "/api/body/goals/recalibrate-cron" ||
    // Google Health polling fallback (Prompt 201b). Authorizes via CRON_SECRET
    // inside the handler and is flag-gated off; must bypass the session redirect
    // so Vercel Cron can reach it.
    pathname === "/api/integrations/google-health/sync" ||
    // Google Health inbound webhook (provider-signed; no user session).
    pathname === "/api/integrations/google-health/webhook" ||
    // Prompt 212: WHOOP webhooks (signature validated in handler).
    pathname === "/api/integrations/whoop/webhook" ||
    // Prompt 212: wearable event processor (CRON_SECRET).
    pathname === "/api/integrations/whoop/process" ||
    // Hannah research cron (vercel.json) — CRON_SECRET auth inside handler.
    pathname === "/api/cron/hannah-research" ||
    pathname.startsWith("/api/cron/") ||
    // Nutrition insights cron (CRON_SECRET inside handler).
    pathname === "/api/nutrition/insights/cron" ||
    // Safety-mode status is intentionally public (feature kill-switch probe).
    pathname === "/api/safety-mode/status" ||
    // Marshall pre-check public JWKS (Prompt #121). Standard .well-known
    // discovery endpoint for third parties verifying clearance receipts.
    pathname === "/.well-known/marshall-clearance-jwks.json" ||
    pathname.startsWith("/.well-known/");

  // If not authenticated and trying to access protected route:
  // - API routes return JSON 401 (Capacitor/fetch/webhooks must not get HTML /login)
  // - Page routes redirect to /login with redirectTo
  // Main uses getClaims(); claims is null when unauthenticated.
  if (!claims && !isPublicRoute) {
    if (pathname.startsWith("/api/")) {
      safeLog.info("middleware.auth", "unauthenticated API request", {
        path: pathname,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          errorCode: "AUTH_REQUIRED",
          timestamp: new Date().toISOString(),
        },
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }
    // Unauth /practitioner and /naturopath must not look like a live portal.
    // Send visitors to the honest Q1 2027 waitlist instead of /login.
    const waitlistPath = unauthenticatedClinicianPortalRedirect(pathname);
    if (waitlistPath) {
      safeLog.info("middleware.auth", "redirecting unauthenticated clinician portal to waitlist", {
        path: pathname,
      });
      const url = request.nextUrl.clone();
      url.pathname = waitlistPath;
      url.search = "";
      return NextResponse.redirect(url);
    }
    safeLog.info("middleware.auth", "redirecting unauthenticated request to login", {
      path: pathname,
    });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // If authenticated, enforce role-based routing
  if (claims) {
    // Source of truth for role is profiles.role (same as every /api/admin route).
    // user_metadata.role is kept as a fallback ONLY for non-admin routing
    // decisions; admin gating strictly requires a profiles.role='admin' row so
    // the middleware and the API layer cannot drift apart.
    let profileRole: string | undefined;
    try {
      // Wrapped in async IIFE because PostgrestBuilder is thenable but not
      // strictly typed as Promise<T>; withTimeout's signature requires Promise.
      profileRole = await withTimeout(
        (async () => {
          const { data: profileRow } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", claims.sub)
            .maybeSingle();
          return profileRow?.role as string | undefined;
        })(),
        1500,
        "middleware.profiles.role"
      );
    } catch (error) {
      if (isTimeoutError(error)) {
        safeLog.warn("middleware.role", "profiles role lookup timed out, falling back to user_metadata.role", {
          path: pathname,
          userId: claims.sub,
          error,
        });
      } else {
        safeLog.error("middleware.role", "profiles role lookup failed", {
          path: pathname,
          userId: claims.sub,
          error,
        });
      }
      profileRole = undefined;
    }

    const rawRole = profileRole ?? (claims.user_metadata?.role as string | undefined);
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

    // Admin role has access to ALL portals. Must match /api/admin/** gating
    // exactly: profiles.role='admin' is the only path to isAdmin=true.
    // Note: when the role lookup timed out, profileRole is undefined here, so
    // isAdmin becomes false. Admin routes will then redirect (fail-CLOSED for
    // admin gating, which is the safe default).
    const isAdmin = profileRole === "admin";

    // Admin-only routes
    if (pathname.startsWith("/admin") && !isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = getRoleHomePath(role);
      url.searchParams.set("portal_switch", "1");
      return NextResponse.redirect(url);
    }

    // Enforce portal access based on role, block cross-portal access.
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
