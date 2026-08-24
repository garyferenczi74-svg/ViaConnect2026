'use client';

// Prompt 185a slice 6a (2026-06-09): the keyboard-accessible "Move to" control.
// A small menu offering Morning / Afternoon / Evening so a supplement's bucket
// can be changed without a pointer (the accessible path that mirrors the drag).
// Selecting a bucket performs the same mutation and the same user_drag lock as
// a drag. No emojis. No em or en dashes.

import { useEffect, useRef, useState } from 'react';
import { MoveVertical } from 'lucide-react';
import type { TimeOfDay } from '@/lib/caq/supplements/timing/types';

const OPTIONS: { id: TimeOfDay; label: string }[] = [
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
];

export function MoveToMenu({ current, onMove }: { current: TimeOfDay; onMove: (t: TimeOfDay) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex flex-shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Move to a different time of day"
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-white/40 transition-colors hover:text-[#2DA5A0] focus-visible:text-[#2DA5A0] focus-visible:outline-none"
      >
        <MoveVertical className="h-4 w-4" strokeWidth={1.5} />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-36 rounded-xl border border-white/10 bg-[#1E3054] p-1 shadow-xl shadow-black/40">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.10em] text-white/40">Move to</p>
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              role="menuitem"
              disabled={o.id === current}
              onClick={() => { onMove(o.id); setOpen(false); }}
              className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-xs transition-colors ${o.id === current ? 'cursor-default text-white/30' : 'text-white/75 hover:bg-white/10'}`}
            >
              {o.id === current ? `${o.label} (current)` : o.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default MoveToMenu;
