// Prompt #118 — Region registry read. Filters by mode + view if provided.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode"); // composition | muscle | null
  const view = url.searchParams.get("view"); // front | back | null

  let q = sb.from("body_regions")
    .select("region_id, display_name, display_name_fr, region_type, anatomical_group, applicable_views, display_order, is_bilateral")
    .order("display_order", { ascending: true });
  if (mode === "composition" || mode === "muscle") q = q.eq("region_type", mode);
  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const rows = (data ?? []) as Array<{ applicable_views: string[] } & Record<string, unknown>>;
  const filtered = view === "front" || view === "back"
    ? rows.filter((r) => r.applicable_views.includes(view))
    : rows;
  return NextResponse.json({ ok: true, regions: filtered });
}
