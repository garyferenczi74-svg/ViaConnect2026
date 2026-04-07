"use client";

// ReorderButton — Prompt #55. Adds every line item from a past order
// back into the cart with current pricing (re-fetched downstream by
// the cart RPC). Items added with unitPriceCents=null are re-priced
// from the live catalog before checkout.
//
// Two visual variants: "compact" for the order list card, "full" for
// the order detail page.

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { useCart } from "@/context/CartContext";
import type { OrderItemSummary } from "./orderTypes";

interface ReorderButtonProps {
  orderNumber: string;
  items: OrderItemSummary[];
  variant?: "compact" | "full";
}

export function ReorderButton({
  orderNumber,
  items,
  variant = "compact",
}: ReorderButtonProps) {
  const { addItem, openCart } = useCart();
  const reduce = useReducedMotion();
  const [isReordering, setIsReordering] = useState(false);

  async function handleReorder() {
    if (items.length === 0 || isReordering) return;
    setIsReordering(true);
    let added = 0;
    let failed = 0;
    for (const item of items) {
      try {
        await addItem({
          productSlug: item.productSlug,
          productName: item.productName,
          productType: item.productType,
          quantity: item.quantity,
          deliveryForm: item.deliveryForm,
          // Null = re-price from current catalog when surfaced in cart UI
          unitPriceCents: null,
          metadata: {
            ...(item.metadata ?? {}),
            reorderedFrom: orderNumber,
          },
        });
        added += 1;
      } catch {
        failed += 1;
      }
    }
    setIsReordering(false);
    if (added > 0) {
      const msg =
        failed > 0
          ? `${added} of ${items.length} items added · ${failed} unavailable`
          : `${added} item${added === 1 ? "" : "s"} added to cart`;
      toast.success(msg);
      openCart();
    } else {
      toast.error("Could not reorder — items unavailable");
    }
  }

  if (variant === "compact") {
    return (
      <motion.button
        type="button"
        onClick={handleReorder}
        disabled={isReordering}
        whileHover={reduce || isReordering ? undefined : { scale: 1.02 }}
        whileTap={reduce || isReordering ? undefined : { scale: 0.97 }}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#2DA5A0]/30 rounded-lg text-xs font-medium text-gray-300 hover:text-white transition-all duration-200 min-h-[32px] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isReordering ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
        ) : (
          <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
        )}
        Reorder
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={handleReorder}
      disabled={isReordering}
      whileHover={reduce || isReordering ? undefined : { scale: 1.01 }}
      whileTap={reduce || isReordering ? undefined : { scale: 0.98 }}
      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2DA5A0]/15 hover:bg-[#2DA5A0]/25 border border-[#2DA5A0]/30 hover:border-[#2DA5A0]/50 rounded-xl text-sm font-semibold text-[#2DA5A0] transition-all duration-200 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isReordering ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
          Adding to cart…
        </>
      ) : (
        <>
          <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
          Reorder All Items
        </>
      )}
    </motion.button>
  );
}
