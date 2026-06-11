// Prompt 183 Task 5 (2026-06-10): source as text contract tests for the
// presentational 7 Day Meal History tile. Same convention the other hub tests
// use (readFileSync + assert on the source); full visual sign off happens at
// the Vercel preview. These lock the PlasmaGauge reuse with max 7, the seven
// bar slots, the props only / presentational contract (no data hooks, no
// Supabase, no fetch), the undefined prop empty states (no fabricated 0), the
// streak caption, the absence of an Open button, strokeWidth 1.5, and the no
// dash rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'NutritionMealHistoryTile.tsx');
const HELPERS = path.resolve(__dirname, '..', 'nutritionMealHistory.helpers.ts');

describe('NutritionMealHistoryTile source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('is a client component', () => {
    expect(source.startsWith("'use client';")).toBe(true);
  });

  it('reuses PlasmaGauge with max 7 toward the 7 day target', () => {
    expect(source).toContain("import { PlasmaGauge } from '@/components/gauges/PlasmaGauge'");
    expect(source).toContain('<PlasmaGauge');
    expect(source).toContain('max={STREAK_GAUGE_MAX}');
    expect(source).toContain('STREAK_GAUGE_MAX = 7');
  });

  it('authors no new gauge math (no svg arc / stroke geometry here)', () => {
    expect(source).not.toContain('arcPath');
    expect(source).not.toContain('strokeDasharray');
    expect(source).not.toContain('<svg');
  });

  it('feeds the gauge value off the streakDays prop', () => {
    // value passes a clamp of the streak prop, not a hardcoded number.
    expect(source).toContain('value={clamped}');
    expect(source).toContain('Math.min(STREAK_GAUGE_MAX, Math.round(streakDays))');
  });

  it('renders 7 bar slots for the day window', () => {
    // The populated path maps over dailyMealCounts (length 7) and the empty
    // placeholder renders exactly 7 tracks.
    expect(source).toContain('dailyMealCounts.map(');
    expect(source).toContain('Array.from({ length: 7 })');
  });

  it('uses the brand Teal token for filled bars and a dim white track for empty days', () => {
    expect(source).toContain("TEAL = '#2DA5A0'");
    expect(source).toContain('bg-white/[0.06]'); // empty bar track
  });

  it('derives weekday labels for display from the current date', () => {
    expect(source).toContain('weekdayLabelsEndingToday(new Date(), 7)');
  });

  it('delegates bar height scaling to the pure helper', () => {
    expect(source).toContain("from './nutritionMealHistory.helpers'");
    expect(source).toContain('barHeightFractions(');
  });

  it('shows an empty state when streakDays is undefined (no fabricated 0 streak)', () => {
    // The streak caption is gated on presence; the absent branch shows a no
    // streak note rather than a 0 day streak.
    expect(source).toContain('No streak yet');
    expect(source).toContain('hasStreak(streakDays)');
  });

  it('shows a calm placeholder when dailyMealCounts is undefined (no fabricated bars)', () => {
    expect(source).toContain('Log meals to build your 7 day history.');
    expect(source).toContain('hasCounts(dailyMealCounts)');
  });

  it('includes the day streak caption', () => {
    expect(source).toContain('day streak');
  });

  it('has no Open button (drill down is a later prompt)', () => {
    // No interactive button element at all, and no Open / drill down affordance.
    expect(source).not.toMatch(/<button/i);
    expect(source).not.toMatch(/\bOpen\b/);
    expect(source).not.toMatch(/onClick/i);
    expect(source).not.toMatch(/href=/i);
  });

  it('is presentational: no data hooks, no Supabase, no fetch, no writes', () => {
    // Assert on import paths and call forms (the bare words createClient /
    // fetch appear in the explanatory header comment describing what the tile
    // does NOT do; the contract is that none of them are imported or invoked).
    expect(source).not.toMatch(/import[^\n]*supabase/i);
    expect(source).not.toMatch(/createClient\(/);
    expect(source).not.toMatch(/useNutritionHubMetrics\(/);
    expect(source).not.toMatch(/import[^\n]*useUserMeals/);
    expect(source).not.toContain('fetch(');
    expect(source).not.toContain('.insert(');
    expect(source).not.toContain('.update(');
    expect(source).not.toContain('.delete(');
    expect(source).not.toContain('.upsert(');
  });

  it('respects prefers reduced motion via framer-motion', () => {
    expect(source).toContain("from 'framer-motion'");
    expect(source).toContain('useReducedMotion');
  });

  it('uses Lucide strokeWidth 1.5 only', () => {
    expect(source).toContain("from 'lucide-react'");
    expect(source).toContain('strokeWidth={1.5}');
    expect(source).not.toContain('strokeWidth={2}');
    expect(source).not.toContain('strokeWidth={1}');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});

describe('nutritionMealHistory.helpers source', () => {
  const source = readFileSync(HELPERS, 'utf-8');

  it('performs no reads or writes (pure transforms only)', () => {
    expect(source).not.toContain('createClient');
    expect(source).not.toContain('fetch(');
    expect(source).not.toContain('.insert(');
    expect(source).not.toContain('.update(');
    expect(source).not.toContain('.delete(');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
