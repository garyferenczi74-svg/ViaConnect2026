import { redirect } from "next/navigation";
import { resolveSessionRole } from "@/lib/auth/resolve-session-role";
import {
  canAccessPortalPath,
  outOfRoleRedirect,
} from "@/lib/auth/session-role";

export default async function NaturopathPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await resolveSessionRole("app.naturopath.layout");
  const role = session?.role;
  if (!canAccessPortalPath(role, "/naturopath/dashboard")) {
    redirect(outOfRoleRedirect(role, "/naturopath/dashboard") ?? "/practitioners");
  }
  return <>{children}</>;
}
