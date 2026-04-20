// Prompt #99 Phase 1 (Path A): Sherlock narrative insight stub.
//
// The production implementation (Path B) calls buildUnifiedContext(),
// sends to Claude claude-opus-4-7, post-processes, and writes to
// sherlock_insights_cache. Until the dependency tables are live
// (clients, bio_optimization_scores, interaction_events, etc.), this
// stub returns a deterministic placeholder so the page scaffolds can
// render the insight card without tripping CI.

export type SherlockPage =
  | 'practice_health'
  | 'cohorts'
  | 'protocols'
  | 'revenue'
  | 'engagement';

export interface SherlockInsight {
  headline: string;
  body: string;
  suggestedAction: string | null;
  confidence: 'high' | 'medium' | 'low';
  /** When Path B lands, this is the cached_at from
   *  sherlock_insights_cache. Stub returns null to signal pending. */
  generatedAt: string | null;
  isPending: boolean;
}

const PAGE_COPY: Record<SherlockPage, Omit<SherlockInsight, 'generatedAt' | 'isPending'>> = {
  practice_health: {
    headline: 'Insights activate when client + outcome data lands',
    body:
      'Practice Health narrative becomes available once the clients + bio_optimization_scores tables are live. The scaffold, cache, and guardrails are ready — the AI pass fills in last.',
    suggestedAction: null,
    confidence: 'medium',
  },
  cohorts: {
    headline: 'Cohort analysis standing by',
    body:
      'Cohort segmentation narrative surfaces once Tier 1/2/3 client data is populated. The AI pass respects the #17b Addendum — aggregate engagement only, no individual Helix signals.',
    suggestedAction: null,
    confidence: 'medium',
  },
  protocols: {
    headline: 'Protocol intelligence standing by',
    body:
      'Protocol effectiveness narrative activates once user_protocols + interaction_events data is flowing. Recommendations will draw exclusively from the FarmCeutica catalog (#60d).',
    suggestedAction: null,
    confidence: 'medium',
  },
  revenue: {
    headline: 'Revenue narrative standing by',
    body:
      'Revenue intelligence activates once whitelabel_orders (#96), referral_commissions (#98), and practitioner_transactions go live. The 12-month projection fan reads from those three tables.',
    suggestedAction: null,
    confidence: 'medium',
  },
  engagement: {
    headline: 'Engagement narrative standing by',
    body:
      'Engagement insights surface once engagement_score_snapshots + wearables are populated. The narrative only references aggregate rollups — individual Helix Rewards data is excluded by design.',
    suggestedAction: null,
    confidence: 'medium',
  },
};

/** Pure: returns the stub insight for a page. Deterministic — the
 *  same page always returns the same content, so page snapshots stay
 *  stable. Path B will replace this with a real Claude call. */
export function getSherlockStubInsight(page: SherlockPage): SherlockInsight {
  const copy = PAGE_COPY[page];
  return {
    ...copy,
    generatedAt: null,
    isPending: true,
  };
}
