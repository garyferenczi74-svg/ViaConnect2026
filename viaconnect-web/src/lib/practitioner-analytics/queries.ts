// Prompt #99 Phase 1 (Path A): Supabase query helpers for practitioner
// analytics. In Path A most materialized views are not yet live — the
// helpers return a `dependency_pending` result so page scaffolds can
// render a banner instead of throwing at the Supabase boundary.

import { createClient } from '@/lib/supabase/server';
import type { SherlockPage } from './sherlock-stub';
import { PRACTITIONER_PENDING_REASON, type QueryOutcome } from './constants';

export {
  PRACTITIONER_MV,
  PRACTITIONER_PENDING_REASON,
  type DependencyStatus,
  type QueryOutcome,
} from './constants';

/** Fetches the cached Sherlock insight row for a page if one exists.
 *  This table IS live (migration 20260419000010), so it's safe to
 *  query. Returns null when no cache exists for today. */
export async function fetchCachedSherlockInsight(
  practitionerId: string,
  page: SherlockPage,
): Promise<null | {
  headline: string;
  body: string;
  suggestedAction: string | null;
  confidence: 'high' | 'medium' | 'low';
  generatedAt: string;
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as unknown as any;
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('sherlock_insights_cache')
    .select('headline, body, suggested_action, confidence, generated_at')
    .eq('practitioner_id', practitionerId)
    .eq('page', page)
    .eq('generated_at', today)
    .maybeSingle();
  const row = data as
    | {
        headline: string;
        body: string;
        suggested_action: string | null;
        confidence: 'high' | 'medium' | 'low';
        generated_at: string;
      }
    | null;
  if (!row) return null;
  return {
    headline: row.headline,
    body: row.body,
    suggestedAction: row.suggested_action,
    confidence: row.confidence,
    generatedAt: row.generated_at,
  };
}

/** Path A placeholder for the MV read. Returns 'dependency_pending'
 *  for every surface so the UI renders the banner. Path B flips this
 *  one page at a time as dependencies land. */
export function fetchMaterializedView<T>(page: SherlockPage): QueryOutcome<T> {
  return {
    status: 'dependency_pending',
    pendingReason: PRACTITIONER_PENDING_REASON[page],
  };
}
