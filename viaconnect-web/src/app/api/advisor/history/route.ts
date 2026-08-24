/**
 * GET /api/advisor/history
 * Prompt 219F: load persisted advisor conversation for the signed-in user.
 * Returns last N turns (oldest first) with message ids for feedback wiring.
 */

import { createClient } from "@/lib/supabase/server";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ROLES = new Set(["consumer", "practitioner", "naturopath"]);
const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 80;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const role = url.searchParams.get("role") ?? "consumer";
  const limitRaw = Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : DEFAULT_LIMIT));

  if (!VALID_ROLES.has(role)) {
    return Response.json({ error: "role must be consumer|practitioner|naturopath" }, { status: 400 });
  }

  let userClient;
  try {
    userClient = await createClient();
  } catch (e) {
    safeLog.error("api.advisor.history", "createClient failed", { error: e });
    return Response.json({ error: "Session unavailable" }, { status: 503 });
  }

  let user;
  try {
    const authResult = await withTimeout(userClient.auth.getUser(), 5000, "api.advisor.history.auth");
    user = authResult.data.user;
  } catch (err) {
    if (isTimeoutError(err)) {
      return Response.json({ error: "Authentication check timed out." }, { status: 503 });
    }
    throw err;
  }
  if (!user) return Response.json({ error: "Unauthenticated" }, { status: 401 });

  const { data, error } = await userClient
    .from("ultrathink_advisor_conversations")
    .select("id, message_role, content, created_at")
    .eq("user_id", user.id)
    .eq("advisor_role", role)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    safeLog.error("api.advisor.history", "query failed", {
      userId: user.id,
      role,
      code: error.code,
    });
    return Response.json({ error: "Could not load conversation history." }, { status: 500 });
  }

  const rows = (data ?? []) as Array<{
    id: string;
    message_role: string;
    content: string;
    created_at: string;
  }>;

  // Return oldest first for chat UI
  const messages = rows.reverse().map((r) => ({
    id: r.id,
    role: r.message_role === "assistant" ? "assistant" : r.message_role === "user" ? "user" : "system",
    content: r.content,
    createdAt: r.created_at,
  }));

  safeLog.info("api.advisor.history", "loaded", {
    userId: user.id,
    role,
    count: messages.length,
  });

  return Response.json({ messages });
}
