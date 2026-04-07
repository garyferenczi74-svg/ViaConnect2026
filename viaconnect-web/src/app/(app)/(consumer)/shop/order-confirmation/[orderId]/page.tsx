"use client";

// /shop/order-confirmation/[orderId] — success page after a successful order.
// Loads the order + line items by id (RLS scopes to the current user).

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Check, ArrowRight, ShoppingBag, Loader2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCents } from "@/context/CartContext";

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  shipping_first_name: string | null;
  shipping_last_name: string | null;
  shipping_address_line1: string | null;
  shipping_address_line2: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_zip: string | null;
  shipping_email: string | null;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  discount_code: string | null;
}

interface OrderItemRow {
  id: string;
  product_name: string;
  delivery_form: string | null;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
}

export default function OrderConfirmationPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params?.orderId;
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data: orderData, error: orderErr } = await (supabase as any)
        .from("shop_orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();
      if (!active) return;
      if (orderErr || !orderData) {
        setError("Order not found.");
        setLoading(false);
        return;
      }
      setOrder(orderData as OrderRow);
      const { data: itemData } = await (supabase as any)
        .from("shop_order_items")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      if (!active) return;
      setOrderItems((itemData as OrderItemRow[]) ?? []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [orderId]);

  return (
    <div
      className="min-h-screen w-full px-4 py-10 sm:px-6 lg:px-10"
      style={{ background: "linear-gradient(180deg, #141E33 0%, #1A2744 30%, #1A2744 100%)" }}
    >
      <div className="mx-auto max-w-2xl">
        {loading ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-12 text-center">
            <Loader2 className="w-6 h-6 text-white/40 mx-auto animate-spin" strokeWidth={1.5} />
            <p className="text-sm text-white/40 mt-3">Loading your order…</p>
          </div>
        ) : error || !order ? (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-8 text-center">
            <AlertTriangle className="w-7 h-7 text-red-400 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-base text-white mb-1">We couldn't find that order</p>
            <p className="text-sm text-white/50 mb-5">{error ?? "It may have been removed."}</p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#2DA5A0] hover:bg-[#2DA5A0]/85 transition-all"
            >
              Back to Shop
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Hero */}
            <div className="rounded-2xl border border-[#2DA5A0]/25 bg-gradient-to-br from-[#2DA5A0]/10 via-[#1E3054] to-[#1A2744] p-8 text-center">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className="w-16 h-16 mx-auto rounded-full bg-[#2DA5A0]/15 border border-[#2DA5A0]/40 flex items-center justify-center mb-4"
              >
                <Check className="w-8 h-8 text-[#2DA5A0]" strokeWidth={2} />
              </motion.div>
              <h1 className="text-xl md:text-2xl font-bold text-white mb-1">
                Order Placed Successfully
              </h1>
              <p className="text-sm text-white/60 mb-3">
                Order <span className="font-mono text-white/90">#{order.order_number}</span>
              </p>
              <p className="text-sm text-white/60 max-w-md mx-auto leading-relaxed">
                Thank you for your order. You will receive an email confirmation
                {order.shipping_email && (
                  <> at <span className="text-white/90">{order.shipping_email}</span></>
                )}{" "}
                with payment instructions and tracking details.
              </p>
            </div>

            {/* Order details */}
            <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Order Details</h2>
              {orderItems.length === 0 ? (
                <p className="text-sm text-white/40">No line items recorded.</p>
              ) : (
                <ul className="space-y-2">
                  {orderItems.map(it => (
                    <li
                      key={it.id}
                      className="flex items-start justify-between gap-3 text-sm py-1.5 border-b border-white/[0.04] last:border-b-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-white">
                          {it.product_name}{" "}
                          <span className="text-white/40 font-normal">(×{it.quantity})</span>
                        </p>
                        {it.delivery_form && (
                          <p className="text-[10px] text-white/40">{it.delivery_form}</p>
                        )}
                      </div>
                      <p className="text-white/80 whitespace-nowrap">
                        {it.unit_price_cents > 0
                          ? formatCents(it.line_total_cents)
                          : "Contact for Pricing"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              <div className="my-4 h-px bg-white/[0.08]" />
              <dl className="space-y-1.5 text-sm">
                <Row label="Subtotal">{formatCents(order.subtotal_cents)}</Row>
                {order.discount_cents > 0 && (
                  <Row label={`Discount${order.discount_code ? ` (${order.discount_code})` : ""}`}>
                    <span className="text-green-400">−{formatCents(order.discount_cents)}</span>
                  </Row>
                )}
                <Row label="Shipping">
                  {order.shipping_cents === 0 ? "Free" : formatCents(order.shipping_cents)}
                </Row>
                <Row label="Tax">{formatCents(order.tax_cents)}</Row>
                <div className="my-2 h-px bg-white/[0.08]" />
                <Row label={<span className="text-white/80">Total</span>}>
                  <span className="text-lg font-bold text-white">{formatCents(order.total_cents)}</span>
                </Row>
              </dl>
            </section>

            {/* Shipping */}
            {order.shipping_first_name && (
              <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                <h2 className="text-sm font-semibold text-white mb-3">Shipping To</h2>
                <address className="not-italic text-sm text-white/70 leading-relaxed">
                  {order.shipping_first_name} {order.shipping_last_name}<br />
                  {order.shipping_address_line1}
                  {order.shipping_address_line2 && (
                    <>
                      <br />
                      {order.shipping_address_line2}
                    </>
                  )}
                  <br />
                  {order.shipping_city}, {order.shipping_state} {order.shipping_zip}
                </address>
              </section>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/shop"
                className="flex-1 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white border border-white/[0.10] hover:border-white/[0.20] hover:bg-white/[0.04] rounded-xl py-3 transition-all"
              >
                <ShoppingBag className="w-4 h-4" strokeWidth={1.5} />
                Continue Shopping
              </Link>
              <Link
                href="/account/orders"
                className="flex-1 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-[#2DA5A0] hover:bg-[#2DA5A0]/85 shadow-lg shadow-[#2DA5A0]/20 rounded-xl py-3 transition-all"
              >
                View My Orders
                <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-white/60">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
