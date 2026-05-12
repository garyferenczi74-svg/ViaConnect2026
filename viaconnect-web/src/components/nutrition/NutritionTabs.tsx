'use client';

// Prompt #162 section 2: reusable tab shell for the Nutrition page.
// Tab state via URL ?tab=<id>. Keyboard nav: Left/Right cycle when focused.

import { useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface TabDef {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
}

interface NutritionTabsProps {
  readonly tabs: readonly TabDef[];
  readonly defaultTab: string;
}

export function useNutritionActiveTab(tabs: readonly TabDef[], defaultTab: string): string {
  const params = useSearchParams();
  const raw = params?.get('tab') ?? null;
  if (raw && tabs.some((t) => t.id === raw && !t.disabled)) return raw;
  return defaultTab;
}

export function useSetNutritionTab(): (tabId: string) => void {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return useCallback(
    (tabId: string) => {
      const next = new URLSearchParams(params?.toString() ?? '');
      next.set('tab', tabId);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [router, pathname, params],
  );
}

export function NutritionTabs({ tabs, defaultTab }: NutritionTabsProps) {
  const active = useNutritionActiveTab(tabs, defaultTab);
  const setTab = useSetNutritionTab();
  const enabled = tabs.filter((t) => !t.disabled);

  function onKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const idx = enabled.findIndex((t) => t.id === active);
    if (idx < 0) return;
    const nextIdx = e.key === 'ArrowLeft'
      ? (idx - 1 + enabled.length) % enabled.length
      : (idx + 1) % enabled.length;
    setTab(enabled[nextIdx].id);
    e.preventDefault();
  }

  return (
    <div
      role="tablist"
      aria-label="Nutrition view"
      onKeyDown={onKey}
      className="flex w-full gap-2 overflow-x-auto pb-1"
    >
      {tabs.map((t) => {
        const isActive = t.id === active;
        const isDisabled = !!t.disabled;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled}
            disabled={isDisabled}
            onClick={() => !isDisabled && setTab(t.id)}
            className={`flex-1 sm:flex-none rounded-xl px-4 py-2.5 text-sm font-semibold transition-all min-h-[44px] whitespace-nowrap ${
              isActive
                ? 'bg-[#2DA5A0] text-white'
                : isDisabled
                  ? 'cursor-not-allowed bg-white/[0.03] text-white/25'
                  : 'bg-transparent text-white/55 hover:bg-[#1E3054] hover:text-white'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
