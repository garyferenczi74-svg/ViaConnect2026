import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Prompt 231 Task 12: converge migration contract test.
// Reads the migration SQL text (never applies it to a database) and asserts
// the required column/constraint/policy shape described in the task-12
// brief and the binding conditions doc (conditions 1 to 5, 15 to 17).

function findMigrationFile(): string {
  const migrationsDir = path.resolve(__dirname, '../../../../supabase/migrations');
  const files = fs.readdirSync(migrationsDir);
  const match = files.find((f) => f.endsWith('_prompt_231_body_photo_sessions_scan.sql'));
  if (!match) {
    throw new Error(
      'Expected a migration file matching *_prompt_231_body_photo_sessions_scan.sql in ' +
        migrationsDir
    );
  }
  return path.join(migrationsDir, match);
}

describe('prompt 231 converge migration contract', () => {
  let sql: string;
  let sqlLower: string;

  beforeAll(() => {
    const filePath = findMigrationFile();
    sql = fs.readFileSync(filePath, 'utf8');
    sqlLower = sql.toLowerCase();
  });

  describe('body_photo_sessions ADD COLUMN IF NOT EXISTS', () => {
    it('adds protocol text NOT NULL DEFAULT journal_v0', () => {
      expect(sqlLower).toMatch(
        /add column if not exists protocol text not null default 'journal_v0'/
      );
    });

    it('adds capture_status text with the five-value CHECK', () => {
      expect(sqlLower).toContain('add column if not exists capture_status text');
      expect(sqlLower).toMatch(/capture_status is null or capture_status in \(/);
      for (const value of ['uploading', 'ready', 'partial', 'delete_pending', 'deleted']) {
        expect(sqlLower).toContain(`'${value}'`);
      }
    });

    it('adds consent_version text', () => {
      expect(sqlLower).toContain('add column if not exists consent_version text');
    });

    it('adds device_info jsonb', () => {
      expect(sqlLower).toContain('add column if not exists device_info jsonb');
    });

    it('does not re-declare the live height columns', () => {
      expect(sqlLower).not.toContain('add column if not exists height_cm_at_scan');
      expect(sqlLower).not.toContain('add column if not exists height_cm_source');
    });

    it('does not add a new/duplicate index on body_photo_sessions', () => {
      // Condition 17: the existing idx_photo_sessions_user_date already covers
      // the tile/history query; this migration must not add another index on
      // body_photo_sessions.
      const createIndexMatches = sql.match(/create index[^;]*;/gis) ?? [];
      const sessionsIndexes = createIndexMatches.filter((stmt) =>
        /\bon\s+(public\.)?body_photo_sessions\b/i.test(stmt)
      );
      expect(sessionsIndexes).toHaveLength(0);
    });
  });

  describe('body_photo_session_frames table', () => {
    it('is created with CREATE TABLE IF NOT EXISTS', () => {
      expect(sqlLower).toContain('create table if not exists body_photo_session_frames');
    });

    it('has session_id FK to body_photo_sessions with ON DELETE CASCADE', () => {
      expect(sqlLower).toMatch(
        /session_id uuid not null references body_photo_sessions\(id\) on delete cascade/
      );
    });

    it('has a view column with the four-pose CHECK', () => {
      expect(sqlLower).toContain('view text not null');
      expect(sqlLower).toMatch(/view in \('front','right','back','left'\)/);
    });

    it('has qa jsonb NOT NULL', () => {
      expect(sqlLower).toContain('qa jsonb not null');
    });

    it('has qa_mode, captured_width, captured_height columns', () => {
      expect(sqlLower).toContain('qa_mode text');
      expect(sqlLower).toContain('captured_width int');
      expect(sqlLower).toContain('captured_height int');
    });

    it('has skipped boolean NOT NULL DEFAULT false', () => {
      expect(sqlLower).toContain('skipped boolean not null default false');
    });

    it('has retry_count int NOT NULL DEFAULT 0', () => {
      expect(sqlLower).toContain('retry_count int not null default 0');
    });

    it('has a nullable landmarks jsonb column (dormant behind G81)', () => {
      expect(sqlLower).toContain('landmarks jsonb');
    });

    it('has captured_at timestamptz', () => {
      expect(sqlLower).toContain('captured_at timestamptz');
    });

    it('has NO image_path column', () => {
      expect(sqlLower).not.toContain('image_path');
    });

    it('has UNIQUE(session_id, view) as the FK-covering index', () => {
      expect(sqlLower).toMatch(/unique\s*\(\s*session_id\s*,\s*view\s*\)/);
    });

    it('has no bare session_id index', () => {
      const createIndexMatches = sql.match(/create index[^;]*;/gis) ?? [];
      const frameIndexes = createIndexMatches.filter((stmt) =>
        /\bon\s+(public\.)?body_photo_session_frames\b/i.test(stmt)
      );
      const bareSessionIdIndex = frameIndexes.some((stmt) =>
        /\(\s*session_id\s*\)/i.test(stmt)
      );
      expect(bareSessionIdIndex).toBe(false);
    });
  });

  describe('body_photo_session_frames RLS', () => {
    it('enables row level security on the frames table', () => {
      expect(sqlLower).toContain(
        'alter table body_photo_session_frames enable row level security'
      );
    });

    it('has exactly one policy per action (select, insert, update, delete), no FOR ALL', () => {
      const policyBlocks = sql.match(/create policy[\s\S]*?;/gi) ?? [];
      const framePolicies = policyBlocks.filter((stmt) =>
        /on\s+body_photo_session_frames/i.test(stmt)
      );

      const forSelect = framePolicies.filter((s) => /for\s+select/i.test(s));
      const forInsert = framePolicies.filter((s) => /for\s+insert/i.test(s));
      const forUpdate = framePolicies.filter((s) => /for\s+update/i.test(s));
      const forDelete = framePolicies.filter((s) => /for\s+delete/i.test(s));
      const forAll = framePolicies.filter((s) => /for\s+all/i.test(s));

      expect(forSelect).toHaveLength(1);
      expect(forInsert).toHaveLength(1);
      expect(forUpdate).toHaveLength(1);
      expect(forDelete).toHaveLength(1);
      expect(forAll).toHaveLength(0);
      expect(framePolicies).toHaveLength(4);
    });

    it('every frames policy resolves ownership via the parent session EXISTS check', () => {
      const policyBlocks = sql.match(/create policy[\s\S]*?;/gi) ?? [];
      const framePolicies = policyBlocks.filter((stmt) =>
        /on\s+body_photo_session_frames/i.test(stmt)
      );
      expect(framePolicies.length).toBeGreaterThan(0);
      for (const policy of framePolicies) {
        const lower = policy.toLowerCase();
        expect(lower).toMatch(/exists\s*\(\s*select 1 from body_photo_sessions s/);
        expect(lower).toMatch(/s\.id\s*=\s*session_id/);
        expect(lower).toMatch(/s\.user_id\s*=\s*\(select auth\.uid\(\)\)/);
      }
    });

    it('uses (select auth.uid()) and never raw auth.uid() in the frames policies', () => {
      const policyBlocks = sql.match(/create policy[\s\S]*?;/gi) ?? [];
      const framePolicies = policyBlocks.filter((stmt) =>
        /on\s+body_photo_session_frames/i.test(stmt)
      );
      for (const policy of framePolicies) {
        // Every auth.uid() occurrence must be immediately preceded by "(select ".
        const rawAuthUid = policy.match(/(?<!\(select )auth\.uid\(\)/gi) ?? [];
        const selectAuthUid = policy.match(/\(select auth\.uid\(\)\)/gi) ?? [];
        expect(rawAuthUid.length).toBe(0);
        expect(selectAuthUid.length).toBeGreaterThan(0);
      }
    });
  });

  describe('scope guards (condition 1, 4, 14)', () => {
    it('does not create or reference body_scans', () => {
      expect(sqlLower).not.toContain('body_scans');
    });

    it('does not create body_scan_frames or body_scan_artifacts', () => {
      expect(sqlLower).not.toContain('body_scan_frames');
      expect(sqlLower).not.toContain('body_scan_artifacts');
    });

    it('does not touch storage.buckets (no new bucket, no bucket-level change)', () => {
      expect(sqlLower).not.toContain('storage.buckets');
    });

    it('does not contain a CREATE TABLE for any new bucket-adjacent object', () => {
      // Belt-and-suspenders per the task spec's literal wording: no
      // "create table" statement other than body_photo_session_frames.
      const createTableMatches = sql.match(/create table[^(]*\(/gi) ?? [];
      for (const stmt of createTableMatches) {
        expect(stmt.toLowerCase()).toContain('body_photo_session_frames');
      }
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
