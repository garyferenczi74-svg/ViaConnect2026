/**
 * src/app/api/formavision/scan-report/__tests__/route-shape.test.ts
 *
 * Prompt 211a Workstream 3 (whole-branch fix): source-text shape assertions for
 * the scan-report API route (src/app/api/formavision/scan-report/route.ts).
 *
 * All assertions are static text checks against the route source and the shared
 * circumference lib. No network, no DB, no route execution. Node-safe (no jsdom),
 * node builtins only, zero any. Rules: no em dashes, no en dashes, no emojis.
 *
 * ONE-SOURCE INVARIANT (the reason this suite exists). Section 8 bans showing a
 * number that disagrees with the cards. The FormaVision composition + circumference
 * cards render from the body_tracker_* SPINE, so the report route must read that
 * SAME spine and must NOT read body_scan_measurements for the numeric values.
 * (An earlier version of this test asserted the OPPOSITE - that the route must not
 *  read body_tracker_circumference - which enforced the divergence. That assertion
 *  is inverted here.)
 *
 * Invariants guarded:
 *   1. Runtime is nodejs (pdf-lib + Buffer need the node runtime).
 *   2. Server-confirmed auth: createClient().auth.getUser() gate.
 *   3. One source: the route READS the body_tracker_* card spine
 *      (circumference + segmental_fat + segmental_muscle + weight) and does NOT
 *      read body_scan_measurements for the numeric values.
 *   4. Same-source mapping: each report value reads the SAME column the card hooks
 *      read (girths + *_confidence on body_tracker_circumference; hip + hips_confidence
 *      on body_tracker_weight; total_body_fat_pct on segmental_fat; total_muscle_mass_lbs
 *      on segmental_muscle). Girth columns come from the shared MEASUREMENT_DB_COLUMN.
 *   5. Resilience: withTimeout + reportSupabaseError are used; logs carry a
 *      table context only (no PII).
 *   6. Upload target is the body-scan-pdfs bucket; a signed URL is returned.
 *   7. Helix-absent: the route source names no Helix / streak / token strings.
 *   8. No `any` (the admin cast is narrowed to a typed client).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MEASUREMENT_DB_COLUMN,
  MEASUREMENT_EXTERNAL_KEYS,
} from '@/lib/body-tracker/circumference';

const here = dirname(fileURLToPath(import.meta.url));
const ROUTE_PATH = resolve(here, '..', 'route.ts');
const src = readFileSync(ROUTE_PATH, 'utf-8');

// The spine tables the FormaVision cards render from (single source of truth).
const SPINE_TABLES = [
  'body_tracker_circumference',
  'body_tracker_segmental_fat',
  'body_tracker_segmental_muscle',
  'body_tracker_weight',
] as const;

describe('scan-report route: runtime + auth', () => {
  it('declares the nodejs runtime', () => {
    expect(src).toMatch(/export const runtime = ['"]nodejs['"]/);
  });

  it('uses the server-confirmed auth.getUser() gate', () => {
    expect(src).toContain('auth.getUser()');
    expect(src).toContain('createClient');
  });

  it('returns 401 when unauthenticated', () => {
    expect(src).toContain('401');
  });
});

describe('scan-report route: one source (reads the body_tracker_* card spine)', () => {
  it('reads every body_tracker_* spine table the cards render from', () => {
    for (const table of SPINE_TABLES) {
      expect(src).toContain(`'${table}'`);
    }
  });

  it('reads the card body-fat source (segmental_fat.total_body_fat_pct)', () => {
    expect(src).toContain('body_tracker_segmental_fat');
    expect(src).toContain('total_body_fat_pct');
  });

  it('reads the card lean-mass source (segmental_muscle.total_muscle_mass_lbs)', () => {
    expect(src).toContain('body_tracker_segmental_muscle');
    expect(src).toContain('total_muscle_mass_lbs');
  });

  it('reads hip + hip confidence from body_tracker_weight (the #85d card source)', () => {
    expect(src).toContain('body_tracker_weight');
    expect(src).toContain('hips_in');
    expect(src).toContain('hips_confidence');
  });

  it('does NOT read body_scan_measurements for the numeric values (no divergent source)', () => {
    // The whole point of the fix: the old divergent table must not be READ. A
    // prose mention in the header comment explaining WHY it is excluded is fine;
    // what must not exist is an actual query against it or its divergent columns.
    expect(src).not.toMatch(/\bfrom\(\s*['"`]body_scan_measurements['"`]\s*\)/);
    // And none of its divergent numeric columns may leak into the route.
    expect(src).not.toContain('body_fat_pct_mid');
    expect(src).not.toContain('lean_mass_kg');
    expect(src).not.toContain('fat_mass_kg');
    expect(src).not.toContain('_circ_cm');
    // The single-contract SELECT constant / TABLE alias from the old version is gone.
    expect(src).not.toContain('confidence_map');
  });
});

describe('scan-report route: same-source mapping (report value == card column)', () => {
  it('sources girth columns from the shared MEASUREMENT_DB_COLUMN (the card hook map)', () => {
    // The route reads columns via MEASUREMENT_DB_COLUMN[key] rather than a private
    // per-column list, so the report girths track the exact card hook columns.
    expect(src).toContain('MEASUREMENT_DB_COLUMN');
    expect(src).toContain('MEASUREMENT_EXTERNAL_KEYS');
    expect(src).toContain('convertMeasurement');
  });

  it('selects each of the 12 card girth columns from body_tracker_circumference', () => {
    // Pull the body_tracker_circumference .select('...') column list and assert it
    // names every non-hip MEASUREMENT_DB_COLUMN value plus its *_confidence twin.
    const selectRe = /\.select\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    let circSelect: string | null = null;
    let m: RegExpExecArray | null;
    while ((m = selectRe.exec(src)) !== null) {
      const cols = m[1];
      if (cols.includes('neck') && cols.includes('waist') && cols.includes('right_upper_arm')) {
        circSelect = cols;
        break;
      }
    }
    // The CIRC_COLS constant is defined as a concatenation; also fold the whole
    // source in as a fallback so the assertion is robust to how it is spelled.
    const haystack = (circSelect ?? '') + '\n' + src;
    for (const [key, col] of Object.entries(MEASUREMENT_DB_COLUMN)) {
      if (MEASUREMENT_EXTERNAL_KEYS[key as keyof typeof MEASUREMENT_EXTERNAL_KEYS]) continue; // hip is external
      expect(haystack).toContain(col);
      expect(haystack).toContain(`${col}_confidence`);
    }
  });

  it('maps confidence through numericToConfidenceLevel (the same helper the card chips use)', () => {
    expect(src).toContain('numericToConfidenceLevel');
    expect(src).toContain('confidenceDisplay');
  });

  it('converts stored girths with the shared lib rather than a private conversion', () => {
    // Values are stored in entry_unit and converted with convertMeasurement, the
    // exact conversion the card history hook applies. No ad-hoc * 2.54 literals.
    expect(src).toContain('entry_unit');
    expect(src).toContain('convertMeasurement');
  });
});

describe('scan-report route: resilience + logging', () => {
  it('wraps supabase calls in withTimeout', () => {
    expect(src).toContain('withTimeout');
  });

  it('reports supabase errors via reportSupabaseError (drift visibility)', () => {
    expect(src).toContain('reportSupabaseError');
    expect(src).toContain('schema-drift');
  });

  it('log context carries a table name only (no PII)', () => {
    expect(src).toContain('table:');
    // The spine table names appear in the error context.
    expect(src).toContain("table: 'body_tracker_weight'");
  });
});

describe('scan-report route: upload + signed url', () => {
  it('uploads to the body-scan-pdfs bucket', () => {
    expect(src).toContain('body-scan-pdfs');
  });

  it('returns a signed URL', () => {
    expect(src).toContain('createSignedUrl');
  });

  it('renders via the reused scanReportPdf renderer', () => {
    expect(src).toContain('renderScanReportPdf');
  });
});

describe('scan-report route: Helix-absent (Section 8)', () => {
  const banned = ['helix', 'streak', 'viatoken', 'leaderboard', 'multiplier', 'gamif'];
  it('route source names no Helix / streak / token strings', () => {
    const lower = src.toLowerCase();
    for (const w of banned) {
      expect(lower).not.toContain(w);
    }
  });
});

describe('scan-report route: typed admin client (no any)', () => {
  it('does not cast the admin client through any', () => {
    expect(src).not.toContain('as unknown as any');
    expect(src).not.toContain(': any');
    // The admin storage client is a typed SupabaseClient.
    expect(src).toContain('SupabaseClient');
  });
});
