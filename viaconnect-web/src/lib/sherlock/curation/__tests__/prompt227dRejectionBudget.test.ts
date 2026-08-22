/**
 * Prompt 227d: rejection ledger + G64 budget ceiling contract.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { deriveCeilingFromCycles } from '@/lib/sherlock/curation/budgetCeiling227d';
import {
  proposalFingerprint,
} from '@/lib/sherlock/curation/rejectionLedger227ah';

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('227d G64 deriveCeilingFromCycles', () => {
  it('applies 1.5x headroom on observed caps', () => {
    const d = deriveCeilingFromCycles([
      {
        budget: { maxClass3: 5, maxClass0: 3 },
        proposals_raised: { '3': 5 },
        negative_results_count: 5,
      },
      {
        budget: { maxClass3: 5, maxClass0: 3 },
        proposals_raised: { '3': 4 },
        negative_results_count: 2,
      },
    ]);
    expect(d.measured).toBe(2);
    expect(d.maxClass3).toBe(8);
    expect(d.maxClass0).toBe(5);
    expect(d.maxNegatives).toBe(8);
  });

  it('keeps defaults when no cycles', () => {
    const d = deriveCeilingFromCycles([]);
    expect(d.maxClass3).toBe(5);
    expect(d.measured).toBe(0);
  });
});

describe('227d prove and schema', () => {
  it('migration and prove cron exist', () => {
    const sql = read(
      'supabase/migrations/20260821250000_prompt_227d_budget_ceiling.sql',
    );
    expect(sql).toContain('curation_budget_ceiling');
    expect(sql).not.toMatch(/[\u2013\u2014]/);
    expect(
      read('src/app/api/cron/prove-227d-rejection-budget/route.ts'),
    ).toContain('isRejectedWithoutNewEvidence');
    expect(
      read('src/app/api/cron/prove-227d-rejection-budget/route.ts'),
    ).toContain('setBudgetCeiling');
    expect(read('src/lib/kb/migrations/embedded227d.ts')).toContain(
      'PROMPT_227D_MIGRATIONS',
    );
  });

  it('cycle uses budget ceiling and stable peptide order', () => {
    const cycle = read('src/lib/sherlock/curation/runCurationCycle227a.ts');
    expect(cycle).toContain('loadBudgetCeiling');
    expect(cycle).toContain(".order('id'");
    expect(cycle).toContain('g64_ceiling_applied');
  });

  it('fingerprint remains stable for identical Class 3 propose payload', () => {
    const a = proposalFingerprint({
      targetTable: 'kb_peptides',
      targetRowId: 'aaa',
      targetField: 'fda_status',
      proposedValue: {
        action: 'investigate_and_fill',
        note: 'Sherlock proposes review; does not invent regulatory values.',
      },
    });
    const b = proposalFingerprint({
      targetTable: 'kb_peptides',
      targetRowId: 'aaa',
      targetField: 'fda_status',
      proposedValue: {
        note: 'Sherlock proposes review; does not invent regulatory values.',
        action: 'investigate_and_fill',
      },
    });
    expect(a).toBe(b);
  });
});
