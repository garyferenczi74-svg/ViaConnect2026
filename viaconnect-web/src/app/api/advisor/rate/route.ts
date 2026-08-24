/**
 * POST /api/advisor/rate
 * Prompt 219F: thumbs up/down feedback on an assistant conversation row.
 * Body: { conversationId: string, rating: 1 | 5 }
 */

import { createClient } from "@/lib/supabase/server";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { conversationId?: string; rating?: number; feedback?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const conversationId = (body.conversationId ?? "").trim();
  const rating = body.rating;
  if (!conversationId) {
    return Response.json({ error: "conversationId required" }, { status: 400 });
  }
  if (rating !== 1 && rating !== 5) {
    return Response.json({ error: "rating must be 1 (down) or 5 (up)" }, { status: 400 });
  }

  let userClient;
  try {
    userClient = await createClient();
  } catch (e) {
    safeLog.error("api.advisor.rate", "createClient failed", { error: e });
    return Response.json({ error: "Session unavailable" }, { status: 503 });
  }

  let user;
  try {
    const authResult = await withTimeout(userClient.auth.getUser(), 5000, "api.advisor.rate.auth");
    user = authResult.data.user;
  } catch (err) {
    if (isTimeoutError(err)) {
      return Response.json({ error: "Authentication check timed out." }, { status: 503 });
    }
    throw err;
  }
  if (!user) return Response.json({ error: "Unauthenticated" }, { status: 401 });

  // Verify ownership via RLS (select own conversations)
  const { data: conv, error: convErr } = await userClient
    .from("ultrathink_advisor_conversations")
    .select("id, message_role")
    .eq("id", conversationId)
    .maybeSingle();

  if (convErr || !conv) {
    return Response.json({ error: "Conversation message not found" }, { status: 404 });
  }
  if ((conv as { message_role?: string }).message_role !== "assistant") {
    return Response.json({ error: "Ratings apply to assistant messages only" }, { status: 400 });
  }

  const { data: inserted, error: insertErr } = await userClient
    .from("ultrathink_advisor_ratings")
    .insert({
      conversation_id: conversationId,
      user_id: user.id,
      rating,
      feedback: body.feedback ?? null,
    })
    .select("id")
    .single();

  if (insertErr) {
    safeLog.error("api.advisor.rate", "insert failed", {
      userId: user.id,
      code: insertErr.code,
    });
    return Response.json({ error: "Could not save feedback." }, { status: 500 });
  }

  safeLog.info("api.advisor.rate", "saved", {
    userId: user.id,
    rating,
    ratingId: (inserted as { id: string }).id,
  });

  return Response.json({ ok: true, id: (inserted as { id: string }).id });
}
