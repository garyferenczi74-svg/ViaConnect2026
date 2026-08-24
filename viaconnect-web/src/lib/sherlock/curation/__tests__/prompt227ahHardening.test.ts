/**
 * Prompt 227ah Wave A hardening: rejection ledger, G61 wiring, Thanos gates.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  proposalFingerprint,
  stableJson,
} from '@/lib/sherlock/curation/rejectionLedger227ah';
import { detectCumulativeEffect } from '@/lib/sherlock/curation/cumulativeEffect227a';
import {
  canAutoApply,
  effectiveChangeClass,
} from '@/lib/sherlock/curation/fieldClassMap227a';
import { refuseIfNotAutoApplicable } from '@/lib/thanos/applyCurationProposals227ah';

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('227ah rejection ledger', () => {
  it('fingerprints are stable for same proposed value', () => {
    const a = proposalFingerprint({
      targetTable: 'kb_peptides',
      targetRowId: 'pep-1',
      targetField: 'fda_status',
      proposedValue: { action: 'investigate_and_fill', note: 'x' },
    });
    const b = proposalFingerprint({
      targetTable: 'kb_peptides',
      targetRowId: 'pep-1',
      targetField: 'fda_status',
      proposedValue: { note: 'x', action: 'investigate_and_fill' },
    });
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it('stableJson sorts object keys', () => {
    expect(stableJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });
});

describe('227ah Thanos gates and G61', () => {
  it('refuses Class 3 auto-apply', async () => {
    expect((await refuseIfNotAutoApplicable(3)).allowed).toBe(false);
    expect((await refuseIfNotAutoApplicable(2)).allowed).toBe(false);
    expect((await refuseIfNotAutoApplicable(0)).allowed).toBe(true);
    expect((await refuseIfNotAutoApplicable(1)).allowed).toBe(true);
    expect(canAutoApply(3)).toBe(false);
  });

  it('grade upgrade cannot be Class 1', () => {
    expect(
      effectiveChangeClass({
        targetTable: 'kb_peptides',
        targetField: 'evidence_grade_overall',
        direction: 'correction',
        isGradeUpgrade: true,
      }),
    ).toBe(2);
  });

  it('cumulative-effect escalates honesty-shifting Class 0 batch', () => {
    const result = detectCumulativeEffect({
      baselines: [
        {
          peptideId: 'pep-1',
          evidenceGrade: 'C',
          honestyTrialsRegistered: 0,
          honestyPublicationsHuman: 0,
          institutionalConcentration: 0.9,
          independentReplicationCount: 0,
        },
      ],
      batch: [
        {
          peptideId: 'pep-1',
          deltaPublicationsHuman: 3,
          addsToLargestNetwork: true,
        },
      ],
    });
    expect(result.wouldChangeDerived).toBe(true);
    expect(result.escalatedPeptideIds).toContain('pep-1');
  });
});

describe('227ah schema and isolation static', () => {
  it('role migration defines sherlock_curation and prove function', () => {
    const sql = read(
      'supabase/migrations/20260821240000_prompt_227ah_sherlock_curation_role.sql',
    );
    expect(sql).toContain('CREATE ROLE sherlock_curation');
    expect(sql).toContain('prove_sherlock_curation_cannot_write_kb_peptides');
    expect(sql).toContain('REVOKE INSERT, UPDATE, DELETE ON TABLE public.kb_peptides');
    expect(sql).not.toMatch(/[\u2013\u2014]/);
  });

  it('cycle module has no kb_peptides write and uses rejection ledger', () => {
    const src = read('src/lib/sherlock/curation/runCurationCycle227a.ts');
    expect(src).toContain('isRejectedWithoutNewEvidence');
    expect(src).toContain('Does not UPDATE kb_peptides');
    expect(src).not.toMatch(/\.from\(\s*['"]kb_peptides['"]\s*\)\s*\.update\(/);
    expect(src).not.toMatch(/\.from\(\s*['"]kb_peptides['"]\s*\)\s*\.insert\(/);
  });

  it('Thanos apply module refuses Class 3 and calls G61', () => {
    const src = read('src/lib/thanos/applyCurationProposals227ah.ts');
    expect(src).toContain('detectCumulativeEffect');
    expect(src).toContain("applied_by: 'thanos'");
    expect(src).toContain('revertCurationProposal');
    expect(src).toContain('canAutoApply');
  });

  it('crons and embed exist', () => {
    expect(read('src/lib/kb/migrations/embedded227ah.ts')).toContain(
      'PROMPT_227AH_MIGRATIONS',
    );
    expect(
      read('src/app/api/cron/apply-227ah-migrations/route.ts'),
    ).toContain('PROMPT_227AH_MIGRATIONS');
    expect(
      read('src/app/api/cron/run-227ah-thanos-apply/route.ts'),
    ).toContain('applyClass01Batch');
    expect(
      read('src/app/api/cron/prove-227ah-role-isolation/route.ts'),
    ).toContain('prove_sherlock_curation_cannot_write_kb_peptides');
  });
});
