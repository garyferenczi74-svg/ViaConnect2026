// Brief 15: Practitioner / Naturopath / Admin portals show live entitled
// data only. No staged 42 / 28 / 92% census. Unauthorized roles fail closed.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  canAccessPortalPath,
  clinicianPatientsForRole,
  failClosedOnAuthTimeout,
  naturopathPartnersForRole,
  outOfRoleRedirect,
  unauthenticatedClinicianPortalRedirect,
  OUT_OF_ROLE_REDIRECT,
} from "@/lib/auth/session-role";

const REPO = path.resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(path.join(REPO, rel), "utf8");
}

describe("unauthorized roles fail closed", () => {
  it("consumer cannot open clinician or admin portals", () => {
    expect(canAccessPortalPath("consumer", "/practitioner/dashboard")).toBe(false);
    expect(canAccessPortalPath("consumer", "/naturopath/dashboard")).toBe(false);
    expect(canAccessPortalPath("consumer", "/admin")).toBe(false);
    expect(outOfRoleRedirect("consumer", "/practitioner/dashboard")).toBe(
      OUT_OF_ROLE_REDIRECT,
    );
  });

  it("practitioner cannot open naturopath, admin, or helix", () => {
    expect(canAccessPortalPath("practitioner", "/naturopath/dashboard")).toBe(false);
    expect(canAccessPortalPath("practitioner", "/admin")).toBe(false);
    expect(canAccessPortalPath("practitioner", "/helix")).toBe(false);
  });

  it("auth timeout denies clinician/admin pages and APIs", () => {
    expect(failClosedOnAuthTimeout("/practitioner/dashboard")).toBe(true);
    expect(failClosedOnAuthTimeout("/naturopath/dashboard")).toBe(true);
    expect(failClosedOnAuthTimeout("/admin")).toBe(true);
    expect(failClosedOnAuthTimeout("/api/practitioner/invite-patient")).toBe(true);
  });

  it("logged-out clinician pages go to /practitioners, not a fake portal", () => {
    expect(unauthenticatedClinicianPortalRedirect("/practitioner/dashboard")).toBe(
      "/practitioners",
    );
    expect(unauthenticatedClinicianPortalRedirect("/naturopath/dashboard")).toBe(
      "/practitioners",
    );
  });
});

describe("no staged census on the three portal homes", () => {
  it("practitioner dashboard has no staged names, 42, compliance %, or scripted alerts", () => {
    const src = read("src/app/(app)/practitioner/dashboard/page.tsx");
    expect(src).toMatch(/loadPractitionerLiveRoster/);
    expect(src).not.toMatch(/42 Active Patients|value: "42"|John D\.|Maria S\.|Precision Wellness Medical Group/);
    expect(src).not.toMatch(/ViaCura/);
    expect(src).not.toMatch(/89%/);
    expect(src).not.toMatch(/Avg Compliance/);
    expect(src).not.toMatch(/HRV dropped 28%/);
    expect(src).not.toMatch(/Missed 5 consecutive/);
  });

  it("naturopath dashboard has no 28/92% mocks or scripted alerts", () => {
    const src = read("src/app/(app)/naturopath/dashboard/page.tsx");
    expect(src).toMatch(/loadNaturopathLivePartners/);
    expect(src).not.toMatch(/value: '28'|value: '92%'|Emma W\.|David L\.|Sophie R\./);
    expect(src).not.toMatch(/Protocol Adherence/);
    expect(src).not.toMatch(/Methylation pathway bottleneck/);
    expect(src).not.toMatch(/Dr\. Patel/);
  });

  it("admin home does not invent 62 SKUs, Q1 2026, or toolchain KPIs", () => {
    const src = read("src/app/(app)/admin/page.tsx");
    expect(src).not.toMatch(/skuCount \?\? 62|Q1 2026|62 Master SKUs/);
    expect(src).not.toMatch(/board_metrics|sku_rationalization|inventory_reorder|alert_snapshots/);
    expect(src).not.toMatch(/farmceutica\.ps1|Star SKUs|13\.7M|8500/);
    expect(src).toMatch(/ADMIN_BOARD_EMPTY_COPY/);
    expect(src).toMatch(/loadAdminLiveCatalog/);
  });
});

describe("role gates never promote a mock list", () => {
  const staged = [{ id: "x", displayName: "John D." }];

  it("consumer stays empty", () => {
    expect(clinicianPatientsForRole("consumer", staged)).toEqual([]);
    expect(naturopathPartnersForRole("consumer", staged)).toEqual([]);
  });
});
