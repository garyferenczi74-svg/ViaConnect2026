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
import { tokenKeyDiagnostics } from "@/lib/integrations/google-health/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCOPE = "api.integrations.google-health.start";
const DEFAULT_RETURN = "/body-tracker/connections";

function safeReturnTo(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return DEFAULT_RETURN;
  // Allow plugins and connections surfaces only (open redirect guard).
  if (raw.startsWith("/plugins") || raw.startsWith("/body-tracker/connections")) return raw;
  return DEFAULT_RETURN;
}

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const returnTo = safeReturnTo(new URL(req.url).searchParams.get("return_to"));
  const back = (q: string) => NextResponse.redirect(new URL(`${returnTo}?${q}`, req.url));

  if (!isFeatureEnabled("google_health_connector")) {
    return back("error=not_enabled");
  }
  if (!isConnectorConfigured()) {
    // Presence-only diagnostic (never the values) so a not_configured can be
    // pinpointed. tokenKey lengths (not the value) are also echoed in the
    // redirect query so they are readable from the browser URL during setup.
    const tk = tokenKeyDiagnostics();
    safeLog.warn(SCOPE, "connector not configured", {
      hasClientId: Boolean(process.env.GOOGLE_HEALTH_CLIENT_ID),
      hasClientSecret: Boolean(process.env.GOOGLE_HEALTH_CLIENT_SECRET),
      tokenKey: tk,
    });
    const hasId = Boolean(process.env.GOOGLE_HEALTH_CLIENT_ID);
    const hasSecret = Boolean(process.env.GOOGLE_HEALTH_CLIENT_SECRET);
    return back(
      `error=not_configured&id=${hasId ? 1 : 0}&secret=${hasSecret ? 1 : 0}&tkRawLen=${tk.rawLen}&tkDecLen=${tk.decodedLen}`,
    );
  }

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
    // Prompt 218: remember return surface (plugins vs connections).
    res.cookies.set("gh_oauth_return", returnTo, {
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
