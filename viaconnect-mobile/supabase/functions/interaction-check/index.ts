import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { ok, err } from '../_shared/response.ts';
import { getSupabaseAdmin, getUserId } from '../_shared/supabase-admin.ts';
import { writeAudit } from '../_shared/audit.ts';
import { z } from '../_shared/validate.ts';

// ── CYP450 enzyme pathway database ──────────────────────────────────────
// Maps medications and supplements to the CYP450 enzymes they interact with
const CYP_PATHWAYS = ['CYP1A2', 'CYP2D6', 'CYP3A4', 'CYP2C19'] as const;

interface DrugEnzymeProfile {
  substrate?: string[];
  inhibitor?: string[];
  inducer?: string[];
}

// Common medication CYP profiles (simplified clinical reference)
const MEDICATION_CYP: Record<string, DrugEnzymeProfile> = {
  warfarin:       { substrate: ['CYP2C19', 'CYP3A4'] },
  omeprazole:     { substrate: ['CYP2C19', 'CYP3A4'], inhibitor: ['CYP2C19'] },
  metoprolol:     { substrate: ['CYP2D6'] },
  simvastatin:    { substrate: ['CYP3A4'] },
  clopidogrel:    { substrate: ['CYP2C19'] },
  fluoxetine:     { substrate: ['CYP2D6'], inhibitor: ['CYP2D6'] },
  sertraline:     { substrate: ['CYP2D6', 'CYP3A4'], inhibitor: ['CYP2D6'] },
  alprazolam:     { substrate: ['CYP3A4'] },
  caffeine:       { substrate: ['CYP1A2'] },
  theophylline:   { substrate: ['CYP1A2'] },
  codeine:        { substrate: ['CYP2D6'] },
  tramadol:       { substrate: ['CYP2D6', 'CYP3A4'] },
  amitriptyline:  { substrate: ['CYP2D6', 'CYP2C19'] },
  metformin:      {},
  lisinopril:     {},
  levothyroxine:  {},
  amlodipine:     { substrate: ['CYP3A4'] },
};

// FarmCeutica supplement CYP profiles
const SUPPLEMENT_CYP: Record<string, DrugEnzymeProfile> = {
  'MTHFR+':         {},
  'COMT+':          { inhibitor: ['CYP1A2'] },
  'FOCUS+':         { inhibitor: ['CYP2D6'] },
  'BLAST+':         { inducer: ['CYP1A2'] },
  'SHRED+':         {},
  'NAD+':           {},
  'Vitamin D3':     { inducer: ['CYP3A4'] },
  'Curcumin':       { inhibitor: ['CYP1A2', 'CYP2D6', 'CYP3A4'] },
  'St. Johns Wort': { inducer: ['CYP3A4', 'CYP2C19', 'CYP1A2'] },
  'Quercetin':      { inhibitor: ['CYP3A4', 'CYP2C19'] },
  'Green Tea':      { inhibitor: ['CYP3A4'] },
  'Grapefruit':     { inhibitor: ['CYP3A4'] },
  'Milk Thistle':   { inhibitor: ['CYP2C19', 'CYP3A4'] },
  'Ashwagandha':    { inducer: ['CYP3A4'] },
  'Valerian':       { inhibitor: ['CYP3A4'] },
};

// Pharmacodynamic interactions
const PD_INTERACTIONS: Array<{
  medication: string;
  supplement: string;
  severity: 'minor' | 'moderate' | 'major';
  mechanism: string;
  recommendation: string;
}> = [
  { medication: 'warfarin', supplement: 'Vitamin D3', severity: 'minor', mechanism: 'Possible mild effect on vitamin K metabolism', recommendation: 'Monitor INR; generally safe at standard doses' },
  { medication: 'warfarin', supplement: 'Curcumin', severity: 'major', mechanism: 'Curcumin has antiplatelet properties that compound warfarin anticoagulation', recommendation: 'Avoid combination or use under strict medical supervision with INR monitoring' },
  { medication: 'warfarin', supplement: 'Green Tea', severity: 'moderate', mechanism: 'Green tea contains vitamin K which antagonizes warfarin', recommendation: 'Maintain consistent green tea intake; monitor INR' },
  { medication: 'fluoxetine', supplement: 'St. Johns Wort', severity: 'major', mechanism: 'Risk of serotonin syndrome via additive serotonergic activity', recommendation: 'Contraindicated — do not combine' },
  { medication: 'sertraline', supplement: 'St. Johns Wort', severity: 'major', mechanism: 'Risk of serotonin syndrome', recommendation: 'Contraindicated — do not combine' },
  { medication: 'simvastatin', supplement: 'Grapefruit', severity: 'major', mechanism: 'Grapefruit inhibits CYP3A4, causing dangerous statin accumulation', recommendation: 'Avoid grapefruit or switch to a statin not metabolized by CYP3A4' },
  { medication: 'levothyroxine', supplement: 'Curcumin', severity: 'moderate', mechanism: 'Curcumin may reduce absorption of levothyroxine', recommendation: 'Separate administration by at least 4 hours' },
  { medication: 'metformin', supplement: 'MTHFR+', severity: 'minor', mechanism: 'Metformin may deplete B12/folate; MTHFR+ provides methylfolate supplementation', recommendation: 'Beneficial combination — helps offset metformin-related B12 depletion' },
];

// Nutrient depletion effects
const NUTRIENT_DEPLETIONS: Record<string, string[]> = {
  metformin:    ['Vitamin B12', 'Folate', 'CoQ10'],
  omeprazole:   ['Magnesium', 'Vitamin B12', 'Calcium'],
  fluoxetine:   ['Melatonin'],
  simvastatin:  ['CoQ10'],
  metoprolol:   ['CoQ10', 'Melatonin'],
  lisinopril:   ['Zinc'],
  amlodipine:   ['CoQ10'],
};

const InputSchema = z.object({
  medications: z.array(z.string().min(1)).min(1),
  supplements: z.array(z.string().min(1)).min(1),
  geneticProfile: z
    .object({
      cyp1a2: z.string().optional(),
      cyp2d6: z.string().optional(),
      cyp3a4: z.string().optional(),
      cyp2c19: z.string().optional(),
    })
    .optional(),
});

type Severity = 'minor' | 'moderate' | 'major';

interface InteractionResult {
  medication: string;
  supplement: string;
  severity: Severity;
  mechanism: string;
  recommendation: string;
  type: 'cyp450' | 'pharmacodynamic' | 'nutrient_depletion';
  affectedPathways?: string[];
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const userId = await getUserId(req);
    if (!userId) return err('Unauthorized', 'AUTH_REQUIRED', 401);

    const body = await req.json();
    const parsed = InputSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0].message, 'VALIDATION_ERROR');
    }
    const { medications, supplements, geneticProfile } = parsed.data;
    const admin = getSupabaseAdmin();

    const interactions: InteractionResult[] = [];

    // If genetic profile provided, check metabolizer status
    const metabolizerStatus: Record<string, string> = {};
    if (geneticProfile) {
      if (geneticProfile.cyp1a2) metabolizerStatus['CYP1A2'] = geneticProfile.cyp1a2;
      if (geneticProfile.cyp2d6) metabolizerStatus['CYP2D6'] = geneticProfile.cyp2d6;
      if (geneticProfile.cyp3a4) metabolizerStatus['CYP3A4'] = geneticProfile.cyp3a4;
      if (geneticProfile.cyp2c19) metabolizerStatus['CYP2C19'] = geneticProfile.cyp2c19;
    } else {
      // Try to fetch from DB
      const { data: variants } = await admin
        .from('genetic_variants')
        .select('rsid, genotype, risk_level')
        .eq('user_id', userId)
        .in('rsid', ['rs762551', 'rs1800497', 'rs2740574', 'rs4244285']);

      if (variants) {
        for (const v of variants) {
          if (v.rsid === 'rs762551') metabolizerStatus['CYP1A2'] = v.risk_level ?? 'normal';
          if (v.rsid === 'rs1800497') metabolizerStatus['CYP2D6'] = v.risk_level ?? 'normal';
          if (v.rsid === 'rs2740574') metabolizerStatus['CYP3A4'] = v.risk_level ?? 'normal';
          if (v.rsid === 'rs4244285') metabolizerStatus['CYP2C19'] = v.risk_level ?? 'normal';
        }
      }
    }

    for (const med of medications) {
      const medKey = med.toLowerCase().trim();
      const medProfile = MEDICATION_CYP[medKey];

      for (const supp of supplements) {
        const suppProfile = SUPPLEMENT_CYP[supp] ?? {};

        // 1. CYP450 pathway conflicts
        for (const pathway of CYP_PATHWAYS) {
          const medIsSubstrate = medProfile?.substrate?.includes(pathway);
          const suppIsInhibitor = suppProfile.inhibitor?.includes(pathway);
          const suppIsInducer = suppProfile.inducer?.includes(pathway);

          if (medIsSubstrate && suppIsInhibitor) {
            const isPoorMetabolizer =
              metabolizerStatus[pathway] === 'high' ||
              metabolizerStatus[pathway] === 'moderate';
            const severity: Severity = isPoorMetabolizer ? 'major' : 'moderate';

            interactions.push({
              medication: med,
              supplement: supp,
              severity,
              mechanism: `${supp} inhibits ${pathway}, which metabolizes ${med}. This may increase ${med} blood levels.${isPoorMetabolizer ? ` Patient is a ${metabolizerStatus[pathway]}-risk ${pathway} metabolizer — elevated concern.` : ''}`,
              recommendation: `Monitor for ${med} side effects. Consider dose adjustment or alternative supplement.`,
              type: 'cyp450',
              affectedPathways: [pathway],
            });
          }

          if (medIsSubstrate && suppIsInducer) {
            interactions.push({
              medication: med,
              supplement: supp,
              severity: 'moderate',
              mechanism: `${supp} induces ${pathway}, which metabolizes ${med}. This may decrease ${med} effectiveness.`,
              recommendation: `Monitor ${med} efficacy. May need dose increase under medical supervision.`,
              type: 'cyp450',
              affectedPathways: [pathway],
            });
          }
        }

        // 2. Pharmacodynamic interactions
        const pdMatch = PD_INTERACTIONS.find(
          (pd) =>
            pd.medication === medKey &&
            pd.supplement.toLowerCase() === supp.toLowerCase(),
        );
        if (pdMatch) {
          interactions.push({
            medication: med,
            supplement: supp,
            severity: pdMatch.severity,
            mechanism: pdMatch.mechanism,
            recommendation: pdMatch.recommendation,
            type: 'pharmacodynamic',
          });
        }

        // 3. Nutrient depletion effects
        const depletions = NUTRIENT_DEPLETIONS[medKey];
        if (depletions) {
          const suppMatchesDepletion = depletions.some(
            (d) => supp.toLowerCase().includes(d.toLowerCase()),
          );
          if (suppMatchesDepletion) {
            interactions.push({
              medication: med,
              supplement: supp,
              severity: 'minor',
              mechanism: `${med} depletes nutrients that ${supp} supplements. This is a beneficial pairing.`,
              recommendation: `Continue ${supp} — it helps offset ${med}-related nutrient depletion.`,
              type: 'nutrient_depletion',
            });
          }
        }
      }
    }

    // Sort by severity
    const severityOrder: Record<string, number> = { major: 0, moderate: 1, minor: 2 };
    interactions.sort(
      (a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99),
    );

    await writeAudit({
      userId,
      action: 'interaction_check',
      tableName: 'genetic_variants',
      recordId: userId,
      newData: {
        medications,
        supplements,
        interactionsFound: interactions.length,
        majorInteractions: interactions.filter((i) => i.severity === 'major').length,
      },
    });

    return ok({
      interactions,
      summary: {
        total: interactions.length,
        major: interactions.filter((i) => i.severity === 'major').length,
        moderate: interactions.filter((i) => i.severity === 'moderate').length,
        minor: interactions.filter((i) => i.severity === 'minor').length,
      },
      metabolizerStatus,
    });
  } catch (e) {
    return err(
      e instanceof Error ? e.message : 'Internal server error',
      'INTERNAL_ERROR',
      500,
    );
  }
});
