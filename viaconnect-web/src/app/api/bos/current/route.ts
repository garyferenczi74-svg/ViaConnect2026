// BOS read endpoint. Returns the authenticated user's most recent
// Bio Optimization Score state, reshaped for the consumer dashboard.
//
// Phase D of bundled Prompts #159 + #161. The endpoint:
//   1. Authenticates the caller via the cookie-aware Supabase client
//      from @/lib/supabase/server. This is the same helper every other
//      authenticated route in /api uses (e.g. patient-view-preference,
//      ai/calculate-bio-optimization). It honors RLS so a user can
//      only see their own bio_optimization_history rows.
//   2. Fetches the latest row by (date DESC, compute_seq DESC). The
//      compute_seq column was added in the Phase A migration so a same
//      day re-compute always wins over earlier rows of that day.
//   3. Parses the breakdown jsonb to derive:
//        - accuracy_pills (3): CAQ, Labs, Genetics state machine
//        - engagement_pills (6): nutrition, supplements, body_tracker,
//          wearable, plug_ins, helix_challenges
//        - baseline from diagnostic_foundation.caq.baseline_score
//        - hannah_explanation from hannah_output.explanation
//   4. Falls back to the pre-compute response when no history row
//      exists yet (the user has not completed the CAQ).

import { createClient } from '@/lib/supabase/server';
import type {
  AccuracyPill,
  BOSCurrentResponse,
  BOSTier,
  EngagementPill,
} from '@/lib/scoring/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const COMPUTE_VERSION = '2.0.0';
const PRECOMPUTE_EXPLANATION = 'Complete your CAQ to see your Bio Optimization Score.';

const ENGAGEMENT_LABELS: Record<EngagementPill['key'], string> = {
  nutrition: 'Nutrition',
  supplements: 'Supplements',
  body_tracker: 'Body Tracker',
  wearable: 'Wearable Data',
  plug_ins: 'Plug Ins',
  helix_challenges: 'Helix Challenges',
};

const ENGAGEMENT_DESTINATIONS: Record<EngagementPill['key'], string> = {
  nutrition: 'nutrition_log',
  supplements: 'supplements_protocol',
  body_tracker: 'body_tracker',
  wearable: 'wearable_dashboard',
  plug_ins: 'plug_ins_directory',
  helix_challenges: 'helix_challenges',
};

const ENGAGEMENT_ORDER: EngagementPill['key'][] = [
  'nutrition',
  'supplements',
  'body_tracker',
  'wearable',
  'plug_ins',
  'helix_challenges',
];

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(_request: Request): Promise<Response> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: latest } = await sb
    .from('bio_optimization_history')
    .select('id, score, tier, confidence, compute_version, computed_at, breakdown')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('compute_seq', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest) {
    return Response.json(buildPreComputeResponse());
  }

  return Response.json(buildCurrentResponse(latest));
}

// ---------------------------------------------------------------------------
// Pre-compute response builder
// ---------------------------------------------------------------------------

function buildPreComputeResponse(): BOSCurrentResponse {
  return {
    score: null,
    baseline: null,
    tier: 1,
    confidence: 0.720,
    confidence_display: '72%',
    computed_at: null,
    compute_version: COMPUTE_VERSION,
    accuracy_pills: [
      { key: 'caq', label: 'CAQ', state: 'incomplete', destination_key: 'caq_resume', confidence_unlocked_pct: 72 },
      { key: 'labs', label: 'Labs', state: 'incomplete', destination_key: 'labs_upload', confidence_unlocked_pct: 86 },
      { key: 'genetics', label: 'Genetics', state: 'incomplete', destination_key: 'genex360_purchase', confidence_unlocked_pct: 96 },
    ],
    engagement_pills: ENGAGEMENT_ORDER.map((key) => ({
      key,
      label: ENGAGEMENT_LABELS[key],
      state: 'unused' as const,
      velocity_pct: 0,
      ceiling_pct: 0,
      current_contribution_pct: 0,
      last_engaged_at: null,
      destination_key: ENGAGEMENT_DESTINATIONS[key],
    })),
    hannah_explanation: PRECOMPUTE_EXPLANATION,
  };
}

// ---------------------------------------------------------------------------
// Current response builder
// ---------------------------------------------------------------------------

interface HistoryRowLike {
  id: string;
  score: number | null;
  tier: number;
  confidence: number;
  compute_version: string | null;
  computed_at: string | null;
  breakdown: Record<string, unknown>;
}

interface DiagnosticFoundationShape {
  caq?: { completed?: boolean; baseline_score?: number | null };
  labs?: { present?: boolean };
  genetics?: {
    present?: boolean;
    lifecycle_status?: string;
  };
}

interface EngagementStateShape {
  [key: string]: { last_engaged_at?: string | null } | undefined;
}

interface HannahOutputShape {
  explanation?: string;
  engagement?: Record<
    string,
    {
      current_contribution_pct?: number;
      velocity_pct?: number;
      ceiling_pct?: number;
      state?: EngagementPill['state'];
    }
  >;
}

function buildCurrentResponse(row: HistoryRowLike): BOSCurrentResponse {
  const breakdown = row.breakdown ?? {};
  const diag = (breakdown.diagnostic_foundation ?? {}) as DiagnosticFoundationShape;
  const engagementState = (breakdown.engagement_state ?? {}) as EngagementStateShape;
  const hannah = (breakdown.hannah_output ?? {}) as HannahOutputShape;

  const tier = normalizeTier(row.tier);
  const confidence = row.confidence;

  return {
    score: row.score,
    baseline: diag.caq?.baseline_score ?? null,
    tier,
    confidence,
    confidence_display: confidenceDisplay(confidence),
    computed_at: row.computed_at,
    compute_version: row.compute_version ?? COMPUTE_VERSION,
    accuracy_pills: buildAccuracyPills(diag),
    engagement_pills: buildEngagementPills(hannah, engagementState),
    hannah_explanation: hannah.explanation ?? PRECOMPUTE_EXPLANATION,
  };
}

function normalizeTier(t: number | null | undefined): BOSTier {
  if (t === 2) return 2;
  if (t === 3) return 3;
  return 1;
}

function confidenceDisplay(c: number): '72%' | '86%' | '96%' {
  if (Math.abs(c - 0.960) < 0.005) return '96%';
  if (Math.abs(c - 0.860) < 0.005) return '86%';
  return '72%';
}

// ---------------------------------------------------------------------------
// Accuracy pills
// ---------------------------------------------------------------------------

function buildAccuracyPills(diag: DiagnosticFoundationShape): AccuracyPill[] {
  const caqComplete = diag.caq?.completed === true;
  const labsComplete = diag.labs?.present === true;
  const geneticsState = resolveGeneticsState(diag);

  const caqPill: AccuracyPill = {
    key: 'caq',
    label: 'CAQ',
    state: caqComplete ? 'complete' : 'incomplete',
    destination_key: caqComplete ? null : 'caq_resume',
    confidence_unlocked_pct: 72,
  };

  const labsPill: AccuracyPill = {
    key: 'labs',
    label: 'Labs',
    state: labsComplete ? 'complete' : 'incomplete',
    destination_key: labsComplete ? null : 'labs_upload',
    confidence_unlocked_pct: 86,
  };

  const geneticsPill: AccuracyPill = {
    key: 'genetics',
    label: 'Genetics',
    state: geneticsState,
    destination_key:
      geneticsState === 'complete'
        ? null
        : geneticsState === 'awaiting_results'
          ? 'genex360_status'
          : 'genex360_purchase',
    confidence_unlocked_pct: 96,
  };

  return [caqPill, labsPill, geneticsPill];
}

function resolveGeneticsState(
  diag: DiagnosticFoundationShape,
): 'complete' | 'awaiting_results' | 'incomplete' {
  if (diag.genetics?.present === true) return 'complete';
  if (diag.genetics?.lifecycle_status === 'awaiting_results') return 'awaiting_results';
  return 'incomplete';
}

// ---------------------------------------------------------------------------
// Engagement pills
// ---------------------------------------------------------------------------

function buildEngagementPills(
  hannah: HannahOutputShape,
  engagementState: EngagementStateShape,
): EngagementPill[] {
  return ENGAGEMENT_ORDER.map((key) => {
    const contribution = hannah.engagement?.[key] ?? {};
    const stateRow = engagementState[key] ?? {};
    return {
      key,
      label: ENGAGEMENT_LABELS[key],
      state: (contribution.state as EngagementPill['state']) ?? 'unused',
      velocity_pct: contribution.velocity_pct ?? 0,
      ceiling_pct: contribution.ceiling_pct ?? 0,
      current_contribution_pct: contribution.current_contribution_pct ?? 0,
      last_engaged_at: stateRow.last_engaged_at ?? null,
      destination_key: ENGAGEMENT_DESTINATIONS[key],
    };
  });
}
