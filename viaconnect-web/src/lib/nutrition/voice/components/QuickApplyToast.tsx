/**
 * Undo toast per Prompt 170j §6.6 + §11.4 Quick Apply Mode.
 *
 * Bottom-centered toast with 10-second countdown that fires onExpire when
 * the window passes. role="status" + aria-live="polite" announces the
 * applied edit count without yanking screen reader focus.
 */

'use client';

import { Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { UNDO_WINDOW_MS } from '../feature-flags';

interface QuickApplyToastProps {
  appliedCount: number;
  onUndo: () => void;
  onExpire: () => void;
  durationMs?: number;
}

export function QuickApplyToast({
  appliedCount,
  onUndo,
  onExpire,
  durationMs = UNDO_WINDOW_MS,
}: QuickApplyToastProps) {
  const [remainingMs, setRemainingMs] = useState(durationMs);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, durationMs - elapsed);
      setRemainingMs(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 100);
    return () => clearInterval(interval);
  }, [durationMs, onExpire]);

  const seconds = Math.ceil(remainingMs / 1000);
  const message = appliedCount === 1 ? 'Applied 1 edit' : `Applied ${appliedCount} edits`;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-[#1E3054]/95 backdrop-blur-md shadow-lg shadow-black/30"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
      }}
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="text-sm font-medium text-white">{message}</span>
        <button
          type="button"
          onClick={onUndo}
          className="flex min-h-[36px] items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label={`Undo last voice edit, ${seconds} seconds remaining`}
        >
          <Undo2 size={14} strokeWidth={1.5} aria-hidden="true" />
          Undo · {seconds}s
        </button>
      </div>
    </div>
  );
}
