import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('Prompt 225 Thanos regulatory event staging', () => {
  it('staging helper never auto-applies live regulatory fields', () => {
    const src = readFileSync(
      path.join(process.cwd(), 'src/lib/thanos/regulatoryEvents.ts'),
      'utf8',
    );
    expect(src).toContain('stagePeptideRegulatoryEvent');
    expect(src).toContain('applied_at: null');
    expect(src).not.toMatch(/\.update\(\{[^}]*regulatory_status/);
  });

  it('sample event migration stages without applied_at', () => {
    const sql = readFileSync(
      path.join(
        process.cwd(),
        'supabase/migrations/20260820136000_prompt_225_sample_regulatory_event.sql',
      ),
      'utf8',
    );
    expect(sql).toContain('kb_peptide_regulatory_events');
    expect(sql).toContain('applied_at');
    expect(sql).toContain('NULL');
    expect(sql).not.toMatch(/UPDATE\s+public\.kb_peptides/i);
  });
});
