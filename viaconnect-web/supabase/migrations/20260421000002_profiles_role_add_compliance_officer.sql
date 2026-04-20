-- Prompt #101: add compliance_officer role for sensitive-note access.
-- EXCLUDES: all forbidden reward-program tables per #17b Addendum

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['patient','practitioner','admin','compliance_officer']));

COMMENT ON CONSTRAINT profiles_role_check ON public.profiles IS
  'Roles: patient (consumer), practitioner (L1+), admin (full), compliance_officer (read-only access to MAP VIP sensitive notes per Prompt #101 §3.3).';
