import { afterEach, describe, expect, it, vi } from "vitest";
import {
  REVIEWER_PAYMENT_BLOCKED_MESSAGE,
  REVIEWER_PAYMENT_BLOCK_FLAG,
  REVIEWER_USER_IDS_ENV,
  ReviewerPaymentBlockedError,
} from "@/lib/reviewer/payment-block";
import type { PricingSupabaseClient } from "@/lib/pricing/supabase-types";

const sessionsCreate = vi.fn();

vi.mock("stripe", () => ({
  default: class StripeMock {
    checkout = { sessions: { create: sessionsCreate } };
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: "reviewer-1",
            email: "reviewer@example.com",
            app_metadata: { reviewer: true },
            user_metadata: {},
          },
        },
        error: null,
      }),
    },
    from() {
      return {
        insert: async () => ({ error: null }),
      };
    },
  }),
}));

vi.mock("@/lib/pricing/stripe", () => ({
  getStripe: () => {
    throw new Error("stripe client should not be constructed for a blocked reviewer");
  },
  getSiteOrigin: () => "https://viaconnectapp.com",
}));

const originalFlag = process.env[REVIEWER_PAYMENT_BLOCK_FLAG];
const originalIds = process.env[REVIEWER_USER_IDS_ENV];
const originalStripeKey = process.env.STRIPE_SECRET_KEY;
const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  restore(REVIEWER_PAYMENT_BLOCK_FLAG, originalFlag);
  restore(REVIEWER_USER_IDS_ENV, originalIds);
  restore("STRIPE_SECRET_KEY", originalStripeKey);
  restore("NEXT_PUBLIC_APP_URL", originalAppUrl);
  sessionsCreate.mockReset();
});

function restore(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function enableBlock(): void {
  process.env[REVIEWER_PAYMENT_BLOCK_FLAG] = "true";
  process.env[REVIEWER_USER_IDS_ENV] = "reviewer-1";
  process.env.STRIPE_SECRET_KEY = "sk_test_reviewer_block";
  process.env.NEXT_PUBLIC_APP_URL = "https://viaconnectapp.com";
}

describe("reviewer checkout paths", () => {
  it("refuses the Stripe checkout route before a session is created", async () => {
    enableBlock();
    const { POST } = await import("@/app/api/stripe/checkout/route");
    const response = await POST(
      new Request("https://viaconnectapp.com/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://viaconnectapp.com" },
        body: JSON.stringify({ priceId: "price_test", mode: "payment" }),
      }),
    );
    expect(response.status).toBe(403);
    const body = (await response.json()) as { error?: string; errorCode?: string };
    expect(body.error).toBe(REVIEWER_PAYMENT_BLOCKED_MESSAGE);
    expect(body.errorCode).toBe("REVIEWER_PAYMENT_BLOCKED");
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("refuses shop checkout before Stripe is constructed", async () => {
    enableBlock();
    const { createCheckoutSession } = await import("@/lib/shop/checkout-actions");
    const result = await createCheckoutSession({
      cart: [],
      form: { email: "reviewer@example.com", phone: "", firstName: "Sample", lastName: "Account" },
      appliedHelix: 0,
      appliedPromo: null,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe(REVIEWER_PAYMENT_BLOCKED_MESSAGE);
  });

  it("refuses membership, kit, stack, and family helpers before Stripe", async () => {
    enableBlock();
    const checkout = await import("@/lib/pricing/stripe-checkout");
    const client = {} as unknown as PricingSupabaseClient;
    const identity = { userId: "reviewer-1", appMetadata: { reviewer: true } };
    await expect(
      checkout.createMembershipCheckoutSession({
        client,
        email: null,
        tierId: "gold",
        billingCycle: "monthly",
        ...identity,
      }),
    ).rejects.toBeInstanceOf(ReviewerPaymentBlockedError);
    await expect(
      checkout.createFamilyMembershipCheckoutSession({
        client,
        email: null,
        totalAdults: 1,
        totalChildren: 0,
        billingCycle: "monthly",
        ...identity,
      }),
    ).rejects.toBeInstanceOf(ReviewerPaymentBlockedError);
    await expect(
      checkout.createGeneX360CheckoutSession({
        client,
        email: null,
        productId: "genex_m",
        ...identity,
      }),
    ).rejects.toBeInstanceOf(ReviewerPaymentBlockedError);
    await expect(
      checkout.createOutcomeStackCheckoutSession({
        client,
        email: null,
        stackId: "stack-1",
        isSubscription: false,
        ...identity,
      }),
    ).rejects.toBeInstanceOf(ReviewerPaymentBlockedError);
  });

  it("refuses a white-label payment intent before reading the order", async () => {
    enableBlock();
    const { createWhiteLabelPaymentIntent } = await import(
      "@/lib/white-label/stripe-production-payment"
    );
    await expect(
      createWhiteLabelPaymentIntent({
        productionOrderId: "order-1",
        paymentType: "deposit",
        supabase: {
          from() {
            throw new Error("order table should not be read");
          },
        },
        actorUserId: "reviewer-1",
        actorAppMetadata: { reviewer: true },
      }),
    ).rejects.toBeInstanceOf(ReviewerPaymentBlockedError);
  });

  it("refuses legacy subscription and panel checkout helpers", async () => {
    enableBlock();
    const service = await import("@/lib/api/stripe-service");
    await expect(
      service.createSubscriptionCheckout("reviewer-1", "reviewer@example.com", "gold"),
    ).rejects.toBeInstanceOf(ReviewerPaymentBlockedError);
    await expect(
      service.createPanelCheckout("reviewer-1", "GENEX-M"),
    ).rejects.toBeInstanceOf(ReviewerPaymentBlockedError);
  });
});
