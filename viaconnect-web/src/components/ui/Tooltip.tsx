"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <TooltipPrimitive.Provider delayDuration={200}>{children}</TooltipPrimitive.Provider>;
}

export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: string;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="z-[80] px-2.5 py-1.5 text-xs font-medium text-white rounded-lg shadow-lg"
          style={{
            background: "#1F2937",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {content}
          <TooltipPrimitive.Arrow style={{ fill: "#1F2937" }} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
