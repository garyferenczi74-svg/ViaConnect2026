// Pure plan for the App Review sample account (VIA-12).
//
// The CLI in scripts/seed/reviewer-demo-account.ts performs the writes.
// This module does not open a network connection and does not contain
// credentials.
//
// Health, lab, genetic, dose, and product rows are intentionally absent.
// profiles.role "patient" is the consumer value allowed by profiles_role_check
// (migration 20260423000010). Login treats any role other than practitioner
// or naturopath as the consumer home.

export const SAMPLE_FULL_NAME = "SAMPLE App Review Account";
export const SAMPLE_PROFILE_ROLE = "patient";
export const SAMPLE_AUTH_ROLE = "consumer";
export const SAMPLE_POLICY_VERSION = "2026-06-17";
export const REVIEWER_APP_METADATA_KEY = "reviewer";

export const SAMPLE_PROFILE_COLUMNS = [
  "full_name",
  "role",
  "onboarding_completed",
] as const;

export type SampleProfileColumn = (typeof SAMPLE_PROFILE_COLUMNS)[number];

export interface SampleProfilePatch {
  full_name: string;
  role: string;
  onboarding_completed: boolean;
}

export interface SampleConsentRow {
  user_id: string;
  privacy_accepted_at: string;
  terms_accepted_at: string;
  policy_version: string;
}

export interface ReviewerCredentials {
  email: string;
  password: string;
}

export interface ReviewerAuthUser {
  id: string;
  email: string | null;
  appMetadata: Record<string, unknown>;
}

export interface CreateReviewerUserInput {
  email: string;
  password: string;
  userMetadata: Record<string, unknown>;
  appMetadata: Record<string, unknown>;
}

export interface UpdateReviewerUserInput extends CreateReviewerUserInput {
  id: string;
}

export class ReviewerEmailAlreadyRegisteredError extends Error {
  constructor() {
    super("A user with this email is already registered.");
    this.name = "ReviewerEmailAlreadyRegisteredError";
  }
}

export interface ReviewerAuthAdmin {
  findByEmail(email: string): Promise<ReviewerAuthUser | null>;
  createConfirmedUser(input: CreateReviewerUserInput): Promise<ReviewerAuthUser>;
  updateConfirmedUser(input: UpdateReviewerUserInput): Promise<ReviewerAuthUser>;
}

export interface ReviewerProfileStore {
  writeSampleProfile(
    userId: string,
    patch: SampleProfilePatch,
  ): Promise<"inserted" | "updated">;
  ensureConsent(row: SampleConsentRow): Promise<"inserted" | "already_present">;
}

export interface SeedReviewerResult {
  userId: string;
  email: string;
  authAction: "created" | "updated";
  profileAction: "inserted" | "updated";
  consentAction: "inserted" | "already_present";
  healthDataSeeded: false;
  appMetadataReviewer: true;
}

type CredentialEnv = {
  readonly REVIEWER_EMAIL?: string;
  readonly REVIEWER_PASSWORD?: string;
};

export function readReviewerCredentials(env: CredentialEnv): ReviewerCredentials {
  const email = (env.REVIEWER_EMAIL ?? "").trim().toLowerCase();
  const password = env.REVIEWER_PASSWORD ?? "";
  if (!email || !password) {
    throw new Error(
      "REVIEWER_EMAIL and REVIEWER_PASSWORD must be set. Do not hardcode them.",
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("REVIEWER_EMAIL is not a valid email address.");
  }
  if (password.length < 8 || password !== password.trim()) {
    throw new Error(
      "REVIEWER_PASSWORD must be at least 8 characters and must not start or end with whitespace.",
    );
  }
  return { email, password };
}

export function buildSampleProfilePatch(): SampleProfilePatch {
  return {
    full_name: SAMPLE_FULL_NAME,
    role: SAMPLE_PROFILE_ROLE,
    onboarding_completed: true,
  };
}

export function buildReviewerUserMetadata(acceptedAtIso: string): Record<string, unknown> {
  return {
    full_name: SAMPLE_FULL_NAME,
    role: SAMPLE_AUTH_ROLE,
    privacy_accepted_at: acceptedAtIso,
    terms_accepted_at: acceptedAtIso,
    policy_version: SAMPLE_POLICY_VERSION,
    sample_account_label: SAMPLE_FULL_NAME,
  };
}

export function mergeReviewerAppMetadata(existing: unknown): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    for (const [key, value] of Object.entries(existing)) {
      merged[key] = value;
    }
  }
  merged[REVIEWER_APP_METADATA_KEY] = true;
  return merged;
}

export function buildSampleConsentRow(
  userId: string,
  acceptedAtIso: string,
): SampleConsentRow {
  return {
    user_id: userId,
    privacy_accepted_at: acceptedAtIso,
    terms_accepted_at: acceptedAtIso,
    policy_version: SAMPLE_POLICY_VERSION,
  };
}

export function isUniqueViolation(error: { code?: string }): boolean {
  return error.code === "23505";
}

export async function seedReviewerDemoAccount(args: {
  credentials: ReviewerCredentials;
  acceptedAtIso: string;
  auth: ReviewerAuthAdmin;
  profiles: ReviewerProfileStore;
}): Promise<SeedReviewerResult> {
  const { credentials, acceptedAtIso, auth, profiles } = args;
  const userMetadata = buildReviewerUserMetadata(acceptedAtIso);
  const patch = buildSampleProfilePatch();

  let existing = await auth.findByEmail(credentials.email);
  let authAction: SeedReviewerResult["authAction"];
  let user: ReviewerAuthUser;

  if (!existing) {
    try {
      user = await auth.createConfirmedUser({
        email: credentials.email,
        password: credentials.password,
        userMetadata,
        appMetadata: mergeReviewerAppMetadata(null),
      });
      authAction = "created";
    } catch (error) {
      if (!(error instanceof ReviewerEmailAlreadyRegisteredError)) throw error;
      existing = await auth.findByEmail(credentials.email);
      if (!existing) {
        throw new Error(
          "REVIEWER_EMAIL is already registered, but the auth user could not be loaded. No profile write was attempted.",
        );
      }
      user = await auth.updateConfirmedUser({
        id: existing.id,
        email: credentials.email,
        password: credentials.password,
        userMetadata,
        appMetadata: mergeReviewerAppMetadata(existing.appMetadata),
      });
      authAction = "updated";
    }
  } else {
    user = await auth.updateConfirmedUser({
      id: existing.id,
      email: credentials.email,
      password: credentials.password,
      userMetadata,
      appMetadata: mergeReviewerAppMetadata(existing.appMetadata),
    });
    authAction = "updated";
  }

  const profileAction = await profiles.writeSampleProfile(user.id, patch);
  const consentAction = await profiles.ensureConsent(
    buildSampleConsentRow(user.id, acceptedAtIso),
  );

  return {
    userId: user.id,
    email: credentials.email,
    authAction,
    profileAction,
    consentAction,
    healthDataSeeded: false,
    appMetadataReviewer: true,
  };
}
