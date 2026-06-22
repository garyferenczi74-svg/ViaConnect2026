/**
 * src/lib/protocol/synthesis.ts
 *
 * Per-user protocol synthesis engine -- Gate B capstone.
 * Prompt 208, Phase 4, Task 12 (2026-06-21).
 *
 * Loads the user's genetic variants + current supplements, applies PUBLISHED
 * rules via ruleMatchesGenotype, runs every candidate through the real safety
 * interlocks (runInterlocks), and writes one user_protocol_synthesis row.
 *
 * Algorithm (ref: task-12-brief.md):
 *   1. Load user_variants + user_current_supplements (admin client, service role).
 *      If user has no variants: continue and return a valid empty SynthesisOutput.
 *   2. getPublishedRules() -> filter APPLICABLE rules by ruleMatchesGenotype.
 *   3. userRiskRsids = rsids of all applicable rules (feeds interlocks).
 *   4. Build ONE shared InterlockContext.
 *   5. For each applicable rule, by action_type:
 *        prefer_form  -> candidate + runInterlocks -> push to recommended if
 *                        passed AND evidence_tier in [1,2].
 *                        Also flag current supplement if it matches flagged_form.
 *        contraindicate -> flag current supplement if it matches flagged_form.
 *        any rule     -> append avoid_list items (dedup).
 *                        append recommended_form to prefer (dedup).
 *                        append gene/rsid to arnold_context.activeTopics (dedup).
 *   6. ALWAYS set candidate.nutrient via canonicalNutrientKey.
 *   7. Write user_protocol_synthesis row (check error, do not throw).
 *   8. Return SynthesisOutput.
 *
 * No em/en-dashes. No emojis. No live DB writes in tests (mock admin).
 * No package.json changes. Reads PUBLISHED data only. Never re-implements
 * interlock logic -- always calls runInterlocks.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { getPublishedRules, ruleMatchesGenotype } from '@/lib/kb/snpProtocolRules';
import { CONSUMER_TIERS } from '@/lib/kb/evidenceTier';
// runInterlocks is now called via runSafetyGates (I2 extension); kept as type source only.
import type { InterlockContext, ProtocolCandidate } from '@/lib/protocol/safetyInterlocks';
import { nutritionByGeneticsFromRules } from '@/lib/agents/gordon/nutritionByGenetics';
import { safeLog } from '@/lib/utils/safe-log';
import { getQualifiedUserVariants } from '@/lib/genetics/qc/qualifiedVariants';
// === PROMPT 208a EXTENSION START ===
import { computeAndPersistPathways } from '@/lib/genetics/pathways/persistPathways';
import type { PathwayScore } from '@/lib/genetics/pathways/pathwayScore';
// === PROMPT 208a EXTENSION END ===
// === PROMPT 208a E4b EXTENSION START ===
import { computeAndPersistConcordance } from '@/lib/labs/persistConcordance';
import type { ConcordanceRecord } from '@/lib/labs/concordance';
// === PROMPT 208a E4b EXTENSION END ===
// === PROMPT 208a F4 EXTENSION START ===
import { getLatestUserHealthContext } from '@/lib/protocol/healthContext';
import { depletionsForMedications } from '@/lib/protocol/drugNutrientDepletions';
import { screenAllergens, goalRank } from '@/lib/protocol/phenotypeEnrich';
// === PROMPT 208a F4 EXTENSION END ===
// === PROMPT 208a I2 EXTENSION START ===
import { runSafetyGates, type SafetyGateContext } from '@/lib/protocol/safetyGates';
import { getSecondaryFindingsGenes, isSecondaryFindingGene } from '@/lib/kb/secondaryFindings';
// === PROMPT 208a I2 EXTENSION END ===
// === PROMPT 208a I3 EXTENSION START ===
import { getActivePublishedRules } from '@/lib/kb/ruleKillswitch';
// === PROMPT 208a I3 EXTENSION END ===
// === PROMPT 208a C2 EXTENSION START ===
import { getUserAncestry, populationCaveatFor } from '@/lib/genetics/ancestry/populationMatch';
import type { PopulationCaveat } from '@/lib/genetics/ancestry/populationMatch';
// === PROMPT 208a C2 EXTENSION END ===

// ---------------------------------------------------------------------------
// Public constants
// ---------------------------------------------------------------------------

export const DISCLAIMERS_VERSION = 'dshea-2026-06';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface RecommendedItem {
  form: string;
  rationale: string;
  evidenceTier: number;
  ruleRsid: string;
}

export interface SupplementFlag {
  current: string;
  reason: string;
  alternativeForm: string | null;
  ruleRsid: string;
  evidenceTier: number;
}

export interface SynthesisOutput {
  recommended_vitamins_minerals: RecommendedItem[];
  supplement_flags: SupplementFlag[];
  nutrition_guidance: {
    avoid: string[];
    prefer: string[];
  };
  arnold_context: {
    activeTopics: string[];
  };
  disclaimers_version: string;
  // === PROMPT 208a EXTENSION START ===
  // Additive informational pathway context (Module D). Never gates an interlock.
  pathway_context?: PathwayScore[];
  // === PROMPT 208a EXTENSION END ===
  // === PROMPT 208a E4b EXTENSION START ===
  // Additive informational concordance context (Module E). Never gates an interlock.
  concordance_context?: ConcordanceRecord[];
  // === PROMPT 208a E4b EXTENSION END ===
  // === PROMPT 208a I2 EXTENSION START ===
  // Additive secondary-findings routing (Module I). SF-gene variants never drive a
  // protocol item; they are listed here with routing 'genetic_counseling'.
  secondary_findings_routing?: { gene: string; routing: string }[];
  // === PROMPT 208a I2 EXTENSION END ===
  // === PROMPT 208a C2 EXTENSION START ===
  // Additive informational population caveats (Module C). Never gates an interlock.
  // Present only when a rule was validated in a specific population that differs
  // from the user's known ancestry. Empty or absent when ancestry is unknown or matches.
  population_caveats?: PopulationCaveat[];
  // === PROMPT 208a C2 EXTENSION END ===
}

// ---------------------------------------------------------------------------
// canonicalNutrientKey
//
// Maps a supplement label or form name to a canonical nutrient key used by the
// UL table and the contraindication interlock. ALWAYS set candidate.nutrient
// via this function so iron cannot be evaded by product labeling.
//
// Mapping rules:
//   - 'iron' / 'ferrous sulfate' / 'ferrous bisglycinate' / anything
//     containing 'iron' or 'ferrous' -> 'iron'
//   - 'folic acid' -> 'folic_acid'
//   - 'vitamin d' / 'cholecalciferol' / anything starting 'vitamin d' -> 'vitamin_d'
//   - otherwise -> undefined
// ---------------------------------------------------------------------------
export function canonicalNutrientKey(formOrLabel: string): string | undefined {
  if (!formOrLabel || formOrLabel.trim().length === 0) return undefined;

  const lower = formOrLabel.toLowerCase().trim();

  if (lower.includes('iron') || lower.includes('ferrous')) {
    return 'iron';
  }

  if (lower === 'folic acid' || lower.startsWith('folic acid')) {
    return 'folic_acid';
  }

  if (lower === 'vitamin d' || lower.startsWith('vitamin d') || lower === 'cholecalciferol') {
    return 'vitamin_d';
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// synthesizeForUser
// ---------------------------------------------------------------------------

export async function synthesizeForUser(userId: string): Promise<SynthesisOutput> {
  const supabase = createAdminClient();

  // -------------------------------------------------------------------------
  // Step 1: Load user_variants (QC-gated: excludes unresolved orientation /
  // no-call variants; legacy variants with no QC row still pass; fail-open).
  // is_sample exclusion is preserved inside getQualifiedUserVariants.
  // -------------------------------------------------------------------------
  let userVariants: Array<{ rsid: string; genotype: string }> = [];
  try {
    const variantRows = await getQualifiedUserVariants(userId);
    if (variantRows && variantRows.length > 0) {
      userVariants = variantRows as Array<{ rsid: string; genotype: string }>;
    }
    // If variantRows is empty: no variants -> valid empty output path
  } catch (err) {
    safeLog.error('synthesis', 'user_variants query threw; continuing with empty variants', {
      userId,
      err,
    });
  }

  // -------------------------------------------------------------------------
  // Step 1b: Load current supplements
  // -------------------------------------------------------------------------
  let currentSupplementNames: string[] = [];
  try {
    const { data: suppData, error: suppError } = await supabase
      .from('user_current_supplements')
      .select('supplement_name, product_name, is_current, is_ai_recommended')
      .eq('user_id', userId)
      .eq('is_current', true);

    if (suppError) {
      safeLog.warn('synthesis', 'Failed to load current supplements; continuing with empty stack', {
        userId,
        error: suppError,
      });
    } else if (suppData && suppData.length > 0) {
      currentSupplementNames = (
        suppData as Array<{ supplement_name: string }>
      ).map((s) => s.supplement_name).filter(Boolean);
    }
  } catch (err) {
    safeLog.error('synthesis', 'user_current_supplements query threw; continuing with empty stack', {
      userId,
      err,
    });
  }

  // -------------------------------------------------------------------------
  // Step 2: Load PUBLISHED rules and find APPLICABLE rules
  // -------------------------------------------------------------------------
  // === PROMPT 208a I3 EXTENSION START ===
  // getActivePublishedRules wraps getPublishedRules + filters out killed rule ids.
  // Fail-open: if the killswitch read fails, getActivePublishedRules returns the
  // full published set (empty killed set -> all rules pass). getPublishedRules
  // itself is unchanged.
  const allRules = await getActivePublishedRules();
  // === PROMPT 208a I3 EXTENSION END ===

  // Build a lookup: rsid -> user genotype
  const variantByRsid: Record<string, string> = {};
  for (const v of userVariants) {
    variantByRsid[v.rsid] = v.genotype;
  }

  // APPLICABLE: user has a variant at rule.rsid whose genotype satisfies the rule
  const applicableRules = allRules.filter((rule) => {
    const userGenotype = variantByRsid[rule.rsid];
    if (!userGenotype) return false;
    return ruleMatchesGenotype(rule, userGenotype);
  });

  // -------------------------------------------------------------------------
  // Step 3: userRiskRsids (feeds interlock 1)
  // -------------------------------------------------------------------------
  const userRiskRsids = [...new Set(applicableRules.map((r) => r.rsid))];

  // === PROMPT 208a I2 EXTENSION START ===
  // Step 3b: Load secondary-findings gene set and health-context (both fail-open).
  // SF gene set: variants in this set NEVER drive a protocol item.
  // hcEarly: pregnancy + age fields for SafetyGateContext (fail-open empty shape).
  let sfGenes: Set<string> = new Set();
  try {
    sfGenes = await getSecondaryFindingsGenes();
  } catch {
    // fail-open: sfGenes stays empty
  }

  // Filter applicableRules: exclude any rule whose gene is in the SF set.
  // Collect excluded SF genes for the output routing field.
  const sfRoutingGenes = new Set<string>();
  const rulesAfterSfFilter = applicableRules.filter((rule) => {
    if (isSecondaryFindingGene(rule.gene ?? null, sfGenes)) {
      if (rule.gene) sfRoutingGenes.add(rule.gene.trim().toUpperCase());
      return false;
    }
    return true;
  });

  // Early health-context load to get pregnancy + age for SafetyGateContext.
  // The F4 block below also calls getLatestUserHealthContext; this first call
  // is only for the gate fields. The full hc is loaded again in F4 (fail-open,
  // idempotent read).
  let hcEarly: { pregnancyStatus: string | null; age: number | null } = {
    pregnancyStatus: null,
    age: null,
  };
  try {
    const hcFull = await getLatestUserHealthContext(userId);
    hcEarly = { pregnancyStatus: hcFull.pregnancyStatus, age: hcFull.age };
  } catch {
    // fail-open: hcEarly stays null/null
  }

  // Determine pregnant flag: true if pregnancyStatus is a pregnant/lactating value.
  const PREGNANT_VALUES = ['pregnant', 'lactating', 'breastfeeding', 'nursing'];
  const isPregnant: boolean =
    typeof hcEarly.pregnancyStatus === 'string' &&
    PREGNANT_VALUES.some((v) => hcEarly.pregnancyStatus!.toLowerCase().includes(v));
  // === PROMPT 208a I2 EXTENSION END ===

  // -------------------------------------------------------------------------
  // Step 4: Build shared InterlockContext
  // -------------------------------------------------------------------------
  const ctx: InterlockContext = {
    userRiskRsids,
    rules: applicableRules,
    currentStack: [],
    currentSupplements: currentSupplementNames,
    medications: [],
    cypStatusMap: {},
    consentedSensitiveTopics: [],
    disclaimerVersion: DISCLAIMERS_VERSION,
  };

  // === PROMPT 208a I2 EXTENSION START ===
  // Build the SafetyGateContext (superset of InterlockContext).
  // proposedCount is updated before each call to runSafetyGates.
  const gateCtx: SafetyGateContext = {
    ...ctx,
    pregnant: isPregnant,
    age: hcEarly.age,
    proposedCount: 0,
  };
  // === PROMPT 208a I2 EXTENSION END ===

  // -------------------------------------------------------------------------
  // Step 5: Process each applicable rule
  // -------------------------------------------------------------------------
  let recommendedItems: RecommendedItem[] = [];
  const supplementFlags: SupplementFlag[] = [];
  const topicsSet = new Set<string>();

  // === PROMPT 208a I2 EXTENSION START ===
  // Use rulesAfterSfFilter (SF-gene variants excluded); topicsSet and supplementFlags
  // still built from the SF-filtered rule set only.
  // === PROMPT 208a I2 EXTENSION END ===
  for (const rule of rulesAfterSfFilter) {
    // --- arnold_context.activeTopics (all rules) ---
    const topic = (rule.gene && rule.gene.trim().length > 0) ? rule.gene.trim() : rule.rsid;
    topicsSet.add(topic);

    if (rule.action_type === 'prefer_form') {
      // Build candidate; ALWAYS set nutrient via canonicalNutrientKey
      const candidate: ProtocolCandidate = {
        label: rule.recommended_form ?? '',
        nutrient: rule.recommended_form ? canonicalNutrientKey(rule.recommended_form) : undefined,
        supplementName: rule.recommended_form ?? undefined,
      };

      // === PROMPT 208a I2 EXTENSION START ===
      // Update proposedCount before the gate call so polypharmacy cap is accurate.
      gateCtx.proposedCount = recommendedItems.length;
      const result = runSafetyGates(candidate, gateCtx);
      // === PROMPT 208a I2 EXTENSION END ===

      const tier = rule.evidence_tier;
      const isConsumerTier = tier !== undefined && (CONSUMER_TIERS as readonly number[]).includes(tier);

      if (result.passed && isConsumerTier) {
        recommendedItems.push({
          form: rule.recommended_form ?? '',
          rationale: rule.effect ?? '',
          evidenceTier: tier as number,
          ruleRsid: rule.rsid,
        });
      }

      // Flag current supplement if it matches flagged_form (case-insensitive)
      if (rule.flagged_form) {
        const flaggedLower = rule.flagged_form.toLowerCase();
        const matchedSupplement = currentSupplementNames.find(
          (s) => s.toLowerCase() === flaggedLower,
        );
        if (matchedSupplement) {
          supplementFlags.push({
            current: matchedSupplement,
            reason: 'flagged for this variant',
            alternativeForm: rule.recommended_form ?? null,
            ruleRsid: rule.rsid,
            evidenceTier: tier ?? 2,
          });
        }
      }
    } else if (rule.action_type === 'contraindicate') {
      // Flag current supplement if it matches flagged_form (case-insensitive)
      if (rule.flagged_form) {
        const flaggedLower = rule.flagged_form.toLowerCase();
        const matchedSupplement = currentSupplementNames.find(
          (s) => s.toLowerCase() === flaggedLower,
        );
        if (matchedSupplement) {
          supplementFlags.push({
            current: matchedSupplement,
            reason: 'contraindicated for this variant',
            alternativeForm: null,
            ruleRsid: rule.rsid,
            evidenceTier: rule.evidence_tier ?? 1,
          });
        }
      }
    }
    // Other action_types (dose_context, monitor_biomarker, practitioner_only):
    // nutrition_guidance + arnold_context already handled above
  }

  // === PROMPT 208a F4 EXTENSION START ===
  // Post-processing: allergen screen, depletion repletion, goal weighting.
  // Runs AFTER recommendedItems is fully built, BEFORE the output object.
  // Existing candidate-building + interlock logic is UNCHANGED (fenced only).
  // Fail-open throughout: any error leaves recommendedItems as-is.
  {
    let hc: { allergies: string[]; medications: string[]; goals: string[] } = {
      allergies: [],
      medications: [],
      goals: [],
    };
    try {
      hc = await getLatestUserHealthContext(userId);
    } catch {
      // fail-open: hc stays empty
    }

    // Step F4-2: DEPLETION REPLETION
    // Build a candidate for each depleted nutrient and run through the SAME
    // runInterlocks (so a contraindicated repletion is dropped).
    try {
      const repletions = depletionsForMedications(hc.medications);
      // Track which nutrients are already recommended to avoid duplicates.
      const alreadyRecommended = new Set(
        recommendedItems.map((i) => i.form.toLowerCase()),
      );

      for (const r of repletions) {
        const nutrientLower = r.depletedNutrient.toLowerCase();
        if (alreadyRecommended.has(nutrientLower)) continue;

        const candidate: ProtocolCandidate = {
          label: r.depletedNutrient,
          nutrient: canonicalNutrientKey(r.depletedNutrient),
          supplementName: r.depletedNutrient,
        };

        // === PROMPT 208a I2 EXTENSION START ===
        // Update proposedCount before the gate call so polypharmacy cap is accurate.
        gateCtx.proposedCount = recommendedItems.length;
        const result = runSafetyGates(candidate, gateCtx);
        // === PROMPT 208a I2 EXTENSION END ===
        if (result.passed) {
          recommendedItems.push({
            form: r.depletedNutrient,
            rationale: `Repletion consideration for ${r.medication}`,
            evidenceTier: r.evidenceTier,
            ruleRsid: `depletion:${r.medication}`,
          });
          alreadyRecommended.add(nutrientLower);
        }
      }
    } catch {
      // fail-open: repletion step skipped
    }

    // Step F4-3: ALLERGEN SCREEN (applied LAST, hard safety exclusion)
    try {
      recommendedItems = screenAllergens(recommendedItems, hc.allergies);
    } catch {
      // fail-open: screen skipped
    }

    // Step F4-4: GOAL WEIGHTING (stable-sort descending by goal relevance)
    // When goals is empty goalRank returns 0 for all -> no reorder.
    try {
      if (hc.goals.length > 0) {
        const goals = hc.goals;
        // Stable sort: pair each item with its original index, sort, extract.
        recommendedItems = recommendedItems
          .map((item, idx) => ({ item, rank: goalRank(item.form, goals), idx }))
          .sort((a, b) => b.rank - a.rank || a.idx - b.idx)
          .map(({ item }) => item);
      }
    } catch {
      // fail-open: unsorted order preserved
    }
  }
  // === PROMPT 208a F4 EXTENSION END ===

  // -------------------------------------------------------------------------
  // Step 7: Write user_protocol_synthesis row
  // -------------------------------------------------------------------------
  // Use Gordon's translator as the single source of truth for nutrition_guidance.
  // This includes flagged_form items in the avoid list (more correct than the
  // prior inline construction) and keeps the two surfaces in sync.
  // === PROMPT 208a I2 EXTENSION START ===
  // Use rulesAfterSfFilter so SF-gene variants do not drive nutrition guidance either.
  // === PROMPT 208a I2 EXTENSION END ===
  const nutritionGuidance = nutritionByGeneticsFromRules(rulesAfterSfFilter);

  const output: SynthesisOutput = {
    recommended_vitamins_minerals: recommendedItems,
    supplement_flags: supplementFlags,
    nutrition_guidance: nutritionGuidance,
    arnold_context: {
      activeTopics: [...topicsSet],
    },
    disclaimers_version: DISCLAIMERS_VERSION,
    // === PROMPT 208a I2 EXTENSION START ===
    // List SF-gene variants that were excluded from rule application.
    // routing 'genetic_counseling' is the standard routing action for SF genes.
    secondary_findings_routing: sfRoutingGenes.size > 0
      ? [...sfRoutingGenes].map((gene) => ({ gene, routing: 'genetic_counseling' }))
      : undefined,
    // === PROMPT 208a I2 EXTENSION END ===
  };

  try {
    const { error: insertError } = await supabase.from('user_protocol_synthesis').insert([
      {
        user_id: userId,
        recommended_vitamins_minerals: output.recommended_vitamins_minerals,
        supplement_flags: output.supplement_flags,
        nutrition_guidance: output.nutrition_guidance,
        arnold_context: output.arnold_context,
        disclaimers_version: DISCLAIMERS_VERSION,
      },
    ]);

    if (insertError) {
      safeLog.error('synthesis', 'Failed to write user_protocol_synthesis row', {
        userId,
        error: insertError,
      });
      // Still return the computed output -- do not throw
    }
  } catch (err) {
    safeLog.error('synthesis', 'user_protocol_synthesis insert threw', { userId, err });
    // Still return the computed output
  }

  // === PROMPT 208a EXTENSION START ===
  // Module D: enrich the output with composite pathway context (informational;
  // never gates an interlock). computeAndPersistPathways is fail-open (returns []
  // on any error), so this cannot break synthesis.
  output.pathway_context = await computeAndPersistPathways(userId);
  // === PROMPT 208a EXTENSION END ===
  // === PROMPT 208a E4b EXTENSION START ===
  // Module E: enrich the output with genotype-phenotype concordance context
  // (informational; never gates an interlock). computeAndPersistConcordance is
  // fail-open (returns [] on any error), so this cannot break synthesis.
  output.concordance_context = await computeAndPersistConcordance(userId);
  // === PROMPT 208a E4b EXTENSION END ===
  // === PROMPT 208a C2 EXTENSION START ===
  // Module C: enrich the output with cross-population caveats (informational;
  // never gates or removes a rule or an interlock). getUserAncestry is fail-open
  // (returns [] on any error). When userAncestry is [] (unknown), populationCaveatFor
  // returns null for every rule -> population_caveats will be [] -> no unfair
  // penalization of users whose ancestry we do not know.
  try {
    const userAncestry = await getUserAncestry(userId);
    const populationCaveats = rulesAfterSfFilter
      .map((r) => populationCaveatFor(r, userAncestry))
      .filter((c): c is PopulationCaveat => c !== null);
    output.population_caveats = populationCaveats;
  } catch {
    // fail-open: population_caveats left undefined, synthesis continues
  }
  // === PROMPT 208a C2 EXTENSION END ===

  // -------------------------------------------------------------------------
  // Step 8: Return
  // -------------------------------------------------------------------------
  return output;
}
