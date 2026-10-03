import { afterEach, describe, expect, it } from "vitest";
import {
  REVIEWER_PAYMENT_BLOCKED_MESSAGE,
  REVIEWER_PAYMENT_BLOCK_FLAG,
  REVIEWER_USER_IDS_ENV,
  ReviewerPaymentBlockedError,
  assertReviewerMayCreatePayment,
  isReviewerPaymentBlockEnabled,
  parseReviewerUserIds,
  reviewerPaymentBlockMessage,
} from "@/lib/reviewer/payment-block";

const USER_ID = "11111111-1111-4111-8111-111111111111";

const originalFlag = process.env[REVIEWER_PAYMENT_BLOCK_FLAG];
const originalIds = process.env[REVIEWER_USER_IDS_ENV];

afterEach(() => {
  restoreEnv(REVIEWER_PAYMENT_BLOCK_FLAG, originalFlag);
  restoreEnv(REVIEWER_USER_IDS_ENV, originalIds);
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function env(values: Record<string, string | undefined>) {
  return values;
}

describe("reviewer payment block", () => {
  it("stays off unless the flag is exactly true", () => {
    expect(isReviewerPaymentBlockEnabled(env({}))).toBe(false);
    expect(isReviewerPaymentBlockEnabled(env({ [REVIEWER_PAYMENT_BLOCK_FLAG]: "false" }))).toBe(
      false,
    );
    expect(isReviewerPaymentBlockEnabled(env({ [REVIEWER_PAYMENT_BLOCK_FLAG]: "1" }))).toBe(false);
    expect(isReviewerPaymentBlockEnabled(env({ [REVIEWER_PAYMENT_BLOCK_FLAG]: "TRUE" }))).toBe(
      false,
    );
    expect(isReviewerPaymentBlockEnabled(env({ [REVIEWER_PAYMENT_BLOCK_FLAG]: "true" }))).toBe(
      true,
    );
  });

  it("does not block a reviewer while the flag is off", () => {
    const message = reviewerPaymentBlockMessage(
      { userId: USER_ID, appMetadata: { reviewer: true } },
      env({
        [REVIEWER_USER_IDS_ENV]: USER_ID,
      }),
    );
    expect(message).toBeNull();
  });

  it("blocks an allowlisted user id when the flag is on", () => {
    const message = reviewerPaymentBlockMessage(
      { userId: USER_ID.toUpperCase(), appMetadata: {} },
      env({
        [REVIEWER_PAYMENT_BLOCK_FLAG]: "true",
        [REVIEWER_USER_IDS_ENV]: ` ${USER_ID}, other-id `,
      }),
    );
    expect(message).toBe(REVIEWER_PAYMENT_BLOCKED_MESSAGE);
  });

  it("blocks boolean app_metadata.reviewer and ignores a string", () => {
    const on = env({ [REVIEWER_PAYMENT_BLOCK_FLAG]: "true" });
    expect(
      reviewerPaymentBlockMessage({ userId: USER_ID, appMetadata: { reviewer: true } }, on),
    ).toBe(REVIEWER_PAYMENT_BLOCKED_MESSAGE);
    expect(
      reviewerPaymentBlockMessage({ userId: USER_ID, appMetadata: { reviewer: "true" } }, on),
    ).toBeNull();
    expect(reviewerPaymentBlockMessage({ userId: USER_ID, appMetadata: null }, on)).toBeNull();
  });

  it("does not treat a blank allowlist entry as every user", () => {
    expect(parseReviewerUserIds(" , ")).toEqual(new Set());
    expect(
      reviewerPaymentBlockMessage(
        { userId: USER_ID },
        env({
          [REVIEWER_PAYMENT_BLOCK_FLAG]: "true",
          [REVIEWER_USER_IDS_ENV]: " , ",
        }),
      ),
    ).toBeNull();
  });

  it("throws the friendly error before a caller can create a charge", () => {
    expect(() =>
      assertReviewerMayCreatePayment(
        { userId: USER_ID, appMetadata: { reviewer: true } },
        env({ [REVIEWER_PAYMENT_BLOCK_FLAG]: "true" }),
      ),
    ).toThrow(ReviewerPaymentBlockedError);
  });
});
