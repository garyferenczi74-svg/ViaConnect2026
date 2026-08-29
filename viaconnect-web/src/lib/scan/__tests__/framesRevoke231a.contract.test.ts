import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Prompt 231a: table-level REVOKE contract test.
// Reads the migration SQL text (never applies it to a database) and asserts
// the table-level REVOKE INSERT, UPDATE, DELETE on body_photo_session_frames
// closes the G81 landmarks-write hole left by the column-level REVOKE in
// 20260829120000 (a column-level REVOKE does not subtract from Supabase's
// default table-level grants to anon/authenticated).

function findMigrationFile(): string {
  const migrationsDir = path.resolve(__dirname, '../../../../supabase/migrations');
  const files = fs.readdirSync(migrationsDir);
  const match = files.find((f) =>
    f.endsWith('_prompt_231a_frames_revoke_client_writes.sql')
  );
  if (!match) {
    throw new Error(
      'Expected a migration file matching *_prompt_231a_frames_revoke_client_writes.sql in ' +
        migrationsDir
    );
  }
  return path.join(migrationsDir, match);
}

describe('prompt 231a frames table-level revoke migration contract', () => {
  let sql: string;
  let sqlLower: string;
  let codeOnly: string;

  beforeAll(() => {
    const filePath = findMigrationFile();
    sql = fs.readFileSync(filePath, 'utf8');
    sqlLower = sql.toLowerCase();
    // Strip SQL line comments so prose (which may itself say "revoke" or
    // "service_role" in an explanatory sentence) is not mistaken for an
    // actual SQL statement.
    codeOnly = sql
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n');
  });

  it('file name timestamp is strictly greater than 20260829130000', () => {
    const filePath = findMigrationFile();
    const base = path.basename(filePath);
    const timestampMatch = base.match(/^(\d{14})_/);
    expect(timestampMatch).not.toBeNull();
    const timestamp = timestampMatch ? Number(timestampMatch[1]) : 0;
    expect(timestamp).toBeGreaterThan(20260829130000);
  });

  it('revokes INSERT, UPDATE, DELETE on body_photo_session_frames from anon, authenticated', () => {
    // Whitespace-tolerant, case-insensitive match on the table-level REVOKE.
    const normalized = sqlLower.replace(/\s+/g, ' ');
    expect(normalized).toMatch(
      /revoke\s+insert\s*,\s*update\s*,\s*delete\s+on\s+public\.body_photo_session_frames\s+from\s+anon\s*,\s*authenticated\s*;/
    );
  });

  it('does not revoke SELECT anywhere in the file', () => {
    const revokeStatements = codeOnly.match(/revoke[^;]*;/gis) ?? [];
    expect(revokeStatements.length).toBeGreaterThan(0);
    for (const stmt of revokeStatements) {
      expect(stmt.toLowerCase()).not.toContain('select');
    }
  });

  it('does not mention service_role in any REVOKE statement', () => {
    const revokeStatements = codeOnly.match(/revoke[^;]*;/gis) ?? [];
    expect(revokeStatements.length).toBeGreaterThan(0);
    for (const stmt of revokeStatements) {
      expect(stmt.toLowerCase()).not.toContain('service_role');
    }
  });

  it('adds no GRANT statement', () => {
    expect(codeOnly.toLowerCase()).not.toContain('grant ');
  });

  it('has a terse Prompt 231a header comment', () => {
    expect(sql).toMatch(/Prompt 231a:/);
  });

  it('contains no em dash or en dash characters', () => {
    const emDash = String.fromCharCode(0x2014);
    const enDash = String.fromCharCode(0x2013);
    expect(sql.includes(emDash)).toBe(false);
    expect(sql.includes(enDash)).toBe(false);
  });
});
