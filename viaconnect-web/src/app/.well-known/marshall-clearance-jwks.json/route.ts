import { NextResponse } from "next/server";
import { getJwks } from "@/lib/marshall/precheck/clearance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public JWKS endpoint for verifying Marshall clearance receipts.
// Consumers: Hounddog reactive pipeline, practitioner portal badge verifier,
// any third-party integrator granted access to validate cleared drafts.
export async function GET() {
  const jwks = getJwks();
  return NextResponse.json(jwks, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "Content-Type": "application/jwk-set+json; charset=utf-8",
    },
  });
}
