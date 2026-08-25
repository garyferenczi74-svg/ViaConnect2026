import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ScoreDetailPanel } from '@/components/body-tracker/connections/ScoreDetailPanel';
import type { DimensionSourceRow } from '@/lib/body-tracker/source-disagreement';
import { EMPTY_BEDTIME_STRIP } from '@/lib/body-tracker/sleep-bedtime-strip';

vi.mock('react-hot-toast', () => ({ default: { success: () => undefined, error: () => undefined } }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));

// Regression guard for the merge that fed ScoreDetailPanel's 4-dim
// lockScoreDetailRows output straight into ContributorColumn. That collapsed
// away the 3 Task-7b contributor dims (hrv / resting_hr / steps), so a user
// with real data for them saw "Connect your device" while the drill-down sheet
// showed the value -- a self-contradiction. The panel must forward the full
// 7-dim rows to the column with only the Sleep row gated. No prior test wired
// a 7-row snapshot THROUGH ScoreDetailPanel, which is why the suite stayed
// green; this one does.

function sourced(dimension: string, source: string, displayValue: string): DimensionSourceRow {
  return {
    dimension,
    source,
    value: Number(displayValue),
    displayValue,
    status: 'sourced',
    showRing: true,
    manual: false,
    disagreement: null,
    sources: [],
  };
}

describe('ScoreDetailPanel contributor rows: 7-dim forwarding (Task 7b regression)', () => {
  it('surfaces hrv / resting_hr / steps as connected when they have real data', () => {
    const rows = [
      sourced('hrv', 'whoop', '55'),
      sourced('resting_hr', 'whoop', '52'),
      sourced('steps', 'apple_health', '8452'),
    ];
    const markup = renderToStaticMarkup(
      createElement(ScoreDetailPanel, {
        rows,
        lastUpdatedAt: null,
        bedtimeStrip: EMPTY_BEDTIME_STRIP,
      }),
    );

    // Exactly the 3 sourced metrics render a visible ring; before the fix all
    // 7 collapsed to cold (lockScoreDetailRows dropped these dimensions).
    expect((markup.match(/data-ring="visible"/g) ?? []).length).toBe(3);
    // The 4 metrics with no data (sleep, recovery, workouts<-strain,
    // body_composition<-metabolic) stay honestly cold.
    expect((markup.match(/Connect your device/g) ?? []).length).toBe(4);

    expect(markup).toContain('data-metric="hrv"');
    expect(markup).toContain('data-metric="resting_hr"');
    expect(markup).toContain('data-metric="steps"');
    // Real source attribution renders for those rows, not the CTA.
    expect(markup).toContain('Whoop'); // hrv + resting_hr
    expect(markup).toMatch(/Apple Health/); // steps
  });

  it('gates only the Sleep row when last-sync is missing, keeping Task-7b rows connected', () => {
    const rows = [sourced('sleep', 'whoop', '62'), sourced('steps', 'apple_health', '8452')];

    // No real last-sync: Sleep must gate to cold, but Steps stays connected.
    const cold = renderToStaticMarkup(
      createElement(ScoreDetailPanel, {
        rows,
        lastUpdatedAt: null,
        bedtimeStrip: EMPTY_BEDTIME_STRIP,
      }),
    );
    expect((cold.match(/data-ring="visible"/g) ?? []).length).toBe(1); // steps only

    // Real last-sync: Sleep joins Steps as connected (Gary's sleep gate, kept).
    const synced = renderToStaticMarkup(
      createElement(ScoreDetailPanel, {
        rows,
        lastUpdatedAt: null,
        bedtimeStrip: { ...EMPTY_BEDTIME_STRIP, sleepTileSynced: true },
      }),
    );
    expect((synced.match(/data-ring="visible"/g) ?? []).length).toBe(2); // sleep + steps
  });
});
