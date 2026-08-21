/**
 * Prompt 226d Wave B: matcher ranking, screening, G28 lexicon.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  bandByGrade,
  evaluateScreening,
  sortMatchedCompounds,
  type MatchedCompound,
} from '@/lib/peptides/suggestionMatch226d';
import {
  SUGGESTION_COPY_226D,
  SUGGESTION_LEXICON_FORBIDDEN,
} from '@/lib/peptides/suggestionCopy226d';

function compound(
  partial: Partial<MatchedCompound> &
    Pick<MatchedCompound, 'slug' | 'evidenceGradeForGoal' | 'indicationMatch'>,
): MatchedCompound {
  return {
    peptideId: partial.peptideId ?? partial.slug,
    slug: partial.slug,
    displayName: partial.displayName ?? partial.slug,
    goalSlug: partial.goalSlug ?? 'weight_body_composition',
    goalDisplayName: partial.goalDisplayName ?? 'Weight',
    evidenceGradeForGoal: partial.evidenceGradeForGoal,
    indicationMatch: partial.indicationMatch,
    mechanismRationale: partial.mechanismRationale ?? 'test',
    exclusionTier: partial.exclusionTier ?? 'educational',
    honesty: partial.honesty ?? { trials_registered: 2 },
    routes: partial.routes ?? [],
  };
}

describe('evaluateScreening', () => {
  it('fail-closed when screens missing', () => {
    expect(evaluateScreening().blocked).toBe(true);
    expect(
      evaluateScreening({
        pregnantOrBreastfeedingOrTrying: null,
        under18: false,
      }).blocked,
    ).toBe(true);
  });

  it('blocks pregnancy and under-18', () => {
    expect(
      evaluateScreening({
        pregnantOrBreastfeedingOrTrying: true,
        under18: false,
      }).blocked,
    ).toBe(true);
    expect(
      evaluateScreening({
        pregnantOrBreastfeedingOrTrying: false,
        under18: true,
      }).blocked,
    ).toBe(true);
  });

  it('passes when both screens are explicitly no', () => {
    expect(
      evaluateScreening({
        pregnantOrBreastfeedingOrTrying: false,
        under18: false,
      }).blocked,
    ).toBe(false);
  });
});

describe('sort and band', () => {
  it('sorts by goal grade then indication then trial count', () => {
    const rows = [
      compound({
        slug: 'd',
        evidenceGradeForGoal: 'D',
        indicationMatch: 'mechanistic_only',
        honesty: { trials_registered: 9 },
      }),
      compound({
        slug: 'a-adj',
        evidenceGradeForGoal: 'A',
        indicationMatch: 'studied_adjacent_indication',
        honesty: { trials_registered: 1 },
      }),
      compound({
        slug: 'a-direct',
        evidenceGradeForGoal: 'A',
        indicationMatch: 'studied_for_this_goal',
        honesty: { trials_registered: 1 },
      }),
      compound({
        slug: 'a-direct-more',
        evidenceGradeForGoal: 'A',
        indicationMatch: 'studied_for_this_goal',
        honesty: { trials_registered: 5 },
      }),
    ];
    expect(sortMatchedCompounds(rows).map((r) => r.slug)).toEqual([
      'a-direct-more',
      'a-direct',
      'a-adj',
      'd',
    ]);
  });

  it('bands are separated by grade with headers', () => {
    const bands = bandByGrade([
      compound({
        slug: 'a',
        evidenceGradeForGoal: 'A',
        indicationMatch: 'studied_for_this_goal',
      }),
      compound({
        slug: 'd',
        evidenceGradeForGoal: 'D',
        indicationMatch: 'mechanistic_only',
      }),
    ]);
    expect(bands.map((b) => b.grade)).toEqual(['A', 'D']);
    expect(bands[0]!.header).toContain('Grade A');
    expect(bands[1]!.header).toContain('Grade D');
  });
});

describe('G28 lexicon on suggestion surfaces', () => {
  it('suggestion copy avoids forbidden tokens as whole words', () => {
    const blob = Object.values(SUGGESTION_COPY_226D).join(' ').toLowerCase();
    for (const bad of SUGGESTION_LEXICON_FORBIDDEN) {
      const re = new RegExp(`\\b${bad.replace(/\s+/g, '\\s+')}\\b`, 'i');
      expect(blob, bad).not.toMatch(re);
    }
    expect(SUGGESTION_COPY_226D.featureName).toBe(
      'AI-powered peptide suggestions',
    );
  });

  it('PeptideSuggestionsClient and match API avoid protocol/recommend language', () => {
    const ui = readFileSync(
      path.join(
        process.cwd(),
        'src/components/peptide-protocol/PeptideSuggestionsClient.tsx',
      ),
      'utf8',
    );
    const api = readFileSync(
      path.join(
        process.cwd(),
        'src/app/api/peptides/suggestions/match/route.ts',
      ),
      'utf8',
    );
    const page = readFileSync(
      path.join(
        process.cwd(),
        'src/app/(app)/(consumer)/peptide-protocol/page.tsx',
      ),
      'utf8',
    );
    for (const src of [ui, api]) {
      const lower = src.toLowerCase();
      // Allow negation phrases like "not a treatment plan"; ban affirmative feature language.
      expect(lower).not.toMatch(/\bprotocol\b/);
      expect(lower).not.toMatch(/\brecommend(ation|s|ed)?\b/);
      expect(lower).not.toMatch(/\bregimen\b/);
      expect(lower).not.toMatch(/(?<!issues?\s)(?<!not\s)(?<!no\s)\bprescribe\b/);
    }
    // 226e moved suggestions to /peptide-protocol/suggestions; index is bento hub.
    expect(page).toContain('PeptideEducationBento');
    expect(page).not.toContain('PersonalizedPeptideStack');
    const suggestionsPage = readFileSync(
      path.join(
        process.cwd(),
        'src/app/(app)/(consumer)/peptide-protocol/suggestions/page.tsx',
      ),
      'utf8',
    );
    expect(suggestionsPage).toContain('PeptideSuggestionsClient');
  });
});
