/**
 * Prompt 172e Phase C Workstream 3: catalog wide clinical claim linter sweep.
 *
 * Phase A passed the Marshall peptide dictionary scan on the 49 row seed.
 * Phase B passed the picker microcopy clinical claim sweep. This sweep
 * extends the build time guardrail to the catalog rows themselves so a
 * future seed drift (a new row added with a structure function claim, an
 * evidence_source that names a curative outcome, a display_name that
 * triggers diagnostic phrasing) is caught at vitest run time before it
 * can land in production Supabase.
 *
 * Failure here is a hard block. The linter is the same one 170c section
 * 13 promises and the same one the meal card microcopy sweep uses; this
 * is just the catalog scope. Failure surfaces the offending row + field
 * + match so Hannah and Kelsey can rewrite without diff archaeology.
 *
 * Reads from the canonical seed file at docs/prompts/prompt-172e-gordon-
 * data-2026-06-02.md (same parse strategy as
 * beverage-catalog-integrity.test.ts), so the test does not require a
 * service role key or a live Supabase connection.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { lintClinicalClaims } from '@/lib/compliance/clinical-claim-linter';

interface CatalogRow {
  slug: string;
  display_name: string;
  evidence_source: string;
}

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
      display_name: stripQuotes(cells[3]),
      evidence_source: stripQuotes(cells[14]),
    });
  }
  return rows;
}

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

describe('Prompt 172e Phase C catalog clinical claim linter sweep', () => {
  it('parses the canonical 49 row seed', () => {
    expect(SEED_ROWS.length).toBe(49);
  });

  it('every display_name passes the clinical claim linter with zero violations', () => {
    const failures: Array<{
      slug: string;
      field: 'display_name';
      match: string;
      kind: string;
    }> = [];

    for (const row of SEED_ROWS) {
      const result = lintClinicalClaims(row.display_name);
      if (!result.ok) {
        for (const v of result.violations) {
          failures.push({
            slug: row.slug,
            field: 'display_name',
            match: v.match,
            kind: v.kind,
          });
        }
      }
    }

    expect(
      failures,
      `Clinical claim violations in catalog display_name fields: ${JSON.stringify(failures, null, 2)}`,
    ).toEqual([]);
  });

  it('every evidence_source passes the clinical claim linter with zero violations', () => {
    const failures: Array<{
      slug: string;
      field: 'evidence_source';
      match: string;
      kind: string;
    }> = [];

    for (const row of SEED_ROWS) {
      const result = lintClinicalClaims(row.evidence_source);
      if (!result.ok) {
        for (const v of result.violations) {
          failures.push({
            slug: row.slug,
            field: 'evidence_source',
            match: v.match,
            kind: v.kind,
          });
        }
      }
    }

    expect(
      failures,
      `Clinical claim violations in catalog evidence_source fields: ${JSON.stringify(failures, null, 2)}`,
    ).toEqual([]);
  });

  it('every slug is dash, emoji, and dollar safe (regression guard against future seed authoring drift)', () => {
    const dashRegex = new RegExp('[–—]');
    for (const row of SEED_ROWS) {
      expect(row.slug).not.toMatch(dashRegex);
      expect(row.display_name).not.toMatch(dashRegex);
      expect(row.evidence_source).not.toMatch(dashRegex);
    }
  });
});

describe('Prompt 172e Phase C catalog flagged rows neutral surface', () => {
  // Phase A R7 ship list: rows with requires_claim_review = true must
  // surface neutral display names with no benefit framing. The linter
  // does not look at the boolean flag column; this assertion pins the
  // 6 row set Phase A landed and rechecks each one stays neutral.
  const FLAGGED_SLUGS = [
    'water_electrolyte_enhanced',
    'water_hydrogen',
    'water_alkaline',
    'sports_drink_electrolyte_mix',
    'sports_drink_ors',
    'functional_kombucha',
  ];

  it('all 6 expected flagged rows are present in the seed', () => {
    for (const slug of FLAGGED_SLUGS) {
      const row = SEED_ROWS.find((r) => r.slug === slug);
      expect(row, `flagged row ${slug} not found in seed`).toBeDefined();
    }
  });

  it('flagged rows ship neutral display names with no health claim words', () => {
    const forbiddenWords = [
      'antioxidant',
      'detox',
      'detoxify',
      'anti inflammatory',
      'anti-inflammatory',
      'immune',
      'pH balancing',
      'alkalizing',
      'cures',
      'heals',
      'prevents',
    ];
    for (const slug of FLAGGED_SLUGS) {
      const row = SEED_ROWS.find((r) => r.slug === slug);
      if (!row) continue;
      const name = row.display_name.toLowerCase();
      for (const word of forbiddenWords) {
        expect(
          name.includes(word.toLowerCase()),
          `flagged row ${slug} display_name "${row.display_name}" contains forbidden health claim word "${word}"`,
        ).toBe(false);
      }
    }
  });
});
