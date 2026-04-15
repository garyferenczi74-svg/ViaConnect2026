"use client";

import type { TimeRange } from "./utils/trendCalculations";

const ORDER: TimeRange[] = ["7D", "4W", "3M", "1Y"];
const LABEL: Record<TimeRange, string> = {
  "7D": "Daily",
  "4W": "Weekly",
  "3M": "Monthly",
  "1Y": "Yearly",
};

export function TimeRangeSelector({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (v: TimeRange) => void;
}) {
  return (
    <div
      className="inline-flex rounded-xl p-1"
      style={{
        background: "rgba(22,36,64,0.4)",
        boxShadow: "0 2px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {ORDER.map((key) => {
        const active = key === value;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              color: active ? "#FFFFFF" : "rgba(255,255,255,0.55)",
              background: active ? "rgba(232,128,58,0.14)" : "transparent",
              boxShadow: active
                ? "inset 0 -2px 0 0 #E8803A, inset 0 1px 0 rgba(255,255,255,0.06)"
                : undefined,
              fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
            }}
          >
            {LABEL[key]}
          </button>
        );
      })}
    </div>
  );
}
