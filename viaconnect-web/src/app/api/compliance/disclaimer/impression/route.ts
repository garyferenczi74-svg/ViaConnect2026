// Prompt #113 — Disclaimer impression logger.
// DSHEADisclaimer component calls this on mount and on suppression detect.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getJurisdictionId } from "@/lib/compliance/jurisdiction";

interface Body {
  surface: string;
  surface_id?: string;
  jurisdiction: "US" | "CA";
  displayed: boolean;
  suppression_attempt?: boolean;
}

export async function POST(request: Request) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body || typeof body.surface !== "string" || typeof body.displayed !== "boolean") {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  if (body.jurisdiction !== "US" && body.jurisdiction !== "CA") {
    return NextResponse.json({ ok: false, error: "invalid_jurisdiction" }, { status: 400 });
  }
  const jurisdictionId = await getJurisdictionId(body.jurisdiction);
  if (!jurisdictionId) return NextResponse.json({ ok: false, error: "jurisdiction_not_found" }, { status: 500 });

  const admin = createAdminClient();
  const { error } = await admin.from("regulatory_disclaimer_events").insert({
    surface: body.surface,
    surface_id: body.surface_id ?? null,
    user_id: user?.id ?? null,
    jurisdiction_id: jurisdictionId,
    displayed: body.displayed,
    suppression_attempt: !!body.suppression_attempt,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
