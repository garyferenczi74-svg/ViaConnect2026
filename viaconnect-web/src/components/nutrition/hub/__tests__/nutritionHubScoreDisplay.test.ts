// Brief 31: Nutrition Score / Daily Macros empty rings reuse the Connections
// -- / UNKNOWN treatment. Missing never paints as a numeric 0 score.

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { ConnectionsBosDial } from '@/components/body-tracker/connections/ConnectionsBosDial';
import {
  CONNECTIONS_BOS_COMPOSITE,
  connectionsBosCompositeDisplay,
  isFiniteHubRingValue,
  nutritionHubEmptyScoreDisplay,
  nutritionHubMacroCenter,
  nutritionHubMacroPaint,
  nutritionHubScoreCenter,
  nutritionHubScorePaint,
} from '../nutritionHubScoreDisplay';
import {
  computeTodayNutrition,
  type HubMealRow,
  type HubMacroTargets,
} from '../useNutritionHubMetrics';

const TZ = 'UTC';
const NOW = new Date('2026-06-10T12:00:00.000Z');

const TARGETS: HubMacroTargets = {
  dailyKcal: 2000,
  dailyProteinG: 100,
  dailyCarbsG: 200,
  dailyFatTotalG: 80,
  dailyFiberG: 30,
};

function iso(dateYmd: string, time = '08:00:00'): string {
  return `${dateYmd}T${time}.000Z`;
}

describe('nutritionHubScoreDisplay', () => {
  it('reuses the Connections empty-score object, not a third treatment', () => {
    expect(nutritionHubEmptyScoreDisplay()).toBe(connectionsBosCompositeDisplay());
    expect(nutritionHubEmptyScoreDisplay()).toEqual({ value: '--', band: 'UNKNOWN' });
    expect(nutritionHubEmptyScoreDisplay()).toEqual(CONNECTIONS_BOS_COMPOSITE);
  });

  it('no meals logged => Nutrition Score display is not 0 OF 100 and not a numeric 0', () => {
    const today = computeTodayNutrition([], TARGETS, NOW, TZ);
    expect(today.nutritionScore).toBeUndefined();
    const center = nutritionHubScoreCenter(today.nutritionScore);
    expect(center.kind).toBe('empty');
    expect(nutritionHubScorePaint(center)).toBe('-- UNKNOWN');
    expect(nutritionHubScorePaint(center)).not.toBe('0 OF 100');
    expect(center.value).not.toBe('0');
    expect(typeof center.value === 'number' ? center.value : null).not.toBe(0);
  });

  it('no meals logged => target ring is not 0% / 0% OF TARGET', () => {
    const today = computeTodayNutrition(
      [{ logged_at: iso('2026-06-09'), quality_score: 80, calories_kcal: 500 }],
      TARGETS,
      NOW,
      TZ,
    );
    expect(today).toEqual({});
    const center = nutritionHubMacroCenter(today.dailyMacrosPct);
    expect(center.kind).toBe('empty');
    expect(nutritionHubMacroPaint(center)).toBe('-- UNKNOWN');
    expect(nutritionHubMacroPaint(center)).not.toBe('0% OF TARGET');
    expect(center.value).not.toBe('0%');
  });

  it('one real scored meal => score is a finite number, never NaN', () => {
    const rows: HubMealRow[] = [
      {
        logged_at: iso('2026-06-10'),
        quality_score: 82,
        calories_kcal: 640,
        protein_g: 40,
        carbs_g: 50,
        fat_total_g: 20,
        fiber_g: 8,
      },
    ];
    const today = computeTodayNutrition(rows, TARGETS, NOW, TZ);
    expect(typeof today.nutritionScore).toBe('number');
    expect(Number.isFinite(today.nutritionScore)).toBe(true);
    expect(today.nutritionScore).not.toBeNaN();
    const center = nutritionHubScoreCenter(today.nutritionScore);
    expect(center.kind).toBe('score');
    if (center.kind !== 'score') return;
    expect(Number.isFinite(center.value)).toBe(true);
    expect(center.value).not.toBeNaN();
    expect(nutritionHubScorePaint(center)).toBe(`${center.value} OF 100`);
    expect(nutritionHubScorePaint(center)).not.toBe('NaN OF 100');
  });

  it('meals logged with truly 0 intake => 0% OF TARGET is allowed', () => {
    const rows: HubMealRow[] = [
      {
        logged_at: iso('2026-06-10'),
        quality_score: 70,
        calories_kcal: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_total_g: 0,
        fiber_g: 0,
      },
    ];
    const today = computeTodayNutrition(rows, TARGETS, NOW, TZ);
    expect(today.nutritionMealCount).toBe(1);
    expect(today.dailyMacrosPct).toBe(0);
    const center = nutritionHubMacroCenter(today.dailyMacrosPct);
    expect(center.kind).toBe('macros');
    expect(nutritionHubMacroPaint(center)).toBe('0% OF TARGET');
    expect(Number.isFinite(today.nutritionScore)).toBe(true);
  });

  it('NaN and Infinity stay UNKNOWN, never a painted 0 score', () => {
    expect(isFiniteHubRingValue(Number.NaN)).toBe(false);
    expect(isFiniteHubRingValue(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isFiniteHubRingValue(undefined)).toBe(false);
    expect(isFiniteHubRingValue(0)).toBe(true);
    expect(nutritionHubScorePaint(nutritionHubScoreCenter(Number.NaN))).toBe('-- UNKNOWN');
    expect(nutritionHubMacroPaint(nutritionHubMacroCenter(Number.NaN))).toBe('-- UNKNOWN');
    expect(nutritionHubScorePaint(nutritionHubScoreCenter(0))).toBe('0 OF 100');
  });

  it('ConnectionsBosDial paints dashes with no 0 OF 100 fill', () => {
    const markup = renderToStaticMarkup(
      createElement(ConnectionsBosDial, { composite: nutritionHubEmptyScoreDisplay() }),
    );
    expect(markup).toContain('--');
    expect(markup).toContain('data-bos-composite="unknown"');
    expect(markup).not.toContain('>UNKNOWN<');
    expect(markup).not.toContain('0 OF 100');
    expect(markup).not.toContain('0% OF TARGET');
    expect(markup).not.toContain('>0<');
  });
});
