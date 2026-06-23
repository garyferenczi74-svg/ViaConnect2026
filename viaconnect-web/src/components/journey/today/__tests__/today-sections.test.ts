/**
 * src/components/journey/today/__tests__/today-sections.test.ts
 *
 * Node-safe render tests for EnergyStressGraph (3.3) and TodayStats (3.5).
 * Uses react-dom/server renderToStaticMarkup + React.createElement (no JSX)
 * so the file stays .test.ts and the existing src/**\/__tests__\/**\/*.test.ts
 * glob picks it up with NO vitest.config.ts change.
 *
 * Primary assertion: SAFETY INVARIANT - no fabricated wearable data is rendered.
 * All wearable-sourced metrics (steps, calories, exercise, sleep, energy, stress)
 * must appear as honest-empty "Not connected" / "--" states, never as numbers.
 * Hydration is the only live value (user-logged, not wearable).
 *
 * Prompt 208d Task D-T6.
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// ---------------------------------------------------------------------------
// Mock useHydrationToday so the hook does not call fetch in node.
// The mock returns null data (no session), so the hydration tile renders "--".
// ---------------------------------------------------------------------------
vi.mock('@/components/hydration/useHydrationToday', () => ({
  useHydrationToday: () => ({ data: null, loading: false, error: null, refresh: async () => {} }),
}));

// Import AFTER vi.mock so the mock is in place.
const { EnergyStressGraph } = await import(
  '@/components/journey/today/EnergyStressGraph'
);
const { TodayStats } = await import(
  '@/components/journey/today/TodayStats'
);

// ---------------------------------------------------------------------------
// EnergyStressGraph (3.3) - honest-empty area-graph frame
// ---------------------------------------------------------------------------

describe('EnergyStressGraph', () => {
  it('renders without throwing', () => {
    const html = renderToStaticMarkup(
      React.createElement(EnergyStressGraph)
    );
    expect(html).toBeTruthy();
    expect(html.length).toBeGreaterThan(0);
  });

  it('contains the honest wearable connect copy', () => {
    const html = renderToStaticMarkup(
      React.createElement(EnergyStressGraph)
    );
    // The brief specifies this exact phrase as the honest-empty overlay.
    expect(html).toContain('Connect a wearable to see your energy and stress through the day');
  });

  it('does NOT contain fabricated energy or stress readings', () => {
    const html = renderToStaticMarkup(
      React.createElement(EnergyStressGraph)
    );
    // No numeric energy/stress values should appear. We check that no standalone
    // digits preceded/followed by common wearable metric units appear.
    // The chart frame may have SVG coordinate numbers - those are layout, not data.
    // Fabricated reading patterns to exclude: bare "8.5", "72 bpm", "92%", etc.
    // Strategy: confirm no data-value aria attributes or metric suffixes.
    expect(html).not.toMatch(/\d+\s*(bpm|hrv|ms|energy|stress score)/i);
  });

  it('includes time-of-day axis hints (6a, 12p, 6p, 12a)', () => {
    const html = renderToStaticMarkup(
      React.createElement(EnergyStressGraph)
    );
    // The frame should render axis tick labels to communicate it is a time-of-day chart.
    expect(html).toContain('6a');
    expect(html).toContain('12p');
    expect(html).toContain('6p');
    expect(html).toContain('12a');
  });

  it('does NOT render plotted data paths (SVG series)', () => {
    const html = renderToStaticMarkup(
      React.createElement(EnergyStressGraph)
    );
    // The honest-empty chart frame has only <line> elements (grid/baseline).
    // A fabricated energy or stress series would render a <path> element inside
    // the chart SVG with viewBox="0 0 400 120". We check that no such path exists
    // by ensuring the chart SVG (the one with viewBox) contains no <path> tags.
    const chartSvgMatch = html.match(/<svg[^>]*viewBox="0 0 400 120"[^>]*>([\s\S]*?)<\/svg>/);
    expect(chartSvgMatch).toBeTruthy();
    if (chartSvgMatch) {
      const chartSvgContent = chartSvgMatch[1];
      expect(chartSvgContent).not.toContain('<path');
    }
  });
});

// ---------------------------------------------------------------------------
// TodayStats (3.5) - today-stat tile grid (flag-off + live hydration)
// ---------------------------------------------------------------------------

describe('TodayStats', () => {
  it('renders without throwing when userId is null', () => {
    const html = renderToStaticMarkup(
      React.createElement(TodayStats, { userId: null })
    );
    expect(html).toBeTruthy();
    expect(html.length).toBeGreaterThan(0);
  });

  it('renders the four flag-off metric labels', () => {
    const html = renderToStaticMarkup(
      React.createElement(TodayStats, { userId: null })
    );
    expect(html).toContain('Steps');
    expect(html).toContain('Active calories');
    expect(html).toContain('Exercise');
    expect(html).toContain('Sleep');
  });

  it('renders "Not connected" for all four flag-off tiles', () => {
    const html = renderToStaticMarkup(
      React.createElement(TodayStats, { userId: null })
    );
    // Each of the four wearable-sourced tiles must show honest "Not connected".
    const matches = html.match(/Not connected/g);
    expect(matches).not.toBeNull();
    // At least four occurrences (one per flag-off tile).
    expect(matches!.length).toBeGreaterThanOrEqual(4);
  });

  it('does NOT contain fabricated step, calorie, exercise, or sleep numbers', () => {
    const html = renderToStaticMarkup(
      React.createElement(TodayStats, { userId: null })
    );
    // Fabricated wearable reading patterns to exclude. These are specific metric
    // value formats that would only appear if someone hardcoded sample data.
    expect(html).not.toMatch(/\b\d{3,5}\s*steps\b/i);
    expect(html).not.toMatch(/\b\d+\s*kcal\b/i);
    expect(html).not.toMatch(/\b\d+\s*(min|minutes)\s*(exercise|active)/i);
    expect(html).not.toMatch(/\b[78]\s*h(ours?)?\s*sleep\b/i);
  });

  it('renders the Hydration tile label', () => {
    const html = renderToStaticMarkup(
      React.createElement(TodayStats, { userId: null })
    );
    expect(html).toContain('Hydration');
  });

  it('renders honest "--" for hydration when data is null (no session in static render)', () => {
    const html = renderToStaticMarkup(
      React.createElement(TodayStats, { userId: null })
    );
    // useHydrationToday returns null data (mocked above), so value must be "--".
    expect(html).toContain('--');
  });

  it('renders without throwing when userId is a string', () => {
    const html = renderToStaticMarkup(
      React.createElement(TodayStats, { userId: 'user-abc-123' })
    );
    expect(html).toBeTruthy();
  });

  it('does NOT render fabricated numeric values in flag-off tile aria-labels', () => {
    const html = renderToStaticMarkup(
      React.createElement(TodayStats, { userId: null })
    );
    // Each StatTile component sets aria-label={`${label}: ${value}`}.
    // Flag-off tiles (Steps, Active calories, Exercise, Sleep) must not render
    // aria-label with a digit immediately after the label. A fabricated value
    // would fail this check (e.g., aria-label="Steps: 8500").
    expect(html).not.toMatch(/aria-label="(Steps|Active calories|Exercise|Sleep): \d/);
  });
});
