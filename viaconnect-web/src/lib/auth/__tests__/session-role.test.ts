import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  activePortalForSession,
  authTimeoutAction,
  canAccessPortalPath,
  clinicianPatientsForRole,
  naturopathPartnersForRole,
  failClosedOnAuthTimeout,
  unauthenticatedClinicianPortalRedirect,
  isClinicianOrAdminPath,
  isConsumerPortalPath,
  isHelixPath,
  isPractitionerPortalPath,
  outOfRoleRedirect,
  portalsForRole,
  roleChipLabel,
  roleFromProfilesColumn,
  roleHomePath,
  shellRoleForActivePortal,
  shellRoleForSession,
  OUT_OF_ROLE_REDIRECT,
} from "@/lib/auth/session-role";

const REPO = path.resolve(__dirname, "../../../..");

describe("roleFromProfilesColumn", () => {
  it("maps profiles.role values and never elevates from unknown/email-like input", () => {
    expect(roleFromProfilesColumn("consumer")).toBe("consumer");
    expect(roleFromProfilesColumn("patient")).toBe("consumer");
    expect(roleFromProfilesColumn("practitioner")).toBe("practitioner");
    expect(roleFromProfilesColumn("naturopath")).toBe("naturopath");
    expect(roleFromProfilesColumn("admin")).toBe("admin");
    expect(roleFromProfilesColumn(undefined)).toBe("consumer");
    expect(roleFromProfilesColumn(null)).toBe("consumer");
    expect(roleFromProfilesColumn("gary@farmceuticawellness.com")).toBe("consumer");
    expect(roleFromProfilesColumn("superuser")).toBe("consumer");
  });
});

describe("portalsForRole / role strip", () => {
  it("consumer sees only Personal Wellness", () => {
    const keys = portalsForRole("consumer").map((p) => p.key);
    expect(keys).toEqual(["consumer"]);
    expect(keys).not.toContain("practitioner");
    expect(keys).not.toContain("naturopath");
    expect(keys).not.toContain("admin");
    expect(keys).not.toContain("hounddog");
  });

  it("unset / unknown profiles.role maps to the consumer strip", () => {
    expect(portalsForRole(roleFromProfilesColumn(undefined)).map((p) => p.key)).toEqual(
      ["consumer"],
    );
    expect(portalsForRole(roleFromProfilesColumn(null)).map((p) => p.key)).toEqual(
      ["consumer"],
    );
    expect(portalsForRole(roleFromProfilesColumn("")).map((p) => p.key)).toEqual(
      ["consumer"],
    );
  });

  it("practitioner sees only the practitioner tab", () => {
    expect(portalsForRole("practitioner").map((p) => p.key)).toEqual([
      "practitioner",
    ]);
  });

  it("naturopath sees only the naturopath tab", () => {
    expect(portalsForRole("naturopath").map((p) => p.key)).toEqual(["naturopath"]);
  });

  it("admin sees Personal Wellness + Admin + Hounddog, not clinician tabs", () => {
    expect(portalsForRole("admin").map((p) => p.key)).toEqual([
      "consumer",
      "admin",
      "hounddog",
    ]);
  });

  it("role chip matches session role", () => {
    expect(roleChipLabel("consumer")).toBe("Personal Wellness");
    expect(roleChipLabel("practitioner")).toBe("Practitioner");
    expect(roleChipLabel("naturopath")).toBe("Naturopath");
    expect(roleChipLabel("admin")).toBe("Admin");
  });
});

describe("path access", () => {
  it("does not treat the ViaCura waitlist as a clinician portal", () => {
    expect(isPractitionerPortalPath("/practitioners")).toBe(false);
    expect(isPractitionerPortalPath("/practitioners/invited")).toBe(false);
    expect(isPractitionerPortalPath("/practitioner")).toBe(true);
    expect(isPractitionerPortalPath("/practitioner/dashboard")).toBe(true);
    expect(isClinicianOrAdminPath("/practitioners")).toBe(false);
  });

  it("denies consumer on clinician, admin, hounddog, and helix stays consumer-only", () => {
    expect(canAccessPortalPath("consumer", "/practitioner/dashboard")).toBe(false);
    expect(canAccessPortalPath("consumer", "/naturopath/dashboard")).toBe(false);
    expect(canAccessPortalPath("consumer", "/admin")).toBe(false);
    expect(canAccessPortalPath("consumer", "/admin/hounddog")).toBe(false);
    expect(canAccessPortalPath("consumer", "/helix")).toBe(true);
    expect(canAccessPortalPath("consumer", "/helix/earn")).toBe(true);
    expect(canAccessPortalPath("practitioner", "/helix")).toBe(false);
    expect(canAccessPortalPath("naturopath", "/helix")).toBe(false);
    expect(canAccessPortalPath("admin", "/helix")).toBe(true);
    expect(canAccessPortalPath("admin", "/api/helix/redeem")).toBe(false);
    expect(canAccessPortalPath("admin", "/admin/hounddog")).toBe(true);
    expect(canAccessPortalPath("practitioner", "/admin/hounddog")).toBe(false);
    expect(canAccessPortalPath("practitioner", "/dashboard")).toBe(false);
    expect(canAccessPortalPath("admin", "/dashboard")).toBe(true);
  });

  it("redirects consumer clinician/admin hits to /practitioners waitlist", () => {
    expect(outOfRoleRedirect("consumer", "/practitioner/dashboard")).toBe(
      OUT_OF_ROLE_REDIRECT,
    );
    expect(outOfRoleRedirect("consumer", "/naturopath/dashboard")).toBe(
      OUT_OF_ROLE_REDIRECT,
    );
    expect(outOfRoleRedirect("consumer", "/admin")).toBe(OUT_OF_ROLE_REDIRECT);
    expect(outOfRoleRedirect("consumer", "/admin/hounddog")).toBe(
      OUT_OF_ROLE_REDIRECT,
    );
    expect(outOfRoleRedirect("consumer", "/dashboard")).toBeNull();
    expect(outOfRoleRedirect("practitioner", "/helix")).toBe(
      roleHomePath("practitioner"),
    );
    expect(outOfRoleRedirect("admin", "/helix")).toBeNull();
  });

  it("active tab follows session-allowed portals, not a spoofed URL", () => {
    expect(activePortalForSession("consumer", "/practitioner/dashboard")).toBe(
      "consumer",
    );
    expect(activePortalForSession("consumer", "/admin")).toBe("consumer");
    expect(activePortalForSession("admin", "/practitioner/dashboard")).toBe(
      "admin",
    );
    expect(activePortalForSession("admin", "/naturopath/dashboard")).toBe(
      "admin",
    );
    expect(activePortalForSession("practitioner", "/dashboard")).toBe(
      "practitioner",
    );
  });
});

describe("admin portal chrome follows the selected portal", () => {
  it("treats wellness routes as Personal Wellness, not only /dashboard", () => {
    expect(isConsumerPortalPath("/dashboard")).toBe(true);
    expect(isConsumerPortalPath("/nutrition")).toBe(true);
    expect(isConsumerPortalPath("/genetics/upload")).toBe(true);
    expect(isConsumerPortalPath("/shop/peptides")).toBe(true);
    expect(isConsumerPortalPath("/admin")).toBe(false);
    expect(isConsumerPortalPath("/practitioner/dashboard")).toBe(false);
  });

  it("admin on wellness routes keeps Personal Wellness chrome", () => {
    expect(activePortalForSession("admin", "/dashboard")).toBe("consumer");
    expect(activePortalForSession("admin", "/nutrition")).toBe("consumer");
    expect(activePortalForSession("admin", "/genetics")).toBe("consumer");
    expect(shellRoleForSession("admin", "/dashboard")).toBe("consumer");
    expect(shellRoleForSession("admin", "/nutrition")).toBe("consumer");
    expect(shellRoleForSession("admin", "/admin")).toBe("admin");
    expect(shellRoleForSession("admin", "/admin/hounddog")).toBe("admin");
    expect(shellRoleForSession("admin", "/practitioner/dashboard")).toBe(
      "admin",
    );
    expect(shellRoleForSession("admin", "/naturopath/dashboard")).toBe("admin");
  });

  it("admin portal list has a single Admin tab", () => {
    const labels = portalsForRole("admin").map((p) => p.label);
    expect(labels.filter((label) => label === "Admin")).toHaveLength(1);
    expect(labels[0]).toBe("Personal Wellness");
  });

  it("sidebar role follows the active portal, not the session chip", () => {
    expect(shellRoleForActivePortal("admin", "consumer")).toBe("consumer");
    expect(shellRoleForActivePortal("admin", "admin")).toBe("admin");
    expect(shellRoleForActivePortal("admin", "hounddog")).toBe("admin");
    expect(shellRoleForActivePortal("consumer", "consumer")).toBe("consumer");
  });
});

describe("middleware fail-closed on auth timeout", () => {
  it("denies clinician and admin page + API routes", () => {
    expect(failClosedOnAuthTimeout("/practitioner/dashboard")).toBe(true);
    expect(failClosedOnAuthTimeout("/practitioner")).toBe(true);
    expect(failClosedOnAuthTimeout("/naturopath/patients")).toBe(true);
    expect(failClosedOnAuthTimeout("/admin")).toBe(true);
    expect(failClosedOnAuthTimeout("/admin/hounddog")).toBe(true);
    expect(failClosedOnAuthTimeout("/api/practitioner/invite-patient")).toBe(true);
    expect(failClosedOnAuthTimeout("/api/admin/jeffery/ops")).toBe(true);
    expect(failClosedOnAuthTimeout("/api/hounddog/evaluate")).toBe(true);
  });

  it("does not fail-closed the public waitlist or consumer home", () => {
    expect(failClosedOnAuthTimeout("/practitioners")).toBe(false);
    expect(failClosedOnAuthTimeout("/dashboard")).toBe(false);
    expect(failClosedOnAuthTimeout("/login")).toBe(false);
    expect(failClosedOnAuthTimeout("/helix")).toBe(false);
  });

  it("maps timeout to deny_page / deny_api / pass", () => {
    expect(authTimeoutAction("/practitioner/dashboard")).toBe("deny_page");
    expect(authTimeoutAction("/api/admin/jeffery/ops")).toBe("deny_api");
    expect(authTimeoutAction("/dashboard")).toBe("pass");
  });
});

describe("clinician patient roster", () => {
  const mock42 = Array.from({ length: 42 }, (_, i) => ({
    id: String(i),
    displayName: `Mock ${i}`,
  }));

  it("consumer token never receives patients, even if a mock list is offered", () => {
    expect(clinicianPatientsForRole("consumer", mock42)).toEqual([]);
    expect(clinicianPatientsForRole("naturopath", mock42)).toEqual([]);
    expect(clinicianPatientsForRole(undefined, mock42)).toEqual([]);
  });

  it("practitioner/admin may receive only the live list, never an implied 42", () => {
    expect(clinicianPatientsForRole("practitioner", [])).toEqual([]);
    expect(clinicianPatientsForRole("admin", mock42)).toHaveLength(42);
  });
});

describe("naturopath partner roster", () => {
  const mock28 = Array.from({ length: 28 }, (_, i) => ({
    id: String(i),
    displayName: `Partner ${i}`,
  }));

  it("consumer and practitioner tokens never receive ND partners", () => {
    expect(naturopathPartnersForRole("consumer", mock28)).toEqual([]);
    expect(naturopathPartnersForRole("practitioner", mock28)).toEqual([]);
    expect(naturopathPartnersForRole(undefined, mock28)).toEqual([]);
  });

  it("naturopath/admin may receive only the live list, never an implied 28", () => {
    expect(naturopathPartnersForRole("naturopath", [])).toEqual([]);
    expect(naturopathPartnersForRole("admin", mock28)).toHaveLength(28);
  });
});

describe("unauthenticated clinician portal redirect", () => {
  it("sends logged-out clinician portals to the public waitlist", () => {
    expect(unauthenticatedClinicianPortalRedirect("/practitioner")).toBe(
      OUT_OF_ROLE_REDIRECT,
    );
    expect(unauthenticatedClinicianPortalRedirect("/practitioner/dashboard")).toBe(
      OUT_OF_ROLE_REDIRECT,
    );
    expect(unauthenticatedClinicianPortalRedirect("/naturopath/dashboard")).toBe(
      OUT_OF_ROLE_REDIRECT,
    );
  });

  it("does not treat admin or the waitlist as a clinician portal CTA", () => {
    expect(unauthenticatedClinicianPortalRedirect("/admin")).toBeNull();
    expect(unauthenticatedClinicianPortalRedirect("/practitioners")).toBeNull();
    expect(unauthenticatedClinicianPortalRedirect("/login")).toBeNull();
  });
});

describe("helix path helper", () => {
  it("identifies helix surfaces", () => {
    expect(isHelixPath("/helix")).toBe(true);
    expect(isHelixPath("/helix/arena")).toBe(true);
    expect(isHelixPath("/dashboard")).toBe(false);
  });
});

describe("source contract: chrome + middleware use session role", () => {
  it("AdminPortalDetector takes sessionRole and does not email-gate Hounddog", () => {
    const src = readFileSync(
      path.join(REPO, "src/components/AdminPortalDetector.tsx"),
      "utf8",
    );
    expect(src).toMatch(/sessionRole/);
    expect(src).toMatch(/portalsForRole/);
    expect(src).toMatch(/roleChipLabel/);
    expect(src).toMatch(/shellRoleForActivePortal/);
    expect(src).not.toMatch(/session-role-chip/);
    expect(src).not.toMatch(/gary@farmceuticawellness\.com/);
    expect(src).not.toMatch(/BASE_PORTALS/);
  });

  it("edge middleware fail-closes clinician/admin on auth timeout", () => {
    const src = readFileSync(path.join(REPO, "src/middleware.ts"), "utf8");
    expect(src).toMatch(/authTimeoutAction/);
    expect(src).toMatch(/denyClinicianAdminOnAuthTimeout/);
    expect(src).not.toMatch(/session check timed out, passing request through/);
  });

  it("supabase middleware does not fall back to user_metadata.role for portal access", () => {
    const src = readFileSync(
      path.join(REPO, "src/lib/supabase/middleware.ts"),
      "utf8",
    );
    expect(src).toMatch(/roleFromProfilesColumn/);
    expect(src).toMatch(/outOfRoleRedirect/);
    expect(src).toMatch(/canAccessPortalPath/);
    expect(src).not.toMatch(/falling back to user_metadata\.role/);
    expect(src).not.toMatch(/claims\.user_metadata\?\.role/);
  });

  it("app layout reads profiles.role, not user_metadata.role, for isAdmin", () => {
    const src = readFileSync(
      path.join(REPO, "src/app/(app)/layout.tsx"),
      "utf8",
    );
    expect(src).toMatch(/resolveSessionRoleForUser/);
    expect(src).toMatch(/isConfirmedAdmin/);
    expect(src).toMatch(/sessionRole="admin"/);
    expect(src).not.toMatch(/user_metadata\?\.role as string\) \?\? "consumer"/);
  });

  it("practitioner dashboard wires live practitioner_patients and does not ship mock 42", () => {
    const src = readFileSync(
      path.join(REPO, "src/app/(app)/practitioner/dashboard/page.tsx"),
      "utf8",
    );
    expect(src).toMatch(/clinicianPatientsForRole/);
    expect(src).toMatch(/loadPractitionerLiveRoster/);
    expect(src).not.toMatch(/value: "42"/);
    expect(src).not.toMatch(/John D\./);
    expect(src).not.toMatch(/Maria S\./);
    expect(src).not.toMatch(/Precision Wellness Medical Group/);
    expect(src).not.toMatch(/ViaCura/);
  });

  it("practitioner patients page wires live roster and does not claim a 42-patient census", () => {
    const src = readFileSync(
      path.join(REPO, "src/app/(app)/practitioner/patients/page.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/of 42 patients/);
    expect(src).not.toMatch(/PATIENTS: Patient\[\] = \[\]/);
    expect(src).toMatch(/loadPractitionerLiveRoster/);
  });

  it("naturopath dashboard kills 28/92% mocks and wires live partners", () => {
    const src = readFileSync(
      path.join(REPO, "src/app/(app)/naturopath/dashboard/page.tsx"),
      "utf8",
    );
    expect(src).toMatch(/loadNaturopathLivePartners/);
    expect(src).toMatch(/naturopathPartnersForRole/);
    expect(src).not.toMatch(/value: '28'/);
    expect(src).not.toMatch(/value: '92%'/);
    expect(src).not.toMatch(/Emma W\./);
    expect(src).not.toMatch(/Dr\. Patel/);
  });

  it("supabase middleware sends unauth clinician portals to /practitioners", () => {
    const src = readFileSync(
      path.join(REPO, "src/lib/supabase/middleware.ts"),
      "utf8",
    );
    expect(src).toMatch(/unauthenticatedClinicianPortalRedirect/);
    const waitlistIdx = src.indexOf("unauthenticatedClinicianPortalRedirect(pathname)");
    const loginIdx = src.indexOf("redirecting unauthenticated request to login");
    expect(waitlistIdx).toBeGreaterThan(0);
    expect(loginIdx).toBeGreaterThan(waitlistIdx);
  });

  it("helix layout is consumer-gated from profiles.role", () => {
    const src = readFileSync(
      path.join(REPO, "src/app/(app)/(consumer)/helix/layout.tsx"),
      "utf8",
    );
    expect(src).toMatch(/resolveSessionRole/);
    expect(src).toMatch(/canAccessPortalPath/);
    expect(src).not.toMatch(/['"]use client['"]/);
  });

  it("helix APIs require a consumer profiles.role", () => {
    for (const rel of [
      "src/app/api/helix/redeem/route.ts",
      "src/app/api/helix/referral-code/route.ts",
      "src/app/api/helix/redemption-catalog/route.ts",
    ]) {
      const src = readFileSync(path.join(REPO, rel), "utf8");
      expect(src).toMatch(/requireConsumerHelixRole/);
    }
  });
});

describe("Brief 37: hide clinician/admin tabs from consumer; drop ViaCura from admin switcher", () => {
  it("consumer tab labels contain none of Practitioner / Naturopath / Admin / Hounddog", () => {
    const labels = portalsForRole("consumer").map((p) => p.label);
    expect(labels).toEqual(["Personal Wellness"]);
    expect(labels).not.toContain("Practitioner");
    expect(labels).not.toContain("Naturopath");
    expect(labels).not.toContain("Admin");
    expect(labels).not.toContain("Hounddog");
  });

  it("admin tab labels include Admin, Hounddog, and Personal Wellness, not clinician portals", () => {
    const labels = portalsForRole("admin").map((p) => p.label);
    expect(labels).toContain("Admin");
    expect(labels).toContain("Hounddog");
    expect(labels).toContain("Personal Wellness");
    expect(labels).not.toContain("Practitioner");
    expect(labels).not.toContain("Naturopath");
    expect(portalsForRole("admin").map((p) => p.key)).toEqual([
      "consumer",
      "admin",
      "hounddog",
    ]);
    expect(portalsForRole("admin").find((p) => p.key === "admin")?.href).toBe("/admin");
    expect(portalsForRole("admin").find((p) => p.key === "hounddog")?.href).toBe(
      "/admin/hounddog",
    );
  });

  it("AdminPortalDetector maps portalsForRole(sessionRole) only and does not hardcode PORTAL_TABS", () => {
    const src = readFileSync(
      path.join(REPO, "src/components/AdminPortalDetector.tsx"),
      "utf8",
    );
    expect(src).toMatch(/portalsForRole\(sessionRole\)/);
    expect(src).not.toMatch(/PORTAL_TABS/);
    expect(src).not.toMatch(/BASE_PORTALS/);
    expect(src).not.toMatch(/gary@farmceuticawellness\.com/);
    expect(src).not.toMatch(/user_metadata/);
    expect(src).not.toMatch(/switch-role/);
    expect(src).not.toMatch(/switchRole/);
  });

  it("unused dashboard TopNav does not ship a second Practitioner/Naturopath/Admin/Hounddog strip", () => {
    const src = readFileSync(
      path.join(REPO, "src/components/dashboard/TopNav.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/label: ['"]Practitioner['"]/);
    expect(src).not.toMatch(/label: ['"]Naturopath['"]/);
    expect(src).not.toMatch(/label: ['"]Admin['"]/);
    expect(src).not.toMatch(/label: ['"]Hounddog['"]/);
    expect(src).not.toMatch(/portalTabs/);
  });

  it("layout gates the detector on isConfirmedAdmin(session.profileRole) with no email gate", () => {
    const src = readFileSync(path.join(REPO, "src/app/(app)/layout.tsx"), "utf8");
    expect(src).toMatch(/isConfirmedAdmin\(session\.profileRole\)/);
    expect(src).toMatch(/sessionRole="admin"/);
    expect(src).toMatch(/AdminPortalDetector/);
    expect(src).toMatch(/PortalShellRouter/);
    expect(src).not.toMatch(/gary@farmceuticawellness\.com/);
    expect(src).not.toMatch(/user_metadata/);
  });

  it("consumer still fail-closes /admin and /admin/hounddog via outOfRoleRedirect to /practitioners", () => {
    expect(outOfRoleRedirect("consumer", "/admin")).toBe(OUT_OF_ROLE_REDIRECT);
    expect(outOfRoleRedirect("consumer", "/admin/hounddog")).toBe(
      OUT_OF_ROLE_REDIRECT,
    );
    expect(outOfRoleRedirect(undefined, "/admin")).toBe(OUT_OF_ROLE_REDIRECT);
    expect(OUT_OF_ROLE_REDIRECT).toBe("/practitioners");
    expect(canAccessPortalPath("consumer", "/admin")).toBe(false);
    expect(canAccessPortalPath("consumer", "/admin/hounddog")).toBe(false);
    expect(canAccessPortalPath("admin", "/admin")).toBe(true);
    expect(canAccessPortalPath("admin", "/admin/hounddog")).toBe(true);
  });
});
