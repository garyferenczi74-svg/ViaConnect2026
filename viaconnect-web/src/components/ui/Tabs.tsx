"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";

export function Tabs({
  defaultValue,
  tabs,
  children,
  className = "",
}: {
  defaultValue: string;
  tabs: { value: string; label: string }[];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TabsPrimitive.Root defaultValue={defaultValue} className={className}>
      <TabsPrimitive.List className="flex border-b border-white/[0.06] gap-1 mb-4">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            className="px-4 py-2 text-sm font-medium text-gray-500 transition-colors
              hover:text-gray-300 border-b-2 border-transparent -mb-px
              data-[state=active]:text-white data-[state=active]:border-copper"
          >
            {tab.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {children}
    </TabsPrimitive.Root>
  );
}

export const TabContent = TabsPrimitive.Content;
