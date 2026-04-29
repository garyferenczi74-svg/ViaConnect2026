// Prompt #118 — Body Graphic preferences GET + PATCH.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BodyGraphicPreferencesRow } from "@/components/body-tracker/body-graphic/BodyGraphic.types";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

// Route requires a user session (auth.getUser) and the service-role admin
// client for upserts; both are runtime-only. Opt out of static pre-render
// so Vercel's build phase does not invoke them with no env or request.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sb = createClient();
    const { data: { user } } = await withTimeout(sb.auth.getUser(), 5000, 'api.body-graphic.preferences.auth');
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const { data } = await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (sb as any).from("body_graphics_preferences").select("*").eq("user_id", user.id).maybeSingle())(),
      8000,
      'api.body-graphic.preferences.read',
    );
    return NextResponse.json({ ok: true, preferences: (data as BodyGraphicPreferencesRow | null) ?? null });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.body-graphic.preferences', 'get timeout', { error: err });
      return NextResponse.json({ ok: false, error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.body-graphic.preferences', 'unexpected error', { error: err });
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const sb = createClient();
    const { data: { user } } = await withTimeout(sb.auth.getUser(), 5000, 'api.body-graphic.preferences.patch.auth');
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const body = await request.json().catch(() => null) as Partial<BodyGraphicPreferencesRow> | null;
    if (!body) return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });

    const allowed: Partial<BodyGraphicPreferencesRow> = {};
    if (body.default_gender === "male" || body.default_gender === "female") allowed.default_gender = body.default_gender;
    if (body.default_view === "front" || body.default_view === "back") allowed.default_view = body.default_view;
    if (typeof body.show_anatomical_detail === "boolean") allowed.show_anatomical_detail = body.show_anatomical_detail;
    if (typeof body.show_region_labels === "boolean") allowed.show_region_labels = body.show_region_labels;
    if (body.preferred_size === "compact" || body.preferred_size === "standard" || body.preferred_size === "large") allowed.preferred_size = body.preferred_size;

    const admin = createAdminClient();
    const { error } = await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (admin as any)
        .from("body_graphics_preferences")
        .upsert({ user_id: user.id, ...allowed, updated_at: new Date().toISOString() }, { onConflict: "user_id" }))(),
      8000,
      'api.body-graphic.preferences.upsert',
    );
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.body-graphic.preferences', 'patch timeout', { error: err });
      return NextResponse.json({ ok: false, error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.body-graphic.preferences', 'unexpected error', { error: err });
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 });
  }
}
