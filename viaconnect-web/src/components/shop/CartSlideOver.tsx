"use client";

// Right-side cart drawer. Triggered by useCart().openCart() from anywhere.

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect } from "react";
import {
  X, ShoppingBag, Sparkles, Minus, Plus, Trash2, ArrowRight,
} from "lucide-react";
import { useCart, formatCents, type CartItem } from "@/context/CartContext";

export function CartSlideOver() {
  const { items, itemCount, subtotalCents, isCartOpen, closeCart, removeItem, updateQuantity } = useCart();
  const reduce = useReducedMotion();

  // Close on Escape
  useEffect(() => {
    if (!isCartOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isCartOpen, closeCart]);

  return (
    <AnimatePresence>
      {isCartOpen && (
        <div className="fixed inset-0 z-[100]">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            onClick={closeCart}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-hidden
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 32 }}
            className="absolute right-0 top-0 h-full w-[400px] max-w-[90vw] bg-[#1A2744] border-l border-white/[0.08] shadow-2xl flex flex-col"
            role="dialog"
            aria-label="Shopping cart"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#2DA5A0]" strokeWidth={1.5} />
                Your Cart
                <span className="text-xs text-white/40 font-normal">({itemCount})</span>
              </h2>
              <button
                onClick={closeCart}
                aria-label="Close cart"
                className="text-white/40 hover:text-white transition-colors p-1 -mr-1"
              >
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <EmptyCart onClose={closeCart} />
              ) : (
                <ul className="space-y-3">
                  {items.map(item => (
                    <CartItemRow
                      key={item.id}
                      item={item}
                      onRemove={() => removeItem(item.id)}
                      onIncrement={() => updateQuantity(item.id, item.quantity + 1)}
                      onDecrement={() => updateQuantity(item.id, item.quantity - 1)}
                    />
                  ))}
                </ul>
              )}
            </div>

            {/* Sticky footer */}
            {items.length > 0 && (
              <div className="border-t border-white/[0.08] px-5 py-4 space-y-3 bg-[#1A2744]">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Subtotal</span>
                  <span className="text-base font-bold text-white">
                    {formatCents(subtotalCents, "—")}
                  </span>
                </div>
                {items.some(i => i.unitPriceCents == null) && (
                  <p className="text-[10px] text-[#B75E18]/80 leading-snug">
                    Some items show "Contact for Pricing" and are not yet included in the subtotal.
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  <Link
                    href="/shop/cart"
                    onClick={closeCart}
                    className="w-full text-center text-sm font-medium text-white/70 hover:text-white border border-white/[0.10] hover:border-white/[0.20] rounded-xl py-2.5 transition-all"
                  >
                    View Cart
                  </Link>
                  <Link
                    href="/shop/checkout"
                    onClick={closeCart}
                    className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-[#2DA5A0] hover:bg-[#2DA5A0]/85 shadow-lg shadow-[#2DA5A0]/20 rounded-xl py-3 transition-all"
                  >
                    Checkout
                    <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                  </Link>
                </div>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Empty state ────────────────────────────────────────────────────────
function EmptyCart({ onClose }: { onClose: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center pt-10">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4">
        <ShoppingBag className="w-7 h-7 text-white/30" strokeWidth={1.5} />
      </div>
      <p className="text-sm text-white/50 mb-1">Your cart is empty</p>
      <p className="text-xs text-white/30 mb-5">Add supplements or genetic tests to get started.</p>
      <Link
        href="/shop"
        onClick={onClose}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-[#2DA5A0]/90 hover:bg-[#2DA5A0] transition-all"
      >
        Browse Shop
      </Link>
    </div>
  );
}

// ── Single row ─────────────────────────────────────────────────────────
function CartItemRow({
  item, onRemove, onIncrement, onDecrement,
}: {
  item: CartItem;
  onRemove: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const lineCents = item.unitPriceCents != null ? item.unitPriceCents * item.quantity : null;
  return (
    <li className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white leading-snug truncate">{item.productName}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {item.deliveryForm && (
              <span className="text-[10px] text-white/40 px-1.5 py-0.5 rounded bg-white/[0.05]">
                {item.deliveryForm}
              </span>
            )}
            {item.metadata?.category && (
              <span className="text-[10px] text-white/40 px-1.5 py-0.5 rounded bg-white/[0.05]">
                {item.metadata.category}
              </span>
            )}
            {item.metadata?.aiRecommended && (
              <span className="inline-flex items-center gap-1 text-[10px] text-[#2DA5A0] px-1.5 py-0.5 rounded bg-[#2DA5A0]/10 border border-[#2DA5A0]/20">
                <Sparkles className="w-2.5 h-2.5" strokeWidth={1.5} />
                AI Recommended
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onRemove}
          aria-label={`Remove ${item.productName} from cart`}
          className="text-red-400 hover:text-red-300 transition-colors p-1 -mt-1 -mr-1"
        >
          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03]">
          <button
            onClick={onDecrement}
            aria-label="Decrease quantity"
            className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white disabled:text-white/20"
            disabled={item.quantity <= 1}
          >
            <Minus className="w-3 h-3" strokeWidth={1.5} />
          </button>
          <span className="text-sm text-white font-medium w-6 text-center tabular-nums">
            {item.quantity}
          </span>
          <button
            onClick={onIncrement}
            aria-label="Increase quantity"
            className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white disabled:text-white/20"
            disabled={item.quantity >= 99}
          >
            <Plus className="w-3 h-3" strokeWidth={1.5} />
          </button>
        </div>
        <p className="text-sm font-bold text-white">
          {formatCents(lineCents)}
        </p>
      </div>
    </li>
  );
}
