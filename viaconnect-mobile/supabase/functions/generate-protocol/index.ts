import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { ok, err } from '../_shared/response.ts';
import { getSupabaseAdmin, getUserId } from '../_shared/supabase-admin.ts';
import { writeAudit } from '../_shared/audit.ts';
import { z } from '../_shared/validate.ts';

// ── 12-Pathway Clinical Pathway Analysis Engine ──────────────────────────
const PATHWAYS = [
  'Methylation',
  'Detoxification',
  'Inflammation',
  'Neurotransmitter',
  'Hormone',
  'Immune',
  'Cardiovascular',
  'Mitochondrial',
  'Gut',
  'Bone',
  'Skin',
  'Sleep',
] as const;

// Map pathways → FarmCeutica product recommendations with dosing
const PATHWAY_PRODUCTS: Record<
  string,
  Array<{ sku: string; name: string; dosing: string; priority: number; conditions?: string[] }>
> = {
  Methylation: [
    { sku: 'VIA-MTHFR-PLUS', name: 'MTHFR+', dosing: '1 capsule daily with food', priority: 1, conditions: ['mthfr_risk'] },
    { sku: 'VIA-B-COMPLEX', name: 'B-Complex Active', dosing: '1 capsule daily', priority: 2 },
  ],
  Detoxification: [
    { sku: 'VIA-COMT-PLUS', name: 'COMT+', dosing: '1 capsule twice daily', priority: 1, conditions: ['comt_risk'] },
    { sku: 'VIA-LIVER-SUPPORT', name: 'Liver Support', dosing: '2 capsules daily with meals', priority: 2 },
    { sku: 'VIA-NAC', name: 'NAC+', dosing: '600mg twice daily', priority: 3 },
  ],
  Inflammation: [
    { sku: 'VIA-INFLAM-GUARD', name: 'InflamGuard', dosing: '2 capsules daily', priority: 1 },
    { sku: 'VIA-OMEGA-3', name: 'Omega-3 Ultra', dosing: '2 softgels daily with food', priority: 2 },
    { sku: 'VIA-CURCUMIN', name: 'Curcumin Elite', dosing: '500mg twice daily (10-27x bioavailability)', priority: 3 },
  ],
  Neurotransmitter: [
    { sku: 'VIA-FOCUS-PLUS', name: 'FOCUS+', dosing: '1 capsule morning', priority: 1 },
    { sku: 'VIA-BLAST-PLUS', name: 'BLAST+', dosing: '1 scoop pre-workout or morning', priority: 2 },
    { sku: 'VIA-CALM', name: 'Calm+', dosing: '2 capsules evening', priority: 3 },
  ],
  Hormone: [
    { sku: 'VIA-HORMONE-BALANCE', name: 'Hormone Balance', dosing: '1 capsule daily', priority: 1 },
    { sku: 'VIA-DIM', name: 'DIM Complex', dosing: '200mg daily', priority: 2 },
  ],
  Immune: [
    { sku: 'VIA-IMMUNE-SHIELD', name: 'Immune Shield', dosing: '2 capsules daily', priority: 1 },
    { sku: 'VIA-VIT-D3', name: 'Vitamin D3 5000 IU', dosing: '1 softgel daily with fat-containing meal', priority: 2 },
    { sku: 'VIA-ZINC', name: 'Zinc Picolinate', dosing: '30mg daily', priority: 3 },
  ],
  Cardiovascular: [
    { sku: 'VIA-CARDIO-GUARD', name: 'CardioGuard', dosing: '2 capsules daily', priority: 1 },
    { sku: 'VIA-COQ10', name: 'CoQ10 Ubiquinol', dosing: '200mg daily', priority: 2 },
    { sku: 'VIA-OMEGA-3', name: 'Omega-3 Ultra', dosing: '2 softgels daily', priority: 3 },
  ],
  Mitochondrial: [
    { sku: 'VIA-NAD-PLUS', name: 'NAD+', dosing: '250mg daily', priority: 1 },
    { sku: 'VIA-COQ10', name: 'CoQ10 Ubiquinol', dosing: '200mg daily', priority: 2 },
    { sku: 'VIA-PQQ', name: 'PQQ Complex', dosing: '20mg daily', priority: 3 },
  ],
  Gut: [
    { sku: 'VIA-GUT-RESTORE', name: 'Gut Restore', dosing: '1 capsule twice daily before meals', priority: 1 },
    { sku: 'VIA-PROBIOTIC', name: 'Probiotic 50B', dosing: '1 capsule daily', priority: 2 },
  ],
  Bone: [
    { sku: 'VIA-BONE-SUPPORT', name: 'Bone Support', dosing: '2 capsules daily with food', priority: 1 },
    { sku: 'VIA-VIT-D3', name: 'Vitamin D3 5000 IU', dosing: '1 softgel daily', priority: 2 },
    { sku: 'VIA-K2', name: 'Vitamin K2 MK-7', dosing: '100mcg daily', priority: 3 },
  ],
  Skin: [
    { sku: 'VIA-SKIN-GLOW', name: 'Skin Glow', dosing: '2 capsules daily', priority: 1 },
    { sku: 'VIA-COLLAGEN', name: 'Collagen Peptides', dosing: '10g daily in beverage', priority: 2 },
  ],
  Sleep: [
    { sku: 'VIA-SLEEP-PLUS', name: 'Sleep+', dosing: '2 capsules 30 min before bed', priority: 1 },
    { sku: 'VIA-MAGNESIUM', name: 'Magnesium Glycinate', dosing: '400mg evening', priority: 2 },
  ],
};

// Map genetic risk to relevant pathways
const GENE_PATHWAY_MAP: Record<string, string[]> = {
  mthfr:  ['Methylation'],
  comt:   ['Detoxification', 'Neurotransmitter'],
  cyp2d6: ['Detoxification'],
};

// Map assessment goals to pathways
const GOAL_PATHWAY_MAP: Record<string, string[]> = {
  energy:         ['Mitochondrial', 'Methylation'],
  sleep:          ['Sleep', 'Neurotransmitter'],
  focus:          ['Neurotransmitter'],
  weight:         ['Inflammation', 'Gut', 'Hormone'],
  immunity:       ['Immune'],
  heart_health:   ['Cardiovascular'],
  skin_health:    ['Skin'],
  bone_health:    ['Bone'],
  gut_health:     ['Gut'],
  stress:         ['Neurotransmitter', 'Hormone'],
  inflammation:   ['Inflammation'],
  detox:          ['Detoxification'],
  hormone_balance: ['Hormone'],
  longevity:      ['Mitochondrial', 'Inflammation', 'Cardiovascular'],
};

const InputSchema = z.object({
  userId: z.string().uuid(),
  geneticProfileId: z.string().uuid().optional(),
  assessmentId: z.string().uuid().optional(),
});

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const requesterId = await getUserId(req);
    if (!requesterId) return err('Unauthorized', 'AUTH_REQUIRED', 401);

    const body = await req.json();
    const parsed = InputSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0].message, 'VALIDATION_ERROR');
    }
    const { userId, geneticProfileId, assessmentId } = parsed.data;
    const admin = getSupabaseAdmin();

    // 1. Pull genetic data
    let geneticData: Record<string, unknown> | null = null;
    if (geneticProfileId) {
      const { data } = await admin
        .from('genetic_profiles')
        .select('*')
        .eq('id', geneticProfileId)
        .single();
      geneticData = data;
    } else {
      const { data } = await admin
        .from('genetic_profiles')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      geneticData = data;
    }

    // 2. Pull CAQ results
    let assessmentData: Record<string, unknown> | null = null;
    if (assessmentId) {
      const { data } = await admin
        .from('clinical_assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();
      assessmentData = data;
    } else {
      const { data } = await admin
        .from('clinical_assessments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      assessmentData = data;
    }

    // 3. Get existing medications
    const currentMedications = (assessmentData?.current_medications as string) ?? '';

    // 4. Determine relevant pathways based on genetics + goals
    const relevantPathways = new Set<string>();

    // From genetics
    if (geneticData) {
      const mthfrStatus = geneticData.mthfr_status as string;
      const comtStatus = geneticData.comt_status as string;
      const cyp2d6Status = geneticData.cyp2d6_status as string;

      if (mthfrStatus && mthfrStatus !== 'normal') {
        GENE_PATHWAY_MAP.mthfr.forEach((p) => relevantPathways.add(p));
      }
      if (comtStatus && comtStatus !== 'normal') {
        GENE_PATHWAY_MAP.comt.forEach((p) => relevantPathways.add(p));
      }
      if (cyp2d6Status && cyp2d6Status !== 'normal') {
        GENE_PATHWAY_MAP.cyp2d6.forEach((p) => relevantPathways.add(p));
      }
    }

    // From assessment goals
    if (assessmentData?.primary_goals) {
      const goals = assessmentData.primary_goals as string[];
      for (const goal of goals) {
        const goalKey = goal.toLowerCase().replace(/\s+/g, '_');
        const pathways = GOAL_PATHWAY_MAP[goalKey];
        if (pathways) pathways.forEach((p) => relevantPathways.add(p));
      }
    }

    // If no specific pathways identified, include core pathways
    if (relevantPathways.size === 0) {
      ['Methylation', 'Inflammation', 'Mitochondrial', 'Gut'].forEach((p) =>
        relevantPathways.add(p),
      );
    }

    // 5. Generate recommendations per pathway
    const recommendations: Array<{
      pathway: string;
      product_sku: string;
      product_name: string;
      dosing: string;
      rationale: string;
      priority: number;
    }> = [];

    for (const pathway of relevantPathways) {
      const products = PATHWAY_PRODUCTS[pathway] ?? [];
      for (const product of products) {
        // Check if product has genetic conditions
        if (product.conditions) {
          const meetsCondition = product.conditions.some((c) => {
            if (c === 'mthfr_risk') return geneticData?.mthfr_status !== 'normal';
            if (c === 'comt_risk') return geneticData?.comt_status !== 'normal';
            return true;
          });
          if (!meetsCondition) continue;
        }

        let rationale = `Recommended for ${pathway} pathway support.`;
        if (geneticData) {
          if (pathway === 'Methylation' && geneticData.mthfr_status !== 'normal') {
            rationale = `MTHFR variant detected (${geneticData.mthfr_status}). ${product.name} provides active methylfolate to support impaired methylation.`;
          }
          if (pathway === 'Detoxification' && geneticData.comt_status !== 'normal') {
            rationale = `COMT variant detected (${geneticData.comt_status}). ${product.name} supports phase II detoxification pathways.`;
          }
        }
        if (assessmentData?.primary_goals) {
          rationale += ` Aligned with patient goals: ${(assessmentData.primary_goals as string[]).join(', ')}.`;
        }

        recommendations.push({
          pathway,
          product_sku: product.sku,
          product_name: product.name,
          dosing: product.dosing,
          rationale,
          priority: product.priority,
        });
      }
    }

    // 6. Run interaction check on generated protocol
    let interactionWarnings: unknown[] = [];
    if (currentMedications && recommendations.length > 0) {
      const meds = currentMedications
        .split(/[,;]/)
        .map((m) => m.trim())
        .filter(Boolean);
      const supps = recommendations.map((r) => r.product_name);

      try {
        const interactionRes = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/interaction-check`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: req.headers.get('Authorization') ?? '',
            },
            body: JSON.stringify({
              medications: meds,
              supplements: supps,
            }),
          },
        );
        const interactionData = await interactionRes.json();
        if (interactionData.success) {
          interactionWarnings = interactionData.data.interactions ?? [];
        }
      } catch {
        // Interaction check failed — continue without it
      }
    }

    // 7. Write recommendations to DB
    const recInserts = recommendations.map((r, idx) => ({
      user_id: userId,
      sku: r.product_sku,
      product_name: r.product_name,
      category: r.pathway,
      reason: r.rationale,
      confidence_level: geneticData ? 'combined' : 'questionnaire',
      confidence_score: geneticData ? 82 : 68,
      priority_rank: idx + 1,
      dosage: r.dosing,
      frequency: 'daily',
      source: geneticData ? 'genetic' : 'caq',
      assessment_id: (assessmentData as Record<string, string>)?.id ?? null,
      status: 'recommended',
    }));

    if (recInserts.length > 0) {
      await admin.from('recommendations').insert(recInserts);
    }

    await writeAudit({
      userId: requesterId,
      action: 'generate_protocol',
      tableName: 'recommendations',
      recordId: userId,
      newData: {
        pathwaysAnalyzed: [...relevantPathways],
        recommendationsGenerated: recommendations.length,
        interactionWarnings: (interactionWarnings as unknown[]).length,
        geneticProfileId: (geneticData as Record<string, string>)?.id,
        assessmentId: (assessmentData as Record<string, string>)?.id,
      },
    });

    return ok({
      userId,
      pathwaysAnalyzed: [...relevantPathways],
      recommendations: recommendations.sort((a, b) => a.priority - b.priority),
      interactionWarnings,
      geneticProfile: geneticData
        ? {
            mthfr: (geneticData as Record<string, unknown>).mthfr_status,
            comt: (geneticData as Record<string, unknown>).comt_status,
            cyp2d6: (geneticData as Record<string, unknown>).cyp2d6_status,
          }
        : null,
      status: 'pending_review',
    });
  } catch (e) {
    return err(
      e instanceof Error ? e.message : 'Internal server error',
      'INTERNAL_ERROR',
      500,
    );
  }
});
