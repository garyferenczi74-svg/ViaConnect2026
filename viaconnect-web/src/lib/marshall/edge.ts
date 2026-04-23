/**
 * Marshall Edge middleware checks.
 * Edge-runtime-compatible: NO Node built-ins, NO server-only modules.
 * Does a lightweight header/cookie scan and sets x-marshall-finding header
 * when anything looks off. Heavy rule evaluation happens at the handler layer.
 */

import type { NextRequest } from "next/server";

export interface EdgeFinding {
  findingId: string;
  severity: "P0" | "P1" | "P2" | "P3" | "ADVISORY";
  message: string;
}

/**
 * Only returns a P0 finding if something is blatantly wrong at the edge.
 * Never throws. Budget: ~2ms p95.
 */
export async function runEdgeMarshallChecks(req: NextRequest): Promise<EdgeFinding | null> {
  try {
    const path = req.nextUrl.pathname;

    // Defense-in-depth: any path containing a forbidden substance name is
    // blocked at the edge regardless of what the app tried to do downstream.
    const lowered = path.toLowerCase();
    if (lowered.includes("semaglutide")) {
      return {
        findingId: `M-EDGE-${Date.now()}`,
        severity: "P0",
        message: "Path references a prohibited compound.",
      };
    }

    // Observe: jurisdictional cookie banner expectation (non-blocking).
    // req.geo was removed in Next 15; fall through to Vercel's geo header.
    const country = req.headers.get("x-vercel-ip-country") ?? "US";
    const acceptedCookie = req.cookies.get("marshall_cookie_consent")?.value;
    if (!acceptedCookie && (country === "DE" || country === "FR" || country === "IT" || country === "ES" || country === "GB" || country === "NL")) {
      return {
        findingId: `M-EDGE-${Date.now()}`,
        severity: "P2",
        message: `Advisory: GDPR jurisdiction (${country}) without consent cookie; serve strict banner.`,
      };
    }

    return null;
  } catch {
    return null;
  }
}
