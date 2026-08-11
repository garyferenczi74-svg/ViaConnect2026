// Prompt 212: GET /api/integrations/whoop/callback

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withTimeout } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { getWhoopRedirectUri, isWhoopConfigured } from "@/lib/wearables/whoop/config";
import { exchangeWhoopCode, whoopGet } from "@/lib/wearables/whoop/client";
import { storeWhoopTokens } from "@/lib/wearables/whoop/tokens";
import { enqueueWhoopBackfill } from "@/lib/wearables/whoop/backfill";
import { seedDefaultPrecedence } from "@/lib/wearables/precedence";
import { WHOOP_SCOPES } from "@/lib/wearables/whoop/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCOPE = "api.integrations.whoop.callback";
const BACK = "/body-tracker/connections";

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const back = (q: string) => NextResponse.redirect(new URL(`${BACK}?${q}`, origin));

  if (!isWhoopConfigured()) return back("wearable_error=whoop_not_configured");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    safeLog.warn(SCOPE, "oauth error param", { oauthError });
    return back("wearable_error=whoop_denied");
  }
  if (!code || !state || state.length < 8) {
    return back("wearable_error=whoop_invalid_state");
  }

  try {
    const admin = createAdminClient();
    const { data: st } = await withTimeout(
      (admin as any)
        .from("wearable_oauth_states")
        .select("user_id, expires_at")
        .eq("state", state)
        .maybeSingle(),
      4000,
      `${SCOPE}.loadState`,
    );

    if (!st?.user_id) return back("wearable_error=whoop_invalid_state");
    if (new Date(st.expires_at).getTime() < Date.now()) {
      return back("wearable_error=whoop_state_expired");
    }

    // One-time state
    await withTimeout(
      (admin as any).from("wearable_oauth_states").delete().eq("state", state),
      3000,
      `${SCOPE}.clearState`,
    );

    const redirectUri = getWhoopRedirectUri(origin);
    const tokens = await exchangeWhoopCode(code, redirectUri);
    await storeWhoopTokens(admin, st.user_id, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in ?? 3600,
      scope: tokens.scope ?? WHOOP_SCOPES.join(" "),
    });

    let externalUserId: string | null = null;
    try {
      const profile = await whoopGet<{ user_id?: number | string }>(
        "/user/profile/basic",
        tokens.access_token,
      );
      if (profile?.user_id != null) externalUserId = String(profile.user_id);
    } catch (err) {
      safeLog.warn(SCOPE, "profile fetch failed (non-blocking)", { error: err });
    }

    await withTimeout(
      (admin as any).from("connected_sources").upsert(
        {
          user_id: st.user_id,
          provider: "whoop",
          status: "connected",
          scopes: WHOOP_SCOPES as unknown as string[],
          external_user_id: externalUserId,
          connected_at: new Date().toISOString(),
          last_sync_at: null,
          error_detail: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" },
      ),
      4000,
      `${SCOPE}.upsertSource`,
    );

    await seedDefaultPrecedence(admin, st.user_id);

    // Fire-and-forget backfill (do not block redirect long)
    void enqueueWhoopBackfill(admin, st.user_id).catch((err) =>
      safeLog.warn(SCOPE, "backfill enqueue failed", { error: err }),
    );

    await withTimeout(
      (admin as any).from("wearable_audit_log").insert({
        user_id: st.user_id,
        action: "whoop_connected",
        provider: "whoop",
        detail: { external_user_id: externalUserId },
      }),
      3000,
      `${SCOPE}.audit`,
    );

    return back("wearable_success=whoop_connected");
  } catch (err) {
    safeLog.error(SCOPE, "callback failed", { error: err });
    return back("wearable_error=whoop_callback_failed");
  }
}
