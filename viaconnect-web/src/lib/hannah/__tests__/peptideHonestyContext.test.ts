import { describe, expect, it } from 'vitest';
import {
  formatPeptideHonestyForHannahContext,
  looksLikePeptideQuestion,
  matchWave1Slugs,
  PEPTIDE_HONESTY_MARKER,
} from '../peptideHonestyContext';

describe('Prompt 225a peptide honesty context', () => {
  it('matches Wave 1 compounds in educational questions', () => {
    expect(matchWave1Slugs('What is known about BPC-157 research?')).toContain(
      'edu-bpc157',
    );
    expect(matchWave1Slugs('Tell me about retatrutide trials')).toContain(
      'retatrutide',
    );
    expect(looksLikePeptideQuestion('What is known about BPC-157 research?')).toBe(
      true,
    );
    expect(looksLikePeptideQuestion('How is the weather today?')).toBe(false);
  });

  it('formats stored honesty counts without inventing trials', () => {
    const block = formatPeptideHonestyForHannahContext({
      peptides: [
        {
          slug: 'edu-bpc157',
          displayName: 'BPC-157',
          honesty: {
            trials_registered: 3,
            trials_completed: 1,
            trials_terminated_or_withdrawn: 0,
            trials_with_results_posted: 0,
            publications_human: 0,
            publications_animal: 4,
            systematic_reviews: 0,
            terminated_for_safety: false,
            evidence_gap_statement:
              'Registration is not completion. Completion is not publication. Publication is not a positive result. For this compound, 3 trials are registered, 1 completed, 0 have posted results, and 0 have published human outcomes in linked evidence.',
            coverage_note:
              'ICTRP global registry coverage may be incomplete (pending_access).',
          },
        },
      ],
      ictrp: {
        status: 'pending_access',
        coverageNote:
          'Global registry coverage is incomplete until ICTRP credentials land.',
        reason: 'WHO credentials pending',
      },
    });

    expect(block).toContain(PEPTIDE_HONESTY_MARKER);
    expect(block).toContain('trials_registered=3');
    expect(block).toContain('publications_human=0');
    expect(block).toContain('evidence_gap_statement');
    expect(block).toContain('ICTRP source_status=pending_access');
    expect(block.toLowerCase()).toContain('incomplete');
    expect(block).not.toMatch(/\b\d+(?:[.,]\d+)?\s*mg\b/i);
    expect(block.toLowerCase()).not.toContain('reconstitut');
  });

  it('keeps thin compounds clearly thin', () => {
    const block = formatPeptideHonestyForHannahContext({
      peptides: [
        {
          slug: 'thin-example',
          displayName: 'Thin Peptide',
          honesty: {
            trials_registered: 0,
            trials_completed: 0,
            trials_terminated_or_withdrawn: 0,
            trials_with_results_posted: 0,
            publications_human: 0,
            publications_animal: 0,
            systematic_reviews: 0,
            evidence_gap_statement:
              'Registration is not completion. For this compound, 0 trials are registered, 0 completed, 0 have posted results, and 0 have published human outcomes in linked evidence.',
          },
        },
      ],
      ictrp: {
        status: 'pending_access',
        coverageNote: 'Global registry coverage may be incomplete.',
        reason: 'pending',
      },
    });
    expect(block).toContain('trials_registered=0');
    expect(block).toContain('publications_human=0');
  });

  it('returns empty when honesty payloads are empty objects', () => {
    expect(
      formatPeptideHonestyForHannahContext({
        peptides: [{ slug: 'x', displayName: 'X', honesty: {} }],
        ictrp: null,
      }),
    ).toBe('');
  });

  it('blocks dose-like leakage in honesty statements', () => {
    const blocked = formatPeptideHonestyForHannahContext({
      peptides: [
        {
          slug: 'bad',
          displayName: 'Bad',
          honesty: {
            trials_registered: 1,
            evidence_gap_statement: 'Patients received 0.5 mg weekly.',
          },
        },
      ],
      ictrp: null,
    });
    expect(blocked).toBe('');
  });
});
