/**
 * Prompt 172e Phase F Workstream 2: Helix earning event types for catalog
 * adoption.
 *
 * Phase F seeds two append only event types into
 * helix_earning_event_types and wires the hydration quick log route to
 * emit them on catalog driven logs only. Reads the canonical migration
 * file so the test does not require a service role key or a live
 * Supabase connection.
 *
 * Pins:
 *   1. both event ids are present with the correct base_points,
 *      category, requires_consumer_tier, and frequency_limit values
 *   2. nutrivision_hydration_catalog_log carries unlimited frequency
 *      (per existing hydration_logged baseline) with app layer dedup
 *      via the route short circuit and the dedup window
 *   3. nutrivision_hydration_catalog_diversity_3 carries once_per_day
 *      so the helix earning engine handles the idempotency without
 *      app layer plumbing (per the spec section 11 "fires once per
 *      user per day" contract)
 *   4. both event types are tracking category, consumer tier 1, active
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATION_PATH = join(
  process.cwd(),
  'supabase',
  'migrations',
  '20260603000020_prompt_172e_phase_f_telemetry_extension.sql',
);

interface SeededEvent {
  id: string;
  display_name: string;
  base_points: number;
  category: string;
  requires_consumer_tier: number;
  is_active: boolean;
  description: string;
  frequency_limit: string | null;
}

let migrationText: string;

beforeAll(() => {
  migrationText = readFileSync(MIGRATION_PATH, 'utf8');
});

/**
 * Parse the INSERT INTO helix_earning_event_types block out of the
 * Phase F migration. The block is small and append only so a verbatim
 * substring extraction is sufficient; we do not need a full SQL parser.
 * Each VALUES tuple holds id, display_name, base_points, category,
 * requires_consumer_tier, is_active, description, frequency_limit.
 */
function parseSeededEvents(text: string): SeededEvent[] {
  const beginMarker = 'INSERT INTO public.helix_earning_event_types';
  const beginIdx = text.indexOf(beginMarker);
  expect(beginIdx, 'Phase F migration must seed helix_earning_event_types').toBeGreaterThan(-1);
  const tail = text.slice(beginIdx);
  const endIdx = tail.indexOf('ON CONFLICT');
  expect(endIdx, 'Phase F migration must guard the seed with ON CONFLICT').toBeGreaterThan(-1);
  const block = tail.slice(0, endIdx);

  // Find every parenthesized tuple at the top level. Tuples are terminated
  // by ),\n or );\n; we use a simple state machine that tracks single
  // quote balance so a string with a comma does not split a tuple.
  const tuples: string[] = [];
  let cursor = block.indexOf('VALUES');
  if (cursor === -1) return tuples.map(() => ({ id: '', display_name: '', base_points: 0, category: '', requires_consumer_tier: 0, is_active: false, description: '', frequency_limit: null }));
  cursor = block.indexOf('(', cursor);
  while (cursor !== -1 && cursor < block.length) {
    let depth = 0;
    let i = cursor;
    let inStr = false;
    for (; i < block.length; i++) {
      const c = block[i];
      if (c === "'" && block[i - 1] !== '\\') inStr = !inStr;
      if (inStr) continue;
      if (c === '(') depth++;
      else if (c === ')') {
        depth--;
        if (depth === 0) {
          tuples.push(block.slice(cursor + 1, i));
          break;
        }
      }
    }
    cursor = block.indexOf('(', i + 1);
  }

  return tuples.map((raw) => {
    const parts: string[] = [];
    let depth = 0;
    let buf = '';
    let inStr = false;
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i];
      if (c === "'" && raw[i - 1] !== '\\') inStr = !inStr;
      if (!inStr) {
        if (c === '(') depth++;
        else if (c === ')') depth--;
        if (c === ',' && depth === 0) {
          parts.push(buf.trim());
          buf = '';
          continue;
        }
      }
      buf += c;
    }
    if (buf.trim().length > 0) parts.push(buf.trim());

    const unquote = (s: string): string => {
      const trimmed = s.trim();
      if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
        return trimmed.slice(1, -1).replace(/''/g, "'");
      }
      return trimmed;
    };

    return {
      id: unquote(parts[0] ?? ''),
      display_name: unquote(parts[1] ?? ''),
      base_points: Number(parts[2] ?? '0'),
      category: unquote(parts[3] ?? ''),
      requires_consumer_tier: Number(parts[4] ?? '0'),
      is_active: (parts[5] ?? '').toLowerCase() === 'true',
      description: unquote(parts[6] ?? ''),
      frequency_limit: parts[7] === undefined || parts[7].trim().toLowerCase() === 'null'
        ? null
        : unquote(parts[7]),
    };
  });
}

describe('Phase F: helix_earning_event_types seed shape', () => {
  it('seeds nutrivision_hydration_catalog_log with the baseline 1 point + unlimited frequency', () => {
    const events = parseSeededEvents(migrationText);
    const log = events.find((e) => e.id === 'nutrivision_hydration_catalog_log');
    expect(log).toBeDefined();
    expect(log?.base_points).toBe(1);
    expect(log?.category).toBe('tracking');
    expect(log?.requires_consumer_tier).toBe(1);
    expect(log?.is_active).toBe(true);
    expect(log?.frequency_limit).toBe('unlimited');
    // Display name passes the dash rule (no em/en dashes) and stays brand neutral.
    expect(log?.display_name).toBeTruthy();
    expect(log?.display_name).not.toMatch(/[–—]/);
  });

  it('seeds nutrivision_hydration_catalog_diversity_3 with 5 points + once_per_day frequency', () => {
    const events = parseSeededEvents(migrationText);
    const diversity = events.find((e) => e.id === 'nutrivision_hydration_catalog_diversity_3');
    expect(diversity).toBeDefined();
    expect(diversity?.base_points).toBe(5);
    expect(diversity?.category).toBe('tracking');
    expect(diversity?.requires_consumer_tier).toBe(1);
    expect(diversity?.is_active).toBe(true);
    // once_per_day rides the earning engine's frequency check at
    // src/lib/helix/earning-engine.ts so the route does not need an app
    // layer idempotency query. This is the spec section 11 contract.
    expect(diversity?.frequency_limit).toBe('once_per_day');
    expect(diversity?.display_name).toBeTruthy();
    expect(diversity?.display_name).not.toMatch(/[–—]/);
  });

  it('uses ON CONFLICT (id) DO NOTHING so the seed is idempotent on re-run', () => {
    expect(migrationText).toMatch(/ON CONFLICT\s*\(\s*id\s*\)\s*DO NOTHING/i);
  });

  it('does not reference em or en dashes in any descriptive copy', () => {
    expect(migrationText).not.toMatch(/[–—]/);
  });

  it('seeds exactly the two Phase F events (no scope creep beyond spec section 11)', () => {
    const events = parseSeededEvents(migrationText);
    const ids = events.map((e) => e.id).sort();
    expect(ids).toEqual([
      'nutrivision_hydration_catalog_diversity_3',
      'nutrivision_hydration_catalog_log',
    ]);
  });
});

describe('Phase F: telemetry column additions append only shape', () => {
  it('adds beverage_catalog_slug column to hydration_log_sessions', () => {
    expect(migrationText).toMatch(
      /ALTER TABLE\s+public\.hydration_log_sessions[\s\S]*ADD COLUMN IF NOT EXISTS\s+beverage_catalog_slug\s+TEXT/i,
    );
  });

  it('adds effective_volume_bucket column to hydration_log_sessions', () => {
    expect(migrationText).toMatch(
      /ADD COLUMN IF NOT EXISTS\s+effective_volume_bucket\s+TEXT/i,
    );
  });

  it('adds caffeine_contributed_flag column to hydration_log_sessions with default false', () => {
    expect(migrationText).toMatch(
      /ADD COLUMN IF NOT EXISTS\s+caffeine_contributed_flag\s+BOOLEAN[\s\S]*DEFAULT\s+FALSE/i,
    );
  });

  it('creates a partial index on beverage_catalog_slug for analytics queries', () => {
    expect(migrationText).toMatch(
      /CREATE INDEX IF NOT EXISTS[\s\S]*ON public\.hydration_log_sessions[\s\S]*beverage_catalog_slug[\s\S]*WHERE\s+beverage_catalog_slug IS NOT NULL/i,
    );
  });

  it('does not edit existing columns (append only discipline)', () => {
    // Strip SQL line comments so the audit checks the executable shape
    // only. The migration header explains the append only posture using
    // the phrase "ALTER COLUMN" inside a comment block; that is
    // documentation, not a DDL statement.
    const executableSql = migrationText
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n');
    expect(executableSql).not.toMatch(/DROP COLUMN/i);
    expect(executableSql).not.toMatch(/ALTER COLUMN/i);
    expect(executableSql).not.toMatch(/RENAME COLUMN/i);
  });
});
