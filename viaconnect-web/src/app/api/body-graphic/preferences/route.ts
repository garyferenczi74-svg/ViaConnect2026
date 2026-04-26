// Prompt #118 — Body Graphic preferences GET + PATCH.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BodyGraphicPreferencesRow } from "@/components/body-tracker/body-graphic/BodyGraphic.types";

// Route requires a user session (auth.getUser) and the service-role admin
// client for upserts; both are runtime-only. Opt out of static pre-render
// so Vercel's build phase does not invoke them with no env or request.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { data } = await sb.from("body_graphics_preferences").select("*").eq("user_id", user.id).maybeSingle();
  return NextResponse.json({ ok: true, preferences: (data as BodyGraphicPreferencesRow | null) ?? null });
}

export async function PATCH(request: Request) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
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
  const { error } = await admin
    .from("body_graphics_preferences")
    .upsert({ user_id: user.id, ...allowed, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
