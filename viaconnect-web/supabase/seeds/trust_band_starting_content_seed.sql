-- =============================================================================
-- Prompt #138c Trust Band starting content seed.
-- =============================================================================
-- Per spec §4: one regulatory paragraph + one Dr. Fadi clinician card draft +
-- four trust chips. All ship inactive (active=false). Activation requires
-- Marshall pre-check + Steve approval, plus written consent for the clinician
-- card.
--
-- The ON CONFLICT clauses make this idempotent across re-applies.
-- =============================================================================

-- Regulatory paragraph (spec §4.1 verbatim)
INSERT INTO public.trust_band_regulatory_paragraphs (
  id, paragraph_text, frameworks_named, substantiation_refs
) VALUES (
  '11111111-1111-4111-8111-111111111111',
  'FarmCeutica''s protocol engine is medically directed by a licensed clinician and built against FTC Endorsement Guide standards, DSHEA supplement-label conventions, and HIPAA Security Rule safeguards. Every recommendation is grounded in published research and reviewed before it reaches you.',
  ARRAY['FTC Endorsement Guides','DSHEA','HIPAA Security Rule'],
  ARRAY['Prompt 119 Marshall rule registry','Prompt 127 Multi-Framework Evidence Architecture']
) ON CONFLICT (id) DO NOTHING;

-- Clinician card draft for Dr. Fadi Dagher (spec §4.2)
-- Ships without consent; activation gate blocks until consent is captured.
INSERT INTO public.trust_band_clinician_cards (
  id, clinician_display_name, credential_line, role_line, descriptor_sentence, display_order
) VALUES (
  '22222222-2222-4222-8222-222222222222',
  'Dr. Fadi Dagher',
  'MD',
  'Medical Director',
  'Reviews the scientific grounding of every protocol category, ensuring recommendations reflect current research and appropriate clinical caution.',
  0
) ON CONFLICT (id) DO NOTHING;

-- Four trust chips (spec §4.3)
INSERT INTO public.trust_band_chips (
  id, icon_name, chip_text, category, substantiation_ref, display_order
) VALUES
  ('33333333-3333-4333-8333-333333333301',
   'stethoscope', 'Medically Directed', 'credentials',
   'Dr. Fadi Dagher Medical Director engagement letter on file', 0),
  ('33333333-3333-4333-8333-333333333302',
   'shield-check', 'FTC Compliant Claims', 'compliance',
   'Marshall MARSHALL.CLAIMS.TESTIMONIAL_DISCLOSURE rule registry per Prompt 119', 1),
  ('33333333-3333-4333-8333-333333333303',
   'lock', 'HIPAA Grade Privacy', 'compliance',
   'Prompt 127 HIPAA Security Rule evidence packet', 2),
  ('33333333-3333-4333-8333-333333333304',
   'microscope', 'Research Grounded Protocols', 'research',
   'Substantiation files attached per protocol category in compliance vault', 3)
ON CONFLICT (id) DO NOTHING;
