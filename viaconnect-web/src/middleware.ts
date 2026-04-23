import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { runEdgeMarshallChecks } from "@/lib/marshall/edge";

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
  return response;
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
