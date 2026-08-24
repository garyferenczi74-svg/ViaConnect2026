// Prompt 201b: Google Health OAuth callback. Verifies the state cookie, exchanges
// the code for tokens, stores them encrypted, and marks the connection.
// Tokens never reach the client. Fails to a redirect with an error code, never a
// thrown 500 into the user's face.
//
// All comments use hyphens only. No em-dashes or en-dashes.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { GOOGLE_HEALTH_SOURCE_ID } from "@/lib/integrations/google-health/config";
import { exchangeCode, storeConnection, isConnectorConfigured } from "@/lib/integrations/google-health/auth";
import { fetchIdentity } from "@/lib/integrations/google-health/client";
import { compileViaChain } from "@/lib/hannah/compilation/chainEntry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCOPE = "api.integrations.google-health.callback";
const DEFAULT_RETURN = "/body-tracker/connections";

function safeReturnTo(raw: string | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return DEFAULT_RETURN;
  if (raw.startsWith("/plugins") || raw.startsWith("/body-tracker/connections")) return raw;
  return DEFAULT_RETURN;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const returnTo = safeReturnTo(req.cookies.get("gh_oauth_return")?.value);
  const back = (q: string) => {
    const res = NextResponse.redirect(new URL(`${returnTo}?${q}`, req.url));
    res.cookies.delete("gh_oauth_state");
    res.cookies.delete("gh_oauth_return");
    return res;
  };

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const cookieState = req.cookies.get("gh_oauth_state")?.value;

  if (oauthError) return back(`error=${encodeURIComponent(oauthError)}`);
  if (!code) return back("error=no_code");
  if (!state || !cookieState || state !== cookieState) return back("error=bad_state");
  if (!isConnectorConfigured()) return back("error=not_configured");

  try {
    const supabase = await createClient();
    let userId: string | null = null;
    try {
      const { data } = await withTimeout(supabase.auth.getUser(), 5000, `${SCOPE}.auth`);
      userId = data.user?.id ?? null;
    } catch (err) {
      if (isTimeoutError(err)) return back("error=auth_timeout");
      throw err;
    }
    if (!userId) return NextResponse.redirect(new URL("/login", req.url));

    const redirectUri = `${url.origin}/api/integrations/google-health/callback`;

    let tokens;
    try {
      tokens = await exchangeCode(code, redirectUri);
    } catch (err) {
      safeLog.error(SCOPE, "code exchange failed", { error: err, userId });
      return back("error=token_failed");
    }

    // Resolve the Google Health identity (healthUserId) for webhook routing.
    // Fail-open: a null identity still connects; webhooks fall back to polling.
    const identity = await fetchIdentity(tokens.accessToken);

    // storeConnection upserts body_tracker_connections (status connected, tokens
    // encrypted in metadata, identity for routing), so the Connected Sources
    // surface reflects it.
    try {
      await storeConnection(supabase, userId, tokens, identity);
    } catch (err) {
      safeLog.error(SCOPE, "store connection failed", { error: err, userId });
      return back("error=db_error");
    }

    // Prompt 218 / 213a: off-cycle recompile so Hannah digests pick up the new source same day.
    void compileViaChain({ userId, reason: "event_manual" }).catch((e) => {
      safeLog.warn(SCOPE, "post-connect recompile failed open", {
        error: e instanceof Error ? e.message : String(e),
      });
    });
    // Prompt 219H: continuous ops event bus
    void import("@/lib/jeffery/ops/eventBus")
      .then(({ emitPlatformEvent }) =>
        emitPlatformEvent({
          eventType: "health_connected",
          userId,
          payload: { source: "google_health" },
          coalesceKey: `health_connected:${userId}`,
        }),
      )
      .catch((e) => {
        safeLog.warn(SCOPE, "platform event failed open", {
          error: e instanceof Error ? e.message : String(e),
        });
      });

    safeLog.info(SCOPE, "connected", { userId: userId.slice(0, 8) });
    return back(`connected=${GOOGLE_HEALTH_SOURCE_ID}`);
  } catch (err) {
    safeLog.error(SCOPE, "unexpected error", { error: err });
    return back("error=internal");
  }
}
