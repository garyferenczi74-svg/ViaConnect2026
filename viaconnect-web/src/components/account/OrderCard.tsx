"use client";

// OrderCard — Prompt #55. Summary card for one order in the
// /account/orders list. Shows order number, date, item count, total,
// compact status tracker, item names (truncated), and CTAs.

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Truck } from "lucide-react";
import { OrderStatusTracker } from "./OrderStatusTracker";
import { ReorderButton } from "./ReorderButton";
import type { OrderSummary, StatusHistoryEntry } from "./orderTypes";
import { formatCents } from "@/context/CartContext";

interface OrderCardProps {
  order: OrderSummary;
  statusHistory: StatusHistoryEntry[];
}

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

const STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting confirmation",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export function OrderCard({ order, statusHistory }: OrderCardProps) {
  const reduce = useReducedMotion();
  const itemCount = order.items.reduce((sum, it) => sum + it.quantity, 0);
  const previewItems = order.items.slice(0, 4);
  const remaining = order.items.length - previewItems.length;

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 hover:border-white/[0.16] transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <Link
            href={`/account/orders/${order.id}`}
            className="text-sm font-mono text-white hover:text-[#2DA5A0] transition-colors"
          >
            #{order.orderNumber}
          </Link>
          <p className="text-xs text-white/45 mt-0.5">
            {formatDate(order.createdAt)} · {itemCount}{" "}
            {itemCount === 1 ? "item" : "items"}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-base font-bold text-white">
            {formatCents(order.totalCents)}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-white/50 mt-0.5">
            {STATUS_LABEL[order.status] ?? order.status}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <OrderStatusTracker
          currentStatus={order.status}
          statusHistory={statusHistory}
          variant="compact"
        />
      </div>

      {order.deliveredAt && (
        <p className="text-[11px] text-[#7BAE7F] mb-3">
          Delivered {formatDate(order.deliveredAt)}
        </p>
      )}

      <ul className="space-y-1 mb-4">
        {previewItems.map((it) => (
          <li
            key={it.id}
            className="text-xs text-white/65 flex items-start gap-2"
          >
            <span className="text-white/30 flex-shrink-0">·</span>
            <span className="truncate">
              {it.productName}{" "}
              <span className="text-white/35">(×{it.quantity})</span>
            </span>
          </li>
        ))}
        {remaining > 0 && (
          <li className="text-xs text-white/40 italic">
            + {remaining} more
          </li>
        )}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/account/orders/${order.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2DA5A0]/10 hover:bg-[#2DA5A0]/20 border border-[#2DA5A0]/25 hover:border-[#2DA5A0]/45 rounded-lg text-xs font-semibold text-[#2DA5A0] transition-all min-h-[32px]"
        >
          View Details
          <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
        </Link>

        {order.status !== "cancelled" && order.status !== "refunded" && (
          <ReorderButton
            orderNumber={order.orderNumber}
            items={order.items}
            variant="compact"
          />
        )}

        {order.trackingUrl && order.status !== "delivered" && (
          <a
            href={order.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-xs font-medium text-gray-300 hover:text-white transition-all min-h-[32px]"
          >
            <Truck className="w-3.5 h-3.5" strokeWidth={1.5} />
            Track
          </a>
        )}
      </div>
    </motion.article>
  );
}
