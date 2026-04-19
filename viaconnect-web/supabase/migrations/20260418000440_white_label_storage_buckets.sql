-- =============================================================================
-- Prompt #96 Phase 3: White-label storage buckets
-- =============================================================================
-- Append-only. Two storage buckets:
--   white-label-brand-assets   logos, wordmarks per practitioner
--   white-label-proofs         PDF design proofs per label design
--
-- Both private; access mediated by storage RLS policies that mirror the
-- table-level policies on practitioner_brand_configurations and
-- white_label_label_designs (practitioner sees own; admin sees all).
--
-- Object naming convention (enforced in app code, not DB):
--   white-label-brand-assets/{practitioner_id}/logo-primary.{ext}
--   white-label-brand-assets/{practitioner_id}/logo-secondary.{ext}
--   white-label-proofs/{practitioner_id}/{label_design_id}/v{n}.pdf
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('white-label-brand-assets', 'white-label-brand-assets', false, 5242880,
    ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']),
  ('white-label-proofs',       'white-label-proofs',       false, 20971520,
    ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Practitioner can read their own brand assets; first path segment is the
-- practitioner.id. Admin can read all.
DROP POLICY IF EXISTS wl_brand_assets_self_read ON storage.objects;
CREATE POLICY wl_brand_assets_self_read
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'white-label-brand-assets' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.practitioners WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS wl_brand_assets_self_write ON storage.objects;
CREATE POLICY wl_brand_assets_self_write
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'white-label-brand-assets' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.practitioners WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS wl_brand_assets_self_delete ON storage.objects;
CREATE POLICY wl_brand_assets_self_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'white-label-brand-assets' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.practitioners WHERE user_id = auth.uid()
    )
  );

-- Proofs: practitioner read+write own; admin all.
DROP POLICY IF EXISTS wl_proofs_self_read ON storage.objects;
CREATE POLICY wl_proofs_self_read
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'white-label-proofs' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.practitioners WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS wl_proofs_self_write ON storage.objects;
CREATE POLICY wl_proofs_self_write
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'white-label-proofs' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.practitioners WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS wl_storage_admin_all ON storage.objects;
CREATE POLICY wl_storage_admin_all
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id IN ('white-label-brand-assets', 'white-label-proofs') AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    bucket_id IN ('white-label-brand-assets', 'white-label-proofs') AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
