/**
 * Canonical domain list for BeginnerQA.
 *
 * These ids are the EXACT values accepted by POST /api/hannah/ask.
 * Imported by BeginnerQA.tsx (component) and BeginnerQA.test.ts (tests)
 * so both always reference the same source of truth.
 */

export const BEGINNER_QA_DOMAINS = [
  { id: 'genomics',       label: 'Genomics' },
  { id: 'nutraceuticals', label: 'Nutraceuticals' },
  { id: 'biohacking',     label: 'Biohacking' },
  { id: 'athletics',      label: 'Athletics' },
  { id: 'weightloss',     label: 'Weight Loss' },
  { id: 'longevity',      label: 'Longevity' },
] as const;

export type BeginnerQADomainId = (typeof BEGINNER_QA_DOMAINS)[number]['id'];
