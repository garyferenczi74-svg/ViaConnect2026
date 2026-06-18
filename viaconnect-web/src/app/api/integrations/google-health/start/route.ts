// Prompt 201b: Google Health OAuth start. Builds the Google consent URL for the
// authenticated user and redirects. A short-lived state cookie guards the
// callback against CSRF. Server-side only; no tokens here.
//
// All comments use hyphens only. No em-dashes or en-dashes.

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { isFeatureEnabled } from "@/lib/config/feature-flags";
import { buildAuthorizeUrl, isConnectorConfigured } from "@/lib/integrations/google-health/auth";
import { isTokenEncryptionConfigured } from "@/lib/integrations/google-health/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCOPE = "api.integrations.google-health.start";
const CONNECTIONS = "/body-tracker/connections";

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const back = (q: string) => NextResponse.redirect(new URL(`${CONNECTIONS}?${q}`, req.url));

  if (!isFeatureEnabled("google_health_connector")) {
    return back("error=not_enabled");
  }
  if (!isConnectorConfigured()) {
    // Presence-only diagnostic (never the values) so a not_configured can be
    // pinpointed to the missing env var. tokenKeyValid false with hasTokenKey
    // true means the key is set but not 32 bytes.
    safeLog.warn(SCOPE, "connector not configured", {
      hasClientId: Boolean(process.env.GOOGLE_HEALTH_CLIENT_ID),
      hasClientSecret: Boolean(process.env.GOOGLE_HEALTH_CLIENT_SECRET),
      hasTokenKey: Boolean(process.env.GOOGLE_HEALTH_TOKEN_KEY),
      tokenKeyValid: isTokenEncryptionConfigured(),
    });
    return back("error=not_configured");
  }

  try {
    const supabase = createClient();
    let userId: string | null = null;
    try {
      const { data } = await withTimeout(supabase.auth.getUser(), 5000, `${SCOPE}.auth`);
      userId = data.user?.id ?? null;
    } catch (err) {
      if (isTimeoutError(err)) return back("error=auth_timeout");
      throw err;
    }
    if (!userId) return NextResponse.redirect(new URL("/login", req.url));

    const redirectUri = `${origin}/api/integrations/google-health/callback`;
    const state = randomUUID();
    const url = buildAuthorizeUrl(redirectUri, state);
    if (!url) return back("error=not_configured");

    const res = NextResponse.redirect(url);
    res.cookies.set("gh_oauth_state", state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    return res;
  } catch (err) {
    safeLog.error(SCOPE, "start failed", { error: err });
    return back("error=internal");
  }
}
