-- =============================================================================
-- Prompt #103 Phase 7 (Jeffery review fix): packaging proofs storage bucket
-- =============================================================================
-- Jeffery flagged that the brand_compliance_validator Edge Function
-- downloads from a "packaging-proofs" bucket that was never
-- provisioned. This migration creates the bucket + tight admin-only
-- write RLS, with practitioner self-read limited to their own
-- practice's proof paths once ownership gets modeled.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'packaging-proofs',
  'packaging-proofs',
  false,
  20971520,              -- 20 MB per file (high-res bottle proofs)
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Admin reads + writes every proof.
DROP POLICY IF EXISTS packaging_proofs_admin_all ON storage.objects;
CREATE POLICY packaging_proofs_admin_all
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'packaging-proofs'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    bucket_id = 'packaging-proofs'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Authenticated users can read proofs for products that have
-- can_publish_to_storefront = TRUE (i.e., storefront-visible products).
-- Unpublished proofs remain admin-only.
DROP POLICY IF EXISTS packaging_proofs_public_read_published ON storage.objects;
CREATE POLICY packaging_proofs_public_read_published
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'packaging-proofs'
    AND EXISTS (
      SELECT 1 FROM public.products
      WHERE packaging_proof_path = storage.objects.name
        AND can_publish_to_storefront = TRUE
    )
  );
