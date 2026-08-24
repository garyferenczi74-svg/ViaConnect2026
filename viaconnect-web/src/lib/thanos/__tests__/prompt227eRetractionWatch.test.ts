/**
 * Prompt 227e retraction watch contract tests.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  detectRetractionFromPubmedMeta,
  isAdverseTrialStatus,
  nextWorseGrade,
} from '@/lib/thanos/retractionDetect227e';
import { lookupChangeClass } from '@/lib/sherlock/curation/fieldClassMap227a';

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('227e detectors', () => {
  it('detects Retracted Publication type', () => {
    const hit = detectRetractionFromPubmedMeta({
      publicationTypes: ['Retracted Publication'],
    });
    expect(hit?.kind).toBe('retracted');
  });

  it('detects ExpressionOfConcernIn ref', () => {
    const hit = detectRetractionFromPubmedMeta({
      publicationTypes: ['Journal Article'],
      commentCorrectionRefs: [
        { refType: 'ExpressionOfConcernIn', pmid: '123' },
      ],
    });
    expect(hit?.kind).toBe('expression_of_concern');
    expect(hit?.noticePmid).toBe('123');
  });

  it('returns null for ordinary article', () => {
    expect(
      detectRetractionFromPubmedMeta({
        publicationTypes: ['Journal Article', 'Clinical Trial'],
      }),
    ).toBeNull();
  });

  it('treats suspended as adverse trial status', () => {
    expect(isAdverseTrialStatus('suspended')).toBe(true);
    expect(isAdverseTrialStatus('completed')).toBe(false);
  });

  it('downgrades grade one step', () => {
    expect(nextWorseGrade('C')).toBe('D');
    expect(nextWorseGrade('E')).toBeNull();
  });
});

describe('227e schema and wiring', () => {
  it('migration and class map cover is_retracted', () => {
    const sql = read(
      'supabase/migrations/20260821260000_prompt_227e_retraction_watch.sql',
    );
    expect(sql).toContain('is_retracted');
    expect(sql).toContain('support_flagged');
    expect(sql).not.toMatch(/[\u2013\u2014]/);
    expect(lookupChangeClass('kb_publications', 'is_retracted')).toBe(1);
    expect(lookupChangeClass('kb_trials', 'status')).toBe(1);
  });

  it('honesty and consumer filters skip retracted', () => {
    expect(read('src/lib/thanos/computeHonestyLayer.ts')).toContain(
      'is_retracted',
    );
    expect(read('src/lib/kb/unifiedEvidence226h.ts')).toContain(
      'is_retracted === true',
    );
  });

  it('crons and embed exist', () => {
    expect(read('src/lib/kb/migrations/embedded227e.ts')).toContain(
      'PROMPT_227E_MIGRATIONS',
    );
    expect(
      read('src/app/api/cron/run-227e-retraction-watch/route.ts'),
    ).toContain('runRetractionWatch227e');
    expect(
      read('src/app/api/cron/prove-227e-retraction-watch/route.ts'),
    ).toContain('proveSyntheticRetractionFlag');
  });

  it('watch module never stores abstracts of notices', () => {
    const watch = read('src/lib/thanos/retractionWatch227e.ts');
    expect(watch).not.toMatch(/abstract/);
    expect(watch).toContain('support_flagged');
    expect(watch).not.toMatch(/[\u2013\u2014]/);
  });
});
