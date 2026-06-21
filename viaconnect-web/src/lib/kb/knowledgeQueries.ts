/**
 * src/lib/kb/knowledgeQueries.ts
 *
 * Conversational Q&A capture helpers for Prompt 208 Phase 7 (Task 19).
 *
 * Three public exports:
 *   stripPII      -- redacts emails, phone runs, and long digit runs; keeps rsIDs
 *   scoreCoverage -- deterministic coverage scoring from retrieved atom tiers
 *   captureQuery  -- persists every exchange to knowledge_queries (fail-open)
 *
 * No em/en-dashes. No emojis. No new dependencies.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { embedText } from '@/lib/kb/embeddings';
import { safeLog } from '@/lib/utils/safe-log';

// ---------------------------------------------------------------------------
// Coverage type - well_covered if any tier 1/2; partial if only tier 3; gap if none.
// ---------------------------------------------------------------------------

export type Coverage = 'well_covered' | 'partial' | 'gap';

// ---------------------------------------------------------------------------
// stripPII
//
// Redacts:
//   - email addresses (/[^\s@]+@[^\s@]+\.[^\s@]+/g)
//   - phone-like digit runs (/\+?\d[\d\s().-]{7,}\d/g)
//   - standalone digit runs of length >= 5 (/\b\d{5,}\b/g)
//
// rsIDs like rs1801133 are NOT purely digit strings (they start with 'rs') so
// they survive all three patterns.
// ---------------------------------------------------------------------------

export function stripPII(text: string): string {
  // Order matters: run the most specific patterns first so overlapping matches
  // are consumed by the right rule.
  return text
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[redacted]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[redacted]')
    .replace(/\b\d{5,}\b/g, '[redacted]');
}

// ---------------------------------------------------------------------------
// scoreCoverage
//
// Returns Coverage and a sorted unique list of tiers present.
//   well_covered: at least one atom has evidence_tier 1 or 2
//   partial:      atoms exist but ALL are tier 3
//   gap:          no atoms
// ---------------------------------------------------------------------------

export function scoreCoverage(
  atoms: Array<{ evidence_tier: number }>,
): { coverage: Coverage; tiersUsed: number[] } {
  if (atoms.length === 0) {
    return { coverage: 'gap', tiersUsed: [] };
  }

  const tiersUsed = Array.from(new Set(atoms.map((a) => a.evidence_tier))).sort(
    (a, b) => a - b,
  );

  const hasHighTier = tiersUsed.some((t) => t === 1 || t === 2);
  const coverage: Coverage = hasHighTier ? 'well_covered' : 'partial';

  return { coverage, tiersUsed };
}

// ---------------------------------------------------------------------------
// CaptureParams
// ---------------------------------------------------------------------------

export interface CaptureParams {
  userId: string;
  domain: string;
  questionText: string;
  answerSummary: string;
  citedAtomIds: string[];
  coverage: Coverage;
  tiersUsed: number[];
  gapTopic?: string | null;
}

// ---------------------------------------------------------------------------
// captureQuery
//
// Persists one Q&A exchange to knowledge_queries via the admin client.
// Embedding is attempted but tolerated as null.
// Fail-open: logs and returns on any error; never throws.
// ---------------------------------------------------------------------------

export async function captureQuery(p: CaptureParams): Promise<void> {
  try {
    const normalized = stripPII(p.questionText);

    let embedding: number[] | null = null;
    try {
      embedding = await embedText(normalized);
    } catch {
      // embedText failure is tolerated - proceed without embedding.
    }

    const gapTopic =
      p.gapTopic !== undefined
        ? p.gapTopic
        : p.coverage === 'well_covered'
          ? null
          : p.domain;

    const row = {
      user_id: p.userId,
      domain: p.domain,
      question_text: p.questionText,
      question_normalized: normalized,
      answer_summary: p.answerSummary,
      cited_atom_ids: p.citedAtomIds,
      evidence_tiers_used: p.tiersUsed,
      coverage: p.coverage,
      gap_topic: gapTopic,
      embedding,
    };

    const supabase = createAdminClient();
    const { error } = await supabase.from('knowledge_queries').insert(row);

    if (error) {
      safeLog.error('kb.captureQuery', 'Failed to insert knowledge_queries row', {
        userId: p.userId,
        domain: p.domain,
        coverage: p.coverage,
        error,
      });
    }
  } catch (err) {
    safeLog.error('kb.captureQuery', 'Unexpected error in captureQuery (fail-open)', {
      userId: p.userId,
      domain: p.domain,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
