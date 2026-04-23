import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { replaySignal } from "@/lib/hounddog/replay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing supabase env");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// Internal replay endpoint: compliance admin can re-evaluate a signal to see
// what rules would fire under the current rule set. No persistence.
export async function POST(req: Request) {
  const userClient = createServerClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { data: profile } = await userClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "superadmin", "compliance_officer", "compliance_admin"].includes(profile.role as string)) {
    return NextResponse.json({ error: "Compliance role required" }, { status: 403 });
  }

  let body: { signalId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body.signalId) return NextResponse.json({ error: "signalId required" }, { status: 400 });

  const result = await replaySignal(serviceClient(), body.signalId);
  if (!result) return NextResponse.json({ error: "Signal not found" }, { status: 404 });
  return NextResponse.json(result);
}
