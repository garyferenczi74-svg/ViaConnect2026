/**
 * Checkout adapter — single source of truth for cart/checkout gating.
 * Called by the client CheckoutGuard AND the server checkout submit handler.
 */

import { ViolationDetector } from "../engine/ViolationDetector";
import type { Finding } from "../engine/types";

export interface CartItem {
  sku: string;
  category: string;
  name?: string;
  price?: number;
}

export interface CheckoutContext {
  userId: string;
  userAge?: number | null;
  hasActivePractitionerLink?: boolean;
  shippingState?: string;
  cart: CartItem[];
}

export interface CheckoutScanResult {
  blocked: boolean;
  modalKey?: "retatrutide_stacking" | "age_verification" | "practitioner_required" | "restricted_state" | "generic";
  findings: Finding[];
}

export async function scanCheckout(ctx: CheckoutContext): Promise<CheckoutScanResult> {
  const detector = new ViolationDetector();
  const res = await detector.detect({
    surface: "checkout",
    source: "runtime",
    cart: ctx.cart,
    userRole: "consumer",
    location: { userId: ctx.userId },
  });

  let modalKey: CheckoutScanResult["modalKey"];
  const first = res.findings.find((f) => f.severity === "P0") ?? res.findings[0];
  if (first) {
    if (first.ruleId === "MARSHALL.PEPTIDE.NO_RETATRUTIDE_STACKING") modalKey = "retatrutide_stacking";
    else if (first.ruleId === "MARSHALL.PEPTIDE.PEPTIDE_AGE_GATE") modalKey = "age_verification";
    else if (first.ruleId === "MARSHALL.PEPTIDE.PEPTIDE_PRACTITIONER_GATE") modalKey = "practitioner_required";
    else if (first.ruleId.startsWith("MARSHALL.GENETIC.")) modalKey = "restricted_state";
    else modalKey = "generic";
  }

  return {
    blocked: res.blocked,
    modalKey,
    findings: res.findings,
  };
}
