-- =============================================================================
-- Prompt 210f Task F5: white label ADDITIVE tranche migration
-- =============================================================================
-- Gary Decision 3 (2026-07-07): apply the white label tranche and launch;
-- this file is the SCHEMA portion (the launch checklist is Task F6). It
-- assembles the additive DDL from the cluster 1 unapplied source migrations,
-- in their original order:
--
--   1. 20260418000420_white_label_data_model.sql
--   2. 20260418000430_white_label_phase2_helpers.sql
--   3. 20260418000440_white_label_storage_buckets.sql (white label cluster
--      source; absent from the decision sheet file list because buckets are
--      not phantom-map objects, included per the F5 bucket instruction)
--   4. 20260418000450_white_label_reviewer_assignments.sql
--   5. 20260418000460_clone_label_design_revision_rpc.sql
--   6. 20260418000470_white_label_order_number_seq.sql
--   7. 20260418000480_white_label_dispensary_settings.sql (WITHOUT the
--      practitioners.dispensary_slug slice: F1 already carried the column,
--      its COMMENT, and idx_practitioners_dispensary_slug)
--   8. 20260418000490_white_label_phase7_governance_and_economics.sql
--   9. 20260418000500_white_label_audit_remediation.sql
--
-- PRECONDITION: F1 (20260707150000) is applied live (confirmed in
-- docs/integrity/snapshot/applied-manifest.json). The 000500 tightened
-- dispensary policy references practitioner_patients, an F1-created table.
--
-- DEFERRED (recorded in docs/integrity/practitioner-core-drop-evidence.md
-- Additional deferrals, NOT carried as executable DDL here):
--   * 20260418000430 sum_practitioner_wholesale_volume: LIVE-VALIDITY STOP.
--     Its LANGUAGE sql body reads shop_orders.wholesale_total_cents,
--     placed_by_practitioner_id, and order_type, none of which exist on live
--     shop_orders; their adding migration 20260418000130 is outside this
--     tranche. LANGUAGE sql bodies are validated at CREATE time, so carrying
--     it would fail the whole apply. It rides below as an inert comment
--     block for a later lift. Eligibility Path 3 callers keep today's
--     fail-open behavior (function absent).
--
-- Conversions applied during extraction (documented in
-- .superpowers/sdd/task-210f-F5-report.md):
--   * Every source DROP POLICY IF EXISTS + CREATE POLICY adjacency pair
--     becomes a DO block that creates the policy only when pg_policies has
--     no row for it (no DROP carried). Same for the two DROP TRIGGER IF
--     EXISTS + CREATE TRIGGER pairs, gated on pg_trigger.
--   * Every bare auth.uid() in a policy is wrapped to the initplan form
--     (select auth.uid()), the established repo remediation (20260622180000).
--     Function bodies keep bare auth.uid() (not policies).
--   * The 000500 DROP VIEW IF EXISTS + CREATE VIEW pair on
--     wl_pending_reviews_with_sla becomes CREATE OR REPLACE VIEW: the view
--     is absent live (created earlier in this same file by the 000450
--     slice), and the 000500 definition keeps the identical column list, so
--     OR REPLACE is exact. This closes the evidence pack row
--     "wl_pending_reviews_with_sla drop/recreate (_500)".
--   * 000480 creates wl_disp_published_read broad (any authenticated user
--     reads any published row); 000500 replaces it with a tightened
--     patient-relationship-scoped version under the SAME name. Guard-once
--     semantics would freeze the insecure draft, so the broad version is
--     NOT emitted; only the 000500 tightened version is (at its original
--     position). The audit itself flagged the broad version as an
--     enumeration leak.
--   * LIVE-VALIDITY REWRITE in the 000500 tightened policy (F3b incident
--     class, caught pre-apply): the source reads pp.patient_user_id, which
--     does not exist on the F1-created practitioner_patients (the column is
--     patient_id), and compares pp.practitioner_id (an auth.users id per
--     the F1 CREATE TABLE) directly to
--     white_label_dispensary_settings.practitioner_id (a practitioners.id).
--     The carried policy uses pp.patient_id and bridges the id spaces via
--     practitioners.user_id, following the F1
--     practitioners_patient_read_public precedent.
--   * LIVE-VALIDITY REWRITE in the 000420 catalog seed: live
--     product_catalog has no cogs_cents (its adding migration
--     20260418000270 is outside this tranche), so
--     COALESCE(pc.cogs_cents, ROUND(pc.price * 100 * 0.35)::INTEGER)
--     becomes ROUND(pc.price * 100 * 0.35)::INTEGER, the value the source
--     COALESCE would produce for every row anyway (the column, wherever it
--     later appears, starts NULL).
--   * Seeds are guarded: empty-table guards for tranche-created tables
--     (white_label_catalog_config, white_label_discount_tiers,
--     white_label_parameters), row-absence guards for live populated tables
--     (launch_phases, pricing_domains, storage.buckets). All source
--     ON CONFLICT clauses are kept. The pricing_domains registration keeps
--     its source table-existence guard as a nested outer IF.
--   * block_compliance_review_mutation gains SET search_path = public,
--     pg_temp per the repo function-security posture (zero behavior
--     change). clone_label_design_revision and
--     next_white_label_order_number keep their source SECURITY DEFINER and
--     SET search_path = public, pg_catalog pins verbatim.
--   * The 000500 COMMENT ON FUNCTION string "Do not modify or drop this
--     trigger" is reworded to "Do not modify or remove this trigger" so the
--     file carries zero DROP tokens (shape-test invariant); same meaning.
--
-- LIVE-VALIDITY CHECKS performed against docs/integrity/snapshot/
-- live-types.ts plus the F1 migration (every check re-asserted at test
-- runtime by src/lib/__tests__/white-label-migration-shape.test.ts):
--   * profiles.id, profiles.role: VALID (admin policy checks).
--   * practitioners.id, practitioners.user_id: VALID (live stub columns;
--     FK targets and ownership subqueries).
--   * product_catalog.id / .category / .active / .price: VALID (seed).
--     product_catalog.cogs_cents: ABSENT live, adapted (see above).
--   * launch_phases id/display_name/description/phase_type/
--     target_activation_date/activation_status/sort_order/metadata: ALL
--     VALID; phase_type value 'white_label_products_launch' is in the live
--     CHECK constraint (creating migration 20260418000180 matches the live
--     shape).
--   * pricing_domains id/display_name/category/target_table/target_column/
--     requires_grandfathering/default_grandfathering_policy/description/
--     sort_order: ALL VALID.
--   * shop_orders.wholesale_total_cents / .placed_by_practitioner_id /
--     .order_type: ABSENT live; sum_practitioner_wholesale_volume DEFERRED.
--   * practitioner_patients.practitioner_id / .patient_id / .status: VALID
--     per the F1 CREATE TABLE (patient_user_id is a phantom, rewritten).
--   * auth.users(id), storage.buckets, storage.objects,
--     storage.foldername(): Supabase built-ins.
--
-- Bucket findings: the sources create white-label-brand-assets and
-- white-label-proofs. NO code path references either bucket today (zero
-- hits in src/ and supabase/functions/), so there is no name mismatch of
-- the practitioner-referral-tax-documents class; the buckets are additive,
-- private, and forward-compatible. Task F6 should confirm the brand-asset
-- upload UX before launch.
--
-- Entity-string finding (FLAGGED, carried verbatim, NOT silently fixed):
-- white_label_label_designs.manufacturer_line defaults to 'Manufactured by
-- FarmCeutica Wellness LLC, Buffalo NY'. The 210f Global Constraint names
-- Farmceutica Wellness Ltd as the legal entity string on customer-facing
-- legal text; label copy is customer-facing. Gary decides the correct
-- manufacturer line in Task F6 before launch.
--
-- Shape test: src/lib/__tests__/white-label-migration-shape.test.ts parses
-- this file. DO NOT add destructive statements here; the test fails on any
-- DROP token.
-- =============================================================================

-- =============================================================================
-- SECTION 1 of 9: from 20260418000420_white_label_data_model.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1.1 Enrollments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.white_label_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE RESTRICT UNIQUE,

  status TEXT NOT NULL DEFAULT 'pending_eligibility' CHECK (status IN (
    'pending_eligibility', 'eligibility_verified', 'brand_setup',
    'first_production_order', 'active', 'paused', 'terminated'
  )),

  qualifying_path TEXT NOT NULL CHECK (qualifying_path IN (
    'certification_level_3', 'white_label_tier_subscription', 'volume_threshold'
  )),
  qualifying_path_verified_at TIMESTAMPTZ,
  qualifying_path_verified_by UUID REFERENCES auth.users(id),
  qualifying_path_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,

  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_production_order_id UUID,
  first_production_delivered_at TIMESTAMPTZ,

  suspended_reason TEXT,
  suspended_at TIMESTAMPTZ,
  terminated_reason TEXT,
  terminated_at TIMESTAMPTZ,
  terminated_by UUID REFERENCES auth.users(id),

  lifetime_production_orders INTEGER NOT NULL DEFAULT 0,
  lifetime_production_revenue_cents BIGINT NOT NULL DEFAULT 0,

  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.white_label_enrollments IS
  'Practitioner enrollment in Level 3 White-Label. One row per practitioner. Status progresses pending_eligibility -> eligibility_verified -> brand_setup -> first_production_order -> active.';
COMMENT ON COLUMN public.white_label_enrollments.qualifying_path IS
  'Which of the three OR-logic eligibility paths granted this enrollment. Stored for audit.';
COMMENT ON COLUMN public.white_label_enrollments.qualifying_path_evidence IS
  'JSONB blob of the verification evidence: certification_id, subscription_id, or wholesale_volume_summary.';

CREATE INDEX IF NOT EXISTS idx_wl_enroll_status      ON public.white_label_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_wl_enroll_practitioner ON public.white_label_enrollments(practitioner_id);

ALTER TABLE public.white_label_enrollments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'white_label_enrollments'
      AND policyname = 'wl_enroll_self_read'
  ) THEN
    CREATE POLICY wl_enroll_self_read
      ON public.white_label_enrollments FOR SELECT TO authenticated
      USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = (select auth.uid())));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'white_label_enrollments'
      AND policyname = 'wl_enroll_admin_all'
  ) THEN
    CREATE POLICY wl_enroll_admin_all
      ON public.white_label_enrollments FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1.2 Catalog config
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.white_label_catalog_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_catalog_id UUID NOT NULL REFERENCES public.product_catalog(id) ON DELETE CASCADE UNIQUE,

  is_white_label_eligible BOOLEAN NOT NULL DEFAULT true,
  is_retail_exclusive BOOLEAN NOT NULL DEFAULT false,

  base_msrp_cents INTEGER NOT NULL,
  base_cogs_cents INTEGER NOT NULL,
  production_minimum_moq INTEGER NOT NULL DEFAULT 100,

  retail_exclusive_reason TEXT,

  standard_production_weeks INTEGER NOT NULL DEFAULT 8,
  expedited_production_weeks INTEGER NOT NULL DEFAULT 6,

  is_active BOOLEAN NOT NULL DEFAULT true,
  flagged_by UUID REFERENCES auth.users(id),
  flagged_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Mutual exclusion: a SKU cannot be both eligible and retail-exclusive.
  CONSTRAINT wl_catalog_eligibility_xor CHECK (
    NOT (is_white_label_eligible = true AND is_retail_exclusive = true)
  )
);

COMMENT ON TABLE public.white_label_catalog_config IS
  'Per-SKU white-label eligibility + production parameters. Seeded from supplement-category product_catalog rows. Peptides and GeneX360 explicitly excluded.';

CREATE INDEX IF NOT EXISTS idx_wl_catalog_eligible
  ON public.white_label_catalog_config(product_catalog_id)
  WHERE is_white_label_eligible = true AND is_active = true;

ALTER TABLE public.white_label_catalog_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'white_label_catalog_config'
      AND policyname = 'wl_catalog_read_enrolled'
  ) THEN
    CREATE POLICY wl_catalog_read_enrolled
      ON public.white_label_catalog_config FOR SELECT TO authenticated
      USING (
        is_white_label_eligible = true AND is_active = true AND
        EXISTS (
          SELECT 1
            FROM public.white_label_enrollments we
            JOIN public.practitioners p ON p.id = we.practitioner_id
           WHERE p.user_id = (select auth.uid())
             AND we.status IN ('brand_setup', 'first_production_order', 'active')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'white_label_catalog_config'
      AND policyname = 'wl_catalog_admin_all'
  ) THEN
    CREATE POLICY wl_catalog_admin_all
      ON public.white_label_catalog_config FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));
  END IF;
END $$;

-- Seed: only category='supplement' SKUs. Peptides, GeneX360, diagnostics
-- explicitly excluded. product_catalog.price is NUMERIC dollars; convert
-- to integer cents at boundary. LIVE-VALIDITY ADAPTATION: the source read
-- COALESCE(pc.cogs_cents, ROUND(pc.price * 100 * 0.35)::INTEGER), but live
-- product_catalog has no cogs_cents column (20260418000270 is outside this
-- tranche), so the fallback expression, which every row would receive
-- anyway, is used directly. Empty-table guarded; source ON CONFLICT kept.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.white_label_catalog_config
  ) THEN
    INSERT INTO public.white_label_catalog_config (
      product_catalog_id, is_white_label_eligible, is_retail_exclusive,
      base_msrp_cents, base_cogs_cents, production_minimum_moq
    )
    SELECT
      pc.id,
      true,
      false,
      ROUND(pc.price * 100)::INTEGER,
      ROUND(pc.price * 100 * 0.35)::INTEGER,
      100
    FROM public.product_catalog pc
    WHERE pc.category = 'supplement'
      AND pc.active = true
    ON CONFLICT (product_catalog_id) DO NOTHING;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1.3 Practitioner brand configurations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practitioner_brand_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE UNIQUE,
  enrollment_id UUID NOT NULL REFERENCES public.white_label_enrollments(id) ON DELETE CASCADE,

  brand_name TEXT NOT NULL,
  brand_tagline TEXT,
  brand_description TEXT,

  logo_primary_url TEXT,
  logo_secondary_url TEXT,
  logo_monochrome_url TEXT,
  wordmark_url TEXT,

  primary_color_hex    TEXT CHECK (primary_color_hex    IS NULL OR primary_color_hex    ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color_hex  TEXT CHECK (secondary_color_hex  IS NULL OR secondary_color_hex  ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color_hex     TEXT CHECK (accent_color_hex     IS NULL OR accent_color_hex     ~ '^#[0-9A-Fa-f]{6}$'),
  background_color_hex TEXT CHECK (background_color_hex IS NULL OR background_color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  text_color_hex       TEXT DEFAULT '#000000' CHECK (text_color_hex IS NULL OR text_color_hex ~ '^#[0-9A-Fa-f]{6}$'),

  brand_font_primary TEXT DEFAULT 'Instrument Sans',
  brand_font_secondary TEXT,

  practice_legal_name TEXT NOT NULL,
  practice_address_line_1 TEXT NOT NULL,
  practice_address_line_2 TEXT,
  practice_city TEXT NOT NULL,
  practice_state TEXT NOT NULL,
  practice_postal_code TEXT NOT NULL,
  practice_country TEXT NOT NULL DEFAULT 'US',
  practice_phone TEXT NOT NULL,
  practice_email TEXT NOT NULL,
  practice_website TEXT,

  product_naming_scheme TEXT NOT NULL DEFAULT 'viacura_name' CHECK (product_naming_scheme IN (
    'viacura_name', 'practice_prefix_plus_viacura', 'fully_custom'
  )),
  practice_prefix TEXT,

  brand_config_approved BOOLEAN NOT NULL DEFAULT false,
  brand_config_approved_at TIMESTAMPTZ,
  brand_config_approved_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.practitioner_brand_configurations IS
  'Brand setup per enrolled practitioner. Referenced by all label designs. Brand config requires admin approval before first production order.';

CREATE INDEX IF NOT EXISTS idx_brand_config_practitioner
  ON public.practitioner_brand_configurations(practitioner_id);

ALTER TABLE public.practitioner_brand_configurations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'practitioner_brand_configurations'
      AND policyname = 'brand_config_self_rw'
  ) THEN
    CREATE POLICY brand_config_self_rw
      ON public.practitioner_brand_configurations FOR ALL TO authenticated
      USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = (select auth.uid())))
      WITH CHECK (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = (select auth.uid())));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'practitioner_brand_configurations'
      AND policyname = 'brand_config_admin_all'
  ) THEN
    CREATE POLICY brand_config_admin_all
      ON public.practitioner_brand_configurations FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1.4 Label designs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.white_label_label_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  brand_configuration_id UUID NOT NULL REFERENCES public.practitioner_brand_configurations(id),
  product_catalog_id UUID NOT NULL REFERENCES public.product_catalog(id),

  display_product_name TEXT NOT NULL,
  short_description TEXT,
  long_description TEXT,
  tagline TEXT,

  layout_template TEXT NOT NULL CHECK (layout_template IN (
    'classic_vertical', 'modern_horizontal', 'premium_wrap', 'clinical_minimal'
  )),

  structure_function_claims TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  usage_directions TEXT,
  warning_text TEXT,

  supplement_facts_panel_data JSONB NOT NULL,
  allergen_statement TEXT,
  other_ingredients TEXT,

  manufacturer_line TEXT NOT NULL DEFAULT 'Manufactured by FarmCeutica Wellness LLC, Buffalo NY',

  design_proof_pdf_url TEXT,
  front_panel_image_url TEXT,
  back_panel_image_url TEXT,
  design_proof_generated_at TIMESTAMPTZ,

  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'ready_for_review', 'under_compliance_review',
    'revision_requested', 'approved', 'production_ready', 'archived'
  )),

  version_number INTEGER NOT NULL DEFAULT 1,
  parent_design_id UUID REFERENCES public.white_label_label_designs(id),
  is_current_version BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (practitioner_id, product_catalog_id, version_number)
);

COMMENT ON TABLE public.white_label_label_designs IS
  'Per-product label designs. Versioned: revisions create new rows with parent_design_id; only one is_current_version=true per (practitioner, product).';
COMMENT ON COLUMN public.white_label_label_designs.structure_function_claims IS
  'Non-empty array triggers mandatory medical-director (Fadi) review in addition to compliance-officer (Steve) review.';
COMMENT ON COLUMN public.white_label_label_designs.manufacturer_line IS
  'FDA-required text. Default = canonical string. Application layer (Phase 4) rejects any drift; the DB does not enforce because Phase 4 surfaces the violation as a compliance review failure for traceability.';
COMMENT ON COLUMN public.white_label_label_designs.supplement_facts_panel_data IS
  'JSONB serving size, servings per container, ingredient list with amounts and %DV. Auto-populated from product_catalog at design creation.';

CREATE INDEX IF NOT EXISTS idx_label_design_practitioner
  ON public.white_label_label_designs(practitioner_id, status);
CREATE INDEX IF NOT EXISTS idx_label_design_status_review
  ON public.white_label_label_designs(status)
  WHERE status IN ('ready_for_review', 'under_compliance_review');
CREATE INDEX IF NOT EXISTS idx_label_design_current
  ON public.white_label_label_designs(practitioner_id, product_catalog_id)
  WHERE is_current_version = true;

ALTER TABLE public.white_label_label_designs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'white_label_label_designs'
      AND policyname = 'label_design_self_rw'
  ) THEN
    CREATE POLICY label_design_self_rw
      ON public.white_label_label_designs FOR ALL TO authenticated
      USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = (select auth.uid())))
      WITH CHECK (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = (select auth.uid())));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'white_label_label_designs'
      AND policyname = 'label_design_admin_all'
  ) THEN
    CREATE POLICY label_design_admin_all
      ON public.white_label_label_designs FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1.5 Compliance reviews (immutable)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.white_label_compliance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label_design_id UUID NOT NULL REFERENCES public.white_label_label_designs(id),

  review_type TEXT NOT NULL CHECK (review_type IN (
    'automated_checklist', 'compliance_review', 'medical_claims_review'
  )),
  reviewer_user_id UUID REFERENCES auth.users(id),
  reviewer_role TEXT CHECK (reviewer_role IN (
    'automated', 'compliance_officer', 'medical_director'
  )),

  decision TEXT NOT NULL CHECK (decision IN ('approved', 'revision_requested', 'rejected')),
  decision_notes TEXT,

  checklist_results JSONB,
  flagged_items JSONB DEFAULT '[]'::jsonb,

  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  review_duration_seconds INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.white_label_compliance_reviews IS
  'Immutable per-event review log. Automated checklist runs first; human reviews follow (compliance_officer = Steve; medical_director = Fadi when claims present). UPDATE/DELETE blocked at trigger.';

CREATE INDEX IF NOT EXISTS idx_compliance_review_design
  ON public.white_label_compliance_reviews(label_design_id, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_review_pending
  ON public.white_label_compliance_reviews(review_type, decision)
  WHERE decision = 'revision_requested';

ALTER TABLE public.white_label_compliance_reviews ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'white_label_compliance_reviews'
      AND policyname = 'compliance_review_practitioner_read'
  ) THEN
    CREATE POLICY compliance_review_practitioner_read
      ON public.white_label_compliance_reviews FOR SELECT TO authenticated
      USING (
        label_design_id IN (
          SELECT id FROM public.white_label_label_designs
           WHERE practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = (select auth.uid()))
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'white_label_compliance_reviews'
      AND policyname = 'compliance_review_admin_all'
  ) THEN
    CREATE POLICY compliance_review_admin_all
      ON public.white_label_compliance_reviews FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.block_compliance_review_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'white_label_compliance_reviews is immutable. UPDATE and DELETE are not permitted.';
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'block_compliance_review_update_trigger'
      AND tgrelid = 'public.white_label_compliance_reviews'::regclass
  ) THEN
    CREATE TRIGGER block_compliance_review_update_trigger
      BEFORE UPDATE ON public.white_label_compliance_reviews
      FOR EACH ROW EXECUTE FUNCTION public.block_compliance_review_mutation();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'block_compliance_review_delete_trigger'
      AND tgrelid = 'public.white_label_compliance_reviews'::regclass
  ) THEN
    CREATE TRIGGER block_compliance_review_delete_trigger
      BEFORE DELETE ON public.white_label_compliance_reviews
      FOR EACH ROW EXECUTE FUNCTION public.block_compliance_review_mutation();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1.6 Production orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.white_label_production_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,

  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id),
  enrollment_id UUID NOT NULL REFERENCES public.white_label_enrollments(id),

  production_timeline TEXT NOT NULL CHECK (production_timeline IN ('standard', 'expedited')),
  expedited_surcharge_cents INTEGER DEFAULT 0,

  total_units INTEGER NOT NULL CHECK (total_units >= 100),
  subtotal_cents BIGINT NOT NULL CHECK (subtotal_cents >= 0),
  expedited_surcharge_applied_cents BIGINT NOT NULL DEFAULT 0,
  total_cents BIGINT NOT NULL CHECK (total_cents >= 0),
  applied_discount_tier TEXT NOT NULL CHECK (applied_discount_tier IN (
    'tier_100_499', 'tier_500_999', 'tier_1000_plus'
  )),
  applied_discount_percent INTEGER NOT NULL CHECK (applied_discount_percent BETWEEN 0 AND 100),

  status TEXT NOT NULL DEFAULT 'quote' CHECK (status IN (
    'quote', 'labels_pending_review', 'labels_approved_pending_deposit',
    'deposit_paid', 'in_production', 'quality_control',
    'final_payment_pending', 'shipped', 'delivered', 'canceled'
  )),

  stripe_deposit_payment_intent_id TEXT,
  stripe_final_payment_intent_id TEXT,
  deposit_paid_at TIMESTAMPTZ,
  final_payment_paid_at TIMESTAMPTZ,
  deposit_amount_cents BIGINT NOT NULL CHECK (deposit_amount_cents >= 0),
  final_payment_amount_cents BIGINT NOT NULL CHECK (final_payment_amount_cents >= 0),

  quoted_at TIMESTAMPTZ,
  labels_approved_at TIMESTAMPTZ,
  production_started_at TIMESTAMPTZ,
  quality_control_completed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  quoted_delivery_date DATE,
  actual_delivery_date DATE,

  ship_to_viacura_warehouse BOOLEAN NOT NULL DEFAULT true,
  shipping_address JSONB,
  tracking_number TEXT,
  carrier TEXT,

  canceled_at TIMESTAMPTZ,
  canceled_by UUID REFERENCES auth.users(id),
  canceled_reason TEXT,
  deposit_refunded BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.white_label_production_orders IS
  'Batch manufacturing requests. State machine: quote -> labels approved -> deposit paid -> in production -> QC -> final payment -> shipped -> delivered.';

CREATE INDEX IF NOT EXISTS idx_wl_prod_order_practitioner
  ON public.white_label_production_orders(practitioner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wl_prod_order_status
  ON public.white_label_production_orders(status);
CREATE INDEX IF NOT EXISTS idx_wl_prod_order_in_production
  ON public.white_label_production_orders(production_started_at)
  WHERE status IN ('in_production', 'quality_control');

ALTER TABLE public.white_label_production_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'white_label_production_orders'
      AND policyname = 'wl_prod_order_self_read'
  ) THEN
    CREATE POLICY wl_prod_order_self_read
      ON public.white_label_production_orders FOR SELECT TO authenticated
      USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = (select auth.uid())));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'white_label_production_orders'
      AND policyname = 'wl_prod_order_admin_all'
  ) THEN
    CREATE POLICY wl_prod_order_admin_all
      ON public.white_label_production_orders FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1.7 Production order items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.white_label_production_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID NOT NULL REFERENCES public.white_label_production_orders(id) ON DELETE CASCADE,

  label_design_id UUID NOT NULL REFERENCES public.white_label_label_designs(id),
  product_catalog_id UUID NOT NULL REFERENCES public.product_catalog(id),

  quantity INTEGER NOT NULL CHECK (quantity >= 100),
  unit_cost_cents INTEGER NOT NULL CHECK (unit_cost_cents >= 0),
  line_subtotal_cents BIGINT NOT NULL CHECK (line_subtotal_cents >= 0),

  lot_number TEXT,
  expiration_date DATE,
  qc_passed BOOLEAN,
  qc_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wl_poi_order        ON public.white_label_production_order_items(production_order_id);
CREATE INDEX IF NOT EXISTS idx_wl_poi_label_design ON public.white_label_production_order_items(label_design_id);

ALTER TABLE public.white_label_production_order_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'white_label_production_order_items'
      AND policyname = 'wl_poi_self_read'
  ) THEN
    CREATE POLICY wl_poi_self_read
      ON public.white_label_production_order_items FOR SELECT TO authenticated
      USING (production_order_id IN (
        SELECT id FROM public.white_label_production_orders
         WHERE practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = (select auth.uid()))
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'white_label_production_order_items'
      AND policyname = 'wl_poi_admin_all'
  ) THEN
    CREATE POLICY wl_poi_admin_all
      ON public.white_label_production_order_items FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1.8 Inventory lots
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.white_label_inventory_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_item_id UUID NOT NULL REFERENCES public.white_label_production_order_items(id),

  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id),
  label_design_id UUID NOT NULL REFERENCES public.white_label_label_designs(id),
  product_catalog_id UUID NOT NULL REFERENCES public.product_catalog(id),

  lot_number TEXT NOT NULL,
  manufactured_date DATE NOT NULL,
  expiration_date DATE NOT NULL,

  units_produced INTEGER NOT NULL CHECK (units_produced >= 0),
  units_available INTEGER NOT NULL CHECK (units_available >= 0),
  units_sold INTEGER NOT NULL DEFAULT 0 CHECK (units_sold >= 0),
  units_expired INTEGER NOT NULL DEFAULT 0 CHECK (units_expired >= 0),
  units_returned INTEGER NOT NULL DEFAULT 0 CHECK (units_returned >= 0),
  units_recalled INTEGER NOT NULL DEFAULT 0 CHECK (units_recalled >= 0),

  storage_location TEXT NOT NULL CHECK (storage_location IN (
    'viacura_warehouse', 'practitioner_facility'
  )),
  viacura_storage_days INTEGER NOT NULL DEFAULT 0 CHECK (viacura_storage_days >= 0),
  viacura_storage_fee_accrued_cents BIGINT NOT NULL DEFAULT 0 CHECK (viacura_storage_fee_accrued_cents >= 0),

  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'depleted', 'expired', 'recalled'
  )),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wl_inventory_practitioner
  ON public.white_label_inventory_lots(practitioner_id, status)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_wl_inventory_expiring
  ON public.white_label_inventory_lots(expiration_date)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_wl_inventory_storage
  ON public.white_label_inventory_lots(storage_location, practitioner_id)
  WHERE status = 'active';

ALTER TABLE public.white_label_inventory_lots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'white_label_inventory_lots'
      AND policyname = 'wl_inventory_self_read'
  ) THEN
    CREATE POLICY wl_inventory_self_read
      ON public.white_label_inventory_lots FOR SELECT TO authenticated
      USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = (select auth.uid())));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'white_label_inventory_lots'
      AND policyname = 'wl_inventory_admin_all'
  ) THEN
    CREATE POLICY wl_inventory_admin_all
      ON public.white_label_inventory_lots FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1.9 SKU mappings (white-label SKU to underlying ViaCura SKU)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.white_label_sku_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  label_design_id UUID NOT NULL REFERENCES public.white_label_label_designs(id) UNIQUE,
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id),
  underlying_viacura_product_id UUID NOT NULL REFERENCES public.product_catalog(id),

  practitioner_sku_code TEXT NOT NULL,
  display_name TEXT NOT NULL,

  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (practitioner_id, practitioner_sku_code)
);

COMMENT ON TABLE public.white_label_sku_mappings IS
  'Bridges practitioner-branded SKU to underlying ViaCura SKU. Patient sees only practitioner brand; adherence + interaction systems traverse this mapping to reach the formulation.';

CREATE INDEX IF NOT EXISTS idx_wl_sku_map_practitioner
  ON public.white_label_sku_mappings(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_wl_sku_map_underlying
  ON public.white_label_sku_mappings(underlying_viacura_product_id);

ALTER TABLE public.white_label_sku_mappings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'white_label_sku_mappings'
      AND policyname = 'wl_sku_map_self_read'
  ) THEN
    CREATE POLICY wl_sku_map_self_read
      ON public.white_label_sku_mappings FOR SELECT TO authenticated
      USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = (select auth.uid())));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'white_label_sku_mappings'
      AND policyname = 'wl_sku_map_admin_all'
  ) THEN
    CREATE POLICY wl_sku_map_admin_all
      ON public.white_label_sku_mappings FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1.10 Recalls
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.white_label_recalls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  recall_number TEXT NOT NULL UNIQUE,
  initiated_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  recall_reason TEXT NOT NULL,
  recall_class TEXT NOT NULL CHECK (recall_class IN ('class_i', 'class_ii', 'class_iii')),
  recall_scope TEXT NOT NULL CHECK (recall_scope IN (
    'single_lot', 'all_lots_single_sku', 'multiple_skus_formulation', 'all_white_label'
  )),

  affected_product_catalog_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  affected_lot_numbers TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  fda_notified BOOLEAN NOT NULL DEFAULT false,
  fda_notified_at TIMESTAMPTZ,
  fda_recall_number TEXT,

  practitioners_notified_count INTEGER NOT NULL DEFAULT 0,
  patients_notified_count INTEGER NOT NULL DEFAULT 0,
  units_recalled INTEGER NOT NULL DEFAULT 0,
  units_returned_to_viacura INTEGER NOT NULL DEFAULT 0,

  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN (
    'initiated', 'notification_in_progress', 'notification_complete', 'closed'
  )),

  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.white_label_recalls ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'white_label_recalls'
      AND policyname = 'wl_recall_admin_all'
  ) THEN
    CREATE POLICY wl_recall_admin_all
      ON public.white_label_recalls FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));
  END IF;
END $$;

-- A practitioner can see a recall when one of their inventory lots is in scope.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'white_label_recalls'
      AND policyname = 'wl_recall_affected_practitioner_read'
  ) THEN
    CREATE POLICY wl_recall_affected_practitioner_read
      ON public.white_label_recalls FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1
            FROM public.white_label_inventory_lots il
            JOIN public.practitioners p ON p.id = il.practitioner_id
           WHERE p.user_id = (select auth.uid())
             AND (il.product_catalog_id = ANY(public.white_label_recalls.affected_product_catalog_ids)
                  OR il.lot_number = ANY(public.white_label_recalls.affected_lot_numbers))
        )
      );
  END IF;
END $$;

-- =============================================================================
-- SECTION 2 of 9: from 20260418000430_white_label_phase2_helpers.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- F5 DEFERRED, DO NOT APPLY IN F5: sum_practitioner_wholesale_volume
-- ---------------------------------------------------------------------------
-- LIVE-VALIDITY STOP (the F3b incident class, caught pre-apply). This
-- LANGUAGE sql function body reads shop_orders.wholesale_total_cents,
-- shop_orders.placed_by_practitioner_id, and shop_orders.order_type. None
-- of the three exist on live shop_orders (live has status and user_id,
-- neither sufficient); they are added by
-- 20260418000130_shop_orders_practitioner_extension.sql, which is OUTSIDE
-- this tranche. LANGUAGE sql bodies are validated at CREATE time, so
-- carrying this create would fail the whole apply, and there is no live
-- equivalent that preserves the wholesale semantics (consumer totals would
-- fabricate eligibility data). Deferred to ride with or immediately after
-- the shop_orders extension; recorded in
-- docs/integrity/practitioner-core-drop-evidence.md (Additional deferrals
-- found during F5 extraction). Verbatim source for the later lift:
--
-- CREATE OR REPLACE FUNCTION public.sum_practitioner_wholesale_volume(
--   p_practitioner_id UUID
-- )
-- RETURNS BIGINT
-- LANGUAGE sql
-- STABLE
-- SECURITY DEFINER
-- SET search_path = public, pg_catalog
-- AS $body$
--   SELECT COALESCE(SUM(wholesale_total_cents), 0)::BIGINT
--     FROM public.shop_orders
--    WHERE placed_by_practitioner_id = p_practitioner_id
--      AND order_type IN ('practitioner_stock', 'drop_ship', 'wholesale_bulk')
--      AND status = 'completed'
--      AND wholesale_total_cents IS NOT NULL;
-- $body$;
--
-- COMMENT ON FUNCTION public.sum_practitioner_wholesale_volume IS
--   'Lifetime wholesale revenue (cents) for one practitioner across the
--    three practitioner-channel order types. Used by white-label
--    eligibility Path 3.';
-- REVOKE ALL ON FUNCTION public.sum_practitioner_wholesale_volume(UUID) FROM PUBLIC;
-- GRANT EXECUTE ON FUNCTION public.sum_practitioner_wholesale_volume(UUID) TO authenticated;
-- ---------------------------------------------------------------------------

-- Launch phase registration. launch_phases is a LIVE populated table, so
-- the guard is row-absence (an empty-table guard would always no-op); the
-- source ON CONFLICT is kept. phase_type 'white_label_products_launch' is
-- in the live CHECK constraint (see header live-validity checks).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.launch_phases WHERE id = 'white_label_products_2028'
  ) THEN
    INSERT INTO public.launch_phases (
      id, display_name, description, phase_type,
      target_activation_date, activation_status, sort_order, metadata
    ) VALUES (
      'white_label_products_2028',
      'Level 3 White-Label Products',
      'Level 3 White-Label Product program. Lets qualified practitioners produce white-labeled versions of ViaCura formulations under their own brand. Infrastructure built in Prompt #96; activation gated by this phase.',
      'white_label_products_launch',
      '2028-09-01',
      'planned',
      30,
      jsonb_build_object('origin_prompt', 'Prompt #96', 'level', 3)
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- =============================================================================
-- SECTION 3 of 9: from 20260418000440_white_label_storage_buckets.sql
-- =============================================================================
-- Two private buckets. storage.buckets is a LIVE populated table, so each
-- insert is row-absence guarded; the source ON CONFLICT is kept. Object
-- naming convention (enforced in app code, not DB):
--   white-label-brand-assets/{practitioner_id}/logo-primary.{ext}
--   white-label-proofs/{practitioner_id}/{label_design_id}/v{n}.pdf
-- BUCKET FINDING: no code path references either bucket today (see header).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'white-label-brand-assets'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('white-label-brand-assets', 'white-label-brand-assets', false, 5242880,
      ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'])
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'white-label-proofs'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('white-label-proofs', 'white-label-proofs', false, 20971520,
      ARRAY['application/pdf'])
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Practitioner can read their own brand assets; first path segment is the
-- practitioner.id. Admin can read all.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'wl_brand_assets_self_read'
  ) THEN
    CREATE POLICY wl_brand_assets_self_read
      ON storage.objects FOR SELECT TO authenticated
      USING (
        bucket_id = 'white-label-brand-assets' AND
        (storage.foldername(name))[1] IN (
          SELECT id::text FROM public.practitioners WHERE user_id = (select auth.uid())
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'wl_brand_assets_self_write'
  ) THEN
    CREATE POLICY wl_brand_assets_self_write
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'white-label-brand-assets' AND
        (storage.foldername(name))[1] IN (
          SELECT id::text FROM public.practitioners WHERE user_id = (select auth.uid())
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'wl_brand_assets_self_delete'
  ) THEN
    CREATE POLICY wl_brand_assets_self_delete
      ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = 'white-label-brand-assets' AND
        (storage.foldername(name))[1] IN (
          SELECT id::text FROM public.practitioners WHERE user_id = (select auth.uid())
        )
      );
  END IF;
END $$;

-- Proofs: practitioner read+write own; admin all.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'wl_proofs_self_read'
  ) THEN
    CREATE POLICY wl_proofs_self_read
      ON storage.objects FOR SELECT TO authenticated
      USING (
        bucket_id = 'white-label-proofs' AND
        (storage.foldername(name))[1] IN (
          SELECT id::text FROM public.practitioners WHERE user_id = (select auth.uid())
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'wl_proofs_self_write'
  ) THEN
    CREATE POLICY wl_proofs_self_write
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'white-label-proofs' AND
        (storage.foldername(name))[1] IN (
          SELECT id::text FROM public.practitioners WHERE user_id = (select auth.uid())
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'wl_storage_admin_all'
  ) THEN
    CREATE POLICY wl_storage_admin_all
      ON storage.objects FOR ALL TO authenticated
      USING (
        bucket_id IN ('white-label-brand-assets', 'white-label-proofs') AND
        EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin')
      )
      WITH CHECK (
        bucket_id IN ('white-label-brand-assets', 'white-label-proofs') AND
        EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin')
      );
  END IF;
END $$;

-- =============================================================================
-- SECTION 4 of 9: from 20260418000450_white_label_reviewer_assignments.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 4.1 Compliance reviewer roles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.white_label_compliance_reviewer_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_role TEXT NOT NULL CHECK (reviewer_role IN ('compliance_officer', 'medical_director')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, reviewer_role)
);

COMMENT ON TABLE public.white_label_compliance_reviewer_roles IS
  'Which admin holds which compliance reviewer role. Multiple admins per role allowed (back-up coverage); the inbox lists every assignment for every active holder.';

CREATE INDEX IF NOT EXISTS idx_wl_reviewer_roles_active
  ON public.white_label_compliance_reviewer_roles(reviewer_role)
  WHERE is_active = true;

ALTER TABLE public.white_label_compliance_reviewer_roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'white_label_compliance_reviewer_roles'
      AND policyname = 'wl_reviewer_roles_admin_all'
  ) THEN
    CREATE POLICY wl_reviewer_roles_admin_all
      ON public.white_label_compliance_reviewer_roles FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4.2 Reviewer assignments (working set)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.white_label_reviewer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label_design_id UUID NOT NULL REFERENCES public.white_label_label_designs(id) ON DELETE CASCADE,
  reviewer_role TEXT NOT NULL CHECK (reviewer_role IN ('compliance_officer', 'medical_director')),

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'recused')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  completed_by_user_id UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (label_design_id, reviewer_role)
);

COMMENT ON TABLE public.white_label_reviewer_assignments IS
  'Per-(label_design, role) row created on submit. Status flips to completed when the reviewer logs a decision. Permanent history lives in white_label_compliance_reviews.';

CREATE INDEX IF NOT EXISTS idx_wl_reviewer_assign_pending
  ON public.white_label_reviewer_assignments(reviewer_role, assigned_at)
  WHERE status = 'pending';

ALTER TABLE public.white_label_reviewer_assignments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'white_label_reviewer_assignments'
      AND policyname = 'wl_reviewer_assign_admin_all'
  ) THEN
    CREATE POLICY wl_reviewer_assign_admin_all
      ON public.white_label_reviewer_assignments FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));
  END IF;
END $$;

-- Practitioner can read assignment rows for their own labels (read-only).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'white_label_reviewer_assignments'
      AND policyname = 'wl_reviewer_assign_practitioner_read'
  ) THEN
    CREATE POLICY wl_reviewer_assign_practitioner_read
      ON public.white_label_reviewer_assignments FOR SELECT TO authenticated
      USING (
        label_design_id IN (
          SELECT id FROM public.white_label_label_designs
           WHERE practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = (select auth.uid()))
        )
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4.3 SLA-decorated pending-reviews view (000450 form; superseded by the
--     000500 recreate in SECTION 9, kept here to preserve original order)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.wl_pending_reviews_with_sla AS
SELECT
  ra.id              AS assignment_id,
  ra.label_design_id,
  ra.reviewer_role,
  ra.assigned_at,
  EXTRACT(EPOCH FROM (NOW() - ra.assigned_at)) / 3600 AS hours_pending,
  CASE
    WHEN EXTRACT(EPOCH FROM (NOW() - ra.assigned_at)) / 3600 >= 48 THEN 'escalation_due'
    WHEN EXTRACT(EPOCH FROM (NOW() - ra.assigned_at)) / 3600 >= 36 THEN 'reminder_due'
    ELSE 'on_time'
  END                AS sla_status,
  ld.practitioner_id,
  ld.display_product_name,
  ld.version_number,
  ld.status          AS label_status
FROM public.white_label_reviewer_assignments ra
JOIN public.white_label_label_designs ld ON ld.id = ra.label_design_id
WHERE ra.status = 'pending'
ORDER BY ra.assigned_at ASC;

COMMENT ON VIEW public.wl_pending_reviews_with_sla IS
  'Inbox source: pending reviewer assignments with elapsed hours and SLA bucket. Powered by the same thresholds as the pure classifyReviewSla helper (36h reminder, 48h escalation).';

-- =============================================================================
-- SECTION 5 of 9: from 20260418000460_clone_label_design_revision_rpc.sql
-- =============================================================================
-- SECURITY DEFINER and search_path pin are the source's own. Function-body
-- auth.uid() stays bare (initplan wrapping applies to policies).

CREATE OR REPLACE FUNCTION public.clone_label_design_revision(
  p_source_design_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_caller_practitioner_id UUID;
  v_source RECORD;
  v_new_id UUID;
BEGIN
  -- Resolve caller -> practitioner.id.
  SELECT id INTO v_caller_practitioner_id
    FROM public.practitioners
   WHERE user_id = auth.uid();
  IF v_caller_practitioner_id IS NULL THEN
    RAISE EXCEPTION 'Caller has no practitioner record';
  END IF;

  -- Load the source row + ownership check.
  SELECT * INTO v_source
    FROM public.white_label_label_designs
   WHERE id = p_source_design_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source design not found';
  END IF;
  IF v_source.practitioner_id != v_caller_practitioner_id THEN
    RAISE EXCEPTION 'Forbidden: design belongs to another practitioner';
  END IF;
  IF NOT v_source.is_current_version THEN
    RAISE EXCEPTION 'Only the current version can be revised';
  END IF;

  WITH demoted AS (
    UPDATE public.white_label_label_designs
       SET is_current_version = false,
           updated_at = NOW()
     WHERE id = p_source_design_id
     RETURNING id
  )
  INSERT INTO public.white_label_label_designs (
    practitioner_id, brand_configuration_id, product_catalog_id,
    display_product_name, short_description, long_description, tagline,
    layout_template, structure_function_claims, usage_directions, warning_text,
    supplement_facts_panel_data, allergen_statement, other_ingredients,
    manufacturer_line, status,
    version_number, parent_design_id, is_current_version
  )
  SELECT
    v_source.practitioner_id, v_source.brand_configuration_id, v_source.product_catalog_id,
    v_source.display_product_name, v_source.short_description, v_source.long_description, v_source.tagline,
    v_source.layout_template, v_source.structure_function_claims, v_source.usage_directions, v_source.warning_text,
    v_source.supplement_facts_panel_data, v_source.allergen_statement, v_source.other_ingredients,
    v_source.manufacturer_line,
    'draft',
    v_source.version_number + 1,
    p_source_design_id,
    true
  FROM demoted
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.clone_label_design_revision(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clone_label_design_revision(UUID) TO authenticated;

COMMENT ON FUNCTION public.clone_label_design_revision IS
  'Atomic versioning of a label design. Demotes the current row + inserts a new draft with version_number+1 in a single CTE so uq_label_design_one_current is never violated.';

-- =============================================================================
-- SECTION 6 of 9: from 20260418000470_white_label_order_number_seq.sql
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS public.white_label_order_number_seq START 1;

CREATE OR REPLACE FUNCTION public.next_white_label_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_n BIGINT;
BEGIN
  v_n := nextval('public.white_label_order_number_seq');
  RETURN 'WL-' || to_char(NOW(), 'YYYYMM') || '-' || lpad(v_n::TEXT, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.next_white_label_order_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_white_label_order_number() TO authenticated;

COMMENT ON FUNCTION public.next_white_label_order_number IS
  'Returns the next human-readable production order number. Combines a monotonic sequence with the current YYYYMM so reordering by name approximates chronological order in dashboards.';

-- =============================================================================
-- SECTION 7 of 9: from 20260418000480_white_label_dispensary_settings.sql
-- =============================================================================
-- The practitioners.dispensary_slug slice (column, COMMENT, index) is NOT
-- repeated here: F1 (20260707150000) carried it verbatim and is applied.
-- The broad wl_disp_published_read policy from this source is NOT emitted:
-- 20260418000500 replaces it under the same name with a tightened version,
-- which rides in SECTION 9 (see header).

CREATE TABLE IF NOT EXISTS public.white_label_dispensary_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  label_design_id UUID NOT NULL REFERENCES public.white_label_label_designs(id) ON DELETE CASCADE,

  retail_price_cents INTEGER NOT NULL CHECK (retail_price_cents >= 0),
  patient_facing_description TEXT,

  is_published BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (practitioner_id, label_design_id)
);

COMMENT ON TABLE public.white_label_dispensary_settings IS
  'Per-product dispensary configuration. retail_price_cents is set entirely at the practitioners discretion (no MAP enforcement on white-label). is_published gates patient visibility; is_featured promotes to the top of the list.';

CREATE INDEX IF NOT EXISTS idx_wl_disp_published
  ON public.white_label_dispensary_settings(practitioner_id)
  WHERE is_published = true;

ALTER TABLE public.white_label_dispensary_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'white_label_dispensary_settings'
      AND policyname = 'wl_disp_self_rw'
  ) THEN
    CREATE POLICY wl_disp_self_rw
      ON public.white_label_dispensary_settings FOR ALL TO authenticated
      USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = (select auth.uid())))
      WITH CHECK (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = (select auth.uid())));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'white_label_dispensary_settings'
      AND policyname = 'wl_disp_admin_all'
  ) THEN
    CREATE POLICY wl_disp_admin_all
      ON public.white_label_dispensary_settings FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));
  END IF;
END $$;

-- =============================================================================
-- SECTION 8 of 9: from 20260418000490_white_label_phase7_governance_and_economics.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 8.1 Governable supporting tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.white_label_discount_tiers (
  id TEXT PRIMARY KEY,
  min_units INTEGER NOT NULL,
  -- max_units NULL = open upper bound
  max_units INTEGER,
  discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 0 AND 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.white_label_discount_tiers IS
  'Per-tier wholesale discount percent for white-label production runs. Loaded by the order route at quote time.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.white_label_discount_tiers
  ) THEN
    INSERT INTO public.white_label_discount_tiers (id, min_units, max_units, discount_percent) VALUES
      ('tier_100_499',   100,  499,  60),
      ('tier_500_999',   500,  999,  65),
      ('tier_1000_plus', 1000, NULL, 70)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

ALTER TABLE public.white_label_discount_tiers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'white_label_discount_tiers'
      AND policyname = 'wl_disc_tiers_read_all'
  ) THEN
    CREATE POLICY wl_disc_tiers_read_all
      ON public.white_label_discount_tiers FOR SELECT TO authenticated
      USING (is_active = true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'white_label_discount_tiers'
      AND policyname = 'wl_disc_tiers_admin_all'
  ) THEN
    CREATE POLICY wl_disc_tiers_admin_all
      ON public.white_label_discount_tiers FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.white_label_parameters (
  id TEXT PRIMARY KEY,
  minimum_order_value_cents BIGINT NOT NULL,
  expedited_surcharge_percent INTEGER NOT NULL CHECK (expedited_surcharge_percent BETWEEN 0 AND 100),
  storage_fee_cents_per_unit_day INTEGER NOT NULL CHECK (storage_fee_cents_per_unit_day >= 0),
  free_storage_days INTEGER NOT NULL CHECK (free_storage_days >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.white_label_parameters IS
  'Singleton-style table (id=default) holding the scalar governable parameters for the white-label program. Loaded by the order route + the storage-fee tick.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.white_label_parameters
  ) THEN
    INSERT INTO public.white_label_parameters (
      id, minimum_order_value_cents, expedited_surcharge_percent,
      storage_fee_cents_per_unit_day, free_storage_days
    ) VALUES
      ('default', 1500000, 15, 2, 60)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

ALTER TABLE public.white_label_parameters ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'white_label_parameters'
      AND policyname = 'wl_params_read_all'
  ) THEN
    CREATE POLICY wl_params_read_all
      ON public.white_label_parameters FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'white_label_parameters'
      AND policyname = 'wl_params_admin_all'
  ) THEN
    CREATE POLICY wl_params_admin_all
      ON public.white_label_parameters FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 8.2 Pricing-domain registrations
-- ---------------------------------------------------------------------------
-- The source's table-existence guard is kept as the outer IF (nested so the
-- inner statements are never parsed when the table is absent); the inner IF
-- adds the row-absence guard for a LIVE populated table. Source ON CONFLICT
-- kept. All nine column names live-validated (see header).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pricing_domains'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.pricing_domains WHERE id = 'wl_discount_tier_100_499'
    ) THEN
      INSERT INTO public.pricing_domains (
        id, display_name, category, target_table, target_column,
        requires_grandfathering, default_grandfathering_policy,
        description, sort_order
      ) VALUES
        ('wl_discount_tier_100_499', 'White-Label Discount Tier 100 to 499 Units',
          'wholesale_discount', 'white_label_discount_tiers', 'discount_percent',
          true, 'six_months',
          'Discount percentage for white-label production orders at the 100 to 499 unit tier. Default 60.', 80),
        ('wl_discount_tier_500_999', 'White-Label Discount Tier 500 to 999 Units',
          'wholesale_discount', 'white_label_discount_tiers', 'discount_percent',
          true, 'six_months',
          'Discount percentage for the 500 to 999 unit tier. Default 65.', 81),
        ('wl_discount_tier_1000_plus', 'White-Label Discount Tier 1000+ Units',
          'wholesale_discount', 'white_label_discount_tiers', 'discount_percent',
          true, 'six_months',
          'Discount percentage for the 1000+ unit tier. Default 70.', 82),
        ('wl_minimum_order_value', 'White-Label Minimum Order Value',
          'wholesale_discount', 'white_label_parameters', 'minimum_order_value_cents',
          false, 'no_grandfathering',
          'Minimum total order value for a white-label production run. Default 1500000 cents ($15,000).', 83),
        ('wl_expedited_surcharge', 'White-Label Expedited Production Surcharge',
          'wholesale_discount', 'white_label_parameters', 'expedited_surcharge_percent',
          false, 'no_grandfathering',
          'Surcharge percent for expedited (6 week) production timeline. Default 15.', 84),
        ('wl_storage_fee_per_unit_day', 'White-Label Storage Fee Per Unit Per Day',
          'wholesale_discount', 'white_label_parameters', 'storage_fee_cents_per_unit_day',
          false, 'no_grandfathering',
          'Daily per-unit storage fee for ViaCura-held inventory beyond the free window. Default 2 cents.', 85),
        ('wl_free_storage_days', 'White-Label Free Storage Days',
          'wholesale_discount', 'white_label_parameters', 'free_storage_days',
          false, 'no_grandfathering',
          'Days of free storage at ViaCura warehouse before storage fees begin. Default 60.', 86)
      ON CONFLICT (id) DO NOTHING;
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 8.3 Unit economics view (Prompt #94 integration)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.white_label_economics AS
SELECT
  wle.practitioner_id,
  wle.status                                                 AS enrollment_status,
  COUNT(DISTINCT wpo.id) FILTER (WHERE wpo.status IN ('shipped', 'delivered')) AS lifetime_production_orders,
  COALESCE(SUM(wpo.total_cents) FILTER (WHERE wpo.status IN ('shipped', 'delivered')), 0)::BIGINT AS lifetime_production_revenue_cents,
  COALESCE(AVG(wpo.total_cents) FILTER (WHERE wpo.status IN ('shipped', 'delivered')), 0)::BIGINT AS average_production_order_cents,
  MAX(wpo.delivered_at)                                      AS most_recent_delivery_at,
  COALESCE(SUM(wil.units_sold), 0)                           AS total_units_sold_to_patients,
  COALESCE(SUM(
    wil.units_produced - wil.units_sold - wil.units_expired - wil.units_returned - wil.units_recalled
  ), 0)                                                      AS units_on_hand,
  COALESCE(SUM(wil.viacura_storage_fee_accrued_cents), 0)::BIGINT AS storage_fees_accrued_cents
FROM public.white_label_enrollments wle
LEFT JOIN public.white_label_production_orders wpo
       ON wpo.enrollment_id = wle.id
LEFT JOIN public.white_label_inventory_lots wil
       ON wil.practitioner_id = wle.practitioner_id
GROUP BY wle.practitioner_id, wle.status;

COMMENT ON VIEW public.white_label_economics IS
  'Per-practitioner white-label aggregates for the unit economics dashboard (Prompt #94). Counts only shipped + delivered production orders toward revenue.';

-- =============================================================================
-- SECTION 9 of 9: from 20260418000500_white_label_audit_remediation.sql
-- =============================================================================

-- 9.1 stripe_refund_id on production orders
ALTER TABLE public.white_label_production_orders
  ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT,
  ADD COLUMN IF NOT EXISTS refund_amount_cents BIGINT,
  ADD COLUMN IF NOT EXISTS refund_recorded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.white_label_production_orders.stripe_refund_id IS
  'Stripe refund object id when a deposit refund was issued during cancellation. Used as the idempotency anchor on retry.';

-- 9.2 parent_design_id FK (source guard kept verbatim)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'wl_label_designs_parent_design_id_fkey'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.white_label_label_designs
      ADD CONSTRAINT wl_label_designs_parent_design_id_fkey
      FOREIGN KEY (parent_design_id) REFERENCES public.white_label_label_designs(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 9.3 Recreate the inbox view filtered by is_current_version. The source
-- pair was DROP VIEW IF EXISTS + CREATE VIEW; carried as CREATE OR REPLACE
-- VIEW because the identical column list makes OR REPLACE exact and the
-- view is absent live (created above in SECTION 4). No DROP is carried.
CREATE OR REPLACE VIEW public.wl_pending_reviews_with_sla AS
SELECT
  ra.id              AS assignment_id,
  ra.label_design_id,
  ra.reviewer_role,
  ra.assigned_at,
  EXTRACT(EPOCH FROM (NOW() - ra.assigned_at)) / 3600 AS hours_pending,
  CASE
    WHEN EXTRACT(EPOCH FROM (NOW() - ra.assigned_at)) / 3600 >= 48 THEN 'escalation_due'
    WHEN EXTRACT(EPOCH FROM (NOW() - ra.assigned_at)) / 3600 >= 36 THEN 'reminder_due'
    ELSE 'on_time'
  END                AS sla_status,
  ld.practitioner_id,
  ld.display_product_name,
  ld.version_number,
  ld.status          AS label_status
FROM public.white_label_reviewer_assignments ra
JOIN public.white_label_label_designs ld ON ld.id = ra.label_design_id
WHERE ra.status = 'pending'
  AND ld.is_current_version = true
ORDER BY ra.assigned_at ASC;

COMMENT ON VIEW public.wl_pending_reviews_with_sla IS
  'Inbox source: pending assignments for the current version of each label only. Stale assignments tied to revised-away versions are filtered. Same SLA buckets as the pure classifyReviewSla helper (36h reminder, 48h escalation).';

-- 9.4 Tightened dispensary read policy (replaces the 000480 broad draft,
-- which is not emitted anywhere in this file). LIVE-VALIDITY REWRITE per
-- the header: pp.patient_user_id (phantom) becomes pp.patient_id, and the
-- practitioner id spaces are bridged via practitioners.user_id because
-- practitioner_patients.practitioner_id holds an auth.users id (F1 CREATE
-- TABLE) while white_label_dispensary_settings.practitioner_id holds a
-- practitioners.id. Precedent: F1 policy practitioners_patient_read_public.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'white_label_dispensary_settings'
      AND policyname = 'wl_disp_published_read'
  ) THEN
    CREATE POLICY wl_disp_published_read
      ON public.white_label_dispensary_settings FOR SELECT TO authenticated
      USING (
        is_published = true
        AND (
          -- caller is an active patient of this practitioner
          EXISTS (
            SELECT 1
              FROM public.practitioner_patients pp
              JOIN public.practitioners pr ON pr.user_id = pp.practitioner_id
             WHERE pr.id = white_label_dispensary_settings.practitioner_id
               AND pp.patient_id = (select auth.uid())
               AND pp.status = 'active'
          )
          -- OR caller is an admin
          OR EXISTS (
            SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'
          )
        )
      );
  END IF;
END $$;

COMMENT ON POLICY wl_disp_published_read ON public.white_label_dispensary_settings IS
  'Dispensary published items are readable only by active patients of the practitioner or by admins. Replaces the broader policy from _480 which let any authenticated user enumerate published products across all practitioners.';

-- 9.5 Re-affirm compliance review immutability ("drop" reworded to "remove"
-- so this file carries zero DROP tokens; same meaning)
COMMENT ON FUNCTION public.block_compliance_review_mutation IS
  'Immutability enforcer for white_label_compliance_reviews. Triggers fire on every UPDATE / DELETE on the table regardless of the caller; SECURITY DEFINER RPCs are NOT a bypass. To support legitimate retraction in the future, ADD a new review row recording the retraction rather than mutating the original. Do not modify or remove this trigger.';
