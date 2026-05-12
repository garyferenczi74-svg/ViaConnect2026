'use client';

// Prompt #162 section 3.5: subtle banner shown when at least one log on the
// selected day is source=quick_calories. Dismissal stored in localStorage for
// 7 days so it stops noising the user.

import { useEffect, useState } from 'react';
import { Info, X } from 'lucide-react';

const STORAGE_KEY = 'vc.nutrition.macro-incomplete-banner.dismissedUntil';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function readDismissedUntil(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function MacroIncompleteBanner() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    setHidden(readDismissedUntil() > Date.now());
  }, []);

  if (hidden) return null;

  function dismiss() {
    setHidden(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now() + SEVEN_DAYS_MS));
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex items-start gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-xs text-white/70">
      <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-[#2DA5A0]" strokeWidth={1.5} />
      <p className="flex-1">
        Some entries today don&apos;t include detailed macros. Use Log Full Meals or Photo AI for complete macro tracking.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-white/45 transition-colors hover:text-white"
      >
        <X className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
}
