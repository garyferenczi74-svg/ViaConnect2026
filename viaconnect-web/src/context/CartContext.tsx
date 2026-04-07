"use client";

// ════════════════════════════════════════════════════════════════════════
//  CartContext — global cart state for the consumer shop
//
//  Persistence strategy:
//   • Authenticated users → shop_cart_items table (RLS-scoped)
//   • Guests             → localStorage (key: VIACONNECT_CART)
//   • On login transition, the local cart is merged into the server cart.
//
//  Deduplication: items with identical (productSlug + deliveryForm) collapse
//  into a single row whose quantity is incremented. Matches the database
//  unique index `shop_cart_items_user_slug_form_uniq`.
//
//  Pricing: items with `unitPriceCents === null` are kept in the cart (for
//  "Contact for Pricing" line items like genetic test kits) but are excluded
//  from the subtotal.
// ════════════════════════════════════════════════════════════════════════

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────

export type ProductType = "supplement" | "genetic_test" | "custom_package" | "peptide";

export interface CartItemMetadata {
  category?: string;
  icon?: string;
  badge?: string;
  imageUrl?: string;
  aiRecommended?: boolean;
  recommendedBy?: string;
  [key: string]: unknown;
}

export interface CartItem {
  /** Local id for guests (uuid-ish), real DB id for authed users */
  id: string;
  productSlug: string;
  productName: string;
  productType: ProductType;
  quantity: number;
  deliveryForm: string | null;
  unitPriceCents: number | null;
  metadata: CartItemMetadata;
}

export interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotalCents: number;
  isLoading: boolean;
  isCartOpen: boolean;

  addItem: (item: Omit<CartItem, "id">) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
}

// ── Storage helpers ────────────────────────────────────────────────────

const LOCAL_STORAGE_KEY = "VIACONNECT_CART";

function readLocalCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as CartItem[];
    return [];
  } catch {
    return [];
  }
}

function writeLocalCart(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota / private mode — silently ignore */
  }
}

function localId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function clamp(qty: number): number {
  return Math.max(1, Math.min(99, Math.round(qty)));
}

function matchKey(slug: string, form: string | null): string {
  return `${slug}::${form ?? ""}`;
}

// Map a Supabase shop_cart_items row to a CartItem.
function rowToItem(row: any): CartItem {
  return {
    id: String(row.id),
    productSlug: String(row.product_slug),
    productName: String(row.product_name),
    productType: (row.product_type as ProductType) ?? "supplement",
    quantity: Number(row.quantity ?? 1),
    deliveryForm: row.delivery_form ?? null,
    unitPriceCents: row.unit_price_cents ?? null,
    metadata: (row.metadata as CartItemMetadata) ?? {},
  };
}

// ── Context ────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextType | null>(null);

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart() must be used inside <CartProvider>");
  }
  return ctx;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());

  // ── Initial load + auth subscription ────────────────────────────
  useEffect(() => {
    const supabase = supabaseRef.current;
    let active = true;

    async function loadFromServer(uid: string): Promise<CartItem[]> {
      const { data, error } = await (supabase as any)
        .from("shop_cart_items")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: true });
      if (error || !data) return [];
      return (data as any[]).map(rowToItem);
    }

    async function mergeLocalIntoServer(uid: string, local: CartItem[]) {
      if (local.length === 0) return;
      // Best-effort upsert: collisions on (user_id, slug, COALESCE(delivery_form,''))
      // are silently ignored. We use insert+catch rather than upsert to avoid
      // overwriting server-side quantities the user may have set elsewhere.
      for (const li of local) {
        await (supabase as any).from("shop_cart_items").insert({
          user_id: uid,
          product_slug: li.productSlug,
          product_name: li.productName,
          product_type: li.productType,
          quantity: clamp(li.quantity),
          delivery_form: li.deliveryForm,
          unit_price_cents: li.unitPriceCents,
          metadata: li.metadata,
        }).then(() => {}, () => {});
      }
    }

    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!active) return;

        if (user) {
          setUserId(user.id);
          const local = readLocalCart();
          if (local.length > 0) {
            await mergeLocalIntoServer(user.id, local);
            writeLocalCart([]);
          }
          const server = await loadFromServer(user.id);
          if (active) setItems(server);
        } else {
          setUserId(null);
          setItems(readLocalCart());
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }
    init();

    // React to login/logout transitions in other tabs / pages.
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      const newUid = session?.user?.id ?? null;
      if (newUid === userId) return;
      setUserId(newUid);
      if (newUid) {
        const local = readLocalCart();
        if (local.length > 0) {
          await mergeLocalIntoServer(newUid, local);
          writeLocalCart([]);
        }
        const server = await loadFromServer(newUid);
        if (active) setItems(server);
      } else {
        setItems(readLocalCart());
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror local items to localStorage for guest users only.
  useEffect(() => {
    if (userId === null && !isLoading) {
      writeLocalCart(items);
    }
  }, [items, userId, isLoading]);

  // ── Mutations ───────────────────────────────────────────────────

  const addItem = useCallback(async (input: Omit<CartItem, "id">) => {
    const supabase = supabaseRef.current;
    const desiredQty = clamp(input.quantity);
    const key = matchKey(input.productSlug, input.deliveryForm);

    // Optimistic local update — increment if exists, otherwise insert.
    let didMerge = false;
    setItems(prev => {
      const next = prev.map(it => {
        if (matchKey(it.productSlug, it.deliveryForm) === key) {
          didMerge = true;
          return { ...it, quantity: clamp(it.quantity + desiredQty) };
        }
        return it;
      });
      if (didMerge) return next;
      return [
        ...prev,
        { ...input, quantity: desiredQty, id: localId() },
      ];
    });

    if (!userId) return; // guest cart — localStorage handles persistence

    // Server sync via the atomic RPC `shop_cart_add_item`. The function does
    // INSERT ... ON CONFLICT DO UPDATE quantity = quantity + EXCLUDED.quantity
    // in a single SQL statement, so parallel adds (e.g. user double-clicks
    // Add to Cart, or two tabs add at once) can never lose increments.
    const { data: row, error: rpcErr } = await (supabase as any).rpc(
      "shop_cart_add_item",
      {
        p_product_slug: input.productSlug,
        p_product_name: input.productName,
        p_product_type: input.productType,
        p_quantity: desiredQty,
        p_delivery_form: input.deliveryForm,
        p_unit_price_cents: input.unitPriceCents,
        p_metadata: input.metadata,
      },
    );

    if (rpcErr || !row) {
      // RPC failed (network blip, RLS, etc.) — leave the optimistic state in
      // place. Next page load will reconcile from the server cart.
      return;
    }

    // The RPC returns the canonical post-merge row. Replace the optimistic
    // entry so the local id becomes the real DB id and the quantity matches
    // what the server actually has after concurrent merges.
    const serverRow = Array.isArray(row) ? row[0] : row;
    if (serverRow) {
      setItems(prev =>
        prev.map(it =>
          matchKey(it.productSlug, it.deliveryForm) === key
            ? rowToItem(serverRow)
            : it,
        ),
      );
    }
  }, [userId]);

  const removeItem = useCallback(async (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
    if (!userId) return;
    if (id.startsWith("local-")) return; // never made it to the server
    await (supabaseRef.current as any).from("shop_cart_items").delete().eq("id", id);
  }, [userId]);

  const updateQuantity = useCallback(async (id: string, quantity: number) => {
    const next = clamp(quantity);
    setItems(prev => prev.map(it => (it.id === id ? { ...it, quantity: next } : it)));
    if (!userId) return;
    if (id.startsWith("local-")) return;
    await (supabaseRef.current as any).from("shop_cart_items").update({ quantity: next }).eq("id", id);
  }, [userId]);

  const clearCart = useCallback(async () => {
    setItems([]);
    if (!userId) {
      writeLocalCart([]);
      return;
    }
    await (supabaseRef.current as any).from("shop_cart_items").delete().eq("user_id", userId);
  }, [userId]);

  // ── Open/close ──────────────────────────────────────────────────
  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const toggleCart = useCallback(() => setIsCartOpen(o => !o), []);

  // ── Derived totals ──────────────────────────────────────────────
  const itemCount = useMemo(
    () => items.reduce((sum, it) => sum + it.quantity, 0),
    [items],
  );
  const subtotalCents = useMemo(
    () =>
      items.reduce(
        (sum, it) => sum + (it.unitPriceCents != null ? it.unitPriceCents * it.quantity : 0),
        0,
      ),
    [items],
  );

  const value: CartContextType = {
    items,
    itemCount,
    subtotalCents,
    isLoading,
    isCartOpen,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    toggleCart,
    openCart,
    closeCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// ── Helper for rendering money ─────────────────────────────────────────
export function formatCents(cents: number | null | undefined, fallback = "Contact for Pricing"): string {
  if (cents == null) return fallback;
  return `$${(cents / 100).toFixed(2)}`;
}
