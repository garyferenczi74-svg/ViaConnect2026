// POST /api/admin/jeffery/process-directive  (Prompt #60c)
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { processDirective } from "@/lib/jeffery/directive-processor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  let body: { directiveId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body.directiveId) return NextResponse.json({ error: "directiveId required" }, { status: 400 });

  const result = await processDirective(body.directiveId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
