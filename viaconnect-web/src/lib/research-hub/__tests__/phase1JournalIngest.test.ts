import { describe, expect, it } from 'vitest';
import { PHASE1_JOURNAL } from '@/lib/research-hub/phase1JournalIngest';

describe('227a phase1 journal ingest config', () => {
  it('targets Aging Cell as primary Tier 2 E-utilities journal', () => {
    expect(PHASE1_JOURNAL.sourceName).toBe('Aging Cell');
    expect(PHASE1_JOURNAL.journalTerm).toContain('Aging Cell');
    expect(PHASE1_JOURNAL.journalTerm).toContain('[Journal]');
    expect(PHASE1_JOURNAL.cursorSourceKey).toBe('research_hub');
    expect(PHASE1_JOURNAL.cursorTopicKey).toBe('aging-cell');
  });

  it('defines AJCN fallback without Mercola or Tier 4 vendors', () => {
    expect(PHASE1_JOURNAL.fallback.sourceName).toBe(
      'American Journal of Clinical Nutrition',
    );
    const blob = JSON.stringify(PHASE1_JOURNAL).toLowerCase();
    expect(blob).not.toContain('mercola');
    expect(blob).not.toContain('genscript');
    expect(blob).not.toContain('mindbodygreen');
  });
});
