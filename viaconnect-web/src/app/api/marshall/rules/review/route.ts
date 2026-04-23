import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing supabase env");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: Request) {
  const userClient = createServerClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { data: profile } = await userClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "superadmin", "compliance_officer", "compliance_admin"].includes(profile.role as string)) {
    return NextResponse.json({ error: "Compliance role required" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const ruleId = form?.get("ruleId");
  if (typeof ruleId !== "string") return NextResponse.json({ error: "ruleId required" }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);
  const svc = serviceClient();
  const { error } = await svc
    .from("compliance_rules")
    .update({ last_reviewed: today, reviewed_by: user.id })
    .eq("id", ruleId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await svc.from("compliance_audit_log").insert({
    event_type: "rule.reviewed",
    actor_type: "user",
    actor_id: user.id,
    payload: { ruleId, reviewedOn: today },
  });

  return NextResponse.redirect(new URL(`/admin/marshall/rules/${encodeURIComponent(ruleId)}`, req.url), { status: 303 });
}
