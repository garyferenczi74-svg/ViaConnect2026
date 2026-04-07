"use client";

// /shop/cart — full-page cart view with items + sidebar order summary

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Sparkles, Trash2, Minus, Plus, ShoppingBag,
  AlertTriangle, Tag,
} from "lucide-react";
import { useCart, formatCents, type CartItem } from "@/context/CartContext";

export default function ShopCartPage() {
  const { items, itemCount, subtotalCents, removeItem, updateQuantity, clearCart, isLoading } = useCart();
  const [confirmClear, setConfirmClear] = useState(false);

  const hasUnpriced = items.some(i => i.unitPriceCents == null);

  return (
    <div
      className="min-h-screen w-full px-4 py-6 pb-28 lg:pb-6 sm:px-6 lg:px-10"
      style={{ background: "linear-gradient(180deg, #141E33 0%, #1A2744 30%, #1A2744 100%)" }}
    >
      <div className="mx-auto max-w-6xl">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            Back to Shop
          </Link>
          <h1 className="text-base md:text-lg font-bold text-white">
            Your Cart{" "}
            <span className="text-white/40 font-normal">
              ({itemCount} item{itemCount === 1 ? "" : "s"})
            </span>
          </h1>
        </div>

        {isLoading ? (
          <p className="text-sm text-white/40">Loading…</p>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Items column */}
            <section className="lg:col-span-3 space-y-3">
              {items.map(item => (
                <CartItemCard
                  key={item.id}
                  item={item}
                  onRemove={() => removeItem(item.id)}
                  onIncrement={() => updateQuantity(item.id, item.quantity + 1)}
                  onDecrement={() => updateQuantity(item.id, item.quantity - 1)}
                />
              ))}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="text-xs text-white/40 hover:text-red-400 transition-colors inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                  Clear Cart
                </button>
              </div>
            </section>

            {/* Sidebar */}
            <aside className="lg:col-span-2">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 lg:sticky lg:top-6">
                <h2 className="text-base font-semibold text-white mb-4">Order Summary</h2>

                <dl className="space-y-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-white/60">Subtotal ({itemCount} item{itemCount === 1 ? "" : "s"})</dt>
                    <dd className="text-white font-medium">{formatCents(subtotalCents, "—")}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-white/60">Shipping</dt>
                    <dd className="text-white/40 text-xs italic">Calculated at checkout</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-white/60">Discount</dt>
                    <dd className="text-white/40">−$0.00</dd>
                  </div>
                </dl>

                <div className="my-4 h-px bg-white/[0.08]" />

                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-white/60">Estimated Total</span>
                  <span className="text-lg font-bold text-white">{formatCents(subtotalCents, "—")}</span>
                </div>

                {hasUnpriced && (
                  <div className="rounded-xl border border-[#B75E18]/25 bg-[#B75E18]/8 px-3 py-2 mb-4 flex items-start gap-2">
                    <AlertTriangle
                      className="w-3.5 h-3.5 text-[#B75E18] flex-shrink-0 mt-0.5"
                      strokeWidth={1.5}
                    />
                    <p className="text-[10px] text-[#B75E18]/90 leading-snug">
                      Some items in your cart show "Contact for Pricing" and aren't included in the estimate. Final price will be confirmed after order review.
                    </p>
                  </div>
                )}

                <Link
                  href="/shop/checkout"
                  className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-[#2DA5A0] hover:bg-[#2DA5A0]/85 shadow-lg shadow-[#2DA5A0]/20 rounded-xl py-3 transition-all"
                >
                  Proceed to Checkout
                  <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                </Link>

                <Link
                  href="/shop"
                  className="w-full text-center block mt-2 text-xs text-white/50 hover:text-white/80 transition-colors py-2"
                >
                  Continue Shopping
                </Link>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Mobile-only sticky checkout bar. Hidden on lg+ since the sidebar
          summary already provides the checkout CTA there. */}
      {!isLoading && items.length > 0 && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/[0.08] bg-[#1A2744]/95 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-3 shadow-[0_-8px_24px_rgba(0,0,0,0.4)]">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-white/40">Subtotal</p>
            <p className="text-base font-bold text-white truncate">
              {formatCents(subtotalCents, "—")}
            </p>
          </div>
          <Link
            href="/shop/checkout"
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-[#2DA5A0] hover:bg-[#2DA5A0]/85 shadow-lg shadow-[#2DA5A0]/20 rounded-xl px-5 py-3 min-h-[44px] flex-shrink-0"
          >
            Checkout
            <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </Link>
        </div>
      )}

      <ConfirmClearModal
        open={confirmClear}
        onCancel={() => setConfirmClear(false)}
        onConfirm={async () => {
          await clearCart();
          setConfirmClear(false);
        }}
      />
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-12 text-center">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4">
        <ShoppingBag className="w-7 h-7 text-white/30" strokeWidth={1.5} />
      </div>
      <p className="text-base text-white/70 mb-1">Your cart is empty</p>
      <p className="text-sm text-white/40 mb-6">Browse the shop to start building your protocol.</p>
      <Link
        href="/shop"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#2DA5A0] hover:bg-[#2DA5A0]/85 shadow-lg shadow-[#2DA5A0]/20 transition-all"
      >
        Browse Shop
      </Link>
    </div>
  );
}

// ── Item card ──────────────────────────────────────────────────────────
function CartItemCard({
  item, onRemove, onIncrement, onDecrement,
}: {
  item: CartItem;
  onRemove: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const lineCents = item.unitPriceCents != null ? item.unitPriceCents * item.quantity : null;
  return (
    <article className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 md:p-5">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm md:text-base font-semibold text-white leading-tight">
            {item.productName}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {item.deliveryForm && (
              <span className="text-[10px] text-white/50 px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.06]">
                {item.deliveryForm}
              </span>
            )}
            {item.metadata?.category && (
              <span className="text-[10px] text-white/50 px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.06]">
                {item.metadata.category}
              </span>
            )}
            {item.metadata?.aiRecommended && (
              <span className="inline-flex items-center gap-1 text-[10px] text-[#2DA5A0] px-2 py-0.5 rounded-full bg-[#2DA5A0]/10 border border-[#2DA5A0]/25">
                <Sparkles className="w-3 h-3" strokeWidth={1.5} />
                AI Recommended
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${item.productName} from cart`}
          className="text-red-400/80 hover:text-red-300 transition-colors p-1 -m-1"
        >
          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03]">
          <button
            type="button"
            onClick={onDecrement}
            aria-label="Decrease quantity"
            disabled={item.quantity <= 1}
            className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white disabled:text-white/20"
          >
            <Minus className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <span className="text-sm text-white font-semibold w-7 text-center tabular-nums">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={onIncrement}
            aria-label="Increase quantity"
            disabled={item.quantity >= 99}
            className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white disabled:text-white/20"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
        <p className="text-base font-bold text-white">{formatCents(lineCents)}</p>
      </div>
    </article>
  );
}

// ── Confirm clear modal ────────────────────────────────────────────────
function ConfirmClearModal({
  open, onCancel, onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-sm rounded-2xl border border-white/[0.10] bg-[#1E3054] p-6 shadow-2xl"
          >
            <h3 className="text-base font-semibold text-white mb-1">Clear cart?</h3>
            <p className="text-sm text-white/60 mb-5">
              This removes every item from your cart. You can't undo this.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-xl text-sm text-white/70 hover:text-white border border-white/[0.10] hover:border-white/[0.20] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500/85 hover:bg-red-500 transition-all"
              >
                Clear Cart
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
