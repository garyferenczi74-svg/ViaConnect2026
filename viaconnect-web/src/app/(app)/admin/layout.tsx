/**
 * Prompt 219I: admin layout shell. Children render inside; route error.tsx is
 * last resort. Per-page panels use AdminPanelErrorBoundary for isolation.
 *
 * Brief 11: profiles.role must be admin. Consumer tokens redirect to the
 * ViaCura waitlist rather than seeing admin chrome.
 */

import { redirect } from "next/navigation";
import { resolveSessionRole } from "@/lib/auth/resolve-session-role";
import {
  canAccessPortalPath,
  outOfRoleRedirect,
} from "@/lib/auth/session-role";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await resolveSessionRole("app.admin.layout");
  const role = session?.role;
  if (!canAccessPortalPath(role, "/admin")) {
    redirect(outOfRoleRedirect(role, "/admin") ?? "/practitioners");
  }
  return <div className="min-h-screen bg-[#1A2744]">{children}</div>;
}
