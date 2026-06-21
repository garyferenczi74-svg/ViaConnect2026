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
import { runInterlocks } from '@/lib/protocol/safetyInterlocks';
import type { InterlockContext, ProtocolCandidate } from '@/lib/protocol/safetyInterlocks';
import { safeLog } from '@/lib/utils/safe-log';

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
  // Step 1: Load user_variants
  // -------------------------------------------------------------------------
  let userVariants: Array<{ rsid: string; genotype: string }> = [];
  try {
    const { data: variantData, error: variantError } = await supabase
      .from('user_variants')
      .select('rsid, gene, genotype, panel_key, status')
      .eq('user_id', userId);

    if (variantError) {
      safeLog.warn('synthesis', 'Failed to load user_variants; continuing with empty variants', {
        userId,
        error: variantError,
      });
    } else if (variantData && variantData.length > 0) {
      userVariants = variantData as Array<{ rsid: string; genotype: string }>;
    }
    // If variantData is null or empty: no variants -> valid empty output path
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
  const allRules = await getPublishedRules();

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

  // -------------------------------------------------------------------------
  // Step 5: Process each applicable rule
  // -------------------------------------------------------------------------
  const recommendedItems: RecommendedItem[] = [];
  const supplementFlags: SupplementFlag[] = [];
  const avoidSet = new Set<string>();
  const preferSet = new Set<string>();
  const topicsSet = new Set<string>();

  for (const rule of applicableRules) {
    // --- nutrition_guidance: avoid_list (all rules) ---
    if (Array.isArray(rule.avoid_list)) {
      for (const item of rule.avoid_list) {
        if (item && item.trim().length > 0) avoidSet.add(item.trim());
      }
    }

    // --- nutrition_guidance: prefer (all rules with recommended_form) ---
    if (rule.recommended_form && rule.recommended_form.trim().length > 0) {
      preferSet.add(rule.recommended_form.trim());
    }

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

      const result = runInterlocks(candidate, ctx);

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

  // -------------------------------------------------------------------------
  // Step 7: Write user_protocol_synthesis row
  // -------------------------------------------------------------------------
  const output: SynthesisOutput = {
    recommended_vitamins_minerals: recommendedItems,
    supplement_flags: supplementFlags,
    nutrition_guidance: {
      avoid: [...avoidSet],
      prefer: [...preferSet],
    },
    arnold_context: {
      activeTopics: [...topicsSet],
    },
    disclaimers_version: DISCLAIMERS_VERSION,
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

  // -------------------------------------------------------------------------
  // Step 8: Return
  // -------------------------------------------------------------------------
  return output;
}
