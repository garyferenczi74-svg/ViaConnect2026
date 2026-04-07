"use client";

// /account/orders/[orderId] — Prompt #55. Full order detail page with
// status tracker, line items, summary, shipping address, action row,
// timeline, and a cancel-order modal that's only available while the
// order is still pending.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Truck,
  Copy,
  Check,
  Printer,
  HelpCircle,
  Ban,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { formatCents } from "@/context/CartContext";
import { OrderStatusTracker } from "@/components/account/OrderStatusTracker";
import { OrderTimeline } from "@/components/account/OrderTimeline";
import { ReorderButton } from "@/components/account/ReorderButton";
import {
  toOrderSummary,
  type OrderStatus,
  type OrderSummary,
  type StatusHistoryEntry,
} from "@/components/account/orderTypes";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function OrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = Array.isArray(params?.orderId)
    ? params!.orderId[0]
    : params?.orderId;

  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  async function load() {
    if (!orderId) return;
    setLoading(true);
    const supabase = createClient();
    const { data: orderRow, error: orderErr } = await (supabase as any)
      .from("shop_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    if (orderErr || !orderRow) {
      setError("Order not found.");
      setLoading(false);
      return;
    }
    const [itemsRes, historyRes] = await Promise.all([
      (supabase as any)
        .from("shop_order_items")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true }),
      (supabase as any)
        .from("shop_order_status_history")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false }),
    ]);
    const items = (itemsRes.data as any[]) ?? [];
    const historyRows = (historyRes.data as any[]) ?? [];
    setOrder(toOrderSummary(orderRow, items));
    setHistory(
      historyRows.map((h) => ({
        id: String(h.id),
        status: h.status as OrderStatus,
        title: String(h.title),
        description: h.description ?? null,
        trackingNumber: h.tracking_number ?? null,
        trackingUrl: h.tracking_url ?? null,
        carrier: h.carrier ?? null,
        createdAt: String(h.created_at),
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const canCancel = order?.status === "pending";

  function copyOrderNumber() {
    if (!order) return;
    navigator.clipboard.writeText(`#${order.orderNumber}`).then(() => {
      setCopied(true);
      toast.success("Order number copied");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-12 text-center">
        <Loader2
          className="w-6 h-6 text-white/40 mx-auto animate-spin"
          strokeWidth={1.5}
        />
        <p className="text-sm text-white/40 mt-3">Loading order details…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-5">
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          Back to Orders
        </Link>
        <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-8 text-center">
          <AlertCircle
            className="w-7 h-7 text-red-400 mx-auto mb-3"
            strokeWidth={1.5}
          />
          <p className="text-base text-white mb-1">We couldn't find that order</p>
          <p className="text-sm text-white/50">{error ?? "It may have been removed."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          Back to Orders
        </Link>
        <p className="text-xs text-white/45 font-mono">#{order.orderNumber}</p>
      </div>

      {/* Status tracker */}
      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
        <OrderStatusTracker
          currentStatus={order.status}
          statusHistory={history}
          estimatedDeliveryDate={order.estimatedDeliveryDate}
          variant="full"
        />
      </section>

      {/* Tracking info */}
      {order.trackingNumber && (
        <section className="rounded-2xl border border-[#2DA5A0]/25 bg-[#2DA5A0]/5 p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2DA5A0]/15 border border-[#2DA5A0]/30 flex items-center justify-center flex-shrink-0">
              <Truck className="w-5 h-5 text-[#2DA5A0]" strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wider text-[#2DA5A0] font-semibold mb-1">
                Shipment Tracking
              </p>
              {order.carrier && (
                <p className="text-sm text-white">
                  Carrier: <span className="font-semibold">{order.carrier.toUpperCase()}</span>
                </p>
              )}
              <p className="text-sm text-white/75 font-mono break-all mt-0.5">
                {order.trackingNumber}
              </p>
              {order.estimatedDeliveryDate && (
                <p className="text-xs text-white/55 mt-1">
                  Estimated delivery: {formatDate(order.estimatedDeliveryDate)}
                </p>
              )}
              {order.trackingUrl && (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-[#2DA5A0] hover:underline"
                >
                  Track on {order.carrier?.toUpperCase() ?? "carrier"}
                  <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Items */}
      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Order Items</h3>
        {order.items.length === 0 ? (
          <p className="text-sm text-white/40">No line items recorded.</p>
        ) : (
          <ul className="space-y-3">
            {order.items.map((it) => {
              const aiRecommended =
                it.metadata && (it.metadata as any).aiRecommended === true;
              return (
                <li
                  key={it.id}
                  className="rounded-xl bg-[#1A2744] border border-white/[0.06] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-white truncate">
                          {it.productName}
                        </p>
                        {aiRecommended && (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#7C6FE0]/15 text-[#7C6FE0] border border-[#7C6FE0]/30 font-semibold">
                            <Sparkles className="w-3 h-3" strokeWidth={1.5} />
                            AI Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/45 mt-0.5">
                        {it.deliveryForm ?? it.productType.replace("_", " ")}
                        {it.metadata?.category ? (
                          <> · {String(it.metadata.category)}</>
                        ) : null}
                      </p>
                      <p className="text-xs text-white/55 mt-1">
                        Qty: {it.quantity}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-white">
                        {it.lineTotalCents !== null
                          ? formatCents(it.lineTotalCents)
                          : "—"}
                      </p>
                      <Link
                        href={`/shop/peptides/${it.productSlug}`}
                        className="text-[10px] text-[#2DA5A0] hover:underline mt-1 inline-block"
                      >
                        View in Shop →
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Summary + shipping (side-by-side on desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Order Summary</h3>
          <dl className="space-y-1.5 text-sm">
            <Row label="Subtotal">{formatCents(order.subtotalCents)}</Row>
            {order.discountCents > 0 && (
              <Row label={`Discount${order.discountCode ? ` (${order.discountCode})` : ""}`}>
                <span className="text-green-400">−{formatCents(order.discountCents)}</span>
              </Row>
            )}
            <Row label="Shipping">
              {order.shippingCents === 0 ? "Free" : formatCents(order.shippingCents)}
            </Row>
            <Row label="Tax">{formatCents(order.taxCents)}</Row>
            <div className="my-2 h-px bg-white/[0.08]" />
            <Row label={<span className="text-white/85">Total</span>}>
              <span className="text-base font-bold text-white">
                {formatCents(order.totalCents)}
              </span>
            </Row>
          </dl>
        </section>

        {order.shippingFirstName && (
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Shipping Address</h3>
            <address className="not-italic text-sm text-white/75 leading-relaxed">
              {order.shippingFirstName} {order.shippingLastName}
              <br />
              {order.shippingAddressLine1}
              {order.shippingAddressLine2 && (
                <>
                  <br />
                  {order.shippingAddressLine2}
                </>
              )}
              <br />
              {order.shippingCity}, {order.shippingState} {order.shippingZip}
              {order.shippingCountry && order.shippingCountry !== "US" && (
                <>
                  <br />
                  {order.shippingCountry}
                </>
              )}
              {order.shippingPhone && (
                <>
                  <br />
                  <span className="text-white/55">{order.shippingPhone}</span>
                </>
              )}
              {order.shippingEmail && (
                <>
                  <br />
                  <span className="text-white/55">{order.shippingEmail}</span>
                </>
              )}
            </address>
          </section>
        )}
      </div>

      {/* Actions */}
      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {order.status !== "cancelled" && order.status !== "refunded" && (
            <ReorderButton
              orderNumber={order.orderNumber}
              items={order.items}
              variant="full"
            />
          )}
          <button
            type="button"
            onClick={copyOrderNumber}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-sm font-semibold text-white/80 transition-all min-h-[44px]"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" strokeWidth={1.5} />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" strokeWidth={1.5} />
                Copy Order #
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-sm font-semibold text-white/80 transition-all min-h-[44px]"
          >
            <Printer className="w-4 h-4" strokeWidth={1.5} />
            Print Order
          </button>
          <a
            href="mailto:support@farmceutica.com?subject=Help%20with%20order%20%23"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-sm font-semibold text-white/80 transition-all min-h-[44px]"
          >
            <HelpCircle className="w-4 h-4" strokeWidth={1.5} />
            Need Help?
          </a>
          {canCancel && (
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-xl text-sm font-semibold text-red-300 transition-all min-h-[44px] sm:col-span-2"
            >
              <Ban className="w-4 h-4" strokeWidth={1.5} />
              Cancel Order
            </button>
          )}
        </div>
      </section>

      {/* Timeline */}
      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Order Timeline</h3>
        <OrderTimeline statusHistory={history} />
      </section>

      <CancelOrderModal
        open={showCancelModal}
        orderNumber={order.orderNumber}
        orderId={order.id}
        onClose={() => setShowCancelModal(false)}
        onCancelled={async () => {
          setShowCancelModal(false);
          await load();
        }}
      />
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-white/55">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

// ── Cancel modal ─────────────────────────────────────────────────────────

function CancelOrderModal({
  open,
  orderId,
  orderNumber,
  onClose,
  onCancelled,
}: {
  open: boolean;
  orderId: string;
  orderNumber: string;
  onClose: () => void;
  onCancelled: () => void | Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    const supabase = createClient();
    const { error: updateErr } = await (supabase as any)
      .from("shop_orders")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason.trim() || null,
      })
      .eq("id", orderId);
    if (updateErr) {
      toast.error("Could not cancel order");
      setSubmitting(false);
      return;
    }
    await (supabase as any).from("shop_order_status_history").insert({
      order_id: orderId,
      status: "cancelled",
      title: "Order Cancelled",
      description: reason.trim()
        ? `Cancelled by customer: ${reason.trim()}`
        : "Cancelled by customer",
    });
    toast.success("Order cancelled");
    setSubmitting(false);
    setReason("");
    await onCancelled();
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !submitting && onClose()}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md rounded-2xl border border-white/[0.10] bg-[#1E3054] p-6 shadow-2xl"
          >
            <h3 className="text-base font-semibold text-white mb-1">
              Cancel order #{orderNumber}?
            </h3>
            <p className="text-sm text-white/60 mb-4 leading-relaxed">
              This action cannot be undone. Your order will be cancelled and
              any payment will be refunded within 5–7 business days.
            </p>
            <label className="block text-xs uppercase tracking-wider text-white/55 mb-1">
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full bg-[#1A2744] border border-white/[0.10] rounded-lg p-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#2DA5A0]/50 resize-none"
              placeholder="Tell us why you're cancelling…"
            />
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-sm text-white/70 hover:text-white border border-white/[0.10] hover:border-white/[0.20] transition-all"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500/90 hover:bg-red-500 transition-all inline-flex items-center gap-2 disabled:opacity-60"
              >
                {submitting && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                )}
                Cancel Order
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
