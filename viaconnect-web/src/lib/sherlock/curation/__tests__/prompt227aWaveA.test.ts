/**
 * Prompt 227a Wave A: class map, cumulative effect, isolation, schema presence.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  canAutoApply,
  CURATION_FIELD_CLASS_MAP_227A,
  effectiveChangeClass,
  lookupChangeClass,
} from '@/lib/sherlock/curation/fieldClassMap227a';
import { detectCumulativeEffect } from '@/lib/sherlock/curation/cumulativeEffect227a';

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('227a G60 field class map', () => {
  it('assigns class by lookup and refuses missing fields', () => {
    expect(lookupChangeClass('kb_trials', 'row_insert')).toBe(0);
    expect(lookupChangeClass('kb_peptides', 'fda_status')).toBe(3);
    expect(lookupChangeClass('kb_peptides', 'consumer_safe')).toBe(4);
    expect(() => lookupChangeClass('kb_peptides', 'not_a_field')).toThrow(
      /curation_field_class_map_missing/,
    );
  });

  it('grade upgrades escalate to class 2', () => {
    expect(
      effectiveChangeClass({
        targetTable: 'kb_peptides',
        targetField: 'evidence_grade_overall',
        direction: 'correction',
        isGradeUpgrade: true,
      }),
    ).toBe(2);
    expect(
      effectiveChangeClass({
        targetTable: 'kb_peptides',
        targetField: 'evidence_grade_overall',
        direction: 'correction',
        isGradeUpgrade: false,
      }),
    ).toBe(1);
  });

  it('only class 0 and 1 can auto-apply', () => {
    expect(canAutoApply(0)).toBe(true);
    expect(canAutoApply(1)).toBe(true);
    expect(canAutoApply(2)).toBe(false);
    expect(canAutoApply(3)).toBe(false);
  });

  it('map is non-empty and matches migration seed keys', () => {
    const sql =
      read(
        'supabase/migrations/20260821230000_prompt_227a_sherlock_curation_schema.sql',
      ) +
      read(
        'supabase/migrations/20260821260000_prompt_227e_retraction_watch.sql',
      );
    expect(CURATION_FIELD_CLASS_MAP_227A.length).toBeGreaterThan(10);
    for (const row of CURATION_FIELD_CLASS_MAP_227A) {
      expect(sql).toContain(`'${row.targetTable}'`);
      expect(sql).toContain(`'${row.targetField}'`);
    }
  });
});

describe('227a G61 cumulative effect', () => {
  it('escalates Class 0 batch that would shift honesty counts / grade', () => {
    const result = detectCumulativeEffect({
      baselines: [
        {
          peptideId: 'pep-1',
          evidenceGrade: 'C',
          honestyTrialsRegistered: 1,
          honestyPublicationsHuman: 2,
          institutionalConcentration: 0.9,
          independentReplicationCount: 0,
        },
      ],
      batch: [
        {
          peptideId: 'pep-1',
          deltaPublicationsHuman: 5,
          addsToLargestNetwork: true,
        },
      ],
    });
    expect(result.wouldChangeDerived).toBe(true);
    expect(result.escalatedPeptideIds).toContain('pep-1');
  });
});

describe('227a isolation and schema', () => {
  it('curation cycle module does not import isolation-set tables', () => {
    const src = read('src/lib/sherlock/curation/runCurationCycle227a.ts');
    // Static analysis: ban from()/import paths and .from('table') reads, not prose.
    const isolationTables = [
      'converter_sessions',
      'suggestion_sessions',
      'regimen_events',
      'inventory_items',
      'hormone_reports',
      'regimens',
      'inventory_documents',
    ];
    for (const table of isolationTables) {
      expect(src).not.toMatch(
        new RegExp(`(?:from\\(|import\\s+.*|\\.from\\(\\s*['"])${table}`),
      );
      expect(src).not.toMatch(new RegExp(`\\.from\\(\\s*['"]${table}['"]\\s*\\)`));
    }
    expect(src).toContain('Does not UPDATE kb_peptides');
  });

  it('schema defines kill switch and proposal statuses', () => {
    const sql = read(
      'supabase/migrations/20260821230000_prompt_227a_sherlock_curation_schema.sql',
    );
    expect(sql).toContain('sherlock_curation_kill_switch');
    expect(sql).toContain('curation_proposals');
    expect(sql).toContain('curation_negative_results');
    expect(sql).toContain('curation_rejections');
    expect(sql).toContain("'auto_applied'");
    expect(sql).not.toMatch(/[\u2013\u2014]/);
    expect(sql.toLowerCase()).not.toMatch(/semaglutide/);
  });

  it('embedded migration and cron routes exist', () => {
    expect(read('src/lib/kb/migrations/embedded227a.ts')).toContain(
      'PROMPT_227A_MIGRATIONS',
    );
    expect(
      read('src/app/api/cron/apply-227a-migrations/route.ts'),
    ).toContain('PROMPT_227A_MIGRATIONS');
    expect(
      read('src/app/api/cron/run-227a-curation-cycle/route.ts'),
    ).toContain('runCurationCycle227a');
    expect(
      read('src/app/api/cron/prove-227a-artifacts/route.ts'),
    ).toContain('wave_a_artifacts');
  });
});
