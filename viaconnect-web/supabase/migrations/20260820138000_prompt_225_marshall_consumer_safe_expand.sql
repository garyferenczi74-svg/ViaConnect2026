-- Prompt 225: broader Marshall consumer_safe batch (educational tier only).
-- Gary continue authorization. Restricted/excluded rows are never flipped.

DO $$
DECLARE
  v_slugs text[] := ARRAY[
    -- already approved flagships remain idempotent
    'epitalon', 'semax', 'selank', 'ipamorelin-standalone', 'cjc-1295-no-dac',
    'ghk-cu-injectable', 'ghk-cu-topical', 'thymosin-alpha-1', 'mots-c',
    'retatrutide', 'setmelanotide', 'pramlintide', 'liraglutide', 'teduglutide',
    'linaclotide', 'argireline', 'matrixyl', 'carnosine', 'mk-677',
    'edu-bpc157', 'edu-epitalon', 'edu-ss31', 'bpc-157-arginate', 'thymosin-beta-4',
    'afamelanotide', 'plecanatide', 'exenatide', 'dulaglutide',
    -- expansion: cosmetics / GI / cognitive / metabolic education
    'matrixyl-3000', 'palmitoyl-tripeptide-5', 'leuphasyl', 'syn-ake', 'melitane',
    'ghk-copper-free', 'ac-sdkp', 'humanin', 'shlp-2', 'shlp-6',
    'n-acetyl-semax-amidate', 'n-acetyl-selank-amidate', 'noopept',
    'lixisenatide', 'glucagon', 'amycretin', 'petrelintide',
    'larazotide', 'l-glutamine', 'urolithin-a', 'nmn', 'nr',
    'anserine', 'cortexin', 'epithalamin', 'thymogen', 'thymulin',
    'hbd-2', 'hbd-3', 'pexiganan', 'omiganan', 'vip', 'angiotensin-1-7',
    'pegvisomant', 'macimorelin', 'anamorelin', 'ace-031', 'bimagrumab',
    'apitegromab', 'gdf-11', 'orforglipron', 'albiglutide', 'ecnoglutide',
    'maritide', 'efinopegdutide', 'pegozafermin', 'efruxifermin',
    'khavinson-bioregulator-family', 'zinc-thymulin', 'ptd-dbm',
    'davunetide', 'p21-peptide', 'fgl', 'desmopressin',
    'alpha-msh', 'triptorelin', 'leuprolide', 'goserelin', 'cetrorelix',
    'ganirelix', 'follitropin', 'enclomiphene', 'serelaxin',
    'ghrp-1', 'tabimorelin', 'danuglipron',
    -- KEEP branded educational rows commonly asked
    'pinealon', 'vilon', 'vesugen', 'bronchogen', 'kpv-tripeptide',
    'aod-9604', 'sermorelin', 'cerebrolysin', 'dihexa', 'pt-141-bremelanotide',
    'slu-pp-332', '5-amino-1mq', 'tesofensine', 'regenbpc', 'tb500-oral',
    'neuroshield', 'gutrepair', 'immuneguard'
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
    gate_reason = '225 marshall consumer_safe expand batch',
    jeffery_verdict = 'approved',
    updated_at = now()
  FROM public.kb_peptides p
  WHERE p.kb_item_id = i.id
    AND p.slug = ANY (v_slugs)
    AND p.exclusion_tier = 'educational'
    AND p.marshall_status = 'approved'
    AND p.consumer_safe = true;
END $$;
