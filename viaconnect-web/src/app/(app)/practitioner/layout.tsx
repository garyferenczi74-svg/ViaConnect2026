import { redirect } from "next/navigation";
import { resolveSessionRole } from "@/lib/auth/resolve-session-role";
import {
  canAccessPortalPath,
  outOfRoleRedirect,
} from "@/lib/auth/session-role";

export default async function PractitionerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await resolveSessionRole("app.practitioner.layout");
  const role = session?.role;
  if (!canAccessPortalPath(role, "/practitioner/dashboard")) {
    redirect(outOfRoleRedirect(role, "/practitioner/dashboard") ?? "/practitioners");
  }
  return <>{children}</>;
}
