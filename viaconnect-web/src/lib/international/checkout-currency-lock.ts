// Prompt #111 — Checkout currency-lock session (§6.6).
// Once the user initiates checkout, the currency + market is frozen in the
// session cookie. Mid-checkout currency switches are rejected. Returning to
// the cart clears the lock and lets the user re-choose.

import type { MarketCode, CurrencyCode } from "./types";

export const LOCK_COOKIE = "viaconnect_checkout_lock";

export interface CheckoutLockPayload {
  market: MarketCode;
  currency: CurrencyCode;
  paymentIntentId: string;
  lockedAt: number;
}

export function encodeLock(payload: CheckoutLockPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeLock(value: string | null | undefined): CheckoutLockPayload | null {
  if (!value) return null;
  try {
    const json = Buffer.from(value, "base64url").toString("utf8");
    const obj = JSON.parse(json) as CheckoutLockPayload;
    if (!obj.market || !obj.currency || !obj.paymentIntentId) return null;
    return obj;
  } catch {
    return null;
  }
}

/**
 * Reject a currency/market switch if the caller has an active lock that
 * doesn't match the requested currency.
 */
export function assertLockMatchesOrThrow(
  lock: CheckoutLockPayload | null,
  requestedCurrency: CurrencyCode,
): void {
  if (!lock) return;
  if (lock.currency !== requestedCurrency) {
    throw new Error(
      `Prompt #111: currency locked to ${lock.currency} for active checkout; cannot switch to ${requestedCurrency}. Return to cart to change.`,
    );
  }
}
