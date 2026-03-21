"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";

export function Progress({
  value = 0,
  max = 100,
  color = "bg-copper",
  className = "",
}: {
  value?: number;
  max?: number;
  color?: string;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <ProgressPrimitive.Root
      value={value}
      max={max}
      className={`relative h-2 w-full overflow-hidden rounded-full bg-white/[0.06] ${className}`}
    >
      <ProgressPrimitive.Indicator
        className={`h-full rounded-full transition-[width] duration-300 ease-out ${color}`}
        style={{ width: `${pct}%` }}
      />
    </ProgressPrimitive.Root>
  );
}
