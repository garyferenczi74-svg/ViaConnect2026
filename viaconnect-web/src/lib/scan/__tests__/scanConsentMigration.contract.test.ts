import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Prompt 231 Task 9: scan consent migration contract test. Reads the
// migration SQL text (never applies it to a database) and asserts the
// scan_consent_versions / scan_consent_acks shape described in the task-9
// brief and conditions 9, 13, 16.

function findMigrationFile(): string {
  const migrationsDir = path.resolve(__dirname, '../../../../supabase/migrations');
  const files = fs.readdirSync(migrationsDir);
  const match = files.find((f) => f.endsWith('_prompt_231_scan_consent.sql'));
  if (!match) {
    throw new Error(
      'Expected a migration file matching *_prompt_231_scan_consent.sql in ' + migrationsDir,
    );
  }
  return path.join(migrationsDir, match);
}

describe('prompt 231 scan consent migration contract', () => {
  let sql: string;
  let sqlLower: string;

  beforeAll(() => {
    const filePath = findMigrationFile();
    sql = fs.readFileSync(filePath, 'utf8');
    sqlLower = sql.toLowerCase();
  });

  describe('scan_consent_versions table', () => {
    it('is created with CREATE TABLE IF NOT EXISTS', () => {
      expect(sqlLower).toContain('create table if not exists public.scan_consent_versions');
    });

    it('has version text NOT NULL UNIQUE', () => {
      expect(sqlLower).toMatch(/version text not null unique/);
    });

    it('has body_markdown text NOT NULL', () => {
      expect(sqlLower).toContain('body_markdown text not null');
    });

    it('has a lex_status column with a CHECK constraint', () => {
      expect(sqlLower).toContain('lex_status text not null default');
      expect(sqlLower).toMatch(/lex_status in \([^)]*'cleared'[^)]*\)/);
    });

    it('has effective_at timestamptz', () => {
      expect(sqlLower).toContain('effective_at timestamptz');
    });

    it('enables row level security', () => {
      expect(sqlLower).toContain(
        'alter table public.scan_consent_versions enable row level security',
      );
    });

    it('exposes only lex_status = cleared rows via SELECT', () => {
      const policyBlocks = sql.match(/create policy[\s\S]*?;/gi) ?? [];
      const versionPolicies = policyBlocks.filter((stmt) =>
        /on\s+public\.scan_consent_versions/i.test(stmt),
      );
      expect(versionPolicies).toHaveLength(1);
      expect(versionPolicies[0].toLowerCase()).toContain('for select');
      expect(versionPolicies[0].toLowerCase()).toMatch(/lex_status\s*=\s*'cleared'/);
    });
  });

  describe('scan_consent_acks table', () => {
    it('is created with CREATE TABLE IF NOT EXISTS', () => {
      expect(sqlLower).toContain('create table if not exists public.scan_consent_acks');
    });

    it('has user_id uuid NOT NULL referencing auth.users with ON DELETE CASCADE', () => {
      expect(sqlLower).toMatch(
        /user_id uuid not null references auth\.users\(id\) on delete cascade/,
      );
    });

    it('has consent_version_id uuid NOT NULL referencing scan_consent_versions', () => {
      expect(sqlLower).toMatch(
        /consent_version_id uuid not null references public\.scan_consent_versions\(id\)/,
      );
    });

    it('has acknowledged_at timestamptz NOT NULL DEFAULT now()', () => {
      expect(sqlLower).toContain('acknowledged_at timestamptz not null default now()');
    });

    it('has UNIQUE(user_id, consent_version_id) as the FK-covering index', () => {
      expect(sqlLower).toMatch(/unique\s*\(\s*user_id\s*,\s*consent_version_id\s*\)/);
    });

    it('has no bare user_id index', () => {
      const createIndexMatches = sql.match(/create index[^;]*;/gis) ?? [];
      const acksIndexes = createIndexMatches.filter((stmt) =>
        /\bon\s+(public\.)?scan_consent_acks\b/i.test(stmt),
      );
      const bareUserIdIndex = acksIndexes.some((stmt) => /\(\s*user_id\s*\)/i.test(stmt));
      expect(bareUserIdIndex).toBe(false);
    });

    it('enables row level security', () => {
      expect(sqlLower).toContain(
        'alter table public.scan_consent_acks enable row level security',
      );
    });

    it('has exactly one SELECT policy and one INSERT policy, no FOR ALL', () => {
      const policyBlocks = sql.match(/create policy[\s\S]*?;/gi) ?? [];
      const ackPolicies = policyBlocks.filter((stmt) =>
        /on\s+public\.scan_consent_acks/i.test(stmt),
      );
      const forSelect = ackPolicies.filter((s) => /for\s+select/i.test(s));
      const forInsert = ackPolicies.filter((s) => /for\s+insert/i.test(s));
      const forAll = ackPolicies.filter((s) => /for\s+all/i.test(s));
      expect(forSelect).toHaveLength(1);
      expect(forInsert).toHaveLength(1);
      expect(forAll).toHaveLength(0);
      expect(ackPolicies).toHaveLength(2);
    });

    it('every acks policy uses (select auth.uid()) scoped to user_id, never raw auth.uid()', () => {
      const policyBlocks = sql.match(/create policy[\s\S]*?;/gi) ?? [];
      const ackPolicies = policyBlocks.filter((stmt) =>
        /on\s+public\.scan_consent_acks/i.test(stmt),
      );
      expect(ackPolicies.length).toBeGreaterThan(0);
      for (const policy of ackPolicies) {
        const lower = policy.toLowerCase();
        expect(lower).toMatch(/user_id\s*=\s*\(select auth\.uid\(\)\)/);
        const rawAuthUid = policy.match(/(?<!\(select )auth\.uid\(\)/gi) ?? [];
        expect(rawAuthUid.length).toBe(0);
      }
    });
  });

  describe('placeholder seed copy', () => {
    it('inserts a placeholder v1 row that starts pending Lex clearance', () => {
      expect(sqlLower).toContain('insert into public.scan_consent_versions');
      expect(sqlLower).toMatch(/'pending'/);
    });

    it('states that a linked practitioner can view scans (condition 13)', () => {
      expect(sqlLower).toContain('practitioner');
    });
  });

  describe('formatting rules', () => {
    it('contains no em dash or en dash characters', () => {
      const emDash = String.fromCharCode(0x2014);
      const enDash = String.fromCharCode(0x2013);
      expect(sql.includes(emDash)).toBe(false);
      expect(sql.includes(enDash)).toBe(false);
    });
  });
});
