import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing supabase service env");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

const SLA_DAYS: Record<string, number> = {
  ccpa: 45, cpra: 45, gdpr: 30, quebec: 30,
  colorado: 45, connecticut: 45, virginia: 45, utah: 45, iowa: 45, texas: 45, other: 45,
};

export async function POST(req: Request) {
  let body: { email?: string; requestType?: string; jurisdiction?: string; notes?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const email = (body.email ?? "").trim();
  const requestType = body.requestType ?? "access";
  const jurisdiction = body.jurisdiction ?? "ccpa";
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "invalid email" }, { status: 400 });

  const userClient = createServerClient();
  const { data: { user } } = await userClient.auth.getUser();

  const slaDays = SLA_DAYS[jurisdiction] ?? 45;
  const slaDue = new Date(Date.now() + slaDays * 86_400_000).toISOString();

  const svc = serviceClient();
  const { error } = await svc.from("dsar_requests").insert({
    user_id: user?.id ?? null,
    email,
    request_type: requestType,
    jurisdiction,
    sla_due_at: slaDue,
    notes: body.notes ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await svc.from("compliance_audit_log").insert({
    event_type: "dsar.submitted",
    actor_type: "user",
    actor_id: user?.id ?? email,
    payload: { email, requestType, jurisdiction, slaDue },
  });

  return NextResponse.json({ ok: true, slaDue });
}
