// Prompt 172 Phase 1B (172a): microcopy types.
//
// Per spec 172a, every user facing string the meal card surface renders lives
// in a typed string layer with safety mode variants. The variant axis maps
// straight onto 170c section 8.4: normal mode shows absolutes and standard
// post save framing, safety mode hides absolutes and shifts to food positive
// non optimization framing.
//
// Hannah owns the clinical framing on these strings and Kelsey owns the
// regulatory framing; the build time clinical claim linter (Phase 0)
// catches prescriptive, diagnostic, treatment, cure, prevention, and FDA
// approved phrasing.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

export type MicrocopyVariant = 'normal' | 'safety_mode';

/**
 * Every microcopy key surfaced on the meal card. The union is exhaustive so
 * downstream tests can enumerate it (see MICROCOPY_KEYS in ./index).
 */
export type MicrocopyKey =
  // Title row inside the meal totals card.
  | 'title.totals'
  | 'title.totals_hint'
  // State titles per spec 5.4 (analyzing, low_confidence, error).
  | 'state.analyzing'
  | 'state.low_confidence'
  | 'state.error'
  // Body copy when state is low_confidence or error and degradedService is
  // false. Standard non degraded fallback per spec 5.4.
  | 'state.low_confidence_body'
  | 'state.error_body'
  // Action buttons.
  | 'action.confirm'
  | 'action.edit'
  | 'action.split'
  | 'action.cancel'
  | 'action.save'
  | 'action.saving'
  | 'action.add_item'
  // Acknowledgement line variants keyed by recognitionConfidence per the
  // brief. Rendered post save only.
  | 'acknowledgement.high'
  | 'acknowledgement.medium'
  | 'acknowledgement.low'
  // Macro chip labels. Spec 5.3 names them Calories, Protein, Carbs, Fats.
  // Safety mode replaces absolutes with ratios but keeps the same labels.
  | 'chips.calories.label'
  | 'chips.protein.label'
  | 'chips.carbs.label'
  | 'chips.fats.label'
  // 170c section 10.3 degraded service messaging. The kind matches the
  // canonical CHECK constraint from Phase 0 (logmeal_hard_stop,
  // gemini_low_confidence, claude_tertiary_used). The `none` kind has no key
  // because the standard state.low_confidence_body or state.error_body
  // copy is used when no degraded signal is present.
  | 'degraded.logmeal_hard_stop'
  | 'degraded.gemini_low_confidence'
  | 'degraded.claude_tertiary_used'
  // Prompt 172 Phase 2 (172b): Bio Optimization Score line variants. One key
  // per BosLineKind. Strictly within existing Bio Optimization analytics per
  // spec section 3; no clinical, prescriptive, or genetics framing. Safety
  // mode variants are food positive, non quantitative, non evaluative per
  // 170c section 8.4.
  | 'bos.positive_delta'
  | 'bos.neutral'
  | 'bos.gentle_caution'
  | 'bos.learning';

export interface MicrocopyEntry {
  normal: string;
  safety_mode: string;
}

export type MicrocopyMap = Record<MicrocopyKey, MicrocopyEntry>;
