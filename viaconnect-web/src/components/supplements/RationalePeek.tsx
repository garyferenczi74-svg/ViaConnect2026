'use client';

// Prompt 185a slice 5b (2026-06-09): hover-peek-pin rationale popover, in the
// spirit of the Prompt 157k interaction: peek on hover for pointer devices, tap
// to pin on touch, a close button when pinned, dismiss on outside click or
// Escape. Kept self-contained for a list-item card rather than the body-tracker
// HoverSystem geometry. Respects prefers-reduced-motion. No emojis. No em or en
// dashes.

import { useEffect, useId, useRef, useState } from 'react';
import { Info, X } from 'lucide-react';

export function RationalePeek({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [hoverCapable, setHoverCapable] = useState(false);
  const [reduced, setReduced] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const rawId = useId();
  const panelId = `rationale-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    setHoverCapable(window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (!pinned) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setPinned(false);
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPinned(false);
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [pinned]);

  const visible = open || pinned;

  return (
    <div ref={ref} className="relative inline-flex flex-shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-expanded={visible}
        aria-controls={panelId}
        onClick={() => {
          const next = !pinned;
          setPinned(next);
          setOpen(next);
        }}
        onMouseEnter={() => { if (hoverCapable) setOpen(true); }}
        onMouseLeave={() => { if (hoverCapable && !pinned) setOpen(false); }}
        onFocus={() => setOpen(true)}
        onBlur={() => { if (!pinned) setOpen(false); }}
        className="flex h-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-white/40 transition-colors hover:text-[#2DA5A0] focus-visible:text-[#2DA5A0] focus-visible:outline-none"
      >
        <Info className="h-4 w-4" strokeWidth={1.5} />
      </button>
      {visible ? (
        <div
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-label={label}
          className={`absolute right-0 top-full z-30 mt-1 w-60 rounded-xl border border-white/10 bg-[#1E3054] p-3 shadow-xl shadow-black/40 ${reduced ? '' : 'transition-opacity duration-150'}`}
        >
          <div className="mb-1 flex items-start justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[#2DA5A0]">{label}</span>
            {pinned ? (
              <button
                type="button"
                aria-label="Close"
                onClick={() => { setPinned(false); setOpen(false); }}
                className="text-white/40 transition-colors hover:text-white"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            ) : null}
          </div>
          <p className="text-[12px] leading-relaxed text-white/70">{text}</p>
          <p className="mt-1.5 text-[10px] italic leading-snug text-white/35">General wellness guidance, not medical advice.</p>
        </div>
      ) : null}
    </div>
  );
}

export default RationalePeek;
