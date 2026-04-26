/**
 * Type surface for the Sarah Scenario lifecycle (Prompt #138d).
 * Mirrors the migration in
 * supabase/migrations/20260425300000_prompt_138d_scenario_walkthrough.sql.
 */

export type ScenarioSurface = "persona" | "category" | "copy_block" | "disclosure";

export type ScenarioCopySlotId =
  | "walkthrough.section_title"
  | "walkthrough.intro_paragraph"
  | "walkthrough.phase_1"
  | "walkthrough.phase_2"
  | "walkthrough.phase_3"
  | "walkthrough.tier_explainer"
  | "walkthrough.hand_off_cta"
  | string;

export type DisclosurePlacement = "opening" | "closing" | "both";

export interface ScenarioCategoryRow {
  id: string;
  category_code: string;
  category_display_name: string;
  category_description: string;
  marshall_precheck_session_id: string | null;
  marshall_precheck_passed: boolean;
  steve_approval_at: string | null;
  steve_approval_by: string | null;
  active: boolean;
  archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScenarioPersonaRow {
  id: string;
  persona_code: string;
  persona_display_name: string;
  age_band: string;
  lifestyle_descriptors: string[];
  health_concerns_consumer_language: string[];
  protocol_category_refs: string[];
  tier_reached: 1 | 2 | 3;
  tier_rationale: string;
  dr_fadi_supplementary_consent_key: string | null;
  marshall_precheck_session_id: string | null;
  marshall_precheck_passed: boolean;
  steve_approval_at: string | null;
  steve_approval_by: string | null;
  steve_approval_note: string | null;
  active: boolean;
  archived: boolean;
  archived_at: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ScenarioCopyBlockRow {
  id: string;
  slot_id: ScenarioCopySlotId;
  surface: string;
  block_text: string;
  persona_scoped_to: string | null;
  marshall_precheck_session_id: string | null;
  marshall_precheck_passed: boolean;
  steve_approval_at: string | null;
  steve_approval_by: string | null;
  active: boolean;
  archived: boolean;
  archived_at: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ScenarioDisclosureRow {
  id: string;
  disclosure_placement: DisclosurePlacement;
  disclosure_text: string;
  font_weight_matches_body: boolean;
  renders_as_footnote: boolean;
  active: boolean;
  created_at: string;
}

/**
 * Spec section 4.4: four protocol categories. The seed ships exactly four;
 * the section can render up to six without layout strain.
 */
export const SCENARIO_CATEGORY_DISPLAY_MAX = 6;
