// POST /api/admin/jeffery/reject  (Prompt #60c)
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { rejectMessage } from "@/lib/jeffery/message-bus";

export async function POST(req: Request) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  let body: { messageId?: string; reason?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body.messageId || !body.reason) return NextResponse.json({ error: "messageId and reason required" }, { status: 400 });

  const result = await rejectMessage(body.messageId, user.id, body.reason);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
