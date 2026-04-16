// Unified AI Data Context Builder
// Assembles the complete data picture from ALL sources for any AI engine.
// Every engine calls this instead of individual queries.
//
// buildHannahContext: Hannah-specific wrapper used by Ultrathink + Avatar.
// (Prompt #88 — new export, does not modify buildUnifiedContext.)

import { createClient } from "@/lib/supabase/client";

export interface UnifiedDataContext {
  userId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: any;
  caq: {
    demographics: Record<string, unknown>;
    healthConcerns: string[];
    familyHistory: Array<{ condition: string; relationships: string[] }>;
    symptomsPhysical: Record<string, { score: number; description: string }>;
    symptomsNeurological: Record<string, { score: number; description: string }>;
    symptomsEmotional: Record<string, { score: number; description: string }>;
    lifestyle: Record<string, unknown>;
    allergies: string[];
    adverseReactions: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  medications: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supplements: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interactions: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protocol: any | null;
  bioOptimization: {
    currentScore: number;
    tier: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    history: any[];
    strengths: string[];
    opportunities: string[];
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dailyScores: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adherence: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wearable: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  checkins: any[];
  helix: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activeChallenges: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    achievements: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recentTokenActivity: any[];
  };
  aiChat: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recentTopics: any[];
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  genetic: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  labs: any[];
  clinical: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    practitionerNotes: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    naturopathProtocols: any[];
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analytics: any | null;
  dataCompleteness: number;
  lastUpdated: string;
}

export async function buildUnifiedContext(userId: string): Promise<UnifiedDataContext> {
  const supabase = createClient();

  // Parallel load all data sources
  const [
    profileRes,
    assessmentsRes,
    supplementsRes,
    interactionsRes,
    protocolRes,
    scoreHistoryRes,
    dailyScoresRes,
    analyticsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("assessment_results").select("phase, data").eq("user_id", userId),
    supabase.from("user_supplements").select("*").eq("user_id", userId).eq("is_active", true),
    supabase.from("medication_interactions").select("*").eq("user_id", userId),
    supabase.from("user_protocols").select("*").eq("user_id", userId).eq("is_active", true).order("created_at", { ascending: false }).limit(1).single(),
    supabase.from("bio_optimization_history").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(90),
    supabase.from("daily_scores").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(30),
    supabase.from("wellness_analytics").select("*").eq("user_id", userId).order("calculated_at", { ascending: false }).limit(1).single(),
  ]);

  // Cast to any: several columns referenced below (date_of_birth, sex, ethnicity,
  // health_concerns, symptoms_*, bio_optimization_*) live in profiles in the
  // current schema, but the typegen produces a strict Row type and the `|| {}`
  // fallback widens the union to bare {} which loses property access. Treating
  // profile as a loose record preserves runtime behavior.
  const profile: any = profileRes.data || {};
  const assessments = assessmentsRes.data || [];
  const getPhase = (phase: number) => assessments.find((a) => a.phase === phase)?.data as Record<string, unknown> | undefined;

  const phase4 = getPhase(4) || {};
  const meds = (phase4.medications as string[]) || [];

  // Build CAQ data
  const caq = {
    demographics: {
      age: profile.date_of_birth ? Math.floor((Date.now() - new Date(profile.date_of_birth as string).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null,
      sex: profile.sex,
      ethnicity: profile.ethnicity,
      height: profile.height,
      weight: profile.weight,
    },
    healthConcerns: (profile.health_concerns as string[]) || [],
    familyHistory: (profile.family_history as Array<{ condition: string; relationships: string[] }>) || [],
    symptomsPhysical: (profile.symptoms_physical as Record<string, { score: number; description: string }>) || {},
    symptomsNeurological: (profile.symptoms_neurological as Record<string, { score: number; description: string }>) || {},
    symptomsEmotional: (profile.symptoms_emotional as Record<string, { score: number; description: string }>) || {},
    lifestyle: getPhase(3) || {},
    allergies: (phase4.allergies as string[]) || [],
    adverseReactions: (phase4.adverseReactions as string) || "",
  };

  const hasCaq = !!(profile.assessment_completed);
  const hasDailyScores = (dailyScoresRes.data?.length || 0) > 0;

  const dataCompleteness = (hasCaq ? 30 : 0) + (hasDailyScores ? 20 : 0) +
    ((supplementsRes.data?.length || 0) > 0 ? 10 : 0) +
    (profile.genetic_profile ? 15 : 0) + 10; // base 10 for having an account

  return {
    userId,
    profile,
    caq,
    medications: meds.map((m: string) => ({ name: m })),
    supplements: supplementsRes.data || [],
    interactions: interactionsRes.data || [],
    protocol: protocolRes.data || null,
    bioOptimization: {
      currentScore: profile.bio_optimization_score || 0,
      tier: profile.bio_optimization_tier || "Developing",
      history: scoreHistoryRes.data || [],
      strengths: profile.bio_optimization_strengths || [],
      opportunities: profile.bio_optimization_opportunities || [],
    },
    dailyScores: dailyScoresRes.data || [],
    adherence: [],
    wearable: [],
    checkins: [],
    helix: { activeChallenges: [], achievements: [], recentTokenActivity: [] },
    aiChat: { recentTopics: [] },
    genetic: null,
    labs: [],
    clinical: { practitionerNotes: [], naturopathProtocols: [] },
    analytics: analyticsRes.data || null,
    dataCompleteness,
    lastUpdated: new Date().toISOString(),
  };
}

// ── Hannah-specific context wrapper (Prompt #88) ─────────────────────────
// Returns a condensed summary + typed source list for the Ultrathink engine
// and Tavus avatar context. Does NOT modify buildUnifiedContext above.

export interface HannahSource {
  type: 'pubmed' | 'internal_protocol' | 'caq' | 'gene_panel' | 'supplement_db' | 'interaction_rule' | 'other';
  id?: string;
  title?: string;
  url?: string;
  snippet?: string;
}

export interface HannahContextResult {
  summary: string;
  sources: HannahSource[];
  raw: UnifiedDataContext;
}

export async function buildHannahContext(
  userId: string,
  opts?: { includePHI?: boolean; ragPasses?: number },
): Promise<HannahContextResult> {
  const ctx = await buildUnifiedContext(userId);
  const includePHI = opts?.includePHI ?? true;

  const sources: HannahSource[] = [];

  // CAQ data as a source (health concerns are not PHI per HIPAA Safe Harbor)
  if (ctx.caq.healthConcerns.length > 0) {
    sources.push({
      type: 'caq',
      title: 'CAQ Assessment',
      snippet: `Health concerns: ${ctx.caq.healthConcerns.join(', ')}. Allergies: ${ctx.caq.allergies.join(', ') || 'none reported'}.`,
    });
  }

  // Active supplements (product names are not PHI)
  if (ctx.supplements.length > 0) {
    sources.push({
      type: 'supplement_db',
      title: 'Active Supplements',
      snippet: ctx.supplements.map((s: any) => s.product_name || s.supplement_name || 'unknown').join(', '),
    });
  }

  // Interactions — include medication names only when PHI is allowed
  if (ctx.interactions.length > 0 && includePHI) {
    sources.push({
      type: 'interaction_rule',
      title: 'Medication Interactions',
      snippet: ctx.interactions.map((i: any) => `${i.drug_name || 'drug'} / ${i.supplement_name || 'supplement'}: ${i.severity || 'unknown'}`).join('; '),
    });
  }

  // Genetic data — PHI gated
  if (ctx.genetic && includePHI) {
    sources.push({
      type: 'gene_panel',
      title: 'GeneX360 Profile',
      snippet: JSON.stringify(ctx.genetic).slice(0, 500),
    });
  }

  // Protocol (protocol structure is not PHI, but skip for non-PHI to be safe)
  if (ctx.protocol && includePHI) {
    sources.push({
      type: 'internal_protocol',
      title: 'Active Protocol',
      snippet: JSON.stringify(ctx.protocol).slice(0, 500),
    });
  }

  // Build summary — omit identifying info when PHI is not allowed
  const parts: string[] = [];
  if (includePHI && ctx.profile?.display_name) {
    parts.push(`User: ${ctx.profile.display_name}`);
  }
  parts.push(`Bio Optimization: ${ctx.bioOptimization.currentScore}/100 (${ctx.bioOptimization.tier})`);
  parts.push(`Data completeness: ${ctx.dataCompleteness}%`);
  if (includePHI && ctx.medications.length > 0) {
    parts.push(`Medications: ${ctx.medications.map((m: any) => m.name).join(', ')}`);
  }
  if (ctx.caq.healthConcerns.length > 0) parts.push(`Concerns: ${ctx.caq.healthConcerns.join(', ')}`);
  if (ctx.supplements.length > 0) parts.push(`Supplements: ${ctx.supplements.length} active`);

  return {
    summary: parts.join('\n'),
    sources,
    raw: ctx,
  };
}
