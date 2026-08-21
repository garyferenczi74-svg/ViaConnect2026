import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('Prompt 226 user prescribed peptides', () => {
  it('schema is user-owned RLS and not a knowledge source', () => {
    const sql = readFileSync(
      path.join(
        process.cwd(),
        'supabase/migrations/20260820171000_prompt_226_user_prescribed_peptides.sql',
      ),
      'utf8',
    );
    expect(sql).toContain('user_prescribed_peptides');
    expect(sql).toContain('auth.uid() = user_id');
    expect(sql).toContain('Never feed Thanos/Hannah/RAG');
  });

  it('API enforces allowlist and My Protocols UI wires Convert link', () => {
    const api = readFileSync(
      path.join(process.cwd(), 'src/app/api/peptides/prescribed/route.ts'),
      'utf8',
    );
    expect(api).toContain('loadConverterAllowlist');
    expect(api).toContain('not_allowlisted');

    const ui = readFileSync(
      path.join(
        process.cwd(),
        'src/components/peptide-protocol/MyPrescribedPeptidesClient.tsx',
      ),
      'utf8',
    );
    expect(ui).toContain('fromRx');
    expect(ui).toContain('/peptide-protocol/converter');
    expect(ui.toLowerCase()).toContain('does not recommend doses');
  });
});
