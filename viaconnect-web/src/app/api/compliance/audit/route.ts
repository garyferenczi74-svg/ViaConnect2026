// Prompt #113 — Regulatory audit log search endpoint (admin only).

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  if (!role || !["admin", "compliance_admin"].includes(role)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const actorId = url.searchParams.get("actor_id");
  const targetType = url.searchParams.get("target_type");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);

  let q = sb.from("regulatory_audit_log").select("*").order("created_at", { ascending: false }).limit(limit);
  if (action)     q = q.eq("action", action);
  if (actorId)    q = q.eq("actor_id", actorId);
  if (targetType) q = q.eq("target_type", targetType);

  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, rows: data ?? [] });
}
