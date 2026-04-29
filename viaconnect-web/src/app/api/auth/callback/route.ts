import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=missing_code&message=${encodeURIComponent("No authorization code provided")}`
    );
  }

  const supabase = createClient();

  try {
    const { error } = await withTimeout(
      supabase.auth.exchangeCodeForSession(code),
      8000,
      "api.auth.callback.exchange"
    );

    if (error) {
      safeLog.warn("api.auth.callback", "exchange failed", { error });
      return NextResponse.redirect(
        `${origin}/login?error=auth_callback_failed&message=${encodeURIComponent(error.message)}`
      );
    }
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error("api.auth.callback", "exchange timeout", { error: err });
      return NextResponse.redirect(
        `${origin}/login?error=auth_timeout&message=${encodeURIComponent("Authentication took too long. Please try again.")}`
      );
    }
    safeLog.error("api.auth.callback", "exchange unexpected error", { error: err });
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_failed&message=${encodeURIComponent("Authentication failed. Please try again.")}`
    );
  }

  let user;
  try {
    const result = await withTimeout(
      supabase.auth.getUser(),
      5000,
      "api.auth.callback.getUser"
    );
    user = result.data.user;
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error("api.auth.callback", "getUser timeout", { error: err });
      return NextResponse.redirect(
        `${origin}/login?error=auth_timeout&message=${encodeURIComponent("Authentication check timed out. Please try again.")}`
      );
    }
    safeLog.error("api.auth.callback", "getUser unexpected error", { error: err });
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_failed&message=${encodeURIComponent("Authentication failed. Please try again.")}`
    );
  }

  if (!user) {
    return NextResponse.redirect(
      `${origin}/login?error=no_user&message=${encodeURIComponent("Could not retrieve user after authentication")}`
    );
  }

  try {
    await withTimeout(
      // @ts-expect-error -- audit_logs table not in generated Database type
      (async () => supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "oauth_login",
        resource_type: "auth",
        metadata: {
          provider: user.app_metadata?.provider ?? "unknown",
        },
        ip_address:
          request.headers.get("x-forwarded-for")?.split(",")[0] ?? null,
      }))(),
      5000,
      "api.auth.callback.audit-log"
    );
  } catch (auditError) {
    safeLog.warn("api.auth.callback", "audit log failed (non-blocking)", { error: auditError });
  }

  // Role-based redirect
  const role = user.user_metadata?.role;
  let redirectPath = next;

  if (next === "/dashboard") {
    switch (role) {
      case "practitioner":
        redirectPath = "/practitioner/dashboard";
        break;
      case "naturopath":
        redirectPath = "/naturopath/dashboard";
        break;
      default:
        redirectPath = "/dashboard";
    }
  }

  return NextResponse.redirect(`${origin}${redirectPath}`);
}
