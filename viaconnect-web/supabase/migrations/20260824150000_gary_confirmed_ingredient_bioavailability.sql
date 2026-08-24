-- Gary lock 2026-08-23 / applied 2026-08-24:
-- Ingredient Breakdown uses confirmed data only. this_sku human PK = 0.
-- Write per-ingredient Maximum Bioavailability notes onto listed Via Cura
-- products.ingredients JSONB. Append-only. Does not edit prior migrations.

CREATE OR REPLACE FUNCTION public._confirmed_ingredient_bioavailability(
  product_name text,
  ingredient_name text
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  n text := lower(coalesce(ingredient_name, ''));
  p text := lower(replace(replace(coalesce(product_name, ''), '™', ''), '®', ''));
  listed boolean :=
    p LIKE 'radiance+%'
    OR p LIKE 'creatine hcl+%'
    OR p LIKE 'balance+%'
    OR p LIKE 'flex+%'
    OR p LIKE 'desire+%'
    OR p LIKE 'iron+%'
    OR p LIKE 'menobalance+%'
    OR p LIKE 'replenish nad+%'
    OR p LIKE 'grow+%'
    OR p LIKE 'focus+%'
    OR p LIKE 'sproutables children gummies%';
  is_liposomal_c boolean :=
    n ~ '(vitamin c|ascorbic)'
    AND n LIKE '%liposomal%'
    AND NOT (n LIKE '%micellar%' AND n NOT LIKE '%liposomal%');
  is_coq10 boolean :=
    n ~ '(coq10|ubiquinol|coenzyme q10)'
    AND NOT (n LIKE '%ubiquinone%' AND n NOT LIKE '%ubiquinol%');
  is_curcumin boolean := n LIKE '%curcumin%';
  is_iron boolean := n ~ '\y(iron|ferrous|ferric)\y';
BEGIN
  IF NOT listed THEN
    RETURN jsonb_build_object(
      'bioavailability_note',
      'Maximum Bioavailability for this ingredient is not stated. No this-SKU human PK.',
      'evidence_type', 'not_stated',
      'pmid', NULL
    );
  END IF;

  IF p LIKE 'iron+%' AND is_iron THEN
    RETURN jsonb_build_object(
      'bioavailability_note',
      'Maximum Bioavailability for Iron+ is not this SKU human PK. Food-fraction education only: ODS mixed diet about 14-18 percent. Vegetarian diet about 5-12 percent. Not a dose, treatment, or anemia claim.',
      'evidence_type', 'class_not_this_sku',
      'pmid', NULL
    );
  END IF;

  IF (p LIKE 'radiance+%' OR p LIKE 'iron+%' OR p LIKE 'grow+%')
     AND is_liposomal_c THEN
    RETURN jsonb_build_object(
      'bioavailability_note',
      'Maximum Bioavailability: about 1.4x AUC0-4h class (PMID 27375360, other-brand liquid). Not this SKU human PK.',
      'evidence_type', 'class_not_this_sku',
      'pmid', '27375360'
    );
  END IF;

  IF (p LIKE 'radiance+%' OR p LIKE 'menobalance+%' OR p LIKE 'replenish nad+%')
     AND is_coq10 THEN
    RETURN jsonb_build_object(
      'bioavailability_note',
      'Maximum Bioavailability: about 1.23x AUC0-24 class (DOI 10.3389/fnut.2025.1605033). Not this SKU human PK.',
      'evidence_type', 'class_not_this_sku',
      'pmid', NULL
    );
  END IF;

  IF (p LIKE 'balance+%' OR p LIKE 'flex+%' OR p LIKE 'menobalance+%' OR p LIKE 'replenish nad+%')
     AND is_curcumin THEN
    RETURN jsonb_build_object(
      'bioavailability_note',
      'Maximum Bioavailability: same-class oral liposomes no significant AUC gain (Flory / NCT03530436). Not this SKU human PK.',
      'evidence_type', 'class_not_this_sku',
      'pmid', NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'bioavailability_note',
    'Maximum Bioavailability for this ingredient is not stated. No this-SKU human PK.',
    'evidence_type', 'not_stated',
    'pmid', NULL
  );
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.products') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'products'
         AND column_name = 'ingredients'
     )
  THEN
    UPDATE public.products p
    SET ingredients = COALESCE((
      SELECT jsonb_agg(
        CASE
          WHEN jsonb_typeof(elem) = 'object' THEN
            elem || public._confirmed_ingredient_bioavailability(p.name, elem->>'name')
          ELSE elem
        END
        ORDER BY ord
      )
      FROM jsonb_array_elements(COALESCE(p.ingredients, '[]'::jsonb))
        WITH ORDINALITY AS t(elem, ord)
    ), '[]'::jsonb)
    WHERE p.category IS DISTINCT FROM 'peptide'
      AND (
        p.name ILIKE 'Radiance+%'
        OR p.name ILIKE 'Creatine HCL+%'
        OR p.name ILIKE 'Balance+%'
        OR p.name ILIKE 'FLEX+%'
        OR p.name ILIKE 'Flex+%'
        OR p.name ILIKE 'DESIRE+%'
        OR p.name ILIKE 'Desire+%'
        OR p.name ILIKE 'IRON+%'
        OR p.name ILIKE 'Iron+%'
        OR p.name ILIKE 'MenoBalance+%'
        OR p.name ILIKE 'Replenish NAD+%'
        OR p.name ILIKE 'Grow+%'
        OR p.name ILIKE 'FOCUS+%'
        OR p.name ILIKE 'Focus+%'
        OR p.name ILIKE 'Sproutables Children Gummies%'
      );
  END IF;
END $$;

DROP FUNCTION public._confirmed_ingredient_bioavailability(text, text);
