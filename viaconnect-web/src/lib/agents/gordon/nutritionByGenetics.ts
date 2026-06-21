/**
 * src/lib/agents/gordon/nutritionByGenetics.ts
 *
 * Genetics-to-nutrition translator (Prompt 208 Phase 5 Task 14).
 *
 * Gordon is the single source of truth for nutrition. This helper is the
 * translator the Nutrition-by-Genetics panel (Phase 8) and Gordon pipeline
 * consume. It converts a caller-supplied list of PUBLISHED SnpProtocolRule rows
 * into plain prefer/avoid nutrition lists suitable for Gordon task prompts and
 * consumer-facing display.
 *
 * Design decisions:
 *   - Pure function. Reads nothing from the DB; the caller passes already-
 *     applicable, already-published rules (Gate B enforced upstream by
 *     getPublishedRules in snpProtocolRules.ts).
 *   - prefer = deduped recommended_form values across the rules (when present).
 *   - avoid = deduped union of every rule.avoid_list item PLUS each
 *     contraindicate/flagged rule.flagged_form (when present).
 *   - Un-extractable nutrients are never fabricated; this helper only emits
 *     names it has. It never emits 0 or placeholder entries.
 *   - No em/en-dashes. No emojis. No package.json changes. No DB writes.
 */

import type { SnpProtocolRule } from '@/lib/kb/snpProtocolRules';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NutritionByGenetics {
  /** Deduped list of preferred nutrient forms (e.g. 'L-methylfolate'). */
  prefer: string[];
  /** Deduped list of items to avoid (from avoid_list plus contraindicate flagged_form). */
  avoid: string[];
}

// ---------------------------------------------------------------------------
// nutritionByGeneticsFromRules
//
// Caller responsibility: pass only published rules (review_status 'published').
// This function trusts the caller; it does not re-check review_status.
//
// prefer: collect rule.recommended_form for each rule where the field is a
//   non-empty string, then deduplicate.
//
// avoid: collect all items from rule.avoid_list (when present and non-empty),
//   PLUS rule.flagged_form when the rule is a contraindicate or the rule has a
//   flagged_form (any action_type can carry a flagged_form as a safety signal),
//   then deduplicate.
// ---------------------------------------------------------------------------
export function nutritionByGeneticsFromRules(
  applicableRules: SnpProtocolRule[],
): NutritionByGenetics {
  const preferSet = new Set<string>();
  const avoidSet = new Set<string>();

  for (const rule of applicableRules) {
    // prefer: add recommended_form if present and non-empty.
    if (rule.recommended_form && rule.recommended_form.trim().length > 0) {
      preferSet.add(rule.recommended_form.trim());
    }

    // avoid: add all items from avoid_list.
    if (Array.isArray(rule.avoid_list)) {
      for (const item of rule.avoid_list) {
        if (item && item.trim().length > 0) {
          avoidSet.add(item.trim());
        }
      }
    }

    // avoid: add flagged_form when present (contraindicate rules and any rule
    // carrying a flagged_form as a safety signal).
    if (rule.flagged_form && rule.flagged_form.trim().length > 0) {
      avoidSet.add(rule.flagged_form.trim());
    }
  }

  return {
    prefer: Array.from(preferSet),
    avoid: Array.from(avoidSet),
  };
}
