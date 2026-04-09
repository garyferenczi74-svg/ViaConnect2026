// POST /api/admin/jeffery/verify-knowledge  (Prompt #60c)
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  let body: { entryId?: string; notes?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body.entryId) return NextResponse.json({ error: "entryId required" }, { status: 400 });

  const { error } = await supabase
    .from("jeffery_knowledge_entries")
    .update({
      admin_verified: true,
      admin_notes: body.notes ?? null,
    })
    .eq("id", body.entryId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
