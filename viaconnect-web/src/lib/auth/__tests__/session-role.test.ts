import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  activePortalForSession,
  authTimeoutAction,
  canAccessPortalPath,
  clinicianPatientsForRole,
  failClosedOnAuthTimeout,
  isClinicianOrAdminPath,
  isHelixPath,
  isPractitionerPortalPath,
  outOfRoleRedirect,
  portalsForRole,
  roleChipLabel,
  roleFromProfilesColumn,
  roleHomePath,
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

  it("practitioner sees only the practitioner tab", () => {
    expect(portalsForRole("practitioner").map((p) => p.key)).toEqual([
      "practitioner",
    ]);
  });

  it("naturopath sees only the naturopath tab", () => {
    expect(portalsForRole("naturopath").map((p) => p.key)).toEqual(["naturopath"]);
  });

  it("admin sees every portal including Hounddog from role, not email", () => {
    expect(portalsForRole("admin").map((p) => p.key)).toEqual([
      "consumer",
      "practitioner",
      "naturopath",
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
    expect(canAccessPortalPath("admin", "/helix")).toBe(false);
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
  });

  it("active tab follows session-allowed portals, not a spoofed URL", () => {
    expect(activePortalForSession("consumer", "/practitioner/dashboard")).toBe(
      "consumer",
    );
    expect(activePortalForSession("consumer", "/admin")).toBe("consumer");
    expect(activePortalForSession("admin", "/practitioner/dashboard")).toBe(
      "practitioner",
    );
    expect(activePortalForSession("practitioner", "/dashboard")).toBe(
      "practitioner",
    );
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
    expect(src).not.toMatch(/gary@farmceuticawellness\.com/);
    expect(src).not.toMatch(/BASE_PORTALS/);
  });

  it("edge middleware fail-closes clinician/admin on auth timeout", () => {
    const src = readFileSync(path.join(REPO, "src/middleware.ts"), "utf8");
    expect(src).toMatch(/failClosedOnAuthTimeout/);
    expect(src).not.toMatch(/session check timed out, passing request through/);
  });

  it("supabase middleware does not fall back to user_metadata.role for portal access", () => {
    const src = readFileSync(
      path.join(REPO, "src/lib/supabase/middleware.ts"),
      "utf8",
    );
    expect(src).toMatch(/roleFromProfilesColumn/);
    expect(src).toMatch(/outOfRoleRedirect/);
    expect(src).not.toMatch(/falling back to user_metadata\.role/);
    expect(src).toMatch(/\/helix/);
  });

  it("app layout reads profiles.role, not user_metadata.role, for isAdmin", () => {
    const src = readFileSync(
      path.join(REPO, "src/app/(app)/layout.tsx"),
      "utf8",
    );
    expect(src).toMatch(/from\("profiles"\)/);
    expect(src).toMatch(/roleFromProfilesColumn/);
    expect(src).not.toMatch(/user_metadata\?\.role as string\) \?\? "consumer"/);
  });

  it("practitioner dashboard does not ship mock 42 as live patients", () => {
    const src = readFileSync(
      path.join(REPO, "src/app/(app)/practitioner/dashboard/page.tsx"),
      "utf8",
    );
    expect(src).toMatch(/clinicianPatientsForRole/);
    expect(src).not.toMatch(/value: "42"/);
    expect(src).not.toMatch(/John D\./);
    expect(src).not.toMatch(/Maria S\./);
  });

  it("practitioner patients page does not claim a live 42-patient census", () => {
    const src = readFileSync(
      path.join(REPO, "src/app/(app)/practitioner/patients/page.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/of 42 patients/);
    expect(src).toMatch(/PATIENTS: Patient\[\] = \[\]/);
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
