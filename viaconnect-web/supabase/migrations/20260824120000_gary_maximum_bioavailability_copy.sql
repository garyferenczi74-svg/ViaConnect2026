-- Gary lock 2026-08-24: retire house fold-number bioavailability marketing.
-- Replace 10x/28x claims in live user-facing shop and advisor copy with
-- Maximum Bioavailability. Append-only. Does not edit prior migrations.

CREATE OR REPLACE FUNCTION public._retire_bioavailability_fold_claim(src text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN src IS NULL THEN NULL
    ELSE replace(replace(replace(replace(replace(replace(replace(replace(
      src,
      '10x to 28x the bioavailability of', 'Maximum Bioavailability versus'),
      '10x to 28x higher bioavailability', 'Maximum Bioavailability'),
      'The 10x to 28x bioavailability achieved through', 'Maximum Bioavailability achieved through'),
      'The 10x to 28x liposomal and micellar bioavailability', 'Maximum Bioavailability'),
      '10x to 28x bioavailability', 'Maximum Bioavailability'),
      '10x to 28x', 'Maximum Bioavailability'),
      '10-28x', 'Maximum Bioavailability'),
      '10–28×', 'Maximum Bioavailability')
  END
$$;

DO $$
BEGIN
  IF to_regclass('public.products') IS NOT NULL THEN
    UPDATE public.products
    SET
      summary = public._retire_bioavailability_fold_claim(summary),
      description = public._retire_bioavailability_fold_claim(description)
    WHERE COALESCE(summary, '') ~* '10x to 28x|10-28x|10–28'
       OR COALESCE(description, '') ~* '10x to 28x|10-28x|10–28';
  END IF;

  IF to_regclass('public.ultrathink_advisor_prompts') IS NOT NULL THEN
    UPDATE public.ultrathink_advisor_prompts
    SET system_prompt = replace(
      system_prompt,
      'say "10x to 28x" verbatim (never 5x to 27x or other ranges).',
      'say "Maximum Bioavailability" (never a fold-number range).'
    )
    WHERE system_prompt LIKE '%10x to 28x%';
  END IF;

  IF to_regclass('public.kb_peptides') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'kb_peptides'
         AND column_name = 'via_cura_adjacency'
     )
  THEN
    UPDATE public.kb_peptides
    SET via_cura_adjacency = jsonb_set(
      via_cura_adjacency,
      '{bioavailability_note}',
      to_jsonb('Where delivery technology is referenced, standing language remains Maximum Bioavailability.'::text)
    )
    WHERE via_cura_adjacency ? 'bioavailability_note'
      AND via_cura_adjacency->>'bioavailability_note' LIKE '%10x to 28x%';
  END IF;
END $$;

DROP FUNCTION public._retire_bioavailability_fold_claim(text);
