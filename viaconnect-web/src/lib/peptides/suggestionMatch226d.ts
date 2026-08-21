/**
 * Prompt 226d Wave B: deterministic evidence-matched peptide briefing.
 * Model never selects compounds. Curated kb_goal_peptide_links only.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import type { HonestyLayerShape } from '@/lib/hannah/peptideHonestyContext';

export type EvidenceGrade = 'A' | 'B' | 'C' | 'D' | 'E';
export type IndicationMatch =
  | 'studied_for_this_goal'
  | 'studied_adjacent_indication'
  | 'mechanistic_only'
  | 'community_claim_only';

export type ScreeningInput = {
  pregnantOrBreastfeedingOrTrying?: boolean | null;
  under18?: boolean | null;
  /** When true, unknown screens exclude (fail-closed). */
  missingCriticalScreen?: boolean;
};

export type MatchRequest = {
  userId: string;
  goalSlugs: string[];
  screening?: ScreeningInput;
  persistSession?: boolean;
};

export type RouteAttachment = {
  route: string;
  targetSiteClass: string;
  rationale: string;
  routeEvidenceGrade: EvidenceGrade;
  humanDataForRoute: boolean;
  isPreferredByEvidence: boolean;
  preferenceRationale: string;
  bioavailabilityValue: number | null;
  bioavailabilityBasis: string | null;
};

export type MatchedCompound = {
  peptideId: string;
  slug: string;
  displayName: string;
  goalSlug: string;
  goalDisplayName: string;
  evidenceGradeForGoal: EvidenceGrade;
  indicationMatch: IndicationMatch;
  mechanismRationale: string;
  exclusionTier: string;
  honesty: HonestyLayerShape;
  routes: RouteAttachment[];
};

export type GradeBand = {
  grade: EvidenceGrade;
  header: string;
  compounds: MatchedCompound[];
};

export type MatchResult =
  | {
      ok: true;
      thin: boolean;
      goals: Array<{ slug: string; displayName: string }>;
      bands: GradeBand[];
      screeningBlocked: boolean;
      screeningReason: string | null;
      sessionId: string | null;
    }
  | { ok: false; error: string };

const GRADE_ORDER: EvidenceGrade[] = ['A', 'B', 'C', 'D', 'E'];

const GRADE_HEADERS: Record<EvidenceGrade, string> = {
  A: 'Grade A: multiple adequately powered human trials for this goal',
  B: 'Grade B: supportive human evidence for this goal, still limited',
  C: 'Grade C: early or mixed human evidence for this goal',
  D: 'Grade D: animal or laboratory data with little or no human evidence for this goal',
  E: 'Grade E: insufficient evidence for this goal in sources we hold',
};

const INDICATION_RANK: Record<IndicationMatch, number> = {
  studied_for_this_goal: 0,
  studied_adjacent_indication: 1,
  mechanistic_only: 2,
  community_claim_only: 3,
};

export function evaluateScreening(screening?: ScreeningInput): {
  blocked: boolean;
  reason: string | null;
} {
  if (!screening) {
    return {
      blocked: true,
      reason:
        'Screening inputs are incomplete. Compounds are excluded until pregnancy, breastfeeding, and age screens are answered.',
    };
  }
  if (screening.missingCriticalScreen === true) {
    return {
      blocked: true,
      reason:
        'A required screening answer is missing. Unknown is not a pass; no compounds are shown.',
    };
  }
  if (screening.pregnantOrBreastfeedingOrTrying === true) {
    return {
      blocked: true,
      reason:
        'Pregnancy, breastfeeding, or trying to conceive screens positive. No compound cards are shown. Speak with an obstetric or primary clinician.',
    };
  }
  if (screening.under18 === true) {
    return {
      blocked: true,
      reason:
        'Age under 18. Peptide education matching is not available. Speak with a pediatric clinician.',
    };
  }
  if (
    screening.pregnantOrBreastfeedingOrTrying == null ||
    screening.under18 == null
  ) {
    return {
      blocked: true,
      reason:
        'Screening inputs are incomplete. Compounds are excluded until required screens are answered.',
    };
  }
  return { blocked: false, reason: null };
}

export function sortMatchedCompounds(rows: MatchedCompound[]): MatchedCompound[] {
  return [...rows].sort((a, b) => {
    const g =
      GRADE_ORDER.indexOf(a.evidenceGradeForGoal) -
      GRADE_ORDER.indexOf(b.evidenceGradeForGoal);
    if (g !== 0) return g;
    const i =
      INDICATION_RANK[a.indicationMatch] - INDICATION_RANK[b.indicationMatch];
    if (i !== 0) return i;
    const aTrials = Number(a.honesty.trials_registered ?? 0);
    const bTrials = Number(b.honesty.trials_registered ?? 0);
    return bTrials - aTrials;
  });
}

export function bandByGrade(rows: MatchedCompound[]): GradeBand[] {
  const sorted = sortMatchedCompounds(rows);
  const bands: GradeBand[] = [];
  for (const grade of GRADE_ORDER) {
    const compounds = sorted.filter((r) => r.evidenceGradeForGoal === grade);
    if (compounds.length === 0) continue;
    bands.push({ grade, header: GRADE_HEADERS[grade], compounds });
  }
  return bands;
}

function passesHardExclusion(row: {
  exclusionTier: string;
  evidenceGradeForGoal: EvidenceGrade;
  indicationMatch: IndicationMatch;
}): boolean {
  if (
    row.exclusionTier === 'restricted' ||
    row.exclusionTier === 'excluded_adverse_reference'
  ) {
    return false;
  }
  if (
    row.evidenceGradeForGoal === 'E' &&
    row.indicationMatch === 'community_claim_only'
  ) {
    return false;
  }
  return true;
}

export async function runSuggestionMatch(
  req: MatchRequest,
): Promise<MatchResult> {
  const goalSlugs = [...new Set(req.goalSlugs.map((s) => s.trim()).filter(Boolean))];
  if (goalSlugs.length === 0) {
    return { ok: false, error: 'goal_required' };
  }

  const screen = evaluateScreening(req.screening);
  if (screen.blocked) {
    let sessionId: string | null = null;
    if (req.persistSession) {
      sessionId = await persistSession(req.userId, goalSlugs, [], screen, {
        blocked: true,
      });
    }
    return {
      ok: true,
      thin: true,
      goals: [],
      bands: [],
      screeningBlocked: true,
      screeningReason: screen.reason,
      sessionId,
    };
  }

  try {
    const admin = createAdminClient();

    const { data: domains, error: domainErr } = await admin
      .from('kb_goal_domains')
      .select('id, slug, display_name')
      .in('slug', goalSlugs);

    if (domainErr) {
      safeLog.warn('peptides.suggestions', 'goal domains query failed', {
        error: domainErr.message,
      });
      return { ok: false, error: 'goal_domains_unavailable' };
    }

    const domainRows = domains ?? [];
    if (domainRows.length === 0) {
      return { ok: false, error: 'unknown_goals' };
    }

    const domainIds = domainRows.map((d) => d.id);
    const domainById = new Map(domainRows.map((d) => [d.id, d]));

    const { data: links, error: linkErr } = await admin
      .from('kb_goal_peptide_links')
      .select(
        'goal_domain_id, peptide_id, mechanism_rationale, evidence_grade_for_this_goal, indication_match',
      )
      .in('goal_domain_id', domainIds);

    if (linkErr) {
      safeLog.warn('peptides.suggestions', 'goal links query failed', {
        error: linkErr.message,
      });
      return { ok: false, error: 'goal_links_unavailable' };
    }

    const linkRows = links ?? [];
    const peptideIds = [...new Set(linkRows.map((l) => l.peptide_id))];

    if (peptideIds.length === 0) {
      const goals = domainRows.map((d) => ({
        slug: String(d.slug),
        displayName: String(d.display_name),
      }));
      let sessionId: string | null = null;
      if (req.persistSession) {
        sessionId = await persistSession(req.userId, goalSlugs, goals, screen, {
          thin: true,
        });
      }
      return {
        ok: true,
        thin: true,
        goals,
        bands: [],
        screeningBlocked: false,
        screeningReason: null,
        sessionId,
      };
    }

    const { data: peptides, error: pepErr } = await admin
      .from('kb_peptides')
      .select('id, slug, display_name, exclusion_tier, honesty_layer')
      .in('id', peptideIds);

    if (pepErr) {
      safeLog.warn('peptides.suggestions', 'peptides query failed', {
        error: pepErr.message,
      });
      return { ok: false, error: 'peptides_unavailable' };
    }

    const pepById = new Map((peptides ?? []).map((p) => [p.id, p]));

    const { data: routes } = await admin
      .from('kb_peptide_routes')
      .select(
        'peptide_id, route, target_site_class, rationale, route_evidence_grade, human_data_for_route, is_preferred_by_evidence, preference_rationale, bioavailability_value, bioavailability_basis',
      )
      .in('peptide_id', peptideIds);

    const routesByPep = new Map<string, RouteAttachment[]>();
    for (const r of routes ?? []) {
      const list = routesByPep.get(r.peptide_id) ?? [];
      list.push({
        route: String(r.route),
        targetSiteClass: String(r.target_site_class),
        rationale: String(r.rationale ?? ''),
        routeEvidenceGrade: (r.route_evidence_grade as EvidenceGrade) || 'E',
        humanDataForRoute: r.human_data_for_route === true,
        isPreferredByEvidence: r.is_preferred_by_evidence === true,
        preferenceRationale: String(r.preference_rationale ?? ''),
        bioavailabilityValue:
          r.bioavailability_value == null
            ? null
            : Number(r.bioavailability_value),
        bioavailabilityBasis:
          r.bioavailability_basis == null
            ? null
            : String(r.bioavailability_basis),
      });
      routesByPep.set(r.peptide_id, list);
    }

    const matched: MatchedCompound[] = [];
    for (const link of linkRows) {
      const pep = pepById.get(link.peptide_id);
      const domain = domainById.get(link.goal_domain_id);
      if (!pep || !domain) continue;

      const grade = link.evidence_grade_for_this_goal as EvidenceGrade;
      const indication = link.indication_match as IndicationMatch;
      const exclusionTier = String(pep.exclusion_tier ?? 'educational');

      if (
        !passesHardExclusion({
          exclusionTier,
          evidenceGradeForGoal: grade,
          indicationMatch: indication,
        })
      ) {
        continue;
      }

      const honesty = (pep.honesty_layer ?? {}) as HonestyLayerShape;

      matched.push({
        peptideId: String(pep.id),
        slug: String(pep.slug),
        displayName: String(pep.display_name ?? pep.slug),
        goalSlug: String(domain.slug),
        goalDisplayName: String(domain.display_name),
        evidenceGradeForGoal: grade,
        indicationMatch: indication,
        mechanismRationale: String(link.mechanism_rationale ?? ''),
        exclusionTier,
        honesty,
        routes: routesByPep.get(String(pep.id)) ?? [],
      });
    }

    const bands = bandByGrade(matched);
    const goals = domainRows.map((d) => ({
      slug: String(d.slug),
      displayName: String(d.display_name),
    }));
    const thin = matched.length === 0;

    let sessionId: string | null = null;
    if (req.persistSession) {
      sessionId = await persistSession(req.userId, goalSlugs, goals, screen, {
        thin,
        bandCount: bands.length,
        compoundCount: matched.length,
      });
    }

    return {
      ok: true,
      thin,
      goals,
      bands,
      screeningBlocked: false,
      screeningReason: null,
      sessionId,
    };
  } catch (err) {
    safeLog.warn('peptides.suggestions', 'match threw', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, error: 'match_exception' };
  }
}

async function persistSession(
  userId: string,
  goalSlugs: string[],
  goals: Array<{ slug: string; displayName: string }>,
  screen: { blocked: boolean; reason: string | null },
  resultsMeta: Record<string, unknown>,
): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('suggestion_sessions')
      .insert({
        user_id: userId,
        goals_selected: goalSlugs,
        inputs_used: { goals, screening: screen },
        results: resultsMeta,
        screening_cascade: screen,
        disclaimer_version: '226d-v1',
      })
      .select('id')
      .maybeSingle();
    if (error) {
      safeLog.warn('peptides.suggestions', 'session persist failed', {
        error: error.message,
      });
      return null;
    }
    return data?.id ? String(data.id) : null;
  } catch {
    return null;
  }
}

/** Consumer-facing goal chip catalog (explicit selection). */
export const SUGGESTION_GOAL_CHIPS = [
  { slug: 'tissue_repair_recovery', label: 'Tissue repair' },
  { slug: 'weight_body_composition', label: 'Weight / body composition' },
  { slug: 'cognitive_mental_clarity', label: 'Cognitive clarity' },
  { slug: 'gut_digestive_comfort', label: 'Gut comfort' },
  { slug: 'energy_fatigue', label: 'Energy / fatigue' },
  { slug: 'sleep_quality', label: 'Sleep' },
  { slug: 'longevity_healthy_aging', label: 'Longevity' },
  { slug: 'athletic_performance', label: 'Athletic performance' },
] as const;
