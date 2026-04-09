// POST /api/admin/jeffery/process-comment-directive  (Prompt #60c)
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { processCommentDirective } from "@/lib/jeffery/directive-processor";

export async function POST(req: Request) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  let body: { messageId?: string; comment?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body.messageId || !body.comment) return NextResponse.json({ error: "messageId and comment required" }, { status: 400 });

  const result = await processCommentDirective(body.messageId, body.comment);
  return NextResponse.json(result);
}
