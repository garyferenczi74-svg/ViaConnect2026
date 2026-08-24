import { redirect } from "next/navigation";
import { resolveSessionRole } from "@/lib/auth/resolve-session-role";
import {
  canAccessPortalPath,
  outOfRoleRedirect,
} from "@/lib/auth/session-role";
import { HelixChrome } from "./HelixChrome";

export default async function HelixLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await resolveSessionRole("app.helix.layout");
  const role = session?.role;
  if (!canAccessPortalPath(role, "/helix")) {
    redirect(outOfRoleRedirect(role, "/helix") ?? "/dashboard");
  }
  return <HelixChrome>{children}</HelixChrome>;
}
