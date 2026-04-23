// Prompt #118 — Interaction telemetry logger.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_MODES = new Set(["composition", "muscle"]);
const VALID_GENDERS = new Set(["male", "female"]);
const VALID_VIEWS = new Set(["front", "back"]);
const VALID_INTERACTIONS = new Set(["click", "hover", "focus", "long-press"]);

interface Body {
  region_id: string;
  mode: string;
  gender: string;
  view: string;
  interaction_type: string;
  session_id?: string;
}

export async function POST(request: Request) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  if (!body.region_id || typeof body.region_id !== "string") return NextResponse.json({ ok: false, error: "missing_region_id" }, { status: 400 });
  if (!VALID_MODES.has(body.mode)) return NextResponse.json({ ok: false, error: "invalid_mode" }, { status: 400 });
  if (!VALID_GENDERS.has(body.gender)) return NextResponse.json({ ok: false, error: "invalid_gender" }, { status: 400 });
  if (!VALID_VIEWS.has(body.view)) return NextResponse.json({ ok: false, error: "invalid_view" }, { status: 400 });
  if (!VALID_INTERACTIONS.has(body.interaction_type)) return NextResponse.json({ ok: false, error: "invalid_interaction_type" }, { status: 400 });

  const { error } = await sb.from("body_graphic_interactions").insert({
    user_id: user.id,
    region_id: body.region_id,
    mode: body.mode,
    gender: body.gender,
    view: body.view,
    interaction_type: body.interaction_type,
    session_id: body.session_id ?? null,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
