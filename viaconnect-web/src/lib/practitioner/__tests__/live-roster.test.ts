import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  clinicianPatientsForRole,
  naturopathPartnersForRole,
} from "@/lib/auth/session-role";
import {
  displayNameFromInviteFields,
  emptyNaturopathSnapshot,
  emptyPractitionerSnapshot,
  formatVisitDate,
  isLiveRosterStatus,
  mapRelationshipToRosterRow,
  rosterRowsToClinicianPatients,
} from "@/lib/practitioner/live-roster";

const REPO = path.resolve(__dirname, "../../../..");

describe("displayNameFromInviteFields", () => {
  it("prefers a real full name, then invite names, then email", () => {
    expect(
      displayNameFromInviteFields({
        fullName: "Ada Lovelace",
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@clinic.com",
      }),
    ).toBe("Ada Lovelace");
    expect(
      displayNameFromInviteFields({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@clinic.com",
      }),
    ).toBe("Ada Lovelace");
    expect(displayNameFromInviteFields({ email: "ada@clinic.com" })).toBe(
      "ada@clinic.com",
    );
  });

  it("does not invent a staged name when fields are empty", () => {
    expect(displayNameFromInviteFields({})).toBe("Unnamed patient");
    expect(displayNameFromInviteFields({ fullName: "  " })).toBe("Unnamed patient");
    expect(displayNameFromInviteFields({})).not.toMatch(/John D/);
    expect(displayNameFromInviteFields({})).not.toMatch(/Maria S/);
    expect(displayNameFromInviteFields({})).not.toMatch(/Emma W/);
  });
});

describe("mapRelationshipToRosterRow", () => {
  it("maps active and invited rows and drops revoked", () => {
    const active = mapRelationshipToRosterRow({
      id: "rel-1",
      patient_id: "p-1",
      status: "active",
      invited_email: "ada@clinic.com",
      invited_first_name: "Ada",
      invited_last_name: "Lovelace",
      first_visit_date: "2026-03-01",
      invited_at: "2026-02-01",
      updated_at: "2026-03-02",
      chief_complaint: null,
      tags: ["focus"],
    }, "Ada Lovelace");
    expect(active?.status).toBe("active");
    expect(active?.displayName).toBe("Ada Lovelace");
    expect(active?.tags).toEqual(["focus"]);

    expect(
      mapRelationshipToRosterRow({
        id: "rel-2",
        patient_id: null,
        status: "revoked",
        invited_email: null,
        invited_first_name: null,
        invited_last_name: null,
        first_visit_date: null,
        invited_at: null,
        updated_at: "2026-03-02",
        chief_complaint: null,
        tags: [],
      }),
    ).toBeNull();
  });
});

describe("roster entitlement", () => {
  const rows = rosterRowsToClinicianPatients([
    {
      relationshipId: "r1",
      patientId: "p1",
      displayName: "Ada Lovelace",
      email: "ada@clinic.com",
      status: "active",
      firstVisitDate: null,
      invitedAt: null,
      updatedAt: "2026-03-02",
      chiefComplaint: null,
      tags: [],
    },
    {
      relationshipId: "r2",
      patientId: null,
      displayName: "Pending Invite",
      email: "pending@clinic.com",
      status: "invited",
      firstVisitDate: null,
      invitedAt: "2026-03-01",
      updatedAt: "2026-03-01",
      chiefComplaint: null,
      tags: [],
    },
  ]);

  it("counts only active patients with a patient_id as the live census", () => {
    expect(rows).toEqual([{ id: "p1", displayName: "Ada Lovelace" }]);
    expect(clinicianPatientsForRole("consumer", rows)).toEqual([]);
    expect(clinicianPatientsForRole("practitioner", rows)).toHaveLength(1);
  });

  it("keeps empty snapshots empty (not a fake 42 or 28)", () => {
    expect(emptyPractitionerSnapshot().activeCount).toBe(0);
    expect(emptyPractitionerSnapshot().patients).toEqual([]);
    expect(emptyNaturopathSnapshot().activeCount).toBe(0);
    expect(emptyNaturopathSnapshot().partners).toEqual([]);
    expect(naturopathPartnersForRole("naturopath", [])).toEqual([]);
  });
});

describe("helpers", () => {
  it("recognizes live statuses only", () => {
    expect(isLiveRosterStatus("active")).toBe(true);
    expect(isLiveRosterStatus("invited")).toBe(true);
    expect(isLiveRosterStatus("revoked")).toBe(false);
  });

  it("formats dates honestly", () => {
    expect(formatVisitDate(null)).toBe("—");
    expect(formatVisitDate("not-a-date")).toBe("—");
    expect(formatVisitDate("2026-03-24T00:00:00.000Z")).toMatch(/2026/);
  });
});

describe("source contract: mocks gone, live roster wired", () => {
  it("live-roster module has no any and no staged census constants", () => {
    const src = readFileSync(
      path.join(REPO, "src/lib/practitioner/live-roster.ts"),
      "utf8",
    );
    expect(src).toMatch(/from\("practitioner_patients"\)/);
    expect(src).toMatch(/from\("protocol_shares"\)/);
    expect(src).not.toMatch(/: any\b/);
    expect(src).not.toMatch(/as any\b/);
    expect(src).not.toMatch(/John D/);
    expect(src).not.toMatch(/Precision Wellness/);
    expect(src).not.toMatch(/value: "42"/);
    expect(src).not.toMatch(/value: '28'/);
  });

  it("patient detail does not fall back to LegacyPatientView staged PHI", () => {
    const src = readFileSync(
      path.join(REPO, "src/app/(app)/practitioner/patients/[id]/page.tsx"),
      "utf8",
    );
    expect(src).toMatch(/RosterEmptyState/);
    expect(src).not.toMatch(/LegacyPatientView/);
    expect(src).not.toMatch(/as any/);
    expect(src).not.toMatch(/John Davis/);
  });

  it("admin home does not invent SKU or quarter fallbacks", () => {
    const src = readFileSync(
      path.join(REPO, "src/app/(app)/admin/page.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/skuCount \?\? 62/);
    expect(src).not.toMatch(/Q1 2026/);
    expect(src).not.toMatch(/62 Master SKUs/);
    expect(src).toMatch(/No catalog snapshot yet/);
  });
});
