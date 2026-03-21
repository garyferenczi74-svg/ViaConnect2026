"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown, Check } from "lucide-react";

export function Select({
  value,
  onValueChange,
  placeholder = "Select…",
  label,
  options,
}: {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <span className="block text-sm font-medium text-gray-400">{label}</span>
      )}
      <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
        <SelectPrimitive.Trigger
          className="inline-flex items-center justify-between w-full h-10 px-3 rounded-lg text-sm
            bg-white/[0.04] border border-white/[0.08] text-white
            hover:border-white/[0.15] focus:border-copper/50 focus:ring-1 focus:ring-copper/20 outline-none transition-colors"
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="z-[70] overflow-hidden rounded-lg border shadow-xl"
            style={{
              background: "#1F2937",
              borderColor: "rgba(255,255,255,0.08)",
            }}
            position="popper"
            sideOffset={4}
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map((opt) => (
                <SelectPrimitive.Item
                  key={opt.value}
                  value={opt.value}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 rounded-md outline-none cursor-pointer
                    data-[highlighted]:bg-white/[0.06] data-[highlighted]:text-white transition-colors"
                >
                  <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="ml-auto">
                    <Check className="w-3.5 h-3.5 text-copper" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}
