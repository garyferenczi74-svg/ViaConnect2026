"use client";

// Cart icon button with count badge. Drop into any nav.
// Uses the global cart context — opens the slide-over on click.

import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";

export function CartIcon({ className = "" }: { className?: string }) {
  const { itemCount, openCart } = useCart();

  return (
    <button
      type="button"
      onClick={openCart}
      aria-label={`Shopping cart (${itemCount} item${itemCount === 1 ? "" : "s"})`}
      className={`relative p-2 rounded-lg hover:bg-white/[0.04] transition-colors ${className}`}
    >
      <ShoppingCart
        className="w-5 h-5 text-gray-300 hover:text-white transition-colors"
        strokeWidth={1.5}
      />
      <AnimatePresence>
        {itemCount > 0 && (
          <motion.span
            key="cart-badge"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#B75E18] text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-[#B75E18]/30 tabular-nums"
          >
            {itemCount > 99 ? "99+" : itemCount}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
