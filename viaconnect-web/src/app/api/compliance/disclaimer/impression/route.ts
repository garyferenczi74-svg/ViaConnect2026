// Prompt #113 — Disclaimer impression logger.
// DSHEADisclaimer component calls this on mount and on suppression detect.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getJurisdictionId } from "@/lib/compliance/jurisdiction";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

interface Body {
  surface: string;
  surface_id?: string;
  jurisdiction: "US" | "CA";
  displayed: boolean;
  suppression_attempt?: boolean;
}

export async function POST(request: Request) {
  try {
    const sb = createClient();
    const { data: { user } } = await withTimeout(sb.auth.getUser(), 5000, 'api.compliance.disclaimer.auth');
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
    const { error } = await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (admin as any).from("regulatory_disclaimer_events").insert({
        surface: body.surface,
        surface_id: body.surface_id ?? null,
        user_id: user?.id ?? null,
        jurisdiction_id: jurisdictionId,
        displayed: body.displayed,
        suppression_attempt: !!body.suppression_attempt,
      }))(),
      8000,
      'api.compliance.disclaimer.insert',
    );
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.compliance.disclaimer', 'timeout', { error: err });
      return NextResponse.json({ ok: false, error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.compliance.disclaimer', 'unexpected error', { error: err });
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 });
  }
}
