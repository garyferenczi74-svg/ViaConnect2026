/**
 * Naturopath credential on a practitioner account.
 *
 * Gary 2026-10-03: naturopath is not a separate account role. It is a
 * credential stored on the practitioner. Existing routes that already
 * allow profiles.role = 'naturopath' stay as they are. Opening
 * /naturopath/* from a practitioner credential is off unless
 * NATUROPATH_CREDENTIAL_PORTAL_ACCESS is true AND verification_status
 * is verified.
 *
 * Store support, where it applies: Apple App Store Review Guidelines
 * 5.1.1 (permission) and 5.1.3 (health data), and Google Play User Data
 * / Data safety. An unverified self-declaration does not open the
 * naturopath portal. This helper does not change lab, genetics, note,
 * or photo data-access rules.
 */

import {
  canAccessPortalPath,
  isNaturopathPortalPath,
  type SessionRole,
} from "@/lib/auth/session-role";
import { safeLog } from "@/lib/utils/safe-log";

export const NATUROPATH_CREDENTIAL_PORTAL_ENV =
  "NATUROPATH_CREDENTIAL_PORTAL_ACCESS";

export const NATUROPATH_CREDENTIAL_VERIFICATION_STATUSES = [
  "unverified",
  "pending",
  "verified",
  "rejected",
  "expired",
] as const;

export type NaturopathCredentialVerificationStatus =
  (typeof NATUROPATH_CREDENTIAL_VERIFICATION_STATUSES)[number];

export type PractitionerNaturopathCredential = {
  licenceType: string;
  jurisdiction: string;
  licenceNumber: string;
  verificationStatus: NaturopathCredentialVerificationStatus;
};

export type NaturopathCredentialRow = {
  licence_type: unknown;
  jurisdiction: unknown;
  licence_number: unknown;
  verification_status: unknown;
};

interface CredentialQueryResult {
  data: NaturopathCredentialRow | null;
  error: { message: string } | null;
}

interface CredentialQuery {
  select(columns: string): {
    eq(column: string, value: string): {
      maybeSingle(): PromiseLike<CredentialQueryResult>;
    };
  };
}

interface CredentialReader {
  from(table: "practitioner_naturopath_credentials"): CredentialQuery;
}

export function isNaturopathCredentialPortalEnabled(): boolean {
  const raw = process.env.NATUROPATH_CREDENTIAL_PORTAL_ACCESS;
  return raw === "true" || raw === "1";
}

export function parseNaturopathCredentialVerificationStatus(
  raw: string,
): NaturopathCredentialVerificationStatus | null {
  for (const status of NATUROPATH_CREDENTIAL_VERIFICATION_STATUSES) {
    if (status === raw) return status;
  }
  return null;
}

function credentialFieldsPresent(
  credential: PractitionerNaturopathCredential,
): boolean {
  return (
    credential.licenceType.trim().length > 0 &&
    credential.jurisdiction.trim().length > 0 &&
    credential.licenceNumber.trim().length > 0
  );
}

/**
 * True when profiles.role is practitioner and a naturopath credential
 * row has licence type, jurisdiction, and licence number.
 * profiles.role = 'naturopath' is not this credential.
 * Verification is a separate gate.
 */
export function isNaturopathCredentialedPractitioner(input: {
  profileRole: string | null | undefined;
  credential: PractitionerNaturopathCredential | null | undefined;
}): boolean {
  if (input.profileRole !== "practitioner") return false;
  if (!input.credential) return false;
  if (!credentialFieldsPresent(input.credential)) return false;
  return (
    parseNaturopathCredentialVerificationStatus(
      input.credential.verificationStatus,
    ) !== null
  );
}

/**
 * Opens src/app/(app)/naturopath/* only when the flag is on, the caller
 * is a practitioner, and the credential is verified.
 */
export function naturopathPortalOpenForCredential(input: {
  profileRole: string | null | undefined;
  credential: PractitionerNaturopathCredential | null | undefined;
  portalFlagEnabled: boolean;
}): boolean {
  if (!input.portalFlagEnabled) return false;
  if (!isNaturopathCredentialedPractitioner(input)) return false;
  return input.credential?.verificationStatus === "verified";
}

/** Skip the credential query unless a practitioner was already denied. */
export function shouldLoadNaturopathCredentialForPortal(input: {
  portalFlagEnabled: boolean;
  sessionRole: SessionRole | undefined;
  pathname: string;
  alreadyPermitted: boolean;
}): boolean {
  if (!input.portalFlagEnabled) return false;
  if (input.alreadyPermitted) return false;
  if (input.sessionRole !== "practitioner") return false;
  return isNaturopathPortalPath(input.pathname);
}

/**
 * Existing profiles.role rules first. The credential can add /naturopath/*
 * only through naturopathPortalOpenForCredential.
 */
export function portalPermitted(input: {
  sessionRole: SessionRole | undefined;
  pathname: string;
  profileRole: string | null | undefined;
  credential: PractitionerNaturopathCredential | null;
  portalFlagEnabled: boolean;
}): boolean {
  if (canAccessPortalPath(input.sessionRole, input.pathname)) return true;
  if (!isNaturopathPortalPath(input.pathname)) return false;
  return naturopathPortalOpenForCredential({
    profileRole: input.profileRole,
    credential: input.credential,
    portalFlagEnabled: input.portalFlagEnabled,
  });
}

export function credentialFromRow(
  row: NaturopathCredentialRow,
): PractitionerNaturopathCredential | null {
  if (
    typeof row.licence_type !== "string" ||
    typeof row.jurisdiction !== "string" ||
    typeof row.licence_number !== "string" ||
    typeof row.verification_status !== "string"
  ) {
    return null;
  }
  const verificationStatus = parseNaturopathCredentialVerificationStatus(
    row.verification_status,
  );
  if (!verificationStatus) return null;
  const credential: PractitionerNaturopathCredential = {
    licenceType: row.licence_type.trim(),
    jurisdiction: row.jurisdiction.trim(),
    licenceNumber: row.licence_number.trim(),
    verificationStatus,
  };
  if (!credentialFieldsPresent(credential)) return null;
  return credential;
}

/**
 * Reads the caller's credential. Returns null on error so a missing
 * table or a failed query does not open the portal.
 * The table is not in generated Database types until types are regenerated
 * after Gary applies the migration. The cast is to a narrow query shape.
 */
export async function readNaturopathCredentialForUser(
  supabase: unknown,
  userId: string,
): Promise<PractitionerNaturopathCredential | null> {
  try {
    const client = supabase as CredentialReader;
    const { data, error } = await client
      .from("practitioner_naturopath_credentials")
      .select(
        "licence_type, jurisdiction, licence_number, verification_status",
      )
      .eq("practitioner_user_id", userId)
      .maybeSingle();
    if (error || !data) {
      if (error) {
        safeLog.warn("auth.naturopath-credential", "credential lookup failed", {
          userId,
          error,
        });
      }
      return null;
    }
    return credentialFromRow(data);
  } catch (error) {
    safeLog.warn("auth.naturopath-credential", "credential lookup threw", {
      userId,
      error,
    });
    return null;
  }
}
