'use client';

/**
 * src/components/journey/trio/SleepDonut.tsx
 *
 * Sleep-stages donut for Your Journey (Prompt 208d + 216b palette).
 * Wearable stages are not connected: honest no-data ring via chartPalette.empty.
 * Legend swatches use sleepChartColors so users see the future stage palette.
 */

import { Moon } from 'lucide-react';
import { Donut } from './Donut';
import { chartPalette, sleepChartColors } from '@/lib/design-tokens';

const DM_SANS = 'var(--font-dm-sans), sans-serif';
const DM_MONO = 'var(--font-dm-mono), monospace';

const STAGES: ReadonlyArray<{ name: string; color: string }> = [
  { name: 'Deep', color: sleepChartColors.deep },
  { name: 'Light', color: sleepChartColors.light },
  { name: 'REM', color: sleepChartColors.rem },
  { name: 'Awake', color: sleepChartColors.awake },
];

// userId accepted for uniform trio signature; unused while connector is flag-off.
export function SleepDonut({ userId: _userId }: { userId: string | null }) {
  // Prompt 216b no-data treatment: full chart-empty ring (identical rule to Nutrition).
  const noDataSegments = [{ value: 1, color: chartPalette.empty, label: 'No data' }];

  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-white/[0.06] bg-[rgba(22,36,64,0.40)] p-4">
      <div className="flex items-center gap-2">
        <Moon
          className="h-4 w-4 shrink-0"
          strokeWidth={1.5}
          style={{ color: chartPalette.chart1 }}
        />
        <div className="flex min-w-0 flex-col">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ fontFamily: DM_MONO, color: chartPalette.chart1 }}
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
        <Donut
          segments={noDataSegments}
          centerValue="--"
          centerLabel="total"
          emptyCenter="Not connected"
          ariaLabel="Sleep stages, not connected"
        />

        <p
          className="text-center text-[12px] leading-relaxed text-white/55"
          style={{ fontFamily: DM_SANS }}
        >
          Connect a wearable to see your sleep stages (Deep, Light, REM, Awake).
        </p>

        <div className="flex w-full flex-wrap justify-center gap-x-3 gap-y-1">
          {STAGES.map((stage) => (
            <span
              key={stage.name}
              className="flex items-center gap-1.5 text-[11px] text-white/55"
              style={{ fontFamily: DM_SANS }}
            >
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ background: stage.color }}
              />
              {stage.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SleepDonut;
