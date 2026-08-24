import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { runEdgeMarshallChecks } from "@/lib/marshall/edge";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { authTimeoutAction } from "@/lib/auth/session-role";

const VISITOR_COOKIE = "vc_visitor_id";
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// Prompt #140a Layer 1 hardening. Outer try/catch is the safety net that
// prevents any unhandled error from producing a MIDDLEWARE_INVOCATION_TIMEOUT.
// On catastrophic failure we log + fall through to NextResponse.next() so the
// request reaches the page layer (where it is either public, redirected, or
// served by Pattern A/B/C/D-classified server components).
export async function middleware(request: NextRequest) {
  try {
    // Marshall edge runs FIRST. If a P0 finding fires (prohibited compound in
    // URL etc.), redirect before the session handler runs. Fail-OPEN if Marshall
    // hangs: better to occasionally let a request through to a page layer that
    // will block it server-side than to take down every request.
    let marshall: Awaited<ReturnType<typeof runEdgeMarshallChecks>> | null = null;
    try {
      marshall = await withTimeout(
        runEdgeMarshallChecks(request),
        1500,
        "middleware.marshall.edge"
      );
    } catch (error) {
      if (isTimeoutError(error)) {
        safeLog.warn("middleware", "marshall edge check timed out, failing open", {
          path: request.nextUrl.pathname,
          error,
        });
      } else {
        safeLog.error("middleware", "marshall edge check failed unexpectedly", {
          path: request.nextUrl.pathname,
          error,
        });
      }
    }

    if (marshall?.severity === "P0") {
      safeLog.info("middleware", "marshall P0 redirect", {
        path: request.nextUrl.pathname,
        findingId: marshall.findingId,
      });
      const url = request.nextUrl.clone();
      url.pathname = "/compliance-hold";
      url.searchParams.set("findingId", marshall.findingId);
      return NextResponse.redirect(url);
    }

    // Session handler. Wraps Supabase auth + role lookup with timeouts.
    // Auth timeout on clinician/admin routes is FAIL-CLOSED (deny).
    // Consumer/public routes may still pass through so a transient Auth
    // blip does not 307 the entire site to /login.
    let response: NextResponse;
    try {
      response = await withTimeout(
        updateSession(request),
        3000,
        "middleware.updateSession"
      );
    } catch (error) {
      if (isTimeoutError(error)) {
        safeLog.warn("middleware", "session check timed out", {
          path: request.nextUrl.pathname,
          error,
        });
      } else {
        safeLog.error("middleware", "session check failed unexpectedly", {
          path: request.nextUrl.pathname,
          error,
        });
      }
      const denied = denyClinicianAdminOnAuthTimeout(request);
      if (denied) return denied;
      response = NextResponse.next({
        request: { headers: request.headers },
      });
    }

    if (marshall) response.headers.set("x-marshall-finding", marshall.findingId);
    ensureVisitorCookie(request, response);
    return response;
  } catch (error) {
    // Outer safety net. Never let an unhandled error reach the edge runtime
    // and trigger MIDDLEWARE_INVOCATION_TIMEOUT or a 500 on every request.
    safeLog.error("middleware", "unhandled middleware error", {
      path: request.nextUrl.pathname,
      error,
    });
    const denied = denyClinicianAdminOnAuthTimeout(request);
    if (denied) return denied;
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }
}

function denyClinicianAdminOnAuthTimeout(request: NextRequest): NextResponse | null {
  const pathname = request.nextUrl.pathname;
  const action = authTimeoutAction(pathname);
  if (action === "pass") return null;
  if (action === "deny_api") {
    safeLog.warn("middleware", "auth timeout fail-closed API deny", { path: pathname });
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
        errorCode: "AUTH_TIMEOUT",
        timestamp: new Date().toISOString(),
      },
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }
  safeLog.warn("middleware", "auth timeout fail-closed page deny", { path: pathname });
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("redirectTo", pathname);
  return NextResponse.redirect(url);
}

// Prompt #138a §6.1: stable visitor cookie used for deterministic A/B
// assignment in HeroVariantRenderer. Skipped on /api/* and image routes
// (matcher already excludes static + image; this also skips API requests).
function ensureVisitorCookie(request: NextRequest, response: NextResponse) {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/api/")) return;
  if (request.cookies.has(VISITOR_COOKIE)) return;
  const visitorId = crypto.randomUUID();
  request.cookies.set({ name: VISITOR_COOKIE, value: visitorId });
  response.cookies.set({
    name: VISITOR_COOKIE,
    value: visitorId,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: VISITOR_COOKIE_MAX_AGE,
  });
}

export const config = {
  matcher: [
    /*
     * Prompt #140a: tightened matcher excludes more static asset extensions
     * (avif, ico, woff, woff2, ttf, otf, eot, css, js, map) so middleware does
     * not run on every static request. Keeps existing behavior for HTML pages
     * and API requests under /api/* (the API exclusion lives inside
     * updateSession's public-route allowlist, not in the matcher itself, so
     * webhook routes still pass through middleware for visitor cookie minting
     * skip logic).
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf|eot|css|js|map)$).*)",
  ],
};
