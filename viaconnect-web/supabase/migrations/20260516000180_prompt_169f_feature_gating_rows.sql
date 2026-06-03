-- =============================================================================
-- Prompt #169f: FEATURE-GATING GRANULARITY catalog rows (spec section 3)
-- Migration: 20260516000180_prompt_169f_feature_gating_rows.sql
-- Entity: Farmceutica Wellness Ltd
--
-- WHY THIS EXISTS (the 169f delta this closes):
--   169f section 3 defines the per-tier capability matrix. The features catalog
--   (public.features, seeded in 20260418000010_consumer_pricing_reference.sql)
--   already carries the wearable rows (wearable_single at Gold/level 1,
--   wearable_multiple at Platinum/level 2) but has NO rows for the Body Tracker
--   surface or for FormaVision (Body Scan). This migration INSERTS the MISSING
--   rows so the catalog is complete:
--     * Body Tracker -> Gold (minimum_tier_level 1)
--     * FormaVision  -> Platinum (minimum_tier_level 2)
--
-- AUTHORITATIVE GATE NOTE (do NOT introduce a parallel gate):
--   FormaVision / Body Scan ACCESS is already gated, non-bypassably, by the
--   body_photo_sessions finalize trigger + fn_resolve_body_scan_tier_status
--   (migration 20260516000150, extended for trials in 20260516000170) and its
--   TypeScript mirror (src/lib/body-tracker/entitlement-check.ts +
--   usePremiumEntitlement + BodyScanPremiumPaywall). That entitlement is the
--   single source of truth for the FormaVision ACCESS decision. The FormaVision
--   rows added here are for CATALOG COMPLETENESS and for tier-based CARD
--   VISIBILITY only; they MUST NOT be used as a second access gate that could
--   diverge from the entitlement resolver. Body Tracker, by contrast, had NO
--   gate before this prompt, so its rows below DO drive a real new Gold gate
--   (via userHasFeatureAccess / the effective-tier check in the app layer).
--
-- COLUMNS (verified against the 20260418000010 seed):
--   id, display_name, category, minimum_tier_level, requires_family_tier,
--   requires_genex360, gate_behavior. category CHECK allows 'tracking' and
--   'analytics' (both used here). gate_behavior CHECK allows 'upgrade_prompt'.
--   minimum_tier_level REFERENCES membership_tiers.tier_level
--   (free 0, gold 1, platinum 2, platinum_family 3).
--
-- IDEMPOTENT: every INSERT is ... ON CONFLICT (id) DO NOTHING, so re-running is
--   a no-op and any row that already exists is left untouched (skipped). The
--   wearable_single / wearable_multiple rows from the seed are intentionally NOT
--   re-added here.
--
-- MIGRATION NUMBERING: this is 20260516000180. It sorts AFTER the #169f set
--   (050..170) and is clear of the live #170 range (20260516120010+).
--   Append-only: NEW file only; no existing migration is edited.
--
-- HARD RULES (per spec): append-only; idempotent; ASCII only; no em-dashes or
--   en-dashes; "to" for ranges.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Body Tracker -> Gold (minimum_tier_level 1). category 'tracking' (matches the
-- existing tracking-category convention: dynamic_bio_score, nutrition_logging,
-- supplement_adherence). gate_behavior 'upgrade_prompt' so a Free user is shown
-- the upgrade-to-Gold prompt rather than a hidden surface.
-- -----------------------------------------------------------------------------
INSERT INTO public.features
  (id, display_name, category, minimum_tier_level, requires_family_tier, requires_genex360, gate_behavior)
VALUES
  ('body_tracker_access',       'Body Tracker Access',                 'tracking', 1, false, false, 'upgrade_prompt'),
  ('body_tracker_manual_entry', 'Body Tracker Manual Entry',           'tracking', 1, false, false, 'upgrade_prompt'),
  ('body_tracker_weight_log',   'Body Tracker Manual Weight Log',      'tracking', 1, false, false, 'upgrade_prompt'),
  ('body_tracker_history',      'Body Tracker History and Trend Charts','tracking', 1, false, false, 'upgrade_prompt')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- FormaVision -> Platinum (minimum_tier_level 2). CATALOG-COMPLETENESS ONLY: the
-- authoritative FormaVision access gate stays with the body_photo_sessions
-- finalize entitlement (migration 20260516000150 + the app entitlement). These
-- rows exist so the catalog is complete and so tier-based CARD VISIBILITY can
-- read them; they are NOT a second access gate.
--   formavision_access            -> the FormaVision scan surface itself ('tracking')
--   regional_composition_overlay  -> regional composition overlay   ('analytics')
--   asymmetry_analysis            -> asymmetry analysis              ('analytics')
--   body_scan_pdf_export          -> scan PDF export                 ('analytics')
--   body_scan_practitioner_share  -> practitioner share of a scan    ('analytics')
-- -----------------------------------------------------------------------------
INSERT INTO public.features
  (id, display_name, category, minimum_tier_level, requires_family_tier, requires_genex360, gate_behavior)
VALUES
  ('formavision_access',           'FormaVision Body Scan',                'tracking',  2, false, false, 'upgrade_prompt'),
  ('regional_composition_overlay', 'Regional Composition Overlay',         'analytics', 2, false, false, 'upgrade_prompt'),
  ('asymmetry_analysis',           'Asymmetry Analysis',                   'analytics', 2, false, false, 'upgrade_prompt'),
  ('body_scan_pdf_export',         'Body Scan PDF Export',                 'analytics', 2, false, false, 'upgrade_prompt'),
  ('body_scan_practitioner_share', 'Body Scan Practitioner Share',         'analytics', 2, false, false, 'upgrade_prompt')
ON CONFLICT (id) DO NOTHING;
