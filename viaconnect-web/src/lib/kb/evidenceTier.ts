/**
 * src/lib/kb/evidenceTier.ts
 *
 * Grade-to-tier bridge for the Prompt 208 knowledge corpus (Phase 2, Task 6).
 *
 * Maps the four-level KnowledgeEntry evidence grades (A-D, clinical strength)
 * to the three-level EvidenceTier used by knowledge_atoms (numerical, query-
 * friendly). Tier 1 = strong evidence (systematic reviews / RCTs). Tier 2 =
 * moderate evidence (cohort / observational). Tier 3 = emerging/corpus-only
 * (mechanistic, small study, expert consensus, monograph).
 *
 * The CONSUMER_TIERS constant identifies which tiers are eligible to drive
 * consumer-facing recommendations. Tier 3 enters the corpus for context only
 * and is excluded from recommendation generation.
 *
 * Prompt 208 Phase 2 (2026-06-20). No em/en-dashes.
 */

import type { EvidenceGrade } from './knowledgeEntry';

/** Numerical evidence tier used in the knowledge_atoms table. */
export type EvidenceTier = 1 | 2 | 3;

/**
 * Map an EvidenceGrade letter to an EvidenceTier number.
 *
 *   A -> 1  (systematic review, meta-analysis, RCT)
 *   B -> 2  (cohort, observational)
 *   C -> 3  (mechanistic, small study)
 *   D -> 3  (expert consensus, monograph -- emerging/corpus-only)
 */
export function gradeToTier(grade: EvidenceGrade): EvidenceTier {
  switch (grade) {
    case 'A':
      return 1;
    case 'B':
      return 2;
    case 'C':
      return 3;
    case 'D':
      return 3;
  }
}

/**
 * Tiers eligible to power consumer-facing recommendations.
 * Tier 3 is corpus-only (emerging evidence, context) and must NOT drive
 * consumer recommendations directly.
 */
export const CONSUMER_TIERS: readonly EvidenceTier[] = [1, 2];
