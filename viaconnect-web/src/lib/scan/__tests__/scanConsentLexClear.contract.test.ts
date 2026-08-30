import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Prompt 231 follow-up: Lex-cleared 231-scan-v1 consent copy.
// Reads the append-only clear migration and ConsentNotice source (never
// applies SQL). The original pending seed file stays untouched.

const PRACTITIONER_LINE =
  'If you have a linked practitioner and you share body photos with them, they can view your scan photos the same way they can view your other body-tracker photos.';

function migrationsDir(): string {
  return path.resolve(__dirname, '../../../../supabase/migrations');
}

function findLexClearMigrationFile(): string {
  const files = fs.readdirSync(migrationsDir());
  const match = files.find((f) => f.endsWith('_prompt_231_scan_consent_lex_clear.sql'));
  if (!match) {
    throw new Error(
      'Expected a migration file matching *_prompt_231_scan_consent_lex_clear.sql in ' +
        migrationsDir(),
    );
  }
  return path.join(migrationsDir(), match);
}

function extractDollarQuotedBody(sql: string): string {
  const match = sql.match(/\$c1\$([\s\S]*?)\$c1\$/);
  if (!match) {
    throw new Error('Expected $c1$ dollar-quoted body_markdown in lex-clear migration');
  }
  return match[1];
}

function extractPractitionerNotice(src: string): string {
  const match = src.match(
    /data-testid="scan-consent-practitioner-notice"\s*>\s*([\s\S]*?)<\/p>/,
  );
  if (!match) {
    throw new Error('Expected scan-consent-practitioner-notice in ConsentNotice.tsx');
  }
  return match[1].replace(/\s+/g, ' ').trim();
}

describe('prompt 231 scan consent lex-clear contract', () => {
  let sql: string;
  let bodyMarkdown: string;
  let noticeSrc: string;
  let practitionerNotice: string;

  beforeAll(() => {
    sql = fs.readFileSync(findLexClearMigrationFile(), 'utf8');
    bodyMarkdown = extractDollarQuotedBody(sql);
    noticeSrc = fs.readFileSync(
      path.resolve(__dirname, '../../../components/scan/ConsentNotice.tsx'),
      'utf8',
    );
    practitionerNotice = extractPractitionerNotice(noticeSrc);
  });

  it('clears version 231-scan-v1 with lex_status = cleared', () => {
    expect(sql).toContain("'231-scan-v1'");
    expect(sql).toMatch(/lex_status\s*=\s*'cleared'/);
    expect(sql).toMatch(/ON CONFLICT\s*\(\s*version\s*\)/i);
  });

  it('contains the exact Lex practitioner sentence', () => {
    expect(bodyMarkdown).toContain(PRACTITIONER_LINE);
  });

  it('ConsentNotice practitioner notice equals paragraph 3 of the new body', () => {
    const paragraphs = bodyMarkdown.trim().split(/\n\s*\n/);
    expect(paragraphs[2]).toBeDefined();
    expect(paragraphs[2]).toContain(PRACTITIONER_LINE);
    expect(practitionerNotice).toBe(PRACTITIONER_LINE);
    expect(paragraphs[2]).toContain(practitionerNotice);
  });

  it('does not use shared-care-record language or grant practitioner view on By continuing', () => {
    expect(bodyMarkdown.toLowerCase()).not.toContain('shared care record');
    expect(bodyMarkdown.toLowerCase()).not.toContain('shared care');
    const byContinuing = bodyMarkdown
      .trim()
      .split(/\n\s*\n/)
      .find((p) => p.startsWith('By continuing'));
    expect(byContinuing).toBeDefined();
    expect(byContinuing!.toLowerCase()).not.toContain('practitioner');
  });

  it('does not duplicate the Before your scan title in body_markdown', () => {
    expect(bodyMarkdown.trimStart().startsWith('**Before your scan**')).toBe(false);
    expect(bodyMarkdown).not.toMatch(/^\s*\*\*Before your scan\*\*/);
  });

  it('keeps the amber practitioner notice testid and unavailable-state copy', () => {
    expect(noticeSrc).toContain('data-testid="scan-consent-practitioner-notice"');
    expect(noticeSrc).toContain('text-amber-200');
    expect(noticeSrc).toContain('Scan consent copy is being finalized. Check back soon.');
    expect(noticeSrc).toContain('data-testid="scan-consent-unavailable"');
  });

  it('contains no em dash or en dash characters', () => {
    const emDash = String.fromCharCode(0x2014);
    const enDash = String.fromCharCode(0x2013);
    expect(sql.includes(emDash)).toBe(false);
    expect(sql.includes(enDash)).toBe(false);
    expect(noticeSrc.includes(emDash)).toBe(false);
    expect(noticeSrc.includes(enDash)).toBe(false);
  });
});
