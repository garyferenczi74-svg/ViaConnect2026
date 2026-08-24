// Prompt #161e patch pass: tests for the side-panel data-seam helpers
// (eyebrow + headline + 3 info chips + 5-dot data-completeness
// indicator). All assertions stay JSX-free per the project's
// node-environment Vitest setup.

import { describe, it, expect } from 'vitest';
import {
  buildSidePanelHeadline,
  buildWeeklyDeltaChip,
  buildTierChipValue,
  buildTrackedDimensionsSummary,
  type TrackedDimensions,
} from '@/components/dashboard/bos-side-panel-helpers';

describe('BOSSidePanel / headline builder', () => {
  it('renders "Your score is Optimal" for OPTIMAL band', () => {
    expect(buildSidePanelHeadline(95)).toEqual({
      prefix: 'Your score is ',
      status: 'Optimal',
      color: '#A855F7',
    });
  });

  it('renders "Your score is Excellent" for EXCELLENT band', () => {
    expect(buildSidePanelHeadline(82)).toEqual({
      prefix: 'Your score is ',
      status: 'Excellent',
      color: '#22C55E',
    });
  });

  it('renders "Your score is Good" for GOOD band', () => {
    expect(buildSidePanelHeadline(60)).toEqual({
      prefix: 'Your score is ',
      status: 'Good',
      color: '#2DA5A0',
    });
  });

  it('renders "Your score is Building" for BUILDING band', () => {
    expect(buildSidePanelHeadline(35)).toEqual({
      prefix: 'Your score is ',
      status: 'Building',
      color: '#F59E0B',
    });
  });

  it('renders "Your score is Needs attention" for NEEDS ATTENTION band', () => {
    expect(buildSidePanelHeadline(10)).toEqual({
      prefix: 'Your score is ',
      status: 'Needs attention',
      color: '#EF4444',
    });
  });
});

describe('BOSSidePanel / weekly delta chip', () => {
  it('shows a positive delta with a + sign and TrendingUp polarity', () => {
    expect(buildWeeklyDeltaChip(3)).toEqual({
      value: '+3 pts',
      polarity: 'up',
      color: '#22C55E',
    });
  });

  it('shows a negative delta with the raw sign and TrendingDown polarity', () => {
    expect(buildWeeklyDeltaChip(-2)).toEqual({
      value: '-2 pts',
      polarity: 'down',
      color: '#EF4444',
    });
  });

  it('shows a flat delta with no sign and Minus polarity', () => {
    expect(buildWeeklyDeltaChip(0)).toEqual({
      value: '0 pts',
      polarity: 'flat',
      color: '#A1A1AA',
    });
  });

  it('hides the chip when weekly_delta is missing (never prints -- pts)', () => {
    expect(buildWeeklyDeltaChip(null)).toBeNull();
    expect(buildWeeklyDeltaChip(Number.NaN)).toBeNull();
  });
});

describe('BOSSidePanel / tier chip value', () => {
  it('formats Tier 1 with 1.5x multiplier', () => {
    expect(buildTierChipValue(1)).toBe('Tier 1 · 1.5x');
  });

  it('formats Tier 2 with 2x multiplier', () => {
    expect(buildTierChipValue(2)).toBe('Tier 2 · 2x');
  });

  it('formats Tier 3 with 5x multiplier', () => {
    expect(buildTierChipValue(3)).toBe('Tier 3 · 5x');
  });

  it('uses U+00B7 middle dot as the separator (NOT en-dash, NOT em-dash)', () => {
    const v = buildTierChipValue(2);
    expect(v).toMatch(/·/);
    expect(v).not.toMatch(/[–—]/);
  });
});

describe('BOSSidePanel / tracked dimensions summary', () => {
  it('counts truthy dimensions and reports n / 5 tracked', () => {
    const dims: TrackedDimensions = {
      sleep: true,
      activity: true,
      stress: false,
      recovery: true,
      hrv: false,
    };
    expect(buildTrackedDimensionsSummary(dims)).toEqual({
      tracked: { sleep: true, activity: true, stress: false, recovery: true, hrv: false },
      count: 3,
      label: '3 / 5 tracked',
      hasData: true,
    });
  });

  it('reports 5 / 5 tracked when all dimensions present', () => {
    const dims: TrackedDimensions = {
      sleep: true,
      activity: true,
      stress: true,
      recovery: true,
      hrv: true,
    };
    expect(buildTrackedDimensionsSummary(dims).count).toBe(5);
    expect(buildTrackedDimensionsSummary(dims).label).toBe('5 / 5 tracked');
  });

  it('falls back to placeholder when dimensions are null (read API gap)', () => {
    expect(buildTrackedDimensionsSummary(null)).toEqual({
      tracked: { sleep: false, activity: false, stress: false, recovery: false, hrv: false },
      count: 0,
      label: '-- / 5 tracked',
      hasData: false,
    });
  });

  it('iterates exactly five dimensions in stable order', () => {
    const dims: TrackedDimensions = {
      sleep: true,
      activity: false,
      stress: true,
      recovery: false,
      hrv: true,
    };
    const summary = buildTrackedDimensionsSummary(dims);
    const keys = Object.keys(summary.tracked) as (keyof TrackedDimensions)[];
    expect(keys).toEqual(['sleep', 'activity', 'stress', 'recovery', 'hrv']);
  });
});
