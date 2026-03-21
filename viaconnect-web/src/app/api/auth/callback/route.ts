import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_failed&message=${encodeURIComponent(error.message)}`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      `${origin}/login?error=no_user&message=${encodeURIComponent("Could not retrieve user after authentication")}`
    );
  }

  // Audit log the successful login
  try {
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "oauth_login",
      resource_type: "auth",
      metadata: {
        provider: user.app_metadata?.provider ?? "unknown",
      },
      ip_address:
        request.headers.get("x-forwarded-for")?.split(",")[0] ?? null,
    });
  } catch {
    // Non-blocking audit log
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
