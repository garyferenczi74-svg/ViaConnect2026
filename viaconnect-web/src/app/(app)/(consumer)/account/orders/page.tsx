"use client";

// /account/orders — Prompt #55. Order history list with status, time
// period, and search filters. Pulls every shop_orders row + line items
// for the current user (RLS-scoped) and groups status history per
// order so each card can render its compact status tracker.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Package, Search, ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";
import { OrderCard } from "@/components/account/OrderCard";
import {
  toOrderSummary,
  type OrderStatus,
  type OrderSummary,
  type StatusHistoryEntry,
} from "@/components/account/orderTypes";

type ShopOrderRow = Tables<"shop_orders">;
type ShopOrderItemRow = Tables<"shop_order_items">;
type ShopOrderStatusHistoryRow = Tables<"shop_order_status_history">;

const STATUS_OPTIONS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all",              label: "All statuses" },
  { value: "pending",          label: "Pending" },
  { value: "confirmed",        label: "Confirmed" },
  { value: "processing",       label: "Processing" },
  { value: "shipped",          label: "Shipped" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "delivered",        label: "Delivered" },
  { value: "cancelled",        label: "Cancelled" },
  { value: "refunded",         label: "Refunded" },
];

type TimeRange = "all" | "7d" | "30d" | "90d" | "year";
const TIME_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "all",  label: "All time" },
  { value: "7d",   label: "Last 7 days" },
  { value: "30d",  label: "Last 30 days" },
  { value: "90d",  label: "Last 90 days" },
  { value: "year", label: "This year" },
];

function withinRange(iso: string, range: TimeRange): boolean {
  if (range === "all") return true;
  const ts = new Date(iso).getTime();
  const now = Date.now();
  if (range === "year") {
    return new Date(iso).getFullYear() === new Date().getFullYear();
  }
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return now - ts <= days * 24 * 60 * 60 * 1000;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [history, setHistory] = useState<Map<string, StatusHistoryEntry[]>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [timeFilter, setTimeFilter] = useState<TimeRange>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) {
          setOrders([]);
          setLoading(false);
        }
        return;
      }
      const { data: orderRows, error: ordersErr } = await supabase
        .from("shop_orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (ordersErr) {
        setError(ordersErr.message ?? "Could not load orders.");
        setLoading(false);
        return;
      }
      const orderRowsTyped: ShopOrderRow[] = orderRows ?? [];
      const orderIds = orderRowsTyped.map((o) => o.id);

      let itemRows: ShopOrderItemRow[] = [];
      let historyRows: ShopOrderStatusHistoryRow[] = [];
      if (orderIds.length > 0) {
        const [itemsRes, historyRes] = await Promise.all([
          supabase
            .from("shop_order_items")
            .select("*")
            .in("order_id", orderIds)
            .order("created_at", { ascending: true }),
          supabase
            .from("shop_order_status_history")
            .select("*")
            .in("order_id", orderIds)
            .order("created_at", { ascending: false }),
        ]);
        itemRows = itemsRes.data ?? [];
        historyRows = historyRes.data ?? [];
      }
      if (cancelled) return;

      const itemsByOrder = new Map<string, ShopOrderItemRow[]>();
      for (const it of itemRows) {
        const arr = itemsByOrder.get(it.order_id) ?? [];
        arr.push(it);
        itemsByOrder.set(it.order_id, arr);
      }

      const historyByOrder = new Map<string, StatusHistoryEntry[]>();
      for (const h of historyRows) {
        const arr = historyByOrder.get(h.order_id) ?? [];
        arr.push({
          id: String(h.id),
          status: h.status as OrderStatus,
          title: String(h.title),
          description: h.description ?? null,
          trackingNumber: h.tracking_number ?? null,
          trackingUrl: h.tracking_url ?? null,
          carrier: h.carrier ?? null,
          createdAt: String(h.created_at),
        });
        historyByOrder.set(h.order_id, arr);
      }

      const summaries = orderRowsTyped.map((row) =>
        toOrderSummary(row, itemsByOrder.get(row.id) ?? []),
      );
      setOrders(summaries);
      setHistory(historyByOrder);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!withinRange(o.createdAt, timeFilter)) return false;
      if (q) {
        const hit =
          o.orderNumber.toLowerCase().includes(q) ||
          o.items.some((it) => it.productName.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [orders, statusFilter, timeFilter, search]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-bold">My Orders</h2>
        {!loading && orders.length > 0 && (
          <p className="text-xs text-white/45">
            {filtered.length} of {orders.length}
          </p>
        )}
      </div>

      {/* Filter bar */}
      {!loading && orders.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "all")}
              className="bg-[#1A2744] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2DA5A0]/50 min-h-[40px]"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as TimeRange)}
              className="bg-[#1A2744] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2DA5A0]/50 min-h-[40px]"
            >
              {TIME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35"
                strokeWidth={1.5}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by order number or product…"
                className="w-full bg-[#1A2744] border border-white/[0.10] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#2DA5A0]/50 min-h-[40px]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      {loading ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-12 text-center">
          <Loader2
            className="w-6 h-6 text-white/40 mx-auto animate-spin"
            strokeWidth={1.5}
          />
          <p className="text-sm text-white/40 mt-3">Loading your orders…</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-6 text-center">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      ) : orders.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-10 text-center">
          <p className="text-sm text-white/55">
            No orders match the current filters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((o) => (
            <OrderCard key={o.id} order={o} statusHistory={history.get(o.id) ?? []} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-12 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4">
        <Package className="w-6 h-6 text-white/30" strokeWidth={1.5} />
      </div>
      <p className="text-sm text-white/70 mb-1">
        You haven't placed any orders yet.
      </p>
      <p className="text-xs text-white/40 mb-5">
        Browse the shop to start your wellness protocol.
      </p>
      <Link
        href="/shop"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2DA5A0] hover:bg-[#2DA5A0]/85 text-white text-sm font-semibold transition-colors"
      >
        <ShoppingBag className="w-4 h-4" strokeWidth={1.5} />
        Browse Shop
      </Link>
    </div>
  );
}
