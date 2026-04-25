/**
 * Type surface for the homepage hero variant lifecycle (Prompt #138a).
 * Mirrors the migration in
 * supabase/migrations/20260425000000_prompt_138a_marketing_copy_variants.sql.
 */

export type VariantSurface = "hero";

export type VariantFraming =
  | "process_narrative"
  | "outcome_first"
  | "proof_first"
  | "time_to_value"
  | "other";

export type ConversionKind = "caq_start" | "signup_complete" | "bounce";

export type Viewport = "desktop" | "tablet" | "mobile";

export type ReferrerCategory =
  | "direct"
  | "organic_search"
  | "paid_search"
  | "social"
  | "email"
  | "referral"
  | "other";

export type TestRoundEndedReason =
  | "winner_promoted"
  | "no_winner_archived"
  | "manual_terminated"
  | "superseded";

export type VariantEventKind =
  | "created"
  | "word_count_validated"
  | "precheck_completed"
  | "steve_approved"
  | "steve_revoked"
  | "activated"
  | "deactivated"
  | "archived"
  | "restored";

export interface MarketingCopyVariantRow {
  id: string;
  slot_id: string;
  surface: VariantSurface;
  variant_label: string;
  framing: VariantFraming;
  headline_text: string;
  subheadline_text: string;
  cta_label: string;
  cta_destination: string | null;
  word_count_validated: boolean;
  marshall_precheck_passed: boolean;
  marshall_precheck_session_id: string | null;
  steve_approval_at: string | null;
  steve_approval_by: string | null;
  steve_approval_note: string | null;
  active_in_test: boolean;
  archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketingCopyImpressionRow {
  id: string;
  visitor_id: string;
  slot_id: string;
  rendered_at: string;
  viewport: Viewport | null;
  referrer_category: ReferrerCategory | null;
  is_returning_visitor: boolean;
}

export interface MarketingCopyConversionRow {
  id: string;
  visitor_id: string;
  conversion_kind: ConversionKind;
  preceding_slot_id: string | null;
  occurred_at: string;
  time_from_impression_seconds: number | null;
}

export interface MarketingCopyTestRoundRow {
  id: string;
  test_id: string;
  surface: VariantSurface;
  active_slot_ids: string[];
  started_at: string;
  paused_at: string | null;
  resumed_at: string | null;
  ended_at: string | null;
  winner_slot_id: string | null;
  ended_reason: TestRoundEndedReason | null;
}

export interface MarketingCopyVariantEventRow {
  id: string;
  variant_id: string;
  event_kind: VariantEventKind;
  event_detail: Record<string, unknown> | null;
  actor_user_id: string | null;
  occurred_at: string;
}

/**
 * Word-count budgets per #138a §4 and §5.2 step 2:
 *   headline ≤ 12 words, subheadline ≤ 32 words.
 * Variants exceeding the bounds are rejected at draft time.
 */
export const WORD_COUNT_BUDGETS = {
  headline_max: 12,
  subheadline_max: 32,
} as const;

/**
 * Winner declaration thresholds per #138a §6.4. Five conditions must all
 * hold before a variant becomes the new control.
 */
export const WINNER_THRESHOLDS = {
  min_visitors_per_variant: 5000,
  min_runtime_days: 14,
  confidence_level: 0.95,
  min_absolute_lift_percentage_points: 1,
} as const;

/**
 * Visitor cookie name per #138a §6.1 — Marketing should confirm with Thomas
 * before launch; default kept here so the assignment library has a stable
 * fallback if env override is absent.
 */
export const VISITOR_COOKIE_NAME = "vc_visitor_id";
