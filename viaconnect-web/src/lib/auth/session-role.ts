/**
 * Session role policy (Brief 11 / P0 chrome + route leak, Brief 37 tab strip).
 *
 * Authorization source of truth is profiles.role only.
 * Do not grant clinician/admin access from URL, user_metadata, or email.
 * Admin switcher is Personal Wellness + Admin + Hounddog — not clinician tabs.
 */

export type SessionRole = "consumer" | "practitioner" | "naturopath" | "admin";

export type PortalKey =
  | "consumer"
  | "practitioner"
  | "naturopath"
  | "admin"
  | "hounddog";

export type PortalTab = {
  key: PortalKey;
  label: string;
  href: string;
  color: string;
};

export const OUT_OF_ROLE_REDIRECT = "/practitioners";

export const PORTAL_TABS: readonly PortalTab[] = [
  {
    key: "consumer",
    label: "Personal Wellness",
    href: "/dashboard",
    color: "bg-teal/20 text-teal",
  },
  {
    key: "practitioner",
    label: "Practitioner",
    href: "/practitioner/dashboard",
    color: "bg-portal-green/20 text-portal-green",
  },
  {
    key: "naturopath",
    label: "Naturopath",
    href: "/naturopath/dashboard",
    color: "bg-sage/20 text-sage",
  },
  {
    key: "admin",
    label: "Admin",
    href: "/admin",
    color: "bg-copper/20 text-copper",
  },
  {
    key: "hounddog",
    label: "Hounddog",
    href: "/admin/hounddog",
    color: "bg-copper/20 text-[#B75E18]",
  },
] as const;

const PORTALS_BY_ROLE: Record<SessionRole, readonly PortalKey[]> = {
  consumer: ["consumer"],
  practitioner: ["practitioner"],
  naturopath: ["naturopath"],
  // Brief 37: admin must not preview Practitioner / Naturopath (clinician product).
  admin: ["consumer", "admin", "hounddog"],
};

const ROLE_CHIP_LABEL: Record<SessionRole, string> = {
  consumer: "Personal Wellness",
  practitioner: "Practitioner",
  naturopath: "Naturopath",
  admin: "Admin",
};

/**
 * Map profiles.role (and legacy patient) to a session role.
 * Unknown or missing values fail to consumer (least privilege).
 * user_metadata and email are intentionally not accepted here.
 */
export function roleFromProfilesColumn(
  raw: string | null | undefined,
): SessionRole {
  if (raw === "practitioner") return "practitioner";
  if (raw === "naturopath") return "naturopath";
  if (raw === "admin") return "admin";
  if (raw === "consumer" || raw === "patient") return "consumer";
  return "consumer";
}

export function portalsForRole(role: SessionRole): readonly PortalTab[] {
  const allowed = new Set(PORTALS_BY_ROLE[role]);
  return PORTAL_TABS.filter((tab) => allowed.has(tab.key));
}

export function roleChipLabel(role: SessionRole): string {
  return ROLE_CHIP_LABEL[role];
}

export function isAdminRole(role: SessionRole | undefined): boolean {
  return role === "admin";
}

/** True only when profiles.role was confirmed as admin (not metadata fallback). */
export function isConfirmedAdmin(profileRole: string | null | undefined): boolean {
  return profileRole === "admin";
}

export function isPractitionerPortalPath(pathname: string): boolean {
  return pathname === "/practitioner" || pathname.startsWith("/practitioner/");
}

export function isNaturopathPortalPath(pathname: string): boolean {
  return pathname === "/naturopath" || pathname.startsWith("/naturopath/");
}

export function isAdminPortalPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function isHounddogPath(pathname: string): boolean {
  return pathname === "/admin/hounddog" || pathname.startsWith("/admin/hounddog/");
}

export function isHelixPath(pathname: string): boolean {
  return pathname === "/helix" || pathname.startsWith("/helix/");
}

export function isClinicianOrAdminPath(pathname: string): boolean {
  return (
    isPractitionerPortalPath(pathname) ||
    isNaturopathPortalPath(pathname) ||
    isAdminPortalPath(pathname)
  );
}

/**
 * Logged-out /practitioner and /naturopath must not look like a live portal.
 * Same destination as Brief 7 / PR #31 (`/practitioners`). Do not build a
 * clinician product early and do not add waitlist marketing copy here.
 */
export function unauthenticatedClinicianPortalRedirect(
  pathname: string,
): typeof OUT_OF_ROLE_REDIRECT | null {
  if (isPractitionerPortalPath(pathname) || isNaturopathPortalPath(pathname)) {
    return OUT_OF_ROLE_REDIRECT;
  }
  return null;
}

export function isClinicianOrAdminApiPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/practitioner") ||
    pathname.startsWith("/api/naturopath") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/hounddog") ||
    pathname.startsWith("/api/marshall/hounddog")
  );
}

export function isHelixApiPath(pathname: string): boolean {
  return pathname === "/api/helix" || pathname.startsWith("/api/helix/");
}

const CONSUMER_ONLY_PREFIXES = [
  "/dashboard",
  "/genetics",
  "/supplements",
  "/tokens",
  "/profile",
  "/messages",
  "/ai",
  "/helix",
] as const;

/** Wellness routes that should light the Personal Wellness tab. */
const CONSUMER_PORTAL_PREFIXES = [
  "/dashboard",
  "/analytics",
  "/genetics",
  "/nutrition",
  "/supplements",
  "/tokens",
  "/messages",
  "/ai",
  "/helix",
  "/body-tracker",
  "/wearables",
  "/peptide-protocol",
  "/wellness",
  "/plugins",
  "/media-sources",
  "/science",
  "/shop",
] as const;

export function isConsumerOnlyPath(pathname: string): boolean {
  if (isHelixPath(pathname) || isHelixApiPath(pathname)) return true;
  return CONSUMER_ONLY_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isConsumerPortalPath(pathname: string): boolean {
  if (isHelixPath(pathname)) return true;
  return CONSUMER_PORTAL_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/**
 * Auth-timeout posture. Clinician/admin (and their APIs) deny.
 * Public and consumer surfaces may still pass through so a transient
 * Auth blip does not 307 the entire site to /login.
 */
export function failClosedOnAuthTimeout(pathname: string): boolean {
  return isClinicianOrAdminPath(pathname) || isClinicianOrAdminApiPath(pathname);
}

export type AuthTimeoutAction = "deny_api" | "deny_page" | "pass";

export function authTimeoutAction(pathname: string): AuthTimeoutAction {
  if (!failClosedOnAuthTimeout(pathname)) return "pass";
  if (pathname.startsWith("/api/")) return "deny_api";
  return "deny_page";
}

export function canAccessPortalPath(
  role: SessionRole | undefined,
  pathname: string,
): boolean {
  if (isHelixApiPath(pathname)) {
    return role === "consumer";
  }
  if (isHelixPath(pathname)) {
    return role === "consumer" || role === "admin";
  }
  if (isHounddogPath(pathname)) {
    return role === "admin";
  }
  if (isPractitionerPortalPath(pathname)) {
    return role === "practitioner" || role === "admin";
  }
  if (isNaturopathPortalPath(pathname)) {
    return role === "naturopath" || role === "admin";
  }
  if (isAdminPortalPath(pathname)) {
    return role === "admin";
  }
  if (isConsumerOnlyPath(pathname)) {
    return role === "consumer" || role === "admin";
  }
  return true;
}

/**
 * Where to send a session that is on a path their role cannot open.
 * Consumers hitting clinician/admin chrome go to the ViaCura waitlist.
 */
export function outOfRoleRedirect(
  role: SessionRole | undefined,
  pathname: string,
): string | null {
  if (canAccessPortalPath(role, pathname)) return null;
  if (isClinicianOrAdminPath(pathname)) {
    return role === "consumer" || role === undefined
      ? OUT_OF_ROLE_REDIRECT
      : roleHomePath(role);
  }
  return roleHomePath(role);
}

export function roleHomePath(role: SessionRole | undefined): string {
  switch (role) {
    case "practitioner":
      return "/practitioner/dashboard";
    case "naturopath":
      return "/naturopath/dashboard";
    case "admin":
      return "/admin";
    default:
      return "/dashboard";
  }
}

/**
 * Active portal chrome. URL may highlight a tab only when that tab is
 * in-role. Otherwise the session role wins (no URL-spoofed role chip).
 */
export function activePortalForSession(
  role: SessionRole,
  pathname: string,
): PortalKey {
  const allowed = new Set(PORTALS_BY_ROLE[role]);
  const fromUrl = portalKeyFromPath(pathname);
  if (fromUrl && allowed.has(fromUrl)) return fromUrl;
  if (role === "admin") return "admin";
  return role;
}

export function portalKeyFromPath(pathname: string): PortalKey | null {
  if (isHounddogPath(pathname)) return "hounddog";
  if (isPractitionerPortalPath(pathname)) return "practitioner";
  if (isNaturopathPortalPath(pathname)) return "naturopath";
  if (isAdminPortalPath(pathname)) return "admin";
  if (isConsumerPortalPath(pathname)) return "consumer";
  return null;
}

/**
 * Sidebar / mobile nav follow the portal the admin is actually in.
 * Session role stays admin for authorization; chrome does not stay
 * stuck on the Admin nav when Personal Wellness is open.
 */
export function shellRoleForActivePortal(
  role: SessionRole,
  active: PortalKey,
): SessionRole {
  if (role !== "admin") return role;
  if (active === "consumer") return "consumer";
  if (active === "practitioner") return "practitioner";
  if (active === "naturopath") return "naturopath";
  return "admin";
}

export function shellRoleForSession(
  role: SessionRole,
  pathname: string,
): SessionRole {
  return shellRoleForActivePortal(role, activePortalForSession(role, pathname));
}

export type ClinicianPatientRow = {
  id: string;
  displayName: string;
};

/**
 * Patient roster for clinician chrome. Consumer tokens always get [].
 * Never return a mock census (the old 42) as if live.
 */
export function clinicianPatientsForRole(
  role: SessionRole | undefined,
  livePatients: readonly ClinicianPatientRow[] = [],
): readonly ClinicianPatientRow[] {
  if (role !== "practitioner" && role !== "admin") {
    return [];
  }
  return livePatients;
}

/**
 * Naturopath health-partner roster. Consumer tokens always get [].
 * Never return a mock census (the old 28 / 92%) as if live.
 */
export function naturopathPartnersForRole(
  role: SessionRole | undefined,
  livePartners: readonly ClinicianPatientRow[] = [],
): readonly ClinicianPatientRow[] {
  if (role !== "naturopath" && role !== "admin") {
    return [];
  }
  return livePartners;
}

