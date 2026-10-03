import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveSessionRole } from "@/lib/auth/resolve-session-role";
import {
  canAccessPortalPath,
  outOfRoleRedirect,
} from "@/lib/auth/session-role";
import {
  isNaturopathCredentialPortalEnabled,
  portalPermitted,
  readNaturopathCredentialForUser,
  shouldLoadNaturopathCredentialForPortal,
  type PractitionerNaturopathCredential,
} from "@/lib/auth/naturopath-credential";
import { isTimeoutError, withTimeout } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

const NATUROPATH_HOME = "/naturopath/dashboard";

export default async function NaturopathPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await resolveSessionRole("app.naturopath.layout");
  const role = session?.role;
  const portalFlagEnabled = isNaturopathCredentialPortalEnabled();
  const alreadyPermitted = canAccessPortalPath(role, NATUROPATH_HOME);
  let credential: PractitionerNaturopathCredential | null = null;

  if (
    shouldLoadNaturopathCredentialForPortal({
      portalFlagEnabled,
      sessionRole: role,
      pathname: NATUROPATH_HOME,
      alreadyPermitted,
    })
  ) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        credential = await withTimeout(
          readNaturopathCredentialForUser(supabase, user.id),
          1500,
          "app.naturopath.layout.credential",
        );
      }
    } catch (error) {
      credential = null;
      if (isTimeoutError(error)) {
        safeLog.warn("app.naturopath.layout", "credential lookup timed out", { error });
      } else {
        safeLog.warn("app.naturopath.layout", "credential lookup failed", { error });
      }
    }
  }

  const allowed = portalPermitted({
    sessionRole: role,
    pathname: NATUROPATH_HOME,
    profileRole: session?.profileRole,
    credential,
    portalFlagEnabled,
  });
  if (!allowed) {
    redirect(outOfRoleRedirect(role, NATUROPATH_HOME) ?? "/practitioners");
  }
  return <>{children}</>;
}
