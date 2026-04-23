import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS = new Set(["confirm", "dismiss", "escalate"]);

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing supabase env");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string; action: string }> }) {
  const { id, action } = await params;
  if (!ACTIONS.has(action)) return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  const userClient = createServerClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { data: profile } = await userClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "superadmin", "compliance_officer", "compliance_admin"].includes(profile.role as string)) {
    return NextResponse.json({ error: "Compliance role required" }, { status: 403 });
  }

  const nextStatus =
    action === "confirm" ? "confirmed" : action === "dismiss" ? "dismissed" : "escalated";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = serviceClient() as any;
  await svc
    .from("social_review_queue")
    .update({ status: nextStatus, assigned_to: user.id })
    .eq("id", id);
  await svc.from("compliance_audit_log").insert({
    event_type: `review.${action}`,
    actor_type: "user",
    actor_id: user.id,
    payload: { reviewId: id },
  });

  return NextResponse.redirect(new URL(`/admin/marshall/hounddog/review/${id}`, req.url), { status: 303 });
}
