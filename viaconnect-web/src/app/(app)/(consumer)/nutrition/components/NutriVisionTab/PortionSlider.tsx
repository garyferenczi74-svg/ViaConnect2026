'use client';

// Prompt #170 Phase 1l: portion adjust slider.
//
// 20 g min, 800 g max, 5 g step. Centered current value with a small minus /
// plus pair on the left and right. Calls onChange on input + arrow keys. The
// slider thumb stays Teal across the full track.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { Minus, Plus } from 'lucide-react';

interface PortionSliderProps {
  grams: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}

export function PortionSlider({
  grams,
  onChange,
  min = 20,
  max = 800,
  step = 5,
  label = 'Portion',
}: PortionSliderProps) {
  const value = Math.max(min, Math.min(max, Math.round(grams)));

  const adjust = (delta: number) => {
    const next = Math.max(min, Math.min(max, value + delta));
    if (next !== value) onChange(next);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[11px] text-white/50">
        <span>{label}</span>
        <span className="font-mono text-white">{value} g</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => adjust(-step)}
          aria-label="Decrease portion"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-white/5 text-white/70 transition-colors hover:bg-white/10"
        >
          <Minus className="h-3 w-3" strokeWidth={1.5} />
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={`${label} in grams`}
          className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-[#2DA5A0]"
          style={{
            // Teal track fill via gradient mask.
            background: `linear-gradient(to right, #2DA5A0 0%, #2DA5A0 ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) 100%)`,
          }}
        />
        <button
          type="button"
          onClick={() => adjust(step)}
          aria-label="Increase portion"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-white/5 text-white/70 transition-colors hover:bg-white/10"
        >
          <Plus className="h-3 w-3" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
