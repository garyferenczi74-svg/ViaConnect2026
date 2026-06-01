/**
 * Prompt 170o Phase 1 Phase C: Floating action button per Hannah §3.
 *
 * Bottom-right of Dashboard + Wellness Analytics. Scroll-past-widget
 * trigger (visible after 320px scroll). Tap opens bottom sheet with 4
 * quick-log buttons + custom amount input. No pulse animation per Hannah
 * explicit reject (attention-demanding).
 */

'use client';

import { useEffect, useState } from 'react';
import { Droplet, X } from 'lucide-react';
import { HydrationQuickLogButtons } from './HydrationQuickLogButtons';
import { useHydrationQuickLog } from './useHydrationQuickLog';
import toast from 'react-hot-toast';

export function HydrationFloatingActionButton(): JSX.Element | null {
  const [visible, setVisible] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [customMl, setCustomMl] = useState('');
  const { log, loading } = useHydrationQuickLog();

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 320);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!sheetOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSheetOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sheetOpen]);

  const handleCustomLog = async () => {
    const vol = Number(customMl);
    if (!Number.isFinite(vol) || vol < 10 || vol > 2000) {
      toast.error('Enter a volume between 10 and 2000 ml.');
      return;
    }
    const result = await log({
      volume_ml: vol,
      beverage_kind: 'pure_water',
      log_surface: 'floating_fab',
    });
    if (result === null) return;
    if (result.deduplicated) {
      toast.success('Already logged within the last few minutes.');
    } else {
      toast.success(`+${vol} ml logged`);
    }
    setCustomMl('');
    setSheetOpen(false);
  };

  if (!visible && !sheetOpen) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        aria-label="Log hydration"
        className="fixed bottom-6 right-6 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#2DA5A0] text-white shadow-lg transition-transform hover:bg-[#2DA5A0]/90 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
      >
        <Droplet className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
      </button>

      {sheetOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="hydration-fab-sheet-title"
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-4 md:items-center"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#1E3054] p-5 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              aria-label="Close hydration log sheet"
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/65 hover:bg-white/10"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <h2 id="hydration-fab-sheet-title" className="text-base font-semibold">
              Log hydration
            </h2>
            <p className="mt-1 text-[12px] text-white/65">
              Tap a quick amount or enter a custom volume.
            </p>
            <div className="mt-4">
              <HydrationQuickLogButtons
                surface="floating_fab"
                variant="four"
                layout="grid"
                size="medium"
                onLogged={() => setSheetOpen(false)}
              />
            </div>
            <div className="mt-4 flex items-end gap-2">
              <label className="flex flex-1 flex-col gap-1 text-[12px] text-white/70">
                Custom amount
                <input
                  type="number"
                  inputMode="numeric"
                  value={customMl}
                  onChange={(e) => setCustomMl(e.target.value)}
                  placeholder="e.g. 350"
                  className="h-10 rounded-lg border border-white/[0.06] bg-[#1A2744]/55 px-3 text-sm text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-[#2DA5A0]"
                />
              </label>
              <span className="pb-3 text-[12px] text-white/55">ml</span>
              <button
                type="button"
                onClick={() => void handleCustomLog()}
                disabled={loading || customMl.trim() === ''}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[#2DA5A0] px-4 text-sm font-medium text-white transition-colors hover:bg-[#2DA5A0]/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Log
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
