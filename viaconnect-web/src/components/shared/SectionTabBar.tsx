'use client';

// Canonical section tab bar (Prompt #74). Sticky dark backing strip
// that lives below the hero on every section page. Holds PortalTabPill
// children only; no bespoke tab markup.

interface SectionTabBarProps {
  children: React.ReactNode;
}

export function SectionTabBar({ children }: SectionTabBarProps) {
  return (
    <div className="sticky top-[60px] z-30 w-full border-b border-white/[0.08] bg-[#1A2744] shadow-[0_2px_12px_rgba(0,0,0,0.25)]">
      <div
        role="tablist"
        className="flex items-center gap-2 overflow-x-auto scrollbar-hide px-4 py-3 md:px-6"
      >
        {children}
      </div>
    </div>
  );
}
