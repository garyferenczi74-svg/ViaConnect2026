"use client";

// Client-side layout wrapper for the consumer route group. Hosts the global
// CartProvider + the side-drawer cart so any consumer page can call useCart()
// and any "Add to Cart" button can fire toasts that mount inside this tree.
//
// The auth gate + AppShell still live in src/app/(app)/layout.tsx (server
// component) — this layout sits inside that and only adds client-side state.

import type { ReactNode } from "react";
import { CartProvider } from "@/context/CartContext";
import { CartSlideOver } from "@/components/shop/CartSlideOver";

// Toaster is already mounted globally in src/lib/providers.tsx — do not
// re-mount it here or toasts will fire twice.

export default function ConsumerLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      {children}
      <CartSlideOver />
    </CartProvider>
  );
}
