-- Prompt 225: Marshall flagship consumer_safe batch (Gary continue authorization).
-- Educational tier only. Sets marshall_status approved, flips linked kb_items
-- gate + Jeffery verdict so RLS can serve consumer catalog rows.
-- Does NOT flip restricted or excluded_adverse_reference rows.

DO $$
DECLARE
  v_slugs text[] := ARRAY[
    'epitalon',
    'semax',
    'selank',
    'ipamorelin-standalone',
    'cjc-1295-no-dac',
    'ghk-cu-injectable',
    'ghk-cu-topical',
    'thymosin-alpha-1',
    'mots-c',
    'retatrutide',
    'setmelanotide',
    'pramlintide',
    'liraglutide',
    'teduglutide',
    'linaclotide',
    'argireline',
    'matrixyl',
    'carnosine',
    'mk-677',
    'edu-bpc157',
    'edu-epitalon',
    'edu-ss31',
    'bpc-157-arginate',
    'thymosin-beta-4',
    'afamelanotide',
    'plecanatide',
    'exenatide',
    'dulaglutide'
  ];
BEGIN
  UPDATE public.kb_peptides p
  SET
    consumer_safe = true,
    marshall_status = 'approved',
    last_reviewed_at = now(),
    updated_at = now()
  WHERE p.slug = ANY (v_slugs)
    AND p.exclusion_tier = 'educational';

  UPDATE public.kb_items i
  SET
    consumer_safe = true,
    gate_status = 'approved',
    gate_decided_at = now(),
    gate_reason = '225 marshall flagship consumer batch',
    jeffery_verdict = 'approved',
    updated_at = now()
  FROM public.kb_peptides p
  WHERE p.kb_item_id = i.id
    AND p.slug = ANY (v_slugs)
    AND p.exclusion_tier = 'educational'
    AND p.marshall_status = 'approved';

END $$;
