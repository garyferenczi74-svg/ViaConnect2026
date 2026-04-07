"use client";

// OrderStatusTracker — Prompt #55. Linear status stepper.
//
// Two variants:
//   - "compact": small dotted line, fits inside an OrderCard. No labels
//     on small screens. Used in /account/orders.
//   - "full": large stepper with circles, icons, labels, timestamps,
//     responsive horizontal/vertical layout. Used on /account/orders/[id].
//
// Cancelled / refunded orders short-circuit the path with a red marker
// at the last completed step.

import { motion, useReducedMotion } from "framer-motion";
import {
  ClipboardCheck,
  CheckCircle2,
  Package,
  Truck,
  MapPin,
  PackageCheck,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  STATUS_STEPS,
  currentStepIndex,
  type OrderStatus,
  type StatusHistoryEntry,
} from "./orderTypes";

const STEP_ICONS: Record<OrderStatus, LucideIcon> = {
  pending:          ClipboardCheck,
  confirmed:        CheckCircle2,
  processing:       Package,
  shipped:          Truck,
  out_for_delivery: MapPin,
  delivered:        PackageCheck,
  cancelled:        X,
  refunded:         X,
};

function formatTimestamp(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatEta(iso: string | null): string {
  if (!iso) return "";
  try {
    return `Est. ${new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })}`;
  } catch {
    return iso;
  }
}

interface OrderStatusTrackerProps {
  currentStatus: OrderStatus;
  statusHistory: StatusHistoryEntry[];
  estimatedDeliveryDate?: string | null;
  variant?: "full" | "compact";
}

export function OrderStatusTracker({
  currentStatus,
  statusHistory,
  estimatedDeliveryDate,
  variant = "full",
}: OrderStatusTrackerProps) {
  const cancelled = currentStatus === "cancelled" || currentStatus === "refunded";
  const currentIdx = currentStepIndex(currentStatus);

  // Map each step to the most recent matching history entry's timestamp.
  const stepTimestamps = new Map<OrderStatus, string>();
  for (const h of statusHistory) {
    if (!stepTimestamps.has(h.status)) {
      stepTimestamps.set(h.status, h.createdAt);
    }
  }

  if (variant === "compact") {
    return (
      <CompactTracker
        currentIdx={currentIdx}
        cancelled={cancelled}
      />
    );
  }

  return (
    <FullTracker
      currentIdx={currentIdx}
      cancelled={cancelled}
      stepTimestamps={stepTimestamps}
      currentStatus={currentStatus}
      estimatedDeliveryDate={estimatedDeliveryDate}
    />
  );
}

// ── Compact (used in OrderCard) ───────────────────────────────────────

function CompactTracker({
  currentIdx,
  cancelled,
}: {
  currentIdx: number;
  cancelled: boolean;
}) {
  // 5 visible markers: pending, confirmed, processing, shipped, delivered
  const visibleSteps = STATUS_STEPS.filter(
    (s) => s.status !== "out_for_delivery",
  );
  return (
    <div className="flex items-center gap-1.5" aria-label="Order status">
      {visibleSteps.map((step, i) => {
        const stepIdx = STATUS_STEPS.findIndex((s) => s.status === step.status);
        const completed = !cancelled && stepIdx <= currentIdx;
        const isCurrent = !cancelled && stepIdx === currentIdx;
        const isFinal = i === visibleSteps.length - 1;
        return (
          <span
            key={step.status}
            className="flex items-center gap-1.5 flex-1"
          >
            <span
              className={`w-3 h-3 rounded-full flex-shrink-0 transition-colors ${
                cancelled && i === 0
                  ? "bg-red-500"
                  : completed
                    ? isCurrent
                      ? "bg-[#2DA5A0] ring-2 ring-[#2DA5A0]/30 animate-pulse"
                      : "bg-[#2DA5A0]"
                    : "bg-white/15 border border-white/20"
              }`}
              title={step.label}
            />
            {!isFinal && (
              <span
                className={`flex-1 h-[2px] rounded-full ${
                  cancelled
                    ? "bg-red-500/40"
                    : stepIdx < currentIdx
                      ? "bg-[#2DA5A0]"
                      : "bg-white/10"
                }`}
              />
            )}
          </span>
        );
      })}
      {cancelled && (
        <span className="text-[10px] uppercase tracking-wider text-red-400 font-semibold ml-2">
          Cancelled
        </span>
      )}
    </div>
  );
}

// ── Full (used on order detail page) ──────────────────────────────────

function FullTracker({
  currentIdx,
  cancelled,
  stepTimestamps,
  currentStatus,
  estimatedDeliveryDate,
}: {
  currentIdx: number;
  cancelled: boolean;
  stepTimestamps: Map<OrderStatus, string>;
  currentStatus: OrderStatus;
  estimatedDeliveryDate?: string | null;
}) {
  const reduce = useReducedMotion();
  // For the full tracker, hide out_for_delivery unless reached.
  const visibleSteps = STATUS_STEPS.filter((s) => {
    if (s.status === "out_for_delivery") return currentIdx >= 4;
    return true;
  });

  if (cancelled) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/40 flex items-center justify-center">
            <X className="w-5 h-5 text-red-400" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-300">
              {currentStatus === "refunded" ? "Order Refunded" : "Order Cancelled"}
            </p>
            <p className="text-xs text-red-300/70 mt-0.5">
              {stepTimestamps.has(currentStatus)
                ? formatTimestamp(stepTimestamps.get(currentStatus)!)
                : ""}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Desktop: horizontal */}
      <div className="hidden md:flex items-start justify-between gap-2">
        {visibleSteps.map((step, i) => {
          const stepIdx = STATUS_STEPS.findIndex((s) => s.status === step.status);
          const completed = stepIdx <= currentIdx;
          const isCurrent = stepIdx === currentIdx;
          const Icon = STEP_ICONS[step.status];
          const ts = stepTimestamps.get(step.status);
          const showEta = !ts && step.status === "delivered" && estimatedDeliveryDate;
          const isLast = i === visibleSteps.length - 1;
          return (
            <div key={step.status} className="flex-1 flex flex-col items-center relative">
              {!isLast && (
                <div
                  className={`absolute top-5 left-[calc(50%+20px)] right-[calc(-50%+20px)] h-0.5 ${
                    completed && stepIdx < currentIdx
                      ? "bg-[#2DA5A0]"
                      : "bg-gray-700 border-t border-dashed border-gray-700"
                  }`}
                />
              )}
              <motion.div
                initial={reduce ? false : { scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center ${
                  isCurrent
                    ? "bg-[#2DA5A0] text-white ring-4 ring-[#2DA5A0]/20"
                    : completed
                      ? "bg-[#2DA5A0] text-white"
                      : "bg-[#1E3054] border-2 border-gray-600 text-gray-500"
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={1.5} />
              </motion.div>
              <p
                className={`text-[11px] mt-2 font-semibold text-center ${
                  completed ? "text-white" : "text-gray-500"
                }`}
              >
                {step.label}
              </p>
              {ts && (
                <p className="text-[10px] text-gray-500 mt-0.5 text-center">
                  {formatTimestamp(ts)}
                </p>
              )}
              {showEta && (
                <p className="text-[10px] text-gray-500 mt-0.5 text-center">
                  {formatEta(estimatedDeliveryDate ?? null)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical */}
      <div className="md:hidden space-y-0">
        {visibleSteps.map((step, i) => {
          const stepIdx = STATUS_STEPS.findIndex((s) => s.status === step.status);
          const completed = stepIdx <= currentIdx;
          const isCurrent = stepIdx === currentIdx;
          const Icon = STEP_ICONS[step.status];
          const ts = stepTimestamps.get(step.status);
          const showEta = !ts && step.status === "delivered" && estimatedDeliveryDate;
          const isLast = i === visibleSteps.length - 1;
          return (
            <div key={step.status} className="flex gap-3 relative">
              <div className="flex flex-col items-center">
                <div
                  className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCurrent
                      ? "bg-[#2DA5A0] text-white ring-4 ring-[#2DA5A0]/20"
                      : completed
                        ? "bg-[#2DA5A0] text-white"
                        : "bg-[#1E3054] border-2 border-gray-600 text-gray-500"
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.5} />
                </div>
                {!isLast && (
                  <div
                    className={`w-0.5 flex-1 min-h-[28px] ${
                      stepIdx < currentIdx
                        ? "bg-[#2DA5A0]"
                        : "bg-gray-700"
                    }`}
                  />
                )}
              </div>
              <div className={`flex-1 pb-5 ${isLast ? "pb-0" : ""}`}>
                <p
                  className={`text-sm font-semibold ${
                    completed ? "text-white" : "text-gray-500"
                  }`}
                >
                  {step.label}
                </p>
                {ts ? (
                  <p className="text-xs text-gray-500 mt-0.5">{formatTimestamp(ts)}</p>
                ) : showEta ? (
                  <p className="text-xs text-gray-500 mt-0.5">{formatEta(estimatedDeliveryDate ?? null)}</p>
                ) : null}
                {(completed || isCurrent) && (
                  <p className="text-xs text-gray-400 mt-1">{step.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
