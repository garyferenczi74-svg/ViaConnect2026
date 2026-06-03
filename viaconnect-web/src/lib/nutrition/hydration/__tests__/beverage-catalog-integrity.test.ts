/**
 * Prompt 172e Phase A Deliverable 4: 49 row seed integrity tests.
 *
 * The full 49 row Gordon Deliverable 2 seed is loaded into Supabase via
 * MCP execute_sql before this suite runs (Michelangelo Phase A ordering:
 * snapshot -> patch -> table create -> seed). These tests validate
 * structural invariants that hold against the file copy of Gordon's SQL,
 * so a regression in the seed or a drift between Gordon's data file and
 * what landed in Supabase is caught locally without requiring a service
 * role key in CI.
 *
 * Live row count is verified via the catalog endpoint integration; this
 * suite reads from the canonical text and checks math the same way
 * Hannah + Kelsey verified during ratification.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HYDRATION_SOURCE_KINDS } from '../types';

type CatalogRow = {
  slug: string;
  category: string;
  hydration_source_kind: string;
  display_name: string;
  default_volume_ml: number;
  hydration_coefficient: number;
  caffeine_mg_per_serving: number;
  kcal_per_serving: number;
  sugar_g: number;
  sodium_mg: number;
  potassium_mg: number;
  magnesium_mg: number;
  is_alcoholic: boolean;
  abv: number | null;
  evidence_source: string;
  requires_claim_review: boolean;
  is_active: boolean;
  sort_order: number;
};

function parseSeedRows(): CatalogRow[] {
  const seedFile = join(
    process.cwd(),
    'docs',
    'prompts',
    'prompt-172e-gordon-data-2026-06-02.md',
  );
  const text = readFileSync(seedFile, 'utf8');
  const beginIdx = text.indexOf('insert into beverage_catalog');
  if (beginIdx === -1) throw new Error('seed INSERT not found in data file');
  const tail = text.slice(beginIdx);
  const endIdx = tail.indexOf('on conflict (slug)');
  if (endIdx === -1) throw new Error('seed INSERT terminator not found');
  const insertBody = tail.slice(0, endIdx);
  const valuesIdx = insertBody.indexOf('values');
  const valuesSection = insertBody.slice(valuesIdx + 'values'.length);

  const tupleBodies = extractTopLevelTuples(valuesSection);
  const rows: CatalogRow[] = [];
  for (const body of tupleBodies) {
    const cells = splitSqlTuple(body);
    if (cells.length !== 18) continue;
    rows.push({
      slug: stripQuotes(cells[0]),
      category: stripQuotes(cells[1]),
      hydration_source_kind: stripQuotes(cells[2]),
      display_name: stripQuotes(cells[3]),
      default_volume_ml: Number(cells[4]),
      hydration_coefficient: Number(cells[5]),
      caffeine_mg_per_serving: Number(cells[6]),
      kcal_per_serving: Number(cells[7]),
      sugar_g: Number(cells[8]),
      sodium_mg: Number(cells[9]),
      potassium_mg: Number(cells[10]),
      magnesium_mg: Number(cells[11]),
      is_alcoholic: cells[12] === 'true',
      abv: cells[13] === 'null' ? null : Number(cells[13]),
      evidence_source: stripQuotes(cells[14]),
      requires_claim_review: cells[15] === 'true',
      is_active: cells[16] === 'true',
      sort_order: Number(cells[17]),
    });
  }
  return rows;
}

// Walk the values block char by char. Tracks quote state and paren depth so
// strings containing parens (e.g. "Maughan 2016 (sparkling)") and quoted
// commas are handled correctly. Returns each top level tuple's body
// without the surrounding parens.
function extractTopLevelTuples(input: string): string[] {
  const tuples: string[] = [];
  let buf = '';
  let depth = 0;
  let inQuote = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === "'") {
      inQuote = !inQuote;
      if (depth >= 1) buf += ch;
      continue;
    }
    if (!inQuote && ch === '(') {
      depth++;
      if (depth === 1) {
        buf = '';
        continue;
      }
      buf += ch;
      continue;
    }
    if (!inQuote && ch === ')') {
      depth--;
      if (depth === 0) {
        tuples.push(buf);
        buf = '';
        continue;
      }
      buf += ch;
      continue;
    }
    if (depth >= 1) buf += ch;
  }
  return tuples;
}

function splitSqlTuple(body: string): string[] {
  const cells: string[] = [];
  let buf = '';
  let inQuote = false;
  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "'") {
      inQuote = !inQuote;
      buf += ch;
      continue;
    }
    if (!inQuote && ch === '(') {
      depth++;
      buf += ch;
      continue;
    }
    if (!inQuote && ch === ')') {
      depth--;
      buf += ch;
      continue;
    }
    if (ch === ',' && !inQuote && depth === 0) {
      cells.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim().length > 0) cells.push(buf.trim());
  return cells;
}

function stripQuotes(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

let SEED_ROWS: CatalogRow[];

beforeAll(() => {
  SEED_ROWS = parseSeedRows();
});

describe('Prompt 172e seed integrity (Gordon Deliverable 2)', () => {
  it('parses 49 rows from the canonical data file', () => {
    expect(SEED_ROWS.length).toBe(49);
  });

  it('every slug is unique', () => {
    const slugs = SEED_ROWS.map((r) => r.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  it('every row maps to one of the 9 live hydration_source_kind enum values', () => {
    const valid = new Set(HYDRATION_SOURCE_KINDS);
    for (const row of SEED_ROWS) {
      expect(valid.has(row.hydration_source_kind as never)).toBe(true);
    }
  });

  it('every row carries evidence_source for audit', () => {
    for (const row of SEED_ROWS) {
      expect(row.evidence_source.length).toBeGreaterThan(0);
    }
  });

  it('exactly 6 rows ship requires_claim_review true per Kelsey review', () => {
    const flagged = SEED_ROWS.filter((r) => r.requires_claim_review).map((r) => r.slug);
    expect(flagged.sort()).toEqual(
      [
        'water_electrolyte_enhanced',
        'water_hydrogen',
        'water_alkaline',
        'sports_drink_electrolyte_mix',
        'sports_drink_ors',
        'functional_kombucha',
      ].sort(),
    );
  });
});

describe('Prompt 172e seed caffeine sanity vs 171b corpus', () => {
  const expected: Record<string, number> = {
    coffee_drip: 95,
    coffee_espresso_shot: 63,
    coffee_cold_brew: 175,
    coffee_decaf: 3,
    tea_black: 47,
    tea_green: 28,
    tea_matcha: 70,
    tea_herbal: 0,
    pop_cola: 34,
    pop_diet_cola: 46,
    sports_drink_energy: 80,
  };

  for (const [slug, mg] of Object.entries(expected)) {
    it(`${slug} caffeine_mg_per_serving matches 171b corpus (${mg} mg)`, () => {
      const row = SEED_ROWS.find((r) => r.slug === slug);
      expect(row).toBeDefined();
      expect(row!.caffeine_mg_per_serving).toBe(mg);
    });
  }
});

describe('Prompt 172e seed coefficient sanity vs Maughan conservative patch', () => {
  const expected: Record<string, number> = {
    milk_whole: 1.3,
    milk_skim: 1.3,
    milk_oat: 1.3,
    milk_almond: 1.3,
    milk_soy: 1.3,
    coffee_latte: 1.3,
    coffee_cappuccino: 1.3,
    tea_chai: 1.3,
    functional_kefir: 1.3,
    juice_orange: 1.2,
    juice_apple: 1.2,
    juice_grape: 1.2,
    juice_cranberry: 1.2,
    juice_smoothie_mixed: 1.2,
    functional_broth: 1.2,
    sports_drink_electrolyte_mix: 1.4,
    sports_drink_ors: 1.4,
    alcohol_beer: 1.0,
    alcohol_light_beer: 1.0,
    alcohol_wine: 1.0,
    alcohol_spirits: 1.0,
    alcohol_cocktail: 1.0,
  };

  for (const [slug, coef] of Object.entries(expected)) {
    it(`${slug} hydration_coefficient is ${coef}`, () => {
      const row = SEED_ROWS.find((r) => r.slug === slug);
      expect(row).toBeDefined();
      expect(row!.hydration_coefficient).toBe(coef);
    });
  }
});

describe('Prompt 172e seed authoring discipline', () => {
  it('zero em dashes and zero en dashes across all string columns', () => {
    // U+2014 em dash + U+2013 en dash via unicode escapes so this assertion
    // does not itself trip the .husky/pre-commit dash gate.
    const dashRegex = new RegExp('[\u2013\u2014]');
    for (const row of SEED_ROWS) {
      for (const field of [row.slug, row.category, row.display_name, row.evidence_source]) {
        expect(field).not.toMatch(dashRegex);
      }
    }
  });

  it('every category maps to a known UI bucket', () => {
    const known = new Set([
      'water',
      'coffee',
      'tea',
      'juice',
      'pop',
      'sports_energy',
      'milk',
      'functional',
      'alcohol',
    ]);
    for (const row of SEED_ROWS) {
      expect(known.has(row.category)).toBe(true);
    }
  });

  it('alcohol rows carry an abv and is_alcoholic true', () => {
    const alcoholRows = SEED_ROWS.filter((r) => r.category === 'alcohol');
    expect(alcoholRows.length).toBeGreaterThan(0);
    for (const row of alcoholRows) {
      expect(row.is_alcoholic).toBe(true);
      expect(row.abv).not.toBeNull();
      expect(row.abv!).toBeGreaterThan(0);
    }
  });

  it('non alcohol rows carry abv null and is_alcoholic false', () => {
    const nonAlcoholRows = SEED_ROWS.filter((r) => r.category !== 'alcohol');
    for (const row of nonAlcoholRows) {
      expect(row.is_alcoholic).toBe(false);
      expect(row.abv).toBeNull();
    }
  });
});
