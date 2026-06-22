// Prompt 208a Module D (D3): compute + persist per-user pathway scores.
//
// Isolated, fail-open helper so synthesis can enrich its output with pathway
// context via a single additive call without taking on any new logic. Reads the
// SAME QC-gated variants synthesis uses. NEVER throws (a pathway-persist failure
// must not break synthesis). No em/en-dashes, no emojis.

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { getQualifiedUserVariants } from '@/lib/genetics/qc/qualifiedVariants';
import { computePathwayScores, type PathwayScore } from './pathwayScore';

/**
 * Compute pathway scores from the user's qualified variants, persist them to
 * pathway_scores (fail-open), and return them. Returns [] on any failure.
 */
export async function computeAndPersistPathways(userId: string): Promise<PathwayScore[]> {
  try {
    const variants = await getQualifiedUserVariants(userId);
    const scores = computePathwayScores(
      (variants ?? []).map((v) => ({ rsid: v.rsid, status: v.status ?? null })),
    );
    if (scores.length === 0) return scores;

    try {
      const supabase = createAdminClient();
      const rows = scores.map((s) => ({
        user_id: userId,
        pathway: s.pathway,
        component_variants: s.component_variants,
        composite_score: s.composite_score,
        severity_band: s.severity_band,
      }));
      const { error } = await supabase.from('pathway_scores').insert(rows);
      if (error) {
        safeLog.error('pathways', 'Failed to persist pathway_scores', {
          userId,
          error: error.message,
        });
      }
    } catch (err) {
      safeLog.error('pathways', 'pathway_scores insert threw', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return scores;
  } catch (err) {
    safeLog.error('pathways', 'computeAndPersistPathways failed', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
