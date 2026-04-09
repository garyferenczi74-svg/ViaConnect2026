// =============================================================================
// POST /api/advisor/peptide-share  (Prompt #60d — Section 3A)
// =============================================================================
// Consumer-only endpoint. The Wellness Assistant detected a peptide in
// Jeffery's response and the user clicked "Share with Practitioner". This
// route routes the peptide recommendation to the user's connected provider
// (via protocol_shares), inserts an advisor_peptide_shares row, and fires a
// user_notifications row so the provider sees it in their bell.
//
// Request body:  { peptideName: string; advisorResponse: string }
// Server resolves: originalQuestion (from the user's most recent message
//                  in ultrathink_advisor_conversations).
// =============================================================================

import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { sharePeptideWithPractitioner } from "@/lib/jeffery/peptide-share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // ── auth ──────────────────────────────────────────────────────────────
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // ── parse + validate ──────────────────────────────────────────────────
  let body: { peptideName?: string; advisorResponse?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.peptideName || !body.advisorResponse) {
    return NextResponse.json({ error: "peptideName and advisorResponse required" }, { status: 400 });
  }

  // ── Look up the user's most recent question (for the consumer portal) ──
  // The advisorResponse is the assistant turn; the question is the user
  // message immediately before it. We pull the most recent user turn for this
  // user on the consumer advisor.
  const { data: lastUserTurn } = await supabase
    .from("ultrathink_advisor_conversations")
    .select("content, created_at")
    .eq("user_id", user.id)
    .eq("advisor_role", "consumer")
    .eq("message_role", "user")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const originalQuestion = (lastUserTurn?.content as string | undefined)
    ?? `[Question about ${body.peptideName}]`;

  // ── Route through the share helper ────────────────────────────────────
  try {
    const result = await sharePeptideWithPractitioner({
      patientId: user.id,
      peptideName: body.peptideName,
      originalQuestion,
      advisorResponse: body.advisorResponse,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}
