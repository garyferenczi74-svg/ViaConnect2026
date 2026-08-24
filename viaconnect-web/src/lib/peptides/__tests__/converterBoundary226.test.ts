/**
 * Prompt 226 Section 2.2 / 10.2 boundary static guards (Wave 0).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

function walkTsFiles(dir: string, out: string[] = []): string[] {
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '.next') continue;
      walkTsFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

describe('Prompt 226 dose boundary CI (Wave 0)', () => {
  it('225 practitioner_depth dose CHECK remains in schema migration', () => {
    const sql = read(
      'supabase/migrations/20260820130000_prompt_225_kb_peptides.sql',
    );
    expect(sql).toContain('kb_peptides_practitioner_depth_no_dose');
    expect(sql).toContain("'dose'");
    expect(sql).toContain("'reconstitution'");
  });

  it('226 schema adds converter_eligible default false and user-owned sessions', () => {
    const sql = read(
      'supabase/migrations/20260820160000_prompt_226_converter_schema.sql',
    );
    expect(sql).toContain('converter_eligible boolean NOT NULL DEFAULT false');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.converter_sessions');
    expect(sql).toContain('auth.uid() = user_id');
    expect(sql).toContain('Never feed Thanos/Hannah/RAG');
    expect(sql).toContain('lex_status');
    expect(sql).toContain('226-v1');
  });

  it('converter math does not import kb_peptides or invent doses', () => {
    const src = read('src/lib/peptides/converterMath.ts');
    expect(src).not.toMatch(/kb_peptides/);
    expect(src).not.toMatch(/from\(['\"]@\/lib\/kb/);
    expect(src).toContain('Platform never originates a dose');
  });

  it('Thanos / Hannah retrieval paths do not import converter_sessions', () => {
    const dirs = [
      path.join(ROOT, 'src/lib/thanos'),
      path.join(ROOT, 'src/lib/hounddog'),
      path.join(ROOT, 'src/lib/kb'),
      path.join(ROOT, 'src/lib/hannah'),
    ];
    const offenders: string[] = [];
    for (const dir of dirs) {
      for (const file of walkTsFiles(dir)) {
        if (file.includes(`${path.sep}peptides${path.sep}`)) continue;
        if (file.includes('converterBoundary226')) continue;
        if (file.includes(`${path.sep}migrations${path.sep}`)) continue;
        if (file.includes('embedded226')) continue;
        const body = readFileSync(file, 'utf8');
        if (/converter_sessions/.test(body)) {
          offenders.push(path.relative(ROOT, file));
        }
      }
    }
    expect(offenders, offenders.join(', ')).toEqual([]);
  });

  it('Hannah still refuses dose appropriateness questions', async () => {
    const { detectPeptideRefusal } = await import(
      '@/lib/hannah/peptideRefusals'
    );
    const hit = detectPeptideRefusal('is 0.5 mg of BPC-157 right for me?');
    expect(hit?.code).toBe('dose_request');
  });

  it('Lex copy constants forbid recommended BAC language', async () => {
    const { CONVERTER_COPY } = await import('../converterMath');
    expect(CONVERTER_COPY.bacShortcutsLabel.toLowerCase()).not.toContain(
      'recommend',
    );
    expect(CONVERTER_COPY.bacShortcutsLabel.toLowerCase()).not.toContain(
      'typical',
    );
    expect(CONVERTER_COPY.bacShortcutsLabel).toBe(
      'Common volumes, choose one.',
    );
  });
});
