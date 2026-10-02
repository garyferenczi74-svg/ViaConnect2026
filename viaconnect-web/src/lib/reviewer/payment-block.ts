// App Review payment guard (VIA-12).
//
// Defaults OFF. A reviewer account is charged like any other account until
// REVIEWER_PAYMENT_BLOCK_ENABLED is exactly "true".
//
// When the flag is on, payment creation is refused for a user id in
// REVIEWER_USER_IDS or for app_metadata.reviewer === true. app_metadata is
// set by the service-role seed and is not user-editable. user_metadata is
// ignored on purpose: the signed-in user can change it.

export const REVIEWER_PAYMENT_BLOCK_FLAG = "REVIEWER_PAYMENT_BLOCK_ENABLED";
export const REVIEWER_USER_IDS_ENV = "REVIEWER_USER_IDS";

export const REVIEWER_PAYMENT_BLOCKED_MESSAGE =
  "Purchases are turned off for this App Review sample account, so no card is charged.";

export const REVIEWER_PAYMENT_BLOCKED_CODE = "REVIEWER_PAYMENT_BLOCKED";

export type EnvSource = {
  readonly [key: string]: string | undefined;
};

export interface ReviewerPaymentIdentity {
  userId: string;
  appMetadata?: unknown;
}

export class ReviewerPaymentBlockedError extends Error {
  readonly code = REVIEWER_PAYMENT_BLOCKED_CODE;

  constructor(message: string = REVIEWER_PAYMENT_BLOCKED_MESSAGE) {
    super(message);
    this.name = "ReviewerPaymentBlockedError";
  }
}

export function isReviewerPaymentBlockEnabled(env: EnvSource = process.env): boolean {
  return env[REVIEWER_PAYMENT_BLOCK_FLAG] === "true";
}

export function parseReviewerUserIds(raw: string | undefined): ReadonlySet<string> {
  if (!raw) return new Set();
  const ids = raw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 0);
  return new Set(ids);
}

function metadataRecord(value: unknown): Readonly<Record<string, unknown>> | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object") return null;
  if (Array.isArray(value)) return null;
  const record: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    record[key] = entry;
  }
  return record;
}

export function isReviewerAppMetadata(appMetadata: unknown): boolean {
  return metadataRecord(appMetadata)?.reviewer === true;
}

export function isReviewerAccount(
  identity: ReviewerPaymentIdentity,
  env: EnvSource = process.env,
): boolean {
  const userId = identity.userId.trim().toLowerCase();
  if (!userId) return false;
  if (parseReviewerUserIds(env[REVIEWER_USER_IDS_ENV]).has(userId)) return true;
  return isReviewerAppMetadata(identity.appMetadata);
}

export function reviewerPaymentBlockMessage(
  identity: ReviewerPaymentIdentity,
  env: EnvSource = process.env,
): string | null {
  if (!isReviewerPaymentBlockEnabled(env)) return null;
  if (!isReviewerAccount(identity, env)) return null;
  return REVIEWER_PAYMENT_BLOCKED_MESSAGE;
}

export function assertReviewerMayCreatePayment(
  identity: ReviewerPaymentIdentity,
  env: EnvSource = process.env,
): void {
  const message = reviewerPaymentBlockMessage(identity, env);
  if (message) throw new ReviewerPaymentBlockedError(message);
}
