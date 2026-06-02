// Prompt 170b Workstream A unit test: cuisine coverage validation.
//
// Asserts the production seed file at data/seed/farmceutica_curated_foods
// .csv hits the cuisine coverage targets from spec section 3.2 within
// the +- 2 row tolerance from spec section 3.7:
//   north_american         30 (28..32)
//   mediterranean          20 (18..22)
//   latin_american         20 (18..22)
//   east_asian             30 (28..32)
//   south_asian            20 (18..22)
//   southeast_asian        20 (18..22)
//   middle_eastern         15 (13..17)
//   african                15 (13..17)
//   viacura_branded        30 (28..32)
//   total                  200 (198..202)
//
// Per [[feedback_viacura_separate_brand]] (Gary 2026-06-01 Prompt 170b
// Ask #3 ratification): the 30 branded items in the ViaCura adjacent
// bucket are authored under the ViaCura brand verbatim.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseCSV } from '../../../scripts/seed/lib/csv-parse';

const SEED_PATH = path.resolve('data/seed/farmceutica_curated_foods.csv');

const COVERAGE_TARGETS: Record<string, number> = {
  north_american: 30,
  mediterranean: 20,
  latin_american: 20,
  east_asian: 30,
  south_asian: 20,
  southeast_asian: 20,
  middle_eastern: 15,
  african: 15,
  viacura_branded: 30,
};

const TOLERANCE = 2;

describe('farmceutica_curated_foods cuisine coverage', () => {
  const csv = readFileSync(SEED_PATH, 'utf8');
  const { rows } = parseCSV(csv);

  const counts: Record<string, number> = {};
  for (const row of rows) {
    const tag = (row.cuisine_tag ?? '').trim();
    counts[tag] = (counts[tag] ?? 0) + 1;
  }

  for (const [bucket, target] of Object.entries(COVERAGE_TARGETS)) {
    it(`covers ${bucket} within +- ${TOLERANCE} of target ${target}`, () => {
      const actual = counts[bucket] ?? 0;
      expect(
        actual,
        `Bucket ${bucket} has ${actual} rows; target ${target} +- ${TOLERANCE}`,
      ).toBeGreaterThanOrEqual(target - TOLERANCE);
      expect(actual).toBeLessThanOrEqual(target + TOLERANCE);
    });
  }

  it('no rows carry an unrecognized cuisine_tag', () => {
    const allowed = new Set(Object.keys(COVERAGE_TARGETS));
    for (const row of rows) {
      const tag = (row.cuisine_tag ?? '').trim();
      expect(allowed.has(tag), `Row "${row.name}" has unrecognized cuisine_tag: ${tag}`).toBe(true);
    }
  });

  it('total row count is 200 +- 2', () => {
    expect(rows.length).toBeGreaterThanOrEqual(198);
    expect(rows.length).toBeLessThanOrEqual(202);
  });
});
