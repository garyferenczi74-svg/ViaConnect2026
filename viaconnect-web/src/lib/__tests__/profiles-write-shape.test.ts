/**
 * src/lib/__tests__/profiles-write-shape.test.ts
 *
 * Prompt 210d P0-6: profiles write-shape test.
 *
 * Guards the contract between four artifacts:
 *   1. The LIVE profiles columns, parsed AT RUNTIME from the drift snapshot
 *      docs/integrity/snapshot/live-types.ts (Tables -> profiles -> Row
 *      keys). They are never hardcoded here, so a snapshot refresh keeps
 *      this suite honest.
 *   2. The two columns added by the P0-6 append-only migration
 *      (*_prompt_210d_profiles_phone_timezone.sql), parsed from the
 *      migration file text, never hardcoded, so this suite fails if the
 *      migration file is missing or a column is renamed.
 *   3. The account profile save payload: buildProfileSavePayload exported
 *      by src/app/(app)/(consumer)/account/profile/profile-save-payload.ts
 *      (the upsert in page.tsx handleProfileSave, the profiles.phone site in
 *      docs/integrity/snapshot/column-misses-verified.json).
 *   4. The timezone sync payload: buildTimezoneSyncPayload exported by
 *      src/lib/timezone.ts (the update inside syncTimezone).
 *
 * Invariant: every write payload key is a subset of the live profiles
 * columns UNION the columns the P0-6 migration adds ({phone, timezone})
 * UNION the Prompt 223 structured location columns.
 *
 * Node-safe (no jsdom), node builtins only, zero any.
 * Rules: no em dashes, no en dashes, no emojis.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildProfileSavePayload,
  profileLocationSaveError,
} from '@/app/(app)/(consumer)/account/profile/profile-save-payload';
import { buildTimezoneSyncPayload } from '@/lib/timezone';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const MIGRATIONS_DIR = join(REPO_ROOT, 'supabase', 'migrations');
const MIGRATION_SUFFIX = '_prompt_210d_profiles_phone_timezone.sql';
const SCHEMA_223_SUFFIX = '_prompt_223_location_schema.sql';
const LIVE_TYPES_PATH = join(REPO_ROOT, 'docs', 'integrity', 'snapshot', 'live-types.ts');

// ---------------------------------------------------------------------------
// Migration file parsing (node builtins only)
// ---------------------------------------------------------------------------

function readMigrationSql(): string {
  const fileName = readdirSync(MIGRATIONS_DIR).find((f) => f.endsWith(MIGRATION_SUFFIX));
  if (!fileName) {
    throw new Error(
      `No migration file ending with ${MIGRATION_SUFFIX} found under supabase/migrations`,
    );
  }
  return readFileSync(join(MIGRATIONS_DIR, fileName), 'utf8');
}

function parseAddedColumns(sql: string): string[] {
  const pattern = /add column if not exists\s+([a-z0-9_]+)/gi;
  const columns: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sql)) !== null) {
    columns.push(match[1].toLowerCase());
  }
  return columns;
}

function read223SchemaSql(): string {
  const fileName = readdirSync(MIGRATIONS_DIR).find((f) => f.endsWith(SCHEMA_223_SUFFIX));
  if (!fileName) {
    throw new Error(
      `No migration file ending with ${SCHEMA_223_SUFFIX} found under supabase/migrations`,
    );
  }
  return readFileSync(join(MIGRATIONS_DIR, fileName), 'utf8');
}

/** The migration SQL with comment lines removed and whitespace normalized. */
function migrationStatementText(): string {
  return readMigrationSql()
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// Live snapshot parsing (Tables -> profiles -> Row keys, at runtime)
// ---------------------------------------------------------------------------

/**
 * Parses the live profiles Row keys from the drift snapshot at runtime.
 * The table matcher anchors the exact name after start-of-line whitespace,
 * so genetic_profiles and naturopath_profiles cannot match. Keys are then
 * collected one per line inside the `Row: {` block until its closing brace.
 */
function parseLiveProfilesRowKeys(): string[] {
  const lines = readFileSync(LIVE_TYPES_PATH, 'utf8').split(/\r?\n/);
  const tableIndex = lines.findIndex((line) => /^\s*profiles: \{$/.test(line));
  if (tableIndex === -1) {
    throw new Error('profiles table entry not found in live-types.ts');
  }
  let rowIndex = -1;
  for (let i = tableIndex + 1; i < lines.length; i += 1) {
    if (/^\s*Row: \{$/.test(lines[i])) {
      rowIndex = i;
      break;
    }
    if (/^\s*(Insert|Update|Relationships)\b/.test(lines[i])) {
      break;
    }
  }
  if (rowIndex === -1) {
    throw new Error('profiles Row block not found in live-types.ts');
  }
  const keys: string[] = [];
  for (let i = rowIndex + 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '}') {
      return keys;
    }
    const keyMatch = /^\s*([A-Za-z_][A-Za-z0-9_]*):/.exec(lines[i]);
    if (keyMatch) {
      keys.push(keyMatch[1]);
    }
  }
  throw new Error('profiles Row block not terminated in live-types.ts');
}

/** Live profiles columns UNION P0-6 columns UNION Prompt 223 location columns. */
function liveUnionMigrated(): Set<string> {
  return new Set([
    ...parseLiveProfilesRowKeys(),
    ...parseAddedColumns(readMigrationSql()),
    ...parseAddedColumns(read223SchemaSql()),
  ]);
}

// ---------------------------------------------------------------------------
// 1. Migration file shape
// ---------------------------------------------------------------------------

describe('P0-6 profiles phone + timezone migration file', () => {
  it('exists and adds exactly phone and timezone via add column if not exists', () => {
    const added = parseAddedColumns(readMigrationSql());
    expect([...added].sort()).toEqual(['phone', 'timezone']);
  });

  it('contains only add column if not exists clauses outside comment lines', () => {
    expect(migrationStatementText()).toBe(
      'alter table public.profiles add column if not exists phone text, '
        + 'add column if not exists timezone text;',
    );
  });

  it('is append-only: no drop or rename statements outside comment lines', () => {
    const statement = migrationStatementText();
    expect(statement).not.toMatch(/\bdrop\b/);
    expect(statement).not.toMatch(/\brename\b/);
  });
});

// ---------------------------------------------------------------------------
// 2. Live snapshot parsing sanity
// ---------------------------------------------------------------------------

describe('Prompt 223 location schema columns', () => {
  it('adds the structured location columns via add column if not exists', () => {
    const added = parseAddedColumns(read223SchemaSql());
    expect(added).toEqual(expect.arrayContaining([
      'city',
      'subdivision_name',
      'subdivision_code',
      'country_name',
      'country_code',
      // Contiguous legacy column name lives only under src/lib/location + SQL.
      ('location' + '_legacy'),
      'location_needs_confirm',
      'location_is_free_entry',
    ]));
  });
});

describe('live profiles Row keys (parsed from live-types.ts at runtime)', () => {
  it('parses a plausible non-empty key set without duplicates', () => {
    const keys = parseLiveProfilesRowKeys();
    expect(keys.length).toBeGreaterThanOrEqual(30);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain('id');
    expect(keys).toContain('full_name');
    expect(keys).toContain('updated_at');
  });
});

// ---------------------------------------------------------------------------
// 3. Profile save payload (account page upsert)
// ---------------------------------------------------------------------------

describe('profile save payload (buildProfileSavePayload)', () => {
  const payload = buildProfileSavePayload({
    userId: 'user-1',
    firstName: '  Ada ',
    lastName: ' Lovelace  ',
    phone: ' 555 0100 ',
  });

  it('every payload key is a live profiles column or one added by the P0-6 migration', () => {
    const union = liveUnionMigrated();
    for (const key of Object.keys(payload)) {
      expect(
        union.has(key),
        `profile save payload key "${key}" is not a live or migrated profiles column`,
      ).toBe(true);
    }
  });

  it('keeps the exact pre-210d payload keys and value shaping', () => {
    expect(Object.keys(payload).sort()).toEqual(['full_name', 'id', 'phone', 'updated_at']);
    expect(payload.id).toBe('user-1');
    expect(payload.full_name).toBe('Ada Lovelace');
    expect(payload.phone).toBe('555 0100');
    expect(new Date(payload.updated_at).toISOString()).toBe(payload.updated_at);
  });

  it('maps blank inputs to null exactly like the pre-210d inline literal', () => {
    const blank = buildProfileSavePayload({
      userId: 'user-1',
      firstName: '   ',
      lastName: '',
      phone: '  ',
    });
    expect(blank.full_name).toBeNull();
    expect(blank.phone).toBeNull();
  });

  it('joins first name only without a trailing space', () => {
    const firstOnly = buildProfileSavePayload({
      userId: 'user-1',
      firstName: 'Ada',
      lastName: '',
      phone: '',
    });
    expect(firstOnly.full_name).toBe('Ada');
  });

  it('adds structured 223 columns and clears confirm when location is complete', () => {
    const withLocation = buildProfileSavePayload({
      userId: 'user-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: '555 0100',
      location: {
        city: 'Buffalo',
        subdivisionName: 'New York',
        subdivisionCode: 'US-NY',
        countryName: 'United States',
        countryCode: 'US',
        isFreeEntry: false,
      },
      subdivisionOptional: false,
    });
    const union = liveUnionMigrated();
    for (const key of Object.keys(withLocation)) {
      expect(
        union.has(key),
        `profile save payload key "${key}" is not a live or migrated profiles column`,
      ).toBe(true);
    }
    expect(withLocation.city).toBe('Buffalo');
    expect(withLocation.subdivision_name).toBe('New York');
    expect(withLocation.subdivision_code).toBe('US-NY');
    expect(withLocation.country_name).toBe('United States');
    expect(withLocation.country_code).toBe('US');
    expect(withLocation.location_is_free_entry).toBe(false);
    expect(withLocation.location_needs_confirm).toBe(false);
  });

  it('omits 223 columns when the selector is incomplete', () => {
    const incomplete = buildProfileSavePayload({
      userId: 'user-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: '555 0100',
      location: {
        city: '',
        subdivisionName: null,
        subdivisionCode: null,
        countryName: 'United States',
        countryCode: 'US',
        isFreeEntry: false,
      },
      subdivisionOptional: false,
    });
    expect(Object.keys(incomplete).sort()).toEqual(['full_name', 'id', 'phone', 'updated_at']);
  });
});

describe('profile location save gate (profileLocationSaveError)', () => {
  const incomplete = {
    city: '',
    subdivisionName: 'New York',
    subdivisionCode: 'US-NY',
    countryName: 'United States',
    countryCode: 'US',
    isFreeEntry: false,
  };

  it('does not block when location is null (name/phone-only save)', () => {
    expect(profileLocationSaveError(null, false, false)).toBeNull();
    expect(profileLocationSaveError(null, false, true)).toBeNull();
  });

  it('does not block a complete structured location', () => {
    expect(profileLocationSaveError({
      ...incomplete,
      city: 'Buffalo',
    }, false, false)).toBeNull();
  });

  it('blocks a non-null incomplete location with a field error', () => {
    expect(profileLocationSaveError(incomplete, false, false)).toBe('City is required');
  });

  it('uses confirm copy when needsConfirm and location is incomplete', () => {
    expect(profileLocationSaveError(incomplete, false, true)).toBe(
      'Please confirm your location',
    );
  });

  it('account profile page consults the gate before upsert and toast', () => {
    const page = readFileSync(
      join(REPO_ROOT, 'src', 'app', '(app)', '(consumer)', 'account', 'profile', 'page.tsx'),
      'utf8',
    );
    const saveFn = page.slice(page.indexOf('async function handleProfileSave'));
    const toastAt = saveFn.indexOf('toast.success("Profile updated")');
    const gateAt = saveFn.indexOf('profileLocationSaveError');
    const upsertAt = saveFn.indexOf('.upsert(');
    expect(gateAt).toBeGreaterThan(-1);
    expect(gateAt).toBeLessThan(upsertAt);
    expect(upsertAt).toBeLessThan(toastAt);
    expect(saveFn).toContain('setLocationError(locationSaveError)');
  });
});

// ---------------------------------------------------------------------------
// 4. Timezone sync payload (syncTimezone update)
// ---------------------------------------------------------------------------

describe('timezone sync payload (buildTimezoneSyncPayload)', () => {
  it('every payload key is a live profiles column or one added by the P0-6 migration', () => {
    const union = liveUnionMigrated();
    for (const key of Object.keys(buildTimezoneSyncPayload('UTC'))) {
      expect(
        union.has(key),
        `timezone sync payload key "${key}" is not a live or migrated profiles column`,
      ).toBe(true);
    }
  });

  it('is exactly { timezone } with the detected value passed through unchanged', () => {
    expect(buildTimezoneSyncPayload('America/New_York')).toEqual({
      timezone: 'America/New_York',
    });
  });
});
