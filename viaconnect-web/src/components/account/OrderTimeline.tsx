"use client";

// OrderTimeline — Prompt #55. Vertical chronological audit log of every
// status change for one order. Most recent first. Used on the order
// detail page below the status tracker.

import { Truck } from "lucide-react";
import type { StatusHistoryEntry } from "./orderTypes";

interface OrderTimelineProps {
  statusHistory: StatusHistoryEntry[];
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function OrderTimeline({ statusHistory }: OrderTimelineProps) {
  if (statusHistory.length === 0) {
    return (
      <p className="text-xs text-white/40 text-center py-4">
        No timeline events yet.
      </p>
    );
  }

  // Newest first
  const sorted = [...statusHistory].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <ol className="relative pl-6 border-l-2 border-[#2DA5A0]/30 space-y-5">
      {sorted.map((entry, i) => {
        const isLatest = i === 0;
        return (
          <li key={entry.id} className="relative">
            <span
              className={`absolute -left-[31px] top-1 ${
                isLatest
                  ? "w-4 h-4 ring-2 ring-[#2DA5A0]/40"
                  : "w-3 h-3"
              } rounded-full bg-[#2DA5A0]`}
            />
            <p className="text-xs text-gray-500">{formatTimestamp(entry.createdAt)}</p>
            <p className="text-sm font-semibold text-white mt-0.5">{entry.title}</p>
            {entry.description && (
              <p className="text-sm text-gray-400 mt-0.5">{entry.description}</p>
            )}
            {entry.trackingNumber && (
              <div className="mt-2 inline-flex items-center gap-2 text-xs text-[#2DA5A0]">
                <Truck className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span className="font-mono">{entry.trackingNumber}</span>
                {entry.trackingUrl && (
                  <a
                    href={entry.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    Track package →
                  </a>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
