import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FLAG_REGISTRY } from "@/lib/config/feature-flags";
import {
  credentialFromRow,
  isNaturopathCredentialedPractitioner,
  isNaturopathCredentialPortalEnabled,
  naturopathPortalOpenForCredential,
  portalPermitted,
  shouldLoadNaturopathCredentialForPortal,
  type PractitionerNaturopathCredential,
} from "@/lib/auth/naturopath-credential";

const REPO = path.resolve(__dirname, "../../../..");

const verified: PractitionerNaturopathCredential = {
  licenceType: "ND",
  jurisdiction: "Alberta",
  licenceNumber: "ND-100",
  verificationStatus: "verified",
};

const unverified: PractitionerNaturopathCredential = {
  ...verified,
  verificationStatus: "unverified",
};

const originalEnv = process.env.NATUROPATH_CREDENTIAL_PORTAL_ACCESS;

afterEach(() => {
  if (originalEnv === undefined) {
    delete process.env.NATUROPATH_CREDENTIAL_PORTAL_ACCESS;
  } else {
    process.env.NATUROPATH_CREDENTIAL_PORTAL_ACCESS = originalEnv;
  }
});

describe("isNaturopathCredentialedPractitioner", () => {
  it("is true only for a practitioner with licence type, jurisdiction, and number", () => {
    expect(
      isNaturopathCredentialedPractitioner({
        profileRole: "practitioner",
        credential: unverified,
      }),
    ).toBe(true);
    expect(
      isNaturopathCredentialedPractitioner({
        profileRole: "practitioner",
        credential: verified,
      }),
    ).toBe(true);
  });

  it("does not treat profiles.role naturopath as the credential", () => {
    expect(
      isNaturopathCredentialedPractitioner({
        profileRole: "naturopath",
        credential: verified,
      }),
    ).toBe(false);
    expect(
      isNaturopathCredentialedPractitioner({
        profileRole: "naturopath",
        credential: null,
      }),
    ).toBe(false);
  });

  it("rejects missing credential, blank fields, and other roles", () => {
    expect(
      isNaturopathCredentialedPractitioner({
        profileRole: "practitioner",
        credential: null,
      }),
    ).toBe(false);
    expect(
      isNaturopathCredentialedPractitioner({
        profileRole: "consumer",
        credential: verified,
      }),
    ).toBe(false);
    expect(
      isNaturopathCredentialedPractitioner({
        profileRole: "admin",
        credential: verified,
      }),
    ).toBe(false);
    expect(
      isNaturopathCredentialedPractitioner({
        profileRole: "practitioner",
        credential: { ...verified, licenceNumber: "  " },
      }),
    ).toBe(false);
  });
});

describe("naturopath portal flag", () => {
  it("defaults off", () => {
    delete process.env.NATUROPATH_CREDENTIAL_PORTAL_ACCESS;
    expect(isNaturopathCredentialPortalEnabled()).toBe(false);
    expect(FLAG_REGISTRY.naturopath_credential_portal_access.default).toBe(false);
  });

  it("turns on only for true or 1", () => {
    process.env.NATUROPATH_CREDENTIAL_PORTAL_ACCESS = "true";
    expect(isNaturopathCredentialPortalEnabled()).toBe(true);
    process.env.NATUROPATH_CREDENTIAL_PORTAL_ACCESS = "1";
    expect(isNaturopathCredentialPortalEnabled()).toBe(true);
    process.env.NATUROPATH_CREDENTIAL_PORTAL_ACCESS = "false";
    expect(isNaturopathCredentialPortalEnabled()).toBe(false);
  });

  it("does not open /naturopath when the flag is off, even if verified", () => {
    expect(
      naturopathPortalOpenForCredential({
        profileRole: "practitioner",
        credential: verified,
        portalFlagEnabled: false,
      }),
    ).toBe(false);
  });

  it("opens /naturopath only for a verified practitioner credential when the flag is on", () => {
    expect(
      naturopathPortalOpenForCredential({
        profileRole: "practitioner",
        credential: verified,
        portalFlagEnabled: true,
      }),
    ).toBe(true);
    for (const verificationStatus of [
      "unverified",
      "pending",
      "rejected",
      "expired",
    ] as const) {
      expect(
        naturopathPortalOpenForCredential({
          profileRole: "practitioner",
          credential: { ...verified, verificationStatus },
          portalFlagEnabled: true,
        }),
      ).toBe(false);
    }
  });
});

describe("portalPermitted keeps existing routes", () => {
  it("still admits profiles.role naturopath and admin without a credential", () => {
    expect(
      portalPermitted({
        sessionRole: "naturopath",
        pathname: "/naturopath/dashboard",
        profileRole: "naturopath",
        credential: null,
        portalFlagEnabled: false,
      }),
    ).toBe(true);
    expect(
      portalPermitted({
        sessionRole: "admin",
        pathname: "/naturopath/patients",
        profileRole: "admin",
        credential: null,
        portalFlagEnabled: false,
      }),
    ).toBe(true);
  });

  it("still denies a practitioner on /naturopath while the flag is off", () => {
    expect(
      portalPermitted({
        sessionRole: "practitioner",
        pathname: "/naturopath/dashboard",
        profileRole: "practitioner",
        credential: verified,
        portalFlagEnabled: false,
      }),
    ).toBe(false);
  });

  it("admits a verified practitioner credential only on naturopath paths when the flag is on", () => {
    expect(
      portalPermitted({
        sessionRole: "practitioner",
        pathname: "/naturopath/protocols",
        profileRole: "practitioner",
        credential: verified,
        portalFlagEnabled: true,
      }),
    ).toBe(true);
    expect(
      portalPermitted({
        sessionRole: "practitioner",
        pathname: "/admin",
        profileRole: "practitioner",
        credential: verified,
        portalFlagEnabled: true,
      }),
    ).toBe(false);
    expect(
      portalPermitted({
        sessionRole: "consumer",
        pathname: "/naturopath/dashboard",
        profileRole: "patient",
        credential: verified,
        portalFlagEnabled: true,
      }),
    ).toBe(false);
  });

  it("does not query the credential unless the flag is on and the practitioner was denied", () => {
    expect(
      shouldLoadNaturopathCredentialForPortal({
        portalFlagEnabled: false,
        sessionRole: "practitioner",
        pathname: "/naturopath/dashboard",
        alreadyPermitted: false,
      }),
    ).toBe(false);
    expect(
      shouldLoadNaturopathCredentialForPortal({
        portalFlagEnabled: true,
        sessionRole: "practitioner",
        pathname: "/naturopath/dashboard",
        alreadyPermitted: true,
      }),
    ).toBe(false);
    expect(
      shouldLoadNaturopathCredentialForPortal({
        portalFlagEnabled: true,
        sessionRole: "naturopath",
        pathname: "/naturopath/dashboard",
        alreadyPermitted: false,
      }),
    ).toBe(false);
    expect(
      shouldLoadNaturopathCredentialForPortal({
        portalFlagEnabled: true,
        sessionRole: "practitioner",
        pathname: "/practitioner/dashboard",
        alreadyPermitted: false,
      }),
    ).toBe(false);
    expect(
      shouldLoadNaturopathCredentialForPortal({
        portalFlagEnabled: true,
        sessionRole: "practitioner",
        pathname: "/naturopath/dashboard",
        alreadyPermitted: false,
      }),
    ).toBe(true);
  });
});

describe("credentialFromRow", () => {
  it("trims fields and rejects unknown verification or non-strings", () => {
    expect(
      credentialFromRow({
        licence_type: " ND ",
        jurisdiction: " Alberta ",
        licence_number: " 100 ",
        verification_status: "unverified",
      }),
    ).toEqual({
      licenceType: "ND",
      jurisdiction: "Alberta",
      licenceNumber: "100",
      verificationStatus: "unverified",
    });
    expect(
      credentialFromRow({
        licence_type: "ND",
        jurisdiction: "Alberta",
        licence_number: "100",
        verification_status: "approved",
      }),
    ).toBeNull();
    expect(
      credentialFromRow({
        licence_type: 1,
        jurisdiction: "Alberta",
        licence_number: "100",
        verification_status: "verified",
      }),
    ).toBeNull();
  });
});

describe("route wiring stays flag-gated", () => {
  it("middleware and naturopath layout use the helper and do not read user_metadata", () => {
    const middleware = readFileSync(
      path.join(REPO, "src/lib/supabase/middleware.ts"),
      "utf8",
    );
    const layout = readFileSync(
      path.join(REPO, "src/app/(app)/naturopath/layout.tsx"),
      "utf8",
    );
    for (const src of [middleware, layout]) {
      expect(src).toMatch(/shouldLoadNaturopathCredentialForPortal/);
      expect(src).toMatch(/portalPermitted/);
      expect(src).toMatch(/isNaturopathCredentialPortalEnabled/);
      expect(src).not.toMatch(/claims\.user_metadata\?\.role/);
      expect(src).not.toMatch(/falling back to user_metadata\.role/);
      expect(src).not.toMatch(/\bany\b/);
    }
    expect(middleware).toMatch(/canAccessPortalPath/);
    expect(middleware).toMatch(/roleFromProfilesColumn/);
  });
});
