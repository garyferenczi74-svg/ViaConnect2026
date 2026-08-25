import { createClient } from "@/lib/supabase/server";
import { resolveSessionRoleForUser } from "@/lib/auth/resolve-session-role";
import { PortalShellRouter } from "@/components/practitioner/PortalShellRouter";
import { AppNotFoundView } from "@/components/not-found/AppNotFoundView";
import { MarketingNotFoundView } from "@/components/not-found/MarketingNotFoundView";
import { safeLog } from "@/lib/utils/safe-log";

export const dynamic = "force-dynamic";

/**
 * Root 404. Unmatched URLs skip route-group layouts, so signed-in visitors
 * would otherwise get a chrome-less page. Re-mount PortalShellRouter here
 * (same shell (app)/layout uses). Unsigned visitors get marketing chrome
 * with the ViaConnect logo, never a blank unbranded page.
 */
export default async function NotFound() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const session = await resolveSessionRoleForUser(
        supabase,
        user,
        "app.not-found",
      );
      return (
        <PortalShellRouter
          user={user}
          role={session.role}
          practitionerProfile={null}
          showNaturopathTab={false}
        >
          <AppNotFoundView />
        </PortalShellRouter>
      );
    }
  } catch (error) {
    safeLog.warn("app.not-found", "session lookup failed, using marketing chrome", {
      error,
    });
  }

  return <MarketingNotFoundView />;
}
