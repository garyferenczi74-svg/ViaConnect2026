// Prompt #111 — checkout currency lock encoding + enforcement.

import { describe, it, expect } from "vitest";
import {
  encodeLock,
  decodeLock,
  assertLockMatchesOrThrow,
} from "@/lib/international/checkout-currency-lock";

describe("checkout-currency-lock", () => {
  it("encode/decode roundtrip preserves payload", () => {
    const payload = { market: "EU" as const, currency: "EUR" as const, paymentIntentId: "pi_test_123", lockedAt: 1700000000 };
    const enc = encodeLock(payload);
    const dec = decodeLock(enc);
    expect(dec).toEqual(payload);
  });

  it("decodeLock returns null for garbage", () => {
    expect(decodeLock("not-base64")).toBeNull();
    expect(decodeLock(null)).toBeNull();
    expect(decodeLock(undefined)).toBeNull();
    expect(decodeLock("")).toBeNull();
  });

  it("assertLockMatchesOrThrow is a noop when lock is null", () => {
    expect(() => assertLockMatchesOrThrow(null, "USD")).not.toThrow();
  });

  it("assertLockMatchesOrThrow passes when currencies match", () => {
    const lock = { market: "UK" as const, currency: "GBP" as const, paymentIntentId: "pi_x", lockedAt: 0 };
    expect(() => assertLockMatchesOrThrow(lock, "GBP")).not.toThrow();
  });

  it("assertLockMatchesOrThrow rejects a currency switch mid-checkout", () => {
    const lock = { market: "UK" as const, currency: "GBP" as const, paymentIntentId: "pi_x", lockedAt: 0 };
    expect(() => assertLockMatchesOrThrow(lock, "EUR")).toThrow(/currency locked to GBP/);
  });
});
