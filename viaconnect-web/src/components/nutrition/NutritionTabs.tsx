'use client';

// Prompt #162 section 2: reusable tab shell for the Nutrition page.
// Tab state via URL ?tab=<id>. Keyboard nav: Left/Right cycle when focused.
//
// Prompt 187 Task 4 (2026-06-11): optional paramKey prop (default 'tab',
// default preserving) so one page can render a second independent control,
// e.g. the genetics recommendations needs/avoid segment on ?sub=. Each tab
// button carries a stable id (ntab-{paramKey}-{tabId}) so panels can point
// aria-labelledby at it, and the tablist label is overridable via the optional
// ariaLabel prop (default 'Nutrition view', default preserving).

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
  readonly paramKey?: string;
  readonly ariaLabel?: string;
}

export function useNutritionActiveTab(
  tabs: readonly TabDef[],
  defaultTab: string,
  paramKey: string = 'tab',
): string {
  const params = useSearchParams();
  const raw = params?.get(paramKey) ?? null;
  if (raw && tabs.some((t) => t.id === raw && !t.disabled)) return raw;
  return defaultTab;
}

export function useSetNutritionTab(paramKey: string = 'tab'): (tabId: string) => void {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return useCallback(
    (tabId: string) => {
      const next = new URLSearchParams(params?.toString() ?? '');
      next.set(paramKey, tabId);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [router, pathname, params, paramKey],
  );
}

export function NutritionTabs({
  tabs,
  defaultTab,
  paramKey = 'tab',
  ariaLabel = 'Nutrition view',
}: NutritionTabsProps) {
  const active = useNutritionActiveTab(tabs, defaultTab, paramKey);
  const setTab = useSetNutritionTab(paramKey);
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
      aria-label={ariaLabel}
      onKeyDown={onKey}
      className="flex w-full gap-2 overflow-x-auto pb-1"
    >
      {tabs.map((t) => {
        const isActive = t.id === active;
        const isDisabled = !!t.disabled;
        return (
          <button
            key={t.id}
            id={`ntab-${paramKey}-${t.id}`}
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
