import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Prompt 231b: role-independent landmarks gate contract test.
// Reads the new migration SQL text (never applies it to a database) and
// asserts it adds a CHECK constraint that no role, including service_role,
// can bypass. Also asserts the pending G81 enable file now carries the
// operative DROP CONSTRAINT statement and still contains no GRANT.

function findMigrationFile(): string {
  const migrationsDir = path.resolve(__dirname, '../../../../supabase/migrations');
  const files = fs.readdirSync(migrationsDir);
  const match = files.find((f) =>
    f.endsWith('_prompt_231b_landmarks_check_constraint.sql')
  );
  if (!match) {
    throw new Error(
      'Expected a migration file matching *_prompt_231b_landmarks_check_constraint.sql in ' +
        migrationsDir
    );
  }
  return path.join(migrationsDir, match);
}

function findPendingFile(): string {
  const pendingDir = path.resolve(__dirname, '../../../../supabase/pending');
  const files = fs.readdirSync(pendingDir);
  const match = files.find((f) =>
    f.endsWith('_body_photo_session_landmarks_enable.sql')
  );
  if (!match) {
    throw new Error(
      'Expected a pending file matching *_body_photo_session_landmarks_enable.sql in ' +
        pendingDir
    );
  }
  return path.join(pendingDir, match);
}

describe('prompt 231b landmarks CHECK constraint migration contract', () => {
  let sql: string;
  let sqlLower: string;

  beforeAll(() => {
    const filePath = findMigrationFile();
    sql = fs.readFileSync(filePath, 'utf8');
    sqlLower = sql.toLowerCase();
  });

  it('file name timestamp is strictly greater than 20260829150000', () => {
    const filePath = findMigrationFile();
    const base = path.basename(filePath);
    const timestampMatch = base.match(/^(\d{14})_/);
    expect(timestampMatch).not.toBeNull();
    const timestamp = timestampMatch ? Number(timestampMatch[1]) : 0;
    expect(timestamp).toBeGreaterThan(20260829150000);
  });

  it('adds constraint landmarks_gated_by_g81 with CHECK (landmarks IS NULL)', () => {
    const normalized = sqlLower.replace(/\s+/g, ' ');
    expect(normalized).toMatch(
      /alter table body_photo_session_frames\s+add constraint landmarks_gated_by_g81\s+check\s*\(\s*landmarks\s+is\s+null\s*\)/
    );
  });

  it('has a COMMENT ON CONSTRAINT documenting the G81 gate', () => {
    const normalized = sqlLower.replace(/\s+/g, ' ');
    expect(normalized).toMatch(
      /comment on constraint landmarks_gated_by_g81 on body_photo_session_frames is/
    );
  });

  it('has a terse Prompt 231b header comment', () => {
    expect(sql).toMatch(/Prompt 231b:/);
  });

  it('contains no em dash or en dash characters', () => {
    const emDash = String.fromCharCode(0x2014);
    const enDash = String.fromCharCode(0x2013);
    expect(sql.includes(emDash)).toBe(false);
    expect(sql.includes(enDash)).toBe(false);
  });
});

describe('prompt 231b pending landmarks-enable file contract', () => {
  let sql: string;
  let sqlLower: string;
  let codeOnly: string;

  beforeAll(() => {
    const filePath = findPendingFile();
    sql = fs.readFileSync(filePath, 'utf8');
    sqlLower = sql.toLowerCase();
    // Strip SQL line comments so prose explaining the intentionally omitted
    // GRANT (which necessarily contains the word "grant") is not mistaken
    // for an actual GRANT statement.
    codeOnly = sql
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n');
  });

  it('now contains the operative DROP CONSTRAINT statement', () => {
    const normalized = sqlLower.replace(/\s+/g, ' ');
    expect(normalized).toMatch(
      /alter table body_photo_session_frames\s+drop constraint landmarks_gated_by_g81/
    );
  });

  it('still contains no GRANT statement outside of comments', () => {
    expect(codeOnly.toLowerCase()).not.toContain('grant ');
  });

  it('still documents SCAN_PERSIST_LANDMARKS as the companion code-side step', () => {
    expect(sql).toContain('SCAN_PERSIST_LANDMARKS');
  });

  it('contains no em dash or en dash characters', () => {
    const emDash = String.fromCharCode(0x2014);
    const enDash = String.fromCharCode(0x2013);
    expect(sql.includes(emDash)).toBe(false);
    expect(sql.includes(enDash)).toBe(false);
  });
});
