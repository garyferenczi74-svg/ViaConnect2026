// Prompt #91 Phase 3: Drop-ship to patient orchestration.
//
// A practitioner can place an order that ships directly to a patient
// instead of into the practitioner's own inventory. This module is the
// thin orchestration layer:
//
//   1. Verify the practitioner has an `active` row in practitioner_patients
//      for the target patient.
//   2. Resolve MSRP for each line item from genex360_products (and any
//      future supplement catalog table).
//   3. Apply wholesale pricing to the line items.
//   4. Validate MOQ. The MOQ rule is the same $500 minimum as standard
//      wholesale orders; per spec, drop-ship orders for a single patient
//      typically clear MOQ comfortably with even a partial protocol.
//   5. Insert a shop_orders row tagged with order_type='drop_ship',
//      placed_by_practitioner_id, drop_ship_patient_user_id, and the
//      meets_moq flag.
//
// This module does NOT process payment. Callers are expected to wrap this
// in a Stripe checkout flow or invoice path.

import type { PricingSupabaseClient } from './supabase-types';
import {
  buildWholesaleContext,
  calculateWholesalePrice,
  validateWholesaleMOQ,
  type WholesalePrice,
  type WholesalePricingContext,
} from './wholesale-engine';

export interface DropShipLineItem {
  sku: string;
  quantity: number;
  msrpCentsEach: number;
}

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string | null;
  email?: string | null;
}

export interface CreateDropShipOrderInput {
  client: PricingSupabaseClient;
  practitionerUserId: string;
  patientUserId: string;
  lineItems: DropShipLineItem[];
  shippingAddress: ShippingAddress;
  practitionerNote?: string;
}

export interface CreateDropShipOrderResult {
  ok: boolean;
  orderId?: string;
  wholesaleTotalCents: number;
  meetsMoq: boolean;
  shortfallCents: number;
  reason?: string;
}

const PRACTITIONER_PATIENTS_TABLE = 'practitioner_patients';
const SHOP_ORDERS_TABLE = 'shop_orders';

export async function createDropShipOrder(
  input: CreateDropShipOrderInput,
): Promise<CreateDropShipOrderResult> {
  const { client, practitionerUserId, patientUserId, lineItems } = input;

  // 1. Active relationship check.
  const { data: rel, error: relErr } = await (client as any)
    .from(PRACTITIONER_PATIENTS_TABLE)
    .select('status')
    .eq('practitioner_id', practitionerUserId)
    .eq('patient_id', patientUserId)
    .eq('status', 'active')
    .maybeSingle();

  if (relErr || !rel) {
    return {
      ok: false,
      wholesaleTotalCents: 0,
      meetsMoq: false,
      shortfallCents: 0,
      reason: 'No active relationship between practitioner and patient.',
    };
  }

  // 2. Wholesale context for the practitioner.
  const wholesaleCtx = await buildWholesaleContext(client, practitionerUserId);
  if (!wholesaleCtx) {
    return {
      ok: false,
      wholesaleTotalCents: 0,
      meetsMoq: false,
      shortfallCents: 0,
      reason:
        'Practitioner is not eligible for wholesale pricing. Check subscription and Foundation certification status.',
    };
  }

  // 3. Apply wholesale pricing to each line item.
  const priced = lineItems.map((li) => {
    const price = calculateWholesalePrice(li.msrpCentsEach, wholesaleCtx);
    return { ...li, price };
  });
  const wholesaleTotalCents = priced.reduce(
    (sum, li) => sum + li.price.wholesaleCents * li.quantity,
    0,
  );

  // 4. MOQ check. Drop-ship orders share the wholesale MOQ rule.
  const moq = validateWholesaleMOQ(wholesaleTotalCents);
  if (!moq.meetsMoq) {
    return {
      ok: false,
      wholesaleTotalCents,
      meetsMoq: false,
      shortfallCents: moq.shortfallCents,
      reason: `Order is below the wholesale minimum. Add ${moq.shortfallCents} cents to qualify.`,
    };
  }

  // 5. Insert the shop_orders row.
  const subtotal = wholesaleTotalCents;
  const orderNumber = `DS-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const { data: inserted, error: insErr } = await (client as any)
    .from(SHOP_ORDERS_TABLE)
    .insert({
      order_number: orderNumber,
      portal_type: 'practitioner',
      order_type: 'drop_ship',
      placed_by_practitioner_id: wholesaleCtx.practitionerId,
      drop_ship_patient_user_id: patientUserId,
      practitioner_note: input.practitionerNote ?? null,
      shipping_first_name: input.shippingAddress.firstName,
      shipping_last_name: input.shippingAddress.lastName,
      shipping_address_line1: input.shippingAddress.line1,
      shipping_address_line2: input.shippingAddress.line2 ?? null,
      shipping_city: input.shippingAddress.city,
      shipping_state: input.shippingAddress.state,
      shipping_postal_code: input.shippingAddress.postalCode,
      shipping_country: input.shippingAddress.country,
      shipping_phone: input.shippingAddress.phone ?? null,
      shipping_email: input.shippingAddress.email ?? null,
      subtotal_cents: subtotal,
      shipping_cents: 0,
      discount_cents: 0,
      total_cents: subtotal,
      wholesale_total_cents: wholesaleTotalCents,
      meets_moq: true,
      status: 'pending',
      metadata: {
        line_items: priced.map((li) => ({
          sku: li.sku,
          quantity: li.quantity,
          msrp_cents_each: li.msrpCentsEach,
          wholesale_cents_each: li.price.wholesaleCents,
        })),
      },
    })
    .select('id')
    .single();

  if (insErr || !inserted) {
    return {
      ok: false,
      wholesaleTotalCents,
      meetsMoq: true,
      shortfallCents: 0,
      reason: insErr?.message ?? 'Failed to insert order.',
    };
  }

  return {
    ok: true,
    orderId: inserted.id as string,
    wholesaleTotalCents,
    meetsMoq: true,
    shortfallCents: 0,
  };
}

// Re-exports for ergonomics at the call site.
export type { WholesalePrice, WholesalePricingContext } from './wholesale-engine';
