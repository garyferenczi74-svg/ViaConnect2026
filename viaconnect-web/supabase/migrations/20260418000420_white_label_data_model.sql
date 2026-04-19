-- =============================================================================
-- Prompt #96 Phase 1: Level 3 White-Label Products data model
-- =============================================================================
-- Append-only. Ten tables that scaffold the white-label product line:
--   1.  white_label_enrollments              practitioner enrollment + status
--   2.  white_label_catalog_config           per-SKU eligibility + parameters
--   3.  practitioner_brand_configurations    one brand per enrolled practitioner
--   4.  white_label_label_designs            per-product label + workflow state
--   5.  white_label_compliance_reviews       immutable review log
--   6.  white_label_production_orders        manufacturing batches + payment
--   7.  white_label_production_order_items   line items + lot/QC metadata
--   8.  white_label_inventory_lots           produced inventory by lot
--   9.  white_label_sku_mappings             practitioner SKU to ViaCura SKU
--   10. white_label_recalls                  recall tracking
--
-- All tables are RLS-protected: enrolled practitioners see their own rows,
-- admins see all. Compliance reviews are immutable at the trigger level
-- (UPDATE/DELETE blocked) so the audit trail survives any future RLS or
-- application-layer regression.
--
-- Catalog seed pulls only category='supplement' rows from product_catalog;
-- peptides, GeneX360 kits, and other categories are explicitly excluded
-- per the no-peptide guardrail. This file uses product_catalog.active
-- (not is_active, which does not exist in the existing schema) and
-- converts price (NUMERIC dollars) to base_msrp_cents via ROUND(price*100).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enrollments
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

DROP POLICY IF EXISTS wl_enroll_self_read  ON public.white_label_enrollments;
CREATE POLICY wl_enroll_self_read
  ON public.white_label_enrollments FOR SELECT TO authenticated
  USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS wl_enroll_admin_all ON public.white_label_enrollments;
CREATE POLICY wl_enroll_admin_all
  ON public.white_label_enrollments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------------------------
-- 2. Catalog config
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

DROP POLICY IF EXISTS wl_catalog_read_enrolled ON public.white_label_catalog_config;
CREATE POLICY wl_catalog_read_enrolled
  ON public.white_label_catalog_config FOR SELECT TO authenticated
  USING (
    is_white_label_eligible = true AND is_active = true AND
    EXISTS (
      SELECT 1
        FROM public.white_label_enrollments we
        JOIN public.practitioners p ON p.id = we.practitioner_id
       WHERE p.user_id = auth.uid()
         AND we.status IN ('brand_setup', 'first_production_order', 'active')
    )
  );

DROP POLICY IF EXISTS wl_catalog_admin_all ON public.white_label_catalog_config;
CREATE POLICY wl_catalog_admin_all
  ON public.white_label_catalog_config FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Seed: only category='supplement' SKUs. Peptides, GeneX360, diagnostics
-- explicitly excluded. product_catalog.price is NUMERIC dollars; convert
-- to integer cents at boundary. cogs_cents may be NULL (LTV engine
-- fallback was 35% of price); mirror that behavior on the seed.
INSERT INTO public.white_label_catalog_config (
  product_catalog_id, is_white_label_eligible, is_retail_exclusive,
  base_msrp_cents, base_cogs_cents, production_minimum_moq
)
SELECT
  pc.id,
  true,
  false,
  ROUND(pc.price * 100)::INTEGER,
  COALESCE(pc.cogs_cents, ROUND(pc.price * 100 * 0.35)::INTEGER),
  100
FROM public.product_catalog pc
WHERE pc.category = 'supplement'
  AND pc.active = true
ON CONFLICT (product_catalog_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Practitioner brand configurations
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

DROP POLICY IF EXISTS brand_config_self_rw ON public.practitioner_brand_configurations;
CREATE POLICY brand_config_self_rw
  ON public.practitioner_brand_configurations FOR ALL TO authenticated
  USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()))
  WITH CHECK (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS brand_config_admin_all ON public.practitioner_brand_configurations;
CREATE POLICY brand_config_admin_all
  ON public.practitioner_brand_configurations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------------------------
-- 4. Label designs
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

DROP POLICY IF EXISTS label_design_self_rw ON public.white_label_label_designs;
CREATE POLICY label_design_self_rw
  ON public.white_label_label_designs FOR ALL TO authenticated
  USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()))
  WITH CHECK (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS label_design_admin_all ON public.white_label_label_designs;
CREATE POLICY label_design_admin_all
  ON public.white_label_label_designs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------------------------
-- 5. Compliance reviews (immutable)
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

DROP POLICY IF EXISTS compliance_review_practitioner_read ON public.white_label_compliance_reviews;
CREATE POLICY compliance_review_practitioner_read
  ON public.white_label_compliance_reviews FOR SELECT TO authenticated
  USING (
    label_design_id IN (
      SELECT id FROM public.white_label_label_designs
       WHERE practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS compliance_review_admin_all ON public.white_label_compliance_reviews;
CREATE POLICY compliance_review_admin_all
  ON public.white_label_compliance_reviews FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE OR REPLACE FUNCTION public.block_compliance_review_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'white_label_compliance_reviews is immutable. UPDATE and DELETE are not permitted.';
END;
$$;

DROP TRIGGER IF EXISTS block_compliance_review_update_trigger ON public.white_label_compliance_reviews;
CREATE TRIGGER block_compliance_review_update_trigger
  BEFORE UPDATE ON public.white_label_compliance_reviews
  FOR EACH ROW EXECUTE FUNCTION public.block_compliance_review_mutation();

DROP TRIGGER IF EXISTS block_compliance_review_delete_trigger ON public.white_label_compliance_reviews;
CREATE TRIGGER block_compliance_review_delete_trigger
  BEFORE DELETE ON public.white_label_compliance_reviews
  FOR EACH ROW EXECUTE FUNCTION public.block_compliance_review_mutation();

-- ---------------------------------------------------------------------------
-- 6. Production orders
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

DROP POLICY IF EXISTS wl_prod_order_self_read ON public.white_label_production_orders;
CREATE POLICY wl_prod_order_self_read
  ON public.white_label_production_orders FOR SELECT TO authenticated
  USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS wl_prod_order_admin_all ON public.white_label_production_orders;
CREATE POLICY wl_prod_order_admin_all
  ON public.white_label_production_orders FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------------------------
-- 7. Production order items
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

DROP POLICY IF EXISTS wl_poi_self_read ON public.white_label_production_order_items;
CREATE POLICY wl_poi_self_read
  ON public.white_label_production_order_items FOR SELECT TO authenticated
  USING (production_order_id IN (
    SELECT id FROM public.white_label_production_orders
     WHERE practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
  ));

DROP POLICY IF EXISTS wl_poi_admin_all ON public.white_label_production_order_items;
CREATE POLICY wl_poi_admin_all
  ON public.white_label_production_order_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------------------------
-- 8. Inventory lots
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

DROP POLICY IF EXISTS wl_inventory_self_read ON public.white_label_inventory_lots;
CREATE POLICY wl_inventory_self_read
  ON public.white_label_inventory_lots FOR SELECT TO authenticated
  USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS wl_inventory_admin_all ON public.white_label_inventory_lots;
CREATE POLICY wl_inventory_admin_all
  ON public.white_label_inventory_lots FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------------------------
-- 9. SKU mappings (white-label SKU to underlying ViaCura SKU)
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

DROP POLICY IF EXISTS wl_sku_map_self_read ON public.white_label_sku_mappings;
CREATE POLICY wl_sku_map_self_read
  ON public.white_label_sku_mappings FOR SELECT TO authenticated
  USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS wl_sku_map_admin_all ON public.white_label_sku_mappings;
CREATE POLICY wl_sku_map_admin_all
  ON public.white_label_sku_mappings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------------------------
-- 10. Recalls
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

DROP POLICY IF EXISTS wl_recall_admin_all ON public.white_label_recalls;
CREATE POLICY wl_recall_admin_all
  ON public.white_label_recalls FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- A practitioner can see a recall when one of their inventory lots is in scope.
DROP POLICY IF EXISTS wl_recall_affected_practitioner_read ON public.white_label_recalls;
CREATE POLICY wl_recall_affected_practitioner_read
  ON public.white_label_recalls FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.white_label_inventory_lots il
        JOIN public.practitioners p ON p.id = il.practitioner_id
       WHERE p.user_id = auth.uid()
         AND (il.product_catalog_id = ANY(public.white_label_recalls.affected_product_catalog_ids)
              OR il.lot_number = ANY(public.white_label_recalls.affected_lot_numbers))
    )
  );
