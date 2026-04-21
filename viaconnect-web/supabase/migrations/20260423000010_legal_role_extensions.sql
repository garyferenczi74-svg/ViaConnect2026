-- =============================================================================
-- Prompt #104 Phase 1: Extend profiles.role for legal-ops chain
-- =============================================================================
-- Adds legal_ops, cfo, ceo, medical_director to the profiles.role
-- CHECK constraint. The codebase uses public.profiles.role for all
-- role-based access (no separate user_roles table per #102 §3
-- convention). Existing roles preserved exactly.
-- =============================================================================

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY[
    'patient',
    'practitioner',
    'admin',
    'compliance_officer',  -- Steve Rica + #101 sensitive-note access
    'legal_ops',           -- legal-ops dedicated read/write role
    'cfo',                 -- Domenic Romeo: budget approval $5K-$25K + settlement tier 2
    'ceo',                 -- Gary Ferenczi: budget approval >$25K + settlement tier 3
    'medical_director'     -- Dr. Fadi Dagher: disease-claim case review
  ]));

COMMENT ON CONSTRAINT profiles_role_check ON public.profiles IS
  'Roles. patient = consumer; practitioner = L1+; admin = full; compliance_officer = MAP sensitive notes + legal-ops compliance approver (Steve Rica); legal_ops = legal-ops read/write; cfo = budget approval $5K-$25K + settlement tier 2 (Domenic Romeo); ceo = budget approval >$25K + settlement tier 3 (Gary Ferenczi); medical_director = disease-claim case review (Dr. Fadi Dagher).';
