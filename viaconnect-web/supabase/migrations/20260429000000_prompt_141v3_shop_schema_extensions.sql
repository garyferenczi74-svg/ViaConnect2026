-- 20260429000000_prompt_141v3_shop_schema_extensions.sql
-- Phase B of Prompt #141 v3 (Shop Redesign + Card System Clone).
-- Extends the products table with shop-display columns and creates the
-- categories lookup table for the seven canonical Via Cura shop categories.
--
-- Existing data is untouched. All new columns default to safe empty values
-- so existing read paths continue to work. Backfill happens in separate
-- prompts; missing data is rendered via the dev-only ribbon plus the
-- production category fallback per spec sections 7.3 and 4.4.
--
-- Peptides are explicitly out of scope for the shop. The category column
-- already includes 'peptide' as a CHECK-allowed value; the new product_type
-- column is added so peptide exclusion can be enforced defensively from
-- both axes per spec section 7.1.

BEGIN;

-- 1. New columns on products.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_slug text,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS format text,
  ADD COLUMN IF NOT EXISTS status_tags jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS image_urls jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS testing_meta jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS snp_targets jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bioavailability_pct numeric,
  ADD COLUMN IF NOT EXISTS product_type text,
  ADD COLUMN IF NOT EXISTS ingredients jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS price_msrp numeric,
  ADD COLUMN IF NOT EXISTS gene_match_score numeric,
  ADD COLUMN IF NOT EXISTS requires_practitioner_order boolean DEFAULT false;

-- 2. Indexes for the seven PLP queries, peptide exclusion, and slug lookup.
CREATE INDEX IF NOT EXISTS idx_products_category_slug
  ON public.products(category_slug)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_products_product_type
  ON public.products(product_type);

CREATE INDEX IF NOT EXISTS idx_products_slug
  ON public.products(slug)
  WHERE active = true;

-- 3. Categories lookup table.
CREATE TABLE IF NOT EXISTS public.categories (
  slug text PRIMARY KEY,
  name text NOT NULL,
  tagline text NOT NULL,
  hero_image_url text,
  display_order integer NOT NULL DEFAULT 0,
  card_variant text NOT NULL DEFAULT 'supplement',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_card_variant_check CHECK (card_variant IN ('supplement', 'testing'))
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Public read access. Writes blocked at the policy layer; only service_role
-- bypasses RLS. Matches the pattern used by other public-read lookup tables.
CREATE POLICY "Public can read categories"
  ON public.categories FOR SELECT
  USING (true);

-- 4. Seed the seven canonical categories per spec section 3.
INSERT INTO public.categories (slug, name, tagline, display_order, card_variant) VALUES
  ('base-formulations', 'Base Formulations', 'Core building blocks. The foundation of every Via Cura protocol.', 1, 'supplement'),
  ('advanced-formulas', 'Advanced Formulas', 'Targeted protocols for performance, longevity, and health optimization.', 2, 'supplement'),
  ('womens-health', 'Women''s Health', 'Hormonal balance, prenatal, postnatal, and female wellness formulas.', 3, 'supplement'),
  ('childrens-formulations', 'Children''s Formulations', 'Age-appropriate methylated nutrition for infants, toddlers, and children.', 4, 'supplement'),
  ('methylation-snp', 'Methylation SNP Support', 'Precision formulas targeting MTHFR, COMT, VDR, and 80+ genetic variants.', 5, 'supplement'),
  ('genex360', 'GeneX360 Testing and Diagnostics', 'Genetic, hormone, and biological age testing for personalized protocols.', 6, 'testing'),
  ('functional-mushrooms', 'Functional Mushrooms', 'Adaptogenic mushroom extracts for immune, cognitive, and metabolic support.', 7, 'supplement')
ON CONFLICT (slug) DO NOTHING;

-- 5. Foreign key linking products to categories. Existing products have
-- category_slug NULL until backfilled. The constraint validates new rows but
-- tolerates NULL via standard FK semantics.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'products_category_slug_fkey'
      AND table_schema = 'public'
      AND table_name = 'products'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_category_slug_fkey
      FOREIGN KEY (category_slug)
      REFERENCES public.categories(slug)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

COMMIT;
