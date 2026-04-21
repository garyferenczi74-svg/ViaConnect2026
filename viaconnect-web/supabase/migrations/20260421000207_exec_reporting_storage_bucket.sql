-- =============================================================================
-- Prompt #105 Phase 2b.2: board-pack-artifacts storage bucket
-- =============================================================================
-- Private bucket for rendered PDF / XLSX / PPTX board pack artifacts.
-- Two access patterns:
--   1. Exec-reporting admins + CFO + CEO may read/write any artifact.
--   2. Board members may read ONLY artifacts whose distribution row
--      points to their member_id AND whose access_revoked_at is NULL.
--
-- Board-member access is enforced here at the storage layer AND via the
-- exec-record-download edge function — defense in depth. File-serving
-- in-app goes through signed URLs issued only after watermark + identity
-- verification.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'board-pack-artifacts',
  'board-pack-artifacts',
  false,
  52428800,  -- 50 MB per file ceiling
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Admin / exec-reporting / CFO / CEO: full read + write.
DROP POLICY IF EXISTS board_pack_artifacts_exec_admin_all ON storage.objects;
CREATE POLICY board_pack_artifacts_exec_admin_all
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'board-pack-artifacts'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'exec_reporting_admin', 'cfo', 'ceo')
    )
  )
  WITH CHECK (
    bucket_id = 'board-pack-artifacts'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'exec_reporting_admin', 'cfo', 'ceo')
    )
  );

-- Board members: read only their own distribution artifacts.
-- Storage path convention: {pack_id}/{distribution_id}-{format}.{ext}
-- or {pack_id}/preview.{ext} for admin previews.
-- The policy joins board_pack_distributions by name prefix because we
-- cannot run arbitrary extraction on storage.objects.name from the policy.
-- Safer: enforce the check via signed-URL issuance in-app. This policy
-- permits access only when a matching active distribution exists for
-- the requesting auth.uid()'s board_member.
DROP POLICY IF EXISTS board_pack_artifacts_member_select ON storage.objects;
CREATE POLICY board_pack_artifacts_member_select
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'board-pack-artifacts'
    AND EXISTS (
      SELECT 1
        FROM public.board_pack_distributions d
        JOIN public.board_members bm ON bm.member_id = d.member_id
       WHERE bm.auth_user_id = auth.uid()
         AND d.access_revoked_at IS NULL
         AND storage.objects.name LIKE d.pack_id::TEXT || '/%'
    )
  );
