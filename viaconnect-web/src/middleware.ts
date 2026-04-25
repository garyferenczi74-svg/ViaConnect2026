import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { runEdgeMarshallChecks } from "@/lib/marshall/edge";

const VISITOR_COOKIE = "vc_visitor_id";
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function middleware(request: NextRequest) {
  // Marshall runs FIRST at the edge. If anything blatant (prohibited compound
  // in URL, etc.) shows up, redirect before the session handler runs.
  const marshall = await runEdgeMarshallChecks(request);
  if (marshall?.severity === "P0") {
    const url = request.nextUrl.clone();
    url.pathname = "/compliance-hold";
    url.searchParams.set("findingId", marshall.findingId);
    return NextResponse.redirect(url);
  }

  const response = await updateSession(request);
  if (marshall) response.headers.set("x-marshall-finding", marshall.findingId);
  ensureVisitorCookie(request, response);
  return response;
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
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
