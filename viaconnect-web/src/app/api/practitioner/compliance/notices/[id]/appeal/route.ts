import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLAIM_TYPES = new Set(["dispute_attribution", "dispute_interpretation", "already_remediated", "other"]);

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing supabase env");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userClient = createServerClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  let body: { claimType?: string; rebuttal?: string; supportingLinks?: string[] };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const claimType = (body.claimType ?? "").toLowerCase();
  const rebuttal = (body.rebuttal ?? "").trim();
  if (!CLAIM_TYPES.has(claimType)) return NextResponse.json({ error: "Unknown claim type" }, { status: 400 });
  if (!rebuttal || rebuttal.length > 2000) return NextResponse.json({ error: "Invalid rebuttal" }, { status: 400 });
  const supportingLinks = (body.supportingLinks ?? []).filter((s) => typeof s === "string" && s.length <= 2000).slice(0, 10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = serviceClient() as any;
  const { data: prac } = await svc.from("practitioners").select("id").eq("user_id", user.id).maybeSingle();
  if (!prac?.id) return NextResponse.json({ error: "Practitioner profile required" }, { status: 403 });

  const { data: notice } = await svc.from("practitioner_notices").select("id, practitioner_id").eq("id", id).maybeSingle();
  if (!notice || notice.practitioner_id !== prac.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await svc.from("practitioner_notice_appeals").insert({
    notice_id: id,
    rebuttal,
    supporting_links: supportingLinks,
    claim_type: claimType,
    submitted_by: user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Pause the clock: move status to appealed.
  await svc.from("practitioner_notices").update({ status: "appealed" }).eq("id", id);

  await svc.from("compliance_audit_log").insert({
    event_type: "notice.appealed",
    actor_type: "user",
    actor_id: user.id,
    payload: { noticeId: id, claimType },
  });

  return NextResponse.json({ ok: true });
}
