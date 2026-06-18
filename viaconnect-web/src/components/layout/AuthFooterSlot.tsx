"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/layout/SiteFooter";

// The footer appears on the login and signup pages only, not on
// forgot-password or onboarding. It is rendered from the auth layout so it can
// pin to the bottom of the flex column instead of stacking under the centered
// card, while staying scoped to just those two routes.
export function AuthFooterSlot() {
  const pathname = usePathname();
  if (pathname !== "/login" && pathname !== "/signup") return null;
  return <SiteFooter />;
}
