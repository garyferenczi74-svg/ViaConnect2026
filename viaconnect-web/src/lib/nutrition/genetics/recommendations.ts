// Prompt 187 Task 2: findings read helper + pure recommendation shaping for
// the Nutrition by Genetics page.
//
// DESIGN NOTE (recorded per the 187 spec): this module is a TYPED QUERY
// HELPER, not a database view. The codebase reads consumer surfaces through
// per-surface helpers and hooks (useUserMeals, useNutritionTargets,
// useNutritionHubMetrics) and has no view-based read pattern for consumer
// surfaces; adding one for this page would invent a second read idiom. The
// helper selects raw nutrition_genetic_findings rows under RLS (owner-only
// SELECT), and all shaping (source precedence, direction grouping) is pure
// and unit-tested independently of the fetch.

import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout } from '@/lib/utils/with-timeout';
import { findingFromRow, type NutritionGeneticFinding } from './types';

const TIMEOUT_MS = 4_000;

const FINDINGS_SELECT =
  'id, user_id, source, source_ref_id, category, item_name, item_slug, direction, ' +
  'strength, confidence, estimated, rationale, created_at, superseded_at';

/**
 * Pure. Collapses findings from both sources into one finding per item_slug.
 * Only active rows (supersededAt === null) are considered. A nutrigendx
 * finding always wins its slug and any uploaded_test finding for the same
 * slug is dropped; uploaded_test findings fill the slugs nutrigendx does not
 * cover. Output order is deterministic: category, then itemName.
 */
export function applySourcePrecedence(
  findings: NutritionGeneticFinding[],
): NutritionGeneticFinding[] {
  const winnerBySlug = new Map<string, NutritionGeneticFinding>();
  for (const finding of findings) {
    if (finding.supersededAt !== null) continue;
    const current = winnerBySlug.get(finding.itemSlug);
    if (!current || (current.source !== 'nutrigendx' && finding.source === 'nutrigendx')) {
      winnerBySlug.set(finding.itemSlug, finding);
    }
  }
  return [...winnerBySlug.values()].sort(
    (a, b) => a.category.localeCompare(b.category) || a.itemName.localeCompare(b.itemName),
  );
}

/**
 * Category buckets for one direction. 187's Recommendations tab renders the
 * three named groups (Foods, Vitamins, Minerals). category 'other' findings
 * are NOT folded into those three: they land on the optional `other` array
 * (present only when nonempty) so a later prompt can render a generic group
 * without a reshape.
 */
export interface GroupedFindings {
  food: NutritionGeneticFinding[];
  vitamin: NutritionGeneticFinding[];
  mineral: NutritionGeneticFinding[];
  other?: NutritionGeneticFinding[];
}

/**
 * Pure. Splits findings into the Recommendations tab's two halves. needs is
 * direction 'need' only; avoid is direction 'avoid' only. neutral and
 * unknown directions are EXCLUDED from both: they surface on the AI Results
 * panel, not on Recommendations. Input order is preserved within each
 * bucket.
 */
export function groupRecommendations(findings: NutritionGeneticFinding[]): {
  needs: GroupedFindings;
  avoid: GroupedFindings;
} {
  const needs: GroupedFindings = { food: [], vitamin: [], mineral: [] };
  const avoid: GroupedFindings = { food: [], vitamin: [], mineral: [] };
  for (const finding of findings) {
    if (finding.direction !== 'need' && finding.direction !== 'avoid') continue;
    const bucket = finding.direction === 'need' ? needs : avoid;
    if (
      finding.category === 'food' ||
      finding.category === 'vitamin' ||
      finding.category === 'mineral'
    ) {
      bucket[finding.category].push(finding);
    } else {
      (bucket.other ??= []).push(finding);
    }
  }
  return { needs, avoid };
}

/**
 * Loose structural type for the supabase-js client, mirroring how the hub
 * hooks treat the client (useNutritionHubMetrics casts createClient() to any
 * before calling .from()). Keeps this helper usable from the browser client
 * and from a plain stub in tests without dragging in generated DB types.
 */
export interface SupabaseLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
}

/**
 * Reads the user's ACTIVE findings (superseded_at IS NULL) under RLS.
 * Fail open: on timeout, thrown error, or a supabase error response this
 * returns [] after one safeLog.warn so the page renders its empty state
 * rather than crashing. 4000ms timeout per the nutrition hub convention.
 */
export async function fetchActiveFindings(
  supabase: SupabaseLike,
  userId: string,
): Promise<NutritionGeneticFinding[]> {
  try {
    const result = (await withTimeout(
      supabase
        .from('nutrition_genetic_findings')
        .select(FINDINGS_SELECT)
        .eq('user_id', userId)
        .is('superseded_at', null)
        // Newest first so, if duplicate active slugs ever exist, the
        // first-wins map in applySourcePrecedence keeps the newest row.
        .order('created_at', { ascending: false }),
      TIMEOUT_MS,
      'nutrition.genetics.findings',
    )) as { data: Record<string, unknown>[] | null; error: { message?: string } | null };
    if (result.error) {
      safeLog.warn('nutrition.genetics', 'findings read failed', {
        userId,
        error: result.error.message ?? 'supabase error response',
      });
      return [];
    }
    return (Array.isArray(result.data) ? result.data : []).map(findingFromRow);
  } catch (err) {
    safeLog.warn('nutrition.genetics', 'findings read failed', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
