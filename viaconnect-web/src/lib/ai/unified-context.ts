// Unified AI Data Context Builder
// Assembles the complete data picture from ALL sources for any AI engine.
// Every engine calls this instead of individual queries.

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
