// Prompt 212: POST /api/integrations/whoop/disconnect

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { getWhoopAccessToken, deleteWhoopTokens } from "@/lib/wearables/whoop/tokens";
import { revokeWhoopAccess } from "@/lib/wearables/whoop/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCOPE = "api.integrations.whoop.disconnect";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    let userId: string | null = null;
    try {
      const { data } = await withTimeout(supabase.auth.getUser(), 5000, `${SCOPE}.auth`);
      userId = data.user?.id ?? null;
    } catch (err) {
      if (isTimeoutError(err)) {
        return NextResponse.json({ error: "auth_timeout" }, { status: 503 });
      }
      throw err;
    }
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    let body: { deleteData?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const admin = createAdminClient();
    const access = await getWhoopAccessToken(admin, userId);
    if (access) {
      await revokeWhoopAccess(access); // fail-open inside
    }
    await deleteWhoopTokens(admin, userId);

    await withTimeout(
      (admin as any)
        .from("connected_sources")
        .update({
          status: "revoked",
          updated_at: new Date().toISOString(),
          error_detail: null,
        })
        .eq("user_id", userId)
        .eq("provider", "whoop"),
      4000,
      `${SCOPE}.revokeStatus`,
    );

    if (body.deleteData) {
      const tables = [
        "wearable_sleep_sessions",
        "wearable_recovery",
        "wearable_workouts",
        "wearable_daily_vitals",
        "wearable_body_composition",
        "wearable_events",
      ];
      for (const t of tables) {
        try {
          await withTimeout(
            (admin as any)
              .from(t)
              .delete()
              .eq("user_id", userId)
              .eq(t === "wearable_events" ? "provider" : "source_provider", "whoop"),
            5000,
            `${SCOPE}.delete.${t}`,
          );
        } catch (err) {
          // wearable_events uses provider column; body table may lack source for some rows
          if (t === "wearable_events") {
            await withTimeout(
              (admin as any).from(t).delete().eq("user_id", userId).eq("provider", "whoop"),
              5000,
              `${SCOPE}.delete.events`,
            ).catch(() => undefined);
          }
          safeLog.warn(SCOPE, "delete table failed", { table: t, error: err });
        }
      }
    }

    await withTimeout(
      (admin as any).from("wearable_audit_log").insert({
        user_id: userId,
        action: body.deleteData ? "whoop_disconnect_delete" : "whoop_disconnect",
        provider: "whoop",
        detail: { deleteData: Boolean(body.deleteData) },
      }),
      3000,
      `${SCOPE}.audit`,
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    safeLog.error(SCOPE, "disconnect failed", { error: err });
    return NextResponse.json({ error: "disconnect_failed" }, { status: 500 });
  }
}
