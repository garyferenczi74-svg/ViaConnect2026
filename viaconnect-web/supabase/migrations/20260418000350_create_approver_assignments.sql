-- =============================================================================
-- Prompt #95 Phase 2.1: Approver assignments.
-- =============================================================================
-- Maps approver roles (ceo, cfo, advisory_cto, advisory_medical,
-- board_member) to real auth.users IDs. Multiple board members can hold
-- board_member simultaneously; ceo/cfo typically have a single active
-- holder but the schema does not enforce that so transitions are clean.
-- Historical assignments are preserved via unassigned_at (not DELETE) so
-- past approver routing can be reconstructed for audit.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.approver_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approver_role TEXT NOT NULL CHECK (approver_role IN (
    'ceo', 'cfo', 'advisory_cto', 'advisory_medical', 'board_member'
  )),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  unassigned_at TIMESTAMPTZ,
  unassigned_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN GENERATED ALWAYS AS (unassigned_at IS NULL) STORED,

  UNIQUE (approver_role, user_id, unassigned_at)
);

COMMENT ON TABLE public.approver_assignments IS
  'Maps approver roles to real user IDs. Historical assignments preserved via unassigned_at rather than DELETE.';
COMMENT ON COLUMN public.approver_assignments.is_active IS
  'Generated from unassigned_at IS NULL. True for current assignments.';

CREATE INDEX IF NOT EXISTS idx_approver_assignments_active
  ON public.approver_assignments(approver_role)
  WHERE is_active = true;

ALTER TABLE public.approver_assignments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='approver_assignments' AND policyname='approver_assignments_admin_all') THEN
    CREATE POLICY "approver_assignments_admin_all"
      ON public.approver_assignments FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- Seed: Gary as CEO (only admin currently in auth.users).
-- Domenic, Thomas, Fadi to be assigned via the Phase 2 admin UI once their
-- accounts are created.
INSERT INTO public.approver_assignments (approver_role, user_id, assigned_by)
SELECT 'ceo', u.id, u.id
FROM auth.users u
WHERE u.email = 'gary@farmceuticawellness.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.approver_assignments a
    WHERE a.approver_role = 'ceo'
      AND a.user_id = u.id
      AND a.unassigned_at IS NULL
  );
