// Shared types for the /account/orders feature surface (Prompt #55).
//
// Kept separate from CartContext so order-history components don't pull
// the entire cart provider just for type information.

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface OrderItemSummary {
  id: string;
  productSlug: string;
  productName: string;
  productType: "supplement" | "genetic_test" | "custom_package" | "peptide";
  deliveryForm: string | null;
  quantity: number;
  unitPriceCents: number | null;
  lineTotalCents: number | null;
  metadata: Record<string, unknown> | null;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  createdAt: string;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  estimatedDeliveryDate: string | null;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  discountCode: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  carrier: string | null;
  shippingFirstName: string | null;
  shippingLastName: string | null;
  shippingAddressLine1: string | null;
  shippingAddressLine2: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingZip: string | null;
  shippingCountry: string | null;
  shippingPhone: string | null;
  shippingEmail: string | null;
  items: OrderItemSummary[];
}

export interface StatusHistoryEntry {
  id: string;
  status: OrderStatus;
  title: string;
  description: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  carrier: string | null;
  createdAt: string;
}

// Step definitions for the linear status tracker. The tracker walks
// these in order; cancelled / refunded orders short-circuit the path.
export interface StatusStep {
  status: OrderStatus;
  label: string;
  description: string;
}

export const STATUS_STEPS: StatusStep[] = [
  { status: "pending",          label: "Order Placed",      description: "Your order has been received" },
  { status: "confirmed",        label: "Confirmed",         description: "Payment verified, order confirmed" },
  { status: "processing",       label: "Processing",        description: "Your order is being prepared" },
  { status: "shipped",          label: "Shipped",           description: "Your order is on its way" },
  { status: "out_for_delivery", label: "Out for Delivery",  description: "Your package is out for delivery today" },
  { status: "delivered",        label: "Delivered",         description: "Your order has been delivered" },
];

/** Index of the current status within STATUS_STEPS, or -1 if cancelled. */
export function currentStepIndex(status: OrderStatus): number {
  if (status === "cancelled" || status === "refunded") return -1;
  return STATUS_STEPS.findIndex((s) => s.status === status);
}

/** Convert a raw shop_orders row + items into an OrderSummary. */
export function toOrderSummary(
  row: Record<string, any>,
  items: Record<string, any>[],
): OrderSummary {
  return {
    id: String(row.id),
    orderNumber: String(row.order_number),
    status: row.status as OrderStatus,
    createdAt: String(row.created_at),
    deliveredAt: row.delivered_at ?? null,
    cancelledAt: row.cancelled_at ?? null,
    cancellationReason: row.cancellation_reason ?? null,
    estimatedDeliveryDate: row.estimated_delivery_date ?? null,
    subtotalCents: Number(row.subtotal_cents ?? 0),
    discountCents: Number(row.discount_cents ?? 0),
    shippingCents: Number(row.shipping_cents ?? 0),
    taxCents: Number(row.tax_cents ?? 0),
    totalCents: Number(row.total_cents ?? 0),
    discountCode: row.discount_code ?? null,
    trackingNumber: row.tracking_number ?? null,
    trackingUrl: row.tracking_url ?? null,
    carrier: row.carrier ?? null,
    shippingFirstName: row.shipping_first_name ?? null,
    shippingLastName: row.shipping_last_name ?? null,
    shippingAddressLine1: row.shipping_address_line1 ?? null,
    shippingAddressLine2: row.shipping_address_line2 ?? null,
    shippingCity: row.shipping_city ?? null,
    shippingState: row.shipping_state ?? null,
    shippingZip: row.shipping_zip ?? null,
    shippingCountry: row.shipping_country ?? null,
    shippingPhone: row.shipping_phone ?? null,
    shippingEmail: row.shipping_email ?? null,
    items: items.map((it) => ({
      id: String(it.id),
      productSlug: String(it.product_slug),
      productName: String(it.product_name),
      productType: (it.product_type as OrderItemSummary["productType"]) ?? "supplement",
      deliveryForm: it.delivery_form ?? null,
      quantity: Number(it.quantity ?? 1),
      unitPriceCents: it.unit_price_cents ?? null,
      lineTotalCents: it.line_total_cents ?? null,
      metadata: (it.metadata as Record<string, unknown> | null) ?? null,
    })),
  };
}
