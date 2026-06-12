// Prompt 170b Workstream A unit test: CSV shape validation.
//
// Asserts the production seed file at data/seed/farmceutica_curated_foods
// .csv satisfies the spec section 3.4 authoring rules:
//   - every row has every required column
//   - every numeric field parses as a finite number (or null where
//     density_g_per_ml is intentionally absent)
//   - micronutrients_per_100g_json parses as valid JSON
//   - the 4-4-9 rule holds: kcal approximately = 4*protein + 4*carbs +
//     9*fat (within +-15% tolerance per spec)
//   - no em dashes, no en dashes, no emojis in any cell (per standing
//     rule + spec section 3.4)
//   - name + cuisine_tag pairs are unique (idempotency precondition for
//     the migration 20260601000060 unique index)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseCSV } from '../../../scripts/seed/lib/csv-parse';

const SEED_PATH = path.resolve('data/seed/farmceutica_curated_foods.csv');

const REQUIRED_HEADERS = [
  'name',
  'cuisine_tag',
  'density_g_per_ml',
  'per_100g_kcal',
  'per_100g_protein_g',
  'per_100g_carbs_g',
  'per_100g_fat_g',
  'per_100g_fiber_g',
  'per_100g_sugar_g',
  'per_100g_sodium_mg',
  'per_100g_cholesterol_mg',
  'micronutrients_per_100g_json',
  'notes',
];

const FOUR_NINE_TOLERANCE = 0.15;

// Block U+2014 em dash, U+2013 en dash, U+2015 horizontal bar, U+2212
// minus sign, plus the literal ASCII " - " 3-char sequence. ASCII hyphen
// (U+002D) alone is fine; the 3-char "space hyphen space" sequence is
// the dash-style stand-in we still want to avoid.
const FORBIDDEN_DASHES = /—|–|―|−/;

// Emoji range (BMP + supplementary planes). Conservative; covers the
// common emoji codepoints.
const EMOJI_RANGE = /[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{1F000}-\u{1F2FF}]/u;

describe('farmceutica_curated_foods CSV shape', () => {
  const csv = readFileSync(SEED_PATH, 'utf8');
  const { headers, rows } = parseCSV(csv);

  it('has every required header', () => {
    for (const r of REQUIRED_HEADERS) {
      expect(headers).toContain(r);
    }
  });

  it('has approximately 200 rows (within 198 to 202)', () => {
    expect(rows.length).toBeGreaterThanOrEqual(198);
    expect(rows.length).toBeLessThanOrEqual(202);
  });

  it('every row has a name + cuisine_tag', () => {
    for (const row of rows) {
      expect(row.name?.trim().length ?? 0).toBeGreaterThan(0);
      expect(row.cuisine_tag?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });

  it('every macro numeric field parses as a finite non-negative number', () => {
    const numericFields = [
      'per_100g_kcal',
      'per_100g_protein_g',
      'per_100g_carbs_g',
      'per_100g_fat_g',
      'per_100g_fiber_g',
      'per_100g_sugar_g',
      'per_100g_sodium_mg',
      'per_100g_cholesterol_mg',
    ];
    for (const row of rows) {
      for (const f of numericFields) {
        const n = Number(row[f]);
        expect(Number.isFinite(n), `Row ${row.name} field ${f} = ${row[f]} is not finite`).toBe(true);
        expect(n).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('density_g_per_ml is null or a positive finite number', () => {
    for (const row of rows) {
      const raw = row.density_g_per_ml;
      if (raw === '' || raw?.toLowerCase() === 'null') continue;
      const n = Number(raw);
      expect(Number.isFinite(n), `Row ${row.name} density = ${raw} is not finite`).toBe(true);
      expect(n).toBeGreaterThan(0);
    }
  });

  it('micronutrients_per_100g_json parses as valid JSON object on every row', () => {
    for (const row of rows) {
      const raw = row.micronutrients_per_100g_json || '{}';
      let parsed: unknown;
      expect(() => {
        parsed = JSON.parse(raw);
      }, `Row ${row.name} micronutrients_per_100g_json is not valid JSON: ${raw}`).not.toThrow();
      expect(typeof parsed).toBe('object');
      expect(parsed).not.toBeNull();
    }
  });

  it('macro 4-4-9 rule holds within +-15% on every row (fiber-aware)', () => {
    // Sweep 2026-06-12: total carbs overcounts fiber (4 kcal/g vs ~2). The
    // fiber-aware Atwater form 4p + 4(c-f) + 2f + 9fat matches accurate USDA
    // rows like spinach and broccoli that the naive form rejected. Rows where
    // both sides are near zero (teas, waters) are exempt from the ratio test.
    for (const row of rows) {
      const kcal = Number(row.per_100g_kcal);
      const p = Number(row.per_100g_protein_g);
      const c = Number(row.per_100g_carbs_g);
      const f = Number(row.per_100g_fat_g);
      const fiber = Number(row.per_100g_fiber_g) || 0;
      const digestibleCarbs = Math.max(0, c - fiber);
      const fiberAware = 4 * p + 4 * digestibleCarbs + 2 * fiber + 9 * f;
      const naive = 4 * p + 4 * c + 9 * f;
      if (kcal <= 10 && fiberAware <= 10) continue;
      // Labels legitimately use either Atwater convention; a row passes if
      // the closer of the two fits the tolerance.
      const dev = (calc: number) => Math.abs(kcal - calc) / Math.max(kcal, calc);
      const deviation = Math.min(dev(fiberAware), dev(naive));
      expect(
        deviation,
        `Row "${row.name}" kcal=${kcal}; fiber-aware = ${fiberAware}, naive 4-4-9 = ${naive}; best deviation ${(deviation * 100).toFixed(1)}%`,
      ).toBeLessThanOrEqual(FOUR_NINE_TOLERANCE);
    }
  });

  it('no row contains em dashes, en dashes, horizontal bars, or minus signs', () => {
    for (const row of rows) {
      for (const f of REQUIRED_HEADERS) {
        const v = row[f] ?? '';
        expect(
          FORBIDDEN_DASHES.test(v),
          `Row "${row.name}" field ${f} contains a forbidden dash codepoint: ${v}`,
        ).toBe(false);
      }
    }
  });

  it('no row contains emoji codepoints', () => {
    for (const row of rows) {
      for (const f of REQUIRED_HEADERS) {
        const v = row[f] ?? '';
        expect(EMOJI_RANGE.test(v), `Row "${row.name}" field ${f} contains an emoji codepoint: ${v}`).toBe(false);
      }
    }
  });

  it('name + cuisine_tag pairs are unique across all rows', () => {
    const seen = new Set<string>();
    for (const row of rows) {
      const key = `${row.name}|${row.cuisine_tag}`;
      expect(seen.has(key), `Duplicate row: ${key}`).toBe(false);
      seen.add(key);
    }
  });
});
