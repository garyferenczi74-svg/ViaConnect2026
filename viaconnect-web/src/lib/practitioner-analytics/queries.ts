// Prompt #99 (Path A): Server-side Supabase query helpers for
// practitioner analytics. Currently narrow — only the Sherlock cache
// reader lives here. Live MV reads use queries-client.ts from the
// browser side. Path B will add a server-side Sherlock generator that
// writes to the same cache table.

import { createClient } from '@/lib/supabase/server';
import type { SherlockPage } from './sherlock-stub';

export {
  PRACTITIONER_MV,
  PRACTITIONER_PENDING_REASON,
  type DependencyStatus,
  type QueryOutcome,
} from './constants';

/** Fetches the cached Sherlock insight row for a page if one exists.
 *  The sherlock_insights_cache table is live (migration 20260419000010),
 *  so callers on the server can hit this now. Returns null when no
 *  cache row exists for today. Consumed in Path B by the narrative
 *  generator + Monday-morning digest edge function. */
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
