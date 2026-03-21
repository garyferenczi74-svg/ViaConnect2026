import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Get user role to redirect to correct portal
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const role = user?.user_metadata?.role;
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
  }

  // Auth code error — redirect to error page
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
