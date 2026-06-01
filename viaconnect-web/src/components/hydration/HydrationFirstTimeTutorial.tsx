/**
 * Prompt 170o Phase 1.1: First-time tutorial per Hannah §7 wireframe.
 *
 * 3 slides shown on first widget or card tap. localStorage gate prevents
 * re-show; replay available from Settings. Backdrop tap dismisses without
 * persisting seen-status (Hannah §7 push-back: backdrop tap can be
 * accidental). Skip + X + final CTA all persist seen-status.
 */

'use client';

import { useEffect, useState } from 'react';
import { Droplet, X } from 'lucide-react';

const STORAGE_KEY = 'viaconnect_hydration_tutorial_seen_v1';

export interface HydrationFirstTimeTutorialProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function hasSeenHydrationTutorial(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return true;
  }
}

export function markHydrationTutorialSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    /* silent */
  }
}

export function clearHydrationTutorialSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* silent */
  }
}

const SLIDES = [
  {
    title: 'Track water alongside your meals',
    body: 'Hydration sits next to your food log. One quick tap logs water in seconds; full beverages ride through the existing meal flow.',
  },
  {
    title: 'Quick log in a single tap',
    body: 'Tap +250 ml, +500 ml, or +750 ml on the Dashboard widget or the NutriVision card. Save voice and barcode for richer drinks.',
  },
  {
    title: 'Your target adjusts to you',
    body: 'The default comes from your body weight. Customize it anytime in Settings, and switch between Conservative and Adjusted counting whenever you like.',
  },
];

export function HydrationFirstTimeTutorial({ forceOpen, onClose }: HydrationFirstTimeTutorialProps): JSX.Element | null {
  const [open, setOpen] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    if (forceOpen === true) {
      setOpen(true);
      setSlideIndex(0);
      return;
    }
    if (forceOpen === false) {
      setOpen(false);
      return;
    }
    if (!hasSeenHydrationTutorial()) {
      setOpen(true);
    }
  }, [forceOpen]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeWithoutPersist();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function closeAndPersist() {
    markHydrationTutorialSeen();
    setOpen(false);
    onClose?.();
  }

  function closeWithoutPersist() {
    setOpen(false);
    onClose?.();
  }

  if (!open) return null;

  const slide = SLIDES[slideIndex];
  const isLast = slideIndex === SLIDES.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hydration-tutorial-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
      onClick={closeWithoutPersist}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#1E3054] p-6 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={closeAndPersist}
          aria-label="Skip tutorial"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/65 hover:bg-white/10"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <div className="flex items-center gap-2">
          <Droplet className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} aria-hidden="true" />
          <span className="text-[11px] font-medium uppercase tracking-wide text-white/55">
            Hydration tracking
          </span>
        </div>
        <h2 id="hydration-tutorial-title" className="mt-3 text-lg font-semibold text-white">
          {slide.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/75">
          {slide.body}
        </p>

        <div className="mt-5 flex items-center justify-center gap-1.5">
          {SLIDES.map((_, idx) => (
            <span
              key={idx}
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${idx === slideIndex ? 'bg-[#2DA5A0]' : 'bg-white/20'}`}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={closeAndPersist}
            className="text-sm text-white/55 underline hover:text-white"
          >
            Skip
          </button>
          {isLast ? (
            <button
              type="button"
              onClick={closeAndPersist}
              className="ml-auto inline-flex h-11 items-center justify-center rounded-xl bg-[#2DA5A0] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#2DA5A0]/90"
            >
              Got it
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSlideIndex((i) => Math.min(SLIDES.length - 1, i + 1))}
              className="ml-auto inline-flex h-11 items-center justify-center rounded-xl bg-[#2DA5A0] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#2DA5A0]/90"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const HIDE_WIDGET_KEY = 'viaconnect_hydration_hide_widget_v1';
const HIDE_CARD_KEY = 'viaconnect_hydration_hide_card_v1';

export function getHideWidget(): boolean {
  if (typeof window === 'undefined') return false;
  try { return window.localStorage.getItem(HIDE_WIDGET_KEY) === 'true'; } catch { return false; }
}
export function setHideWidget(hide: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (hide) window.localStorage.setItem(HIDE_WIDGET_KEY, 'true');
    else window.localStorage.removeItem(HIDE_WIDGET_KEY);
  } catch { /* silent */ }
}
export function getHideCard(): boolean {
  if (typeof window === 'undefined') return false;
  try { return window.localStorage.getItem(HIDE_CARD_KEY) === 'true'; } catch { return false; }
}
export function setHideCard(hide: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (hide) window.localStorage.setItem(HIDE_CARD_KEY, 'true');
    else window.localStorage.removeItem(HIDE_CARD_KEY);
  } catch { /* silent */ }
}
