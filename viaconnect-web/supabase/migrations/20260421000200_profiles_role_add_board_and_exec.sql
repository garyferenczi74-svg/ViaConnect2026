-- Prompt #105: extend profiles.role with cfo, ceo, board_member, exec_reporting_admin.
-- The board portal depends on a distinct board_member role that can authenticate
-- into /board without admin privileges. CFO + CEO roles gate the approval chain.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role = ANY (ARRAY[
  'patient','practitioner','admin','compliance_officer',
  'cfo','ceo','board_member','exec_reporting_admin'
]));

COMMENT ON CONSTRAINT profiles_role_check ON public.profiles IS
  'Roles: patient, practitioner, admin, compliance_officer (Prompt #101), cfo, ceo, board_member, exec_reporting_admin (Prompt #105). Users may hold multiple roles via duplicated rows.';
