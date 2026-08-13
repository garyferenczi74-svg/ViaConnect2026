/**
 * Prompt 216b: chart palette tokens and donut component color sourcing.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  chartPalette,
  nutritionChartColors,
  sleepChartColors,
} from '@/lib/design-tokens';

const root = process.cwd();

describe('Prompt 216b chartPalette tokens', () => {
  it('exports exact Section 1 hex values', () => {
    expect(chartPalette.chart1).toBe('#2DA5A0');
    expect(chartPalette.chart2).toBe('#C98A3D');
    expect(chartPalette.chart3).toBe('#5B7FA6');
    expect(chartPalette.chart4).toBe('#8B7BB8');
    expect(chartPalette.empty).toBe('#2E4066');
  });

  it('assigns nutrition segments per Section 1', () => {
    expect(nutritionChartColors.carbs).toBe(chartPalette.chart1);
    expect(nutritionChartColors.protein).toBe(chartPalette.chart2);
    expect(nutritionChartColors.fat).toBe(chartPalette.chart3);
  });

  it('assigns sleep stages per Section 1', () => {
    expect(sleepChartColors.deep).toBe(chartPalette.chart1);
    expect(sleepChartColors.light).toBe(chartPalette.chart3);
    expect(sleepChartColors.rem).toBe(chartPalette.chart4);
    expect(sleepChartColors.awake).toBe(chartPalette.chart2);
  });

  it('sleep colors vary in lightness for CVD distinctness', () => {
    // Rough relative luminance proxy from hex (R*0.3 + G*0.6 + B*0.1)
    const lum = (hex: string) => {
      const h = hex.replace('#', '');
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return r * 0.3 + g * 0.6 + b * 0.1;
    };
    const lums = [
      lum(sleepChartColors.deep),
      lum(sleepChartColors.light),
      lum(sleepChartColors.rem),
      lum(sleepChartColors.awake),
    ];
    // All four not identical; range of lightness is meaningful
    const spread = Math.max(...lums) - Math.min(...lums);
    expect(spread).toBeGreaterThan(15);
    // Distinct pairwise (not equal hex)
    const set = new Set(Object.values(sleepChartColors));
    expect(set.size).toBe(4);
  });
});

describe('Prompt 216b donut components use tokens only', () => {
  const forbidden = [
    /#46C18E/i,
    /#4F7FB5/i,
    /#B75E18/,
    /#7B6FB0/,
    /#6C7A99/,
  ];

  it('NutritionDonut has no legacy hardcoded segment hex', () => {
    const src = readFileSync(
      join(root, 'src/components/journey/trio/NutritionDonut.tsx'),
      'utf8',
    );
    expect(src).toMatch(/nutritionChartColors/);
    expect(src).toMatch(/chartPalette\.empty/);
    for (const re of forbidden) {
      expect(src).not.toMatch(re);
    }
  });

  it('SleepDonut has no legacy hardcoded segment hex', () => {
    const src = readFileSync(
      join(root, 'src/components/journey/trio/SleepDonut.tsx'),
      'utf8',
    );
    expect(src).toMatch(/sleepChartColors/);
    expect(src).toMatch(/chartPalette\.empty/);
    for (const re of forbidden) {
      expect(src).not.toMatch(re);
    }
  });

  it('coaching NutritionCard and SleepCard use chart tokens not C.green/blue/purple for segments', () => {
    const src = readFileSync(
      join(root, 'src/components/journey/YourJourneyCoaching.tsx'),
      'utf8',
    );
    expect(src).toMatch(/nutritionChartColors/);
    expect(src).toMatch(/sleepChartColors/);
    expect(src).toMatch(/chartPalette\.empty/);
    // Segment assignments should not use C.green / C.blue / C.purple
    expect(src).not.toMatch(/value: carbsG, color: C\.green/);
    expect(src).not.toMatch(/color: C\.teal \}, \{ value: 1, color: C\.blue/);
  });
});
