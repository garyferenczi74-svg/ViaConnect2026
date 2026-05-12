'use client';

// Prompt #162 section 4: date navigator. Chevrons + native date input picker.
// No new dependency: HTML5 input type=date works on all modern mobile + desktop.

import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

interface DateNavigatorProps {
  readonly date: string;
  readonly onChange: (next: string) => void;
}

function isoToday(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function minIsoDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 90);
  return d.toISOString().slice(0, 10);
}

function formatLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const today = isoToday();
  const prefix = iso === today ? 'Today, ' : '';
  return prefix + dt.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function shiftIso(iso: string, deltaDays: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

export function DateNavigator({ date, onChange }: DateNavigatorProps) {
  const today = isoToday();
  const min = minIsoDate();
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const isToday = date === today;
  const isMin = date === min;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft' && !isMin) {
        onChange(shiftIso(date, -1));
      } else if (e.key === 'ArrowRight' && !isToday) {
        onChange(shiftIso(date, 1));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [date, isToday, isMin, onChange]);

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      <button
        type="button"
        onClick={() => onChange(shiftIso(date, -1))}
        disabled={isMin}
        aria-label="Previous day"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/5 text-white/70 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
          className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 min-h-[44px]"
        >
          <CalendarDays className="h-4 w-4 text-white/55" strokeWidth={1.5} />
          {formatLabel(date)}
        </button>
        <input
          ref={dateInputRef}
          type="date"
          value={date}
          min={min}
          max={today}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Pick a date"
        />
      </div>

      <button
        type="button"
        onClick={() => onChange(shiftIso(date, 1))}
        disabled={isToday}
        aria-label="Next day"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/5 text-white/70 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
      </button>
    </div>
  );
}
