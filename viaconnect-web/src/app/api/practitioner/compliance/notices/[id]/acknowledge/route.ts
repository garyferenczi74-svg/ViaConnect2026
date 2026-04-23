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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userClient = createServerClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = serviceClient() as any;
  const { data: prac } = await svc.from("practitioners").select("id").eq("user_id", user.id).maybeSingle();
  if (!prac?.id) return NextResponse.json({ error: "Practitioner profile required" }, { status: 403 });

  const { data: notice } = await svc.from("practitioner_notices").select("id, practitioner_id, status").eq("id", id).maybeSingle();
  if (!notice || notice.practitioner_id !== prac.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (notice.status !== "issued") {
    return NextResponse.redirect(new URL(`/practitioner/compliance/notices/${id}`, req.url), { status: 303 });
  }

  await svc.from("practitioner_notices").update({ status: "acknowledged", acknowledged_at: new Date().toISOString() }).eq("id", id);
  await svc.from("compliance_audit_log").insert({
    event_type: "notice.acknowledged",
    actor_type: "user",
    actor_id: user.id,
    payload: { noticeId: id },
  });

  return NextResponse.redirect(new URL(`/practitioner/compliance/notices/${id}`, req.url), { status: 303 });
}
