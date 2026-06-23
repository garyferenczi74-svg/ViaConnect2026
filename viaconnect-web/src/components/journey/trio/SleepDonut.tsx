'use client';

/**
 * src/components/journey/trio/SleepDonut.tsx
 *
 * The sleep-stages donut for the Your Journey page (Prompt 208d, 3.6, Task
 * D-T4). The wearable connector that would supply sleep stages (Deep, Light,
 * REM, Awake) is FLAG-OFF / not connected, so this renders the HONEST EMPTY
 * Donut shell with a calm "connect a wearable" line. It NEVER fabricates stage
 * values; it is structurally ready for when the connector turns on (pass real
 * { value, color, label } stage segments to the same Donut).
 *
 * Style: glass surface over Deep Navy, Teal #2DA5A0 accent, DM Sans, Lucide
 * strokeWidth 1.5, no emojis, no em/en-dashes, reduced-motion safe (the Donut
 * handles motion). Never throws.
 */

import { Moon } from 'lucide-react';
import { Donut } from './Donut';

const TEAL = '#2DA5A0';
const DM_SANS = 'var(--font-dm-sans), sans-serif';
const DM_MONO = 'var(--font-dm-mono), monospace';

// Stage legend is shown muted (the stages this donut WILL display once a
// wearable is connected) so the user knows what to expect. No values.
const STAGES = ['Deep', 'Light', 'REM', 'Awake'] as const;

// userId is accepted for a uniform trio signature and forward-compatibility with
// the wearable read; it is intentionally unused while the connector is flag-off.
export function SleepDonut({ userId: _userId }: { userId: string | null }) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-white/[0.06] bg-[rgba(22,36,64,0.40)] p-4">
      <div className="flex items-center gap-2">
        <Moon
          className="h-4 w-4 shrink-0"
          strokeWidth={1.5}
          style={{ color: TEAL }}
        />
        <div className="flex min-w-0 flex-col">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ fontFamily: DM_MONO, color: TEAL }}
          >
            Sleep
          </span>
          <p
            className="text-[12px] text-white/65"
            style={{ fontFamily: DM_SANS }}
          >
            Your sleep stages, once a wearable is connected.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        {/* Honest empty ring: no segments, calm grey track, honest center. */}
        <Donut
          segments={[]}
          emptyCenter="Not connected"
          ariaLabel="Sleep stages, not connected"
        />

        <p
          className="text-center text-[12px] leading-relaxed text-white/55"
          style={{ fontFamily: DM_SANS }}
        >
          Connect a wearable to see your sleep stages (Deep, Light, REM, Awake).
        </p>

        {/* Muted legend of the stages this ring will show, no fabricated values. */}
        <div className="flex w-full flex-wrap justify-center gap-x-3 gap-y-1">
          {STAGES.map((stage) => (
            <span
              key={stage}
              className="flex items-center gap-1.5 text-[11px] text-white/40"
              style={{ fontFamily: DM_SANS }}
            >
              <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-white/15" />
              {stage}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SleepDonut;
