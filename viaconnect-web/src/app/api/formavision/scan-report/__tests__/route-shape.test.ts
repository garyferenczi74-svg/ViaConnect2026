/**
 * src/app/api/formavision/scan-report/__tests__/route-shape.test.ts
 *
 * Prompt 211a Workstream 3: source-text shape assertions for the scan-report
 * API route (src/app/api/formavision/scan-report/route.ts).
 *
 * All assertions are static text checks against the route source and the live
 * migration. No network, no DB, no route execution. Node-safe (no jsdom), node
 * builtins only, zero any. Rules: no em dashes, no en dashes, no emojis.
 *
 * Invariants guarded:
 *   1. Runtime is nodejs (pdf-lib + Buffer need the node runtime).
 *   2. Server-confirmed auth: createClient().auth.getUser() gate.
 *   3. Single contract: the route SELECTs from body_scan_measurements only, and
 *      every column it names is a real column of that table (parsed from the
 *      migration). No second data path (no body_tracker_circumference read here).
 *   4. Resilience: withTimeout + reportSupabaseError are used; logs carry a
 *      table context only (no PII).
 *   5. Upload target is the body-scan-pdfs bucket; a signed URL is returned.
 *   6. Helix-absent: the route source names no Helix / streak / token strings.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROUTE_PATH = resolve(here, '..', 'route.ts');
const src = readFileSync(ROUTE_PATH, 'utf-8');

// Parse the live body_scan_measurements columns out of the CREATE TABLE block
// in the canonical migration, so the subset assertion tracks the real schema.
const MIGRATION_PATH = resolve(
  here,
  '..', '..', '..', '..', '..', '..',
  'supabase', 'migrations', '20260416000100_body_scan_measurements.sql',
);
const migration = readFileSync(MIGRATION_PATH, 'utf-8');

function liveColumns(): Set<string> {
  const start = migration.indexOf('CREATE TABLE IF NOT EXISTS body_scan_measurements');
  const end = migration.indexOf('ALTER TABLE body_scan_measurements ENABLE ROW LEVEL SECURITY');
  const block = migration.slice(start, end);
  const cols = new Set<string>();
  for (const line of block.split('\n')) {
    // Column definitions look like: `  neck_circ_cm              NUMERIC(5,1),`
    const m = line.match(/^\s{2,}([a-z][a-z0-9_]*)\s+[A-Z]/);
    if (m) cols.add(m[1]);
  }
  return cols;
}

const LIVE = liveColumns();

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

describe('scan-report route: single contract (body_scan_measurements)', () => {
  it('reads from body_scan_measurements', () => {
    expect(src).toContain("from('body_scan_measurements')");
  });

  it('does NOT open a second data path via body_tracker_circumference', () => {
    // The single-contract rule: body_scan_measurements already carries the 12
    // *_circ_cm columns + composition + confidence_map, so no second read.
    expect(src).not.toContain("from('body_tracker_circumference')");
  });

  it('every selected column name exists on the live body_scan_measurements table', () => {
    // The migration parse must have found the real columns.
    expect(LIVE.has('neck_circ_cm')).toBe(true);
    expect(LIVE.has('lean_mass_kg')).toBe(true);
    expect(LIVE.has('overall_confidence')).toBe(true);

    // Pull the column list from the .select('...') call(s) in the route and
    // assert each token is a subset of the live columns (or a known meta col).
    const META = new Set(['id', 'user_id', 'session_id', 'scan_date', 'created_at']);
    const selectRe = /\.select\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    let m: RegExpExecArray | null;
    let sawScanSelect = false;
    while ((m = selectRe.exec(src)) !== null) {
      const cols = m[1].split(',').map((c) => c.trim()).filter(Boolean);
      // Only check the select that names scan columns (skip unrelated selects).
      if (!cols.some((c) => c.endsWith('_circ_cm') || c === 'body_fat_pct_mid')) continue;
      sawScanSelect = true;
      for (const col of cols) {
        const bare = col.replace(/\s+/g, '');
        expect(LIVE.has(bare) || META.has(bare)).toBe(true);
      }
    }
    expect(sawScanSelect).toBe(true);
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
    expect(src).toContain("table: 'body_scan_measurements'");
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
