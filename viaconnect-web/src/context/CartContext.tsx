'use client';

// CartContext — minimal stub so the order-history components compile.
// Provides a typed shape for cart actions and a formatCents helper. The
// underlying cart persistence is intentionally a no-op for now: items are
// kept in component-local state and `openCart()` simply toasts. Replace
// this with a real provider once the cart backend is wired up.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface CartItemInput {
  productSlug: string;
  productName: string;
  productType?: string;
  quantity: number;
  deliveryForm?: string | null;
  unitPriceCents?: number | null;
  metadata?: Record<string, unknown>;
}

export interface CartItem extends CartItemInput {
  id: string;
  addedAt: string;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  isOpen: boolean;
  addItem: (input: CartItemInput) => Promise<CartItem>;
  removeItem: (id: string) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
}

const noopValue: CartContextValue = {
  items: [],
  itemCount: 0,
  isOpen: false,
  addItem: async (input) => ({
    ...input,
    id: `cart-${Date.now()}`,
    addedAt: new Date().toISOString(),
  }),
  removeItem: () => {},
  clear: () => {},
  openCart: () => {},
  closeCart: () => {},
};

const CartContext = createContext<CartContextValue>(noopValue);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = useCallback(async (input: CartItemInput): Promise<CartItem> => {
    const item: CartItem = {
      ...input,
      id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      addedAt: new Date().toISOString(),
    };
    setItems((prev) => [...prev, item]);
    return item;
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount: items.reduce((sum, i) => sum + (i.quantity || 0), 0),
      isOpen,
      addItem,
      removeItem,
      clear,
      openCart,
      closeCart,
    }),
    [items, isOpen, addItem, removeItem, clear, openCart, closeCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/**
 * useCart — returns the active CartContextValue. When no provider is mounted
 * (current state of the app) the call returns the no-op fallback so consumer
 * components like ReorderButton render without crashing.
 */
export function useCart(): CartContextValue {
  return useContext(CartContext);
}

/**
 * formatCents — converts integer cents to a USD currency string.
 * Returns "—" for null/undefined to handle re-priced items gracefully.
 */
export function formatCents(cents: number | null | undefined): string {
  if (cents == null || Number.isNaN(cents)) return '—';
  const dollars = cents / 100;
  return dollars.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
