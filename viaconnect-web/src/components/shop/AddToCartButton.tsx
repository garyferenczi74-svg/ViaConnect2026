"use client";

// Reusable Add to Cart button. Wires the new global cart context + a toast.

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ShoppingCart, Check } from "lucide-react";
import toast from "react-hot-toast";
import {
  useCart, type CartItem, type ProductType, type CartItemMetadata,
} from "@/context/CartContext";

export interface AddToCartButtonProduct {
  productSlug: string;
  productName: string;
  productType?: ProductType;
  deliveryForm?: string | null;
  unitPriceCents?: number | null;
  metadata?: CartItemMetadata;
}

interface AddToCartButtonProps {
  product: AddToCartButtonProduct;
  /** Render a smaller compact variant for tight grids */
  compact?: boolean;
  /** Optional class overrides */
  className?: string;
  /** Disable the visual "Added!" success state (rarely useful) */
  hideAddedState?: boolean;
}

export function AddToCartButton({ product, compact = false, className = "", hideAddedState }: AddToCartButtonProps) {
  const { addItem, openCart } = useCart();
  const reduce = useReducedMotion();
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const item: Omit<CartItem, "id"> = {
        productSlug: product.productSlug,
        productName: product.productName,
        productType: product.productType ?? "supplement",
        deliveryForm: product.deliveryForm ?? null,
        unitPriceCents: product.unitPriceCents ?? null,
        quantity: 1,
        metadata: product.metadata ?? {},
      };
      await addItem(item);

      if (!hideAddedState) {
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
      }

      // Toast with View Cart action
      toast.custom(
        t => (
          <div
            className={`${t.visible ? "animate-in fade-in slide-in-from-top-2" : ""} max-w-sm w-full bg-[#1E3054] border border-[#2DA5A0]/30 rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3`}
          >
            <div className="w-7 h-7 rounded-full bg-[#2DA5A0]/15 border border-[#2DA5A0]/30 flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 text-[#2DA5A0]" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">{product.productName}</p>
              <p className="text-[10px] text-white/40">added to cart</p>
            </div>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                openCart();
              }}
              className="text-xs font-semibold text-[#2DA5A0] hover:text-[#2DA5A0]/80 whitespace-nowrap"
            >
              View Cart →
            </button>
          </div>
        ),
        { duration: 4000, position: "top-right" },
      );
    } finally {
      setBusy(false);
    }
  };

  const sizeClasses = compact
    ? "px-3 py-1.5 text-xs min-h-[32px]"
    : "px-5 py-2.5 text-sm min-h-[44px]";

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileHover={reduce ? undefined : { scale: 1.02 }}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      disabled={busy}
      aria-label={`Add ${product.productName} to cart`}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 ${sizeClasses} ${
        added
          ? "bg-green-600/20 border border-green-500/30 text-green-400"
          : "bg-[#2DA5A0] hover:bg-[#2DA5A0]/85 text-white shadow-lg shadow-[#2DA5A0]/20"
      } disabled:opacity-70 ${className}`}
    >
      {added ? (
        <>
          <Check className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} strokeWidth={1.5} />
          Added
        </>
      ) : (
        <>
          <ShoppingCart className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} strokeWidth={1.5} />
          Add to Cart
        </>
      )}
    </motion.button>
  );
}
