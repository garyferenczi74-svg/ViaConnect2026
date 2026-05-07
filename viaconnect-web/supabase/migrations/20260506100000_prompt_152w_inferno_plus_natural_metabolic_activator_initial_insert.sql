-- Prompt 152w: Inferno+ Natural Metabolic Activator Complex initial product insert.
-- Path 2: hard-delete the legacy glp-1-activator-complex placeholder, then INSERT new row.
-- All FK ref counts (map_policies, map_price_observations, map_violations,
-- map_vip_exemptions, map_waiver_skus, order_items) verified at 0 before write.
--
-- THREE PRODUCTION-LEVEL CORRECTIONS APPLIED (see prompt body for full justification):
--   1. Tesofensine REMOVED entirely (Path A) per Via Cura standing rule
--   2. Selenium 1.0 mg to 0.2 mg matching 152u GST+ pattern (UL safety)
--   3. Chromium Picolinate 2.0 mg to 0.2 mg supplement-industry standard (UL safety)
-- ONE source-doc reformulation: Dileucine (10 mg) removed.
-- Final: 13 ingredients @ 430.4 mg per Size 0 vegetarian capsule. Partial encapsulation
-- (6 of 13 in liposomal/micellar carriers).
--
-- DESCRIPTION SANITIZATION (per Gary no-dashes rule): 3 number-range hyphens swapped
-- to "to" ("500-1500 mg" -> "500 to 1500 mg", "1-3 g" -> "1 to 3 g",
-- "100-400 mg" -> "100 to 400 mg"). Chemical name hyphens preserved (L-Carnitine,
-- L-Selenomethionine, GLP-1, P-glycoprotein, PPAR-gamma, Inulin-FOS).
--
-- Pricing, image, category-confirmation, SKU finalization, formulation specs all
-- deferred to follow-up prompts 152w.1 through 152w.6 per spec.

DO $migration$
DECLARE
  v_run_id        UUID := gen_random_uuid();
  v_legacy_id     UUID;
  v_new_id        UUID;
  v_resolved_slug TEXT := 'inferno-plus-natural-metabolic-activator';
  v_new_summary   TEXT := 'Metabolic regulation, appetite control, and blood sugar balance support in a single capsule.';
  v_new_description TEXT := $desc$## What does Inferno+ do?

Inferno+ Natural Metabolic Activator Complex supports natural metabolic regulation through three interconnected pillars: regulate through AMPK activation and ketone metabolic substrate (Berberine HCl, BHB Salts, L-Carnitine Tartrate, EGCG), control through gut-axis appetite signaling and clean-energy stimulant support (Probiotic Blend, Inulin-FOS prebiotic, Paraxanthine, CLA), and balance through insulin sensitivity cofactor support and glucose-regulatory botanical synergy (Chromium Picolinate, Cinnamon Bark, Moringa Leaf, Selenium L-Selenomethionine, Artichoke Leaf). The 13-ingredient liposomal and micellar capsule provides synergistic micro-dosing across overlapping metabolic pathways: AMPK activation, GLP-1 axis modulation through gut-microbiome and prebiotic support, insulin sensitivity, fat metabolism, and clean-energy stimulant effects. 6 of 13 ingredients use liposomal or micellar carriers achieving 10x to 28x bioavailability versus standard formulations on those ingredients; the remaining 7 ingredients use mechanism-appropriate alternative absorption pathways (mineral transporters, viable probiotic colonization, prebiotic fermentation substrates, established uncoated absorption). Designed for adults with metabolic concerns seeking comprehensive multi-pathway support as part of broader lifestyle approach. **Contains Paraxanthine (caffeine metabolite stimulant). Practitioner-guided use under healthcare professional supervision strongly recommended given Berberine medication interaction profile and pregnancy contraindication.**

## Ingredient breakdown

- **Berberine HCl (98% purity):** Activates AMPK through both LKB1 and CaMKK2 pathways supporting cellular energy regulation, with parallel effects on GLP-1 axis modulation through gut-microbiome shifts (medication interactions: CYP3A4, P-glycoprotein, hypoglycemic, hypotensive activity; pregnancy contraindicated).
- **BHB Salts (Magnesium, Calcium, Sodium):** Provides exogenous beta-hydroxybutyrate as alternative cellular fuel substrate signaling through HCAR2 receptor, with mineral cations supporting electrolyte balance and cardiovascular function.
- **L-Carnitine Tartrate:** Supplies the rate-limiting substrate for carnitine-acylcarnitine translocase shuttling long-chain fatty acids across mitochondrial membranes for beta-oxidation, in the well-absorbed Tartrate form using OCTN2 transporter uptake.
- **Chromium Picolinate:** Provides essential trace mineral cofactor for chromodulin amplifying insulin receptor tyrosine kinase activity, in the picolinate-mediated absorption form at supplement-industry standard 200 mcg elemental chromium.
- **Micellar Cinnamon Bark Extract (10:1):** Delivers methylhydroxychalcone polymer (MHCP) and cinnamaldehyde for insulin signaling support and modest blood sugar moderation, in the micellar carrier for enhanced absorption of lipophilic phytochemicals.
- **Liposomal Conjugated Linoleic Acid (CLA):** Provides PPAR-gamma modulation and modest fat metabolism support through the c9,t11 and t10,c12 isomer combination from safflower oil, in the liposomal carrier for enhanced fatty acid absorption.
- **Probiotic Blend (10 billion CFU):** Supplies viable probiotic strains supporting gut microbiome diversity, intestinal barrier function, and SCFA production that drives gut-axis GLP-1 and PYY signaling for appetite regulation.
- **Liposomal EGCG (Green Tea Extract, 50%):** Activates AMPK pathway through complementary mechanism to Berberine and supports GLUT4 glucose transporter translocation, at sub-toxicity dose (well below documented hepatotoxicity threshold) in liposomal carrier for enhanced absorption.
- **Micellar Moringa Leaf Extract (10:1):** Provides isothiocyanate-mediated Nrf2 pathway activation plus phenolic antioxidant compounds with traditional glucose-regulatory activity, in the micellar carrier for enhanced absorption.
- **Liposomal Paraxanthine (PureCaf):** Delivers the primary active metabolite of caffeine providing alertness through adenosine receptor antagonism with cleaner profile than unmetabolized caffeine (less jitter, less anxiety, less BP elevation) at equivalent doses.
- **Selenium (L-Selenomethionine):** Provides selenium through methionine transporter absorption for incorporation into selenoproteins (glutathione peroxidases, thioredoxin reductases, iodothyronine deiodinases that support thyroid metabolism affecting glucose homeostasis), in the most bioavailable food-source selenium form.
- **Micellar Artichoke Leaf Extract (5% Cynarin):** Supports bile flow and hepatobiliary function through cynarin and chlorogenic acid compounds affecting systemic lipid and glucose metabolism, in the micellar carrier for enhanced phytochemical absorption.
- **Inulin-FOS (Prebiotic Blend):** Provides fermentation substrate for gut bacteria producing short-chain fatty acids (butyrate, propionate, acetate) that activate intestinal L-cell GPR41 and GPR43 receptors stimulating GLP-1 and PYY secretion in synbiotic combination with the probiotic blend.

## Who benefits and what makes this different

**Who benefits:** Adults with metabolic syndrome features (waist circumference, blood pressure, lipid profile, glucose) seeking natural multi-pathway support, individuals with prediabetes or borderline elevated fasting glucose under practitioner supervision, adults with gut-microbiome-mediated metabolic concerns, people with appetite dysregulation contributing to weight management challenges, adults with mild insulin resistance under practitioner supervision, individuals supporting natural energy metabolism through ketone substrate plus fat-energy transport plus clean-stimulant combination, adults with genetic variants affecting metabolic pathways (CYP1A2 polymorphisms, PPAR-alpha/gamma variants, TCF7L2 variants), and users whose ViaConnect Bio Optimization Score flags weakness in metabolic regulation, gut microbiome diversity, blood sugar balance, or appetite signaling domains. **CRITICAL CONTRAINDICATIONS:** NOT for use during pregnancy or lactation due to multiple ingredient concerns (Berberine kernicterus risk and uterine stimulation, Paraxanthine miscarriage and low birth weight associations at higher doses, EGCG hepatotoxicity at higher doses, CLA limited safety data); NOT for use with diabetes medications (Berberine hypoglycemic activity); NOT for use with antihypertensives without monitoring (Berberine hypotensive activity, Paraxanthine variable BP effects); NOT for use with anticoagulants or antiplatelets without prescriber supervision (Berberine CYP2C9 inhibition, CLA and EGCG mild antiplatelet); discontinue 7 to 14 days before any planned surgery; NOT for use with cardiovascular disease (Paraxanthine stimulant effects), anxiety disorders (Paraxanthine stimulant), hyperthyroidism, sleep disorders (avoid within 6 hours of bedtime), active liver disease (EGCG, CLA, Berberine hepatic concerns), active gallbladder disease (Artichoke bile flow stimulation); NOT for individuals under 18; review medication list for CYP3A4 substrates (statins, calcium channel blockers, immunosuppressants, HIV protease inhibitors, benzodiazepines, opioids, antifungals) and P-glycoprotein substrates (digoxin, cyclosporine, tacrolimus) given Berberine inhibition; avoid concurrent selenium-containing supplements at the 2-capsule dose (Selenium reaches UL at 2 caps).

**What makes it different:** What separates Inferno+ from generic metabolic support products is the convergence of three-pillar synergistic micro-dosing architecture (Regulate through Berberine + BHB + L-Carnitine + EGCG; Control through Probiotics + Inulin-FOS + Paraxanthine + CLA; Balance through Chromium + Cinnamon + Moringa + Selenium + Artichoke). Most metabolic support products focus on one or two mechanisms; Inferno+ addresses cellular energy metabolism, gut-axis appetite signaling, AND insulin sensitivity simultaneously with mechanistically diverse low-dose ingredients targeting overlapping pathways. The honest clinical positioning is **synergistic micro-dosing** rather than clinical-dose efficacy: each ingredient is sub-clinical individually relative to typical clinical research thresholds (Berberine 30 mg vs clinical 500 to 1500 mg; L-Carnitine 25 mg vs clinical 1 to 3 g; EGCG 10 mg vs clinical 100 to 400 mg), but the mechanistically diverse combination targets overlapping AMPK, GLP-1 axis, insulin sensitivity, fat metabolism, and gut microbiome pathways for additive or synergistic effect. Distinctive features include Liposomal Paraxanthine for clean-energy stimulant (caffeine metabolite without jitter profile), Liposomal EGCG at sub-toxicity dose (well below documented hepatotoxicity threshold), synbiotic combination of probiotics plus Inulin-FOS for gut-axis signaling, and L-Selenomethionine for methionine-transporter selenium absorption matching the 152u GST+ Selenium pattern. Inferno+ is positioned as comprehensive multi-pathway support as part of broader lifestyle approach (dietary modification, exercise, sleep optimization), NOT a substitute for prescription GLP-1 receptor agonists (semaglutide, tirzepatide, retatrutide pharmaceutical mechanisms are not replicated by natural ingredients at sub-clinical doses), prescription diabetes medications, or weight loss medications. Practitioner-guided use under healthcare professional supervision strongly recommended given Berberine medication interaction profile, Paraxanthine stimulant cardiovascular effects, and pregnancy contraindication.$desc$;
BEGIN
  -- Lock the legacy row id for snapshot + audit
  SELECT id INTO v_legacy_id FROM public.products WHERE slug = 'glp-1-activator-complex';
  IF v_legacy_id IS NULL THEN
    RAISE EXCEPTION 'Prompt 152w: legacy glp-1-activator-complex row not found; aborting (drift since FK preflight).';
  END IF;

  -- Verify no candidate-slug collision
  IF EXISTS (
    SELECT 1 FROM public.products
    WHERE slug IN (
      'inferno-plus-natural-metabolic-activator',
      'inferno-plus',
      'inferno',
      'inferno-glp-1-activator',
      'natural-metabolic-activator',
      'metabolic-activator-complex'
    )
  ) THEN
    RAISE EXCEPTION 'Prompt 152w: target slug already exists; aborting.';
  END IF;

  -- Snapshot legacy row to backup table (matches #142e pattern)
  CREATE TABLE IF NOT EXISTS public.products_dropped_backup_152w
    (LIKE public.products INCLUDING DEFAULTS);
  INSERT INTO public.products_dropped_backup_152w
    SELECT * FROM public.products WHERE id = v_legacy_id;

  -- Hard-delete the legacy row (FK ref counts verified 0 before this migration)
  DELETE FROM public.products WHERE id = v_legacy_id;

  -- Insert the new Inferno+ row.
  -- Pricing, image_urls, ingredients, master_sku, etc. deferred to 152w.1 through 152w.6.
  INSERT INTO public.products (
    slug,
    name,
    short_name,
    sku,
    category,
    category_slug,
    format,
    summary,
    description
  ) VALUES (
    v_resolved_slug,
    'Inferno+ Natural Metabolic Activator Complex',
    'Inferno+',
    'FC-INFERNO-001',
    'supplement',
    'base-formulations',
    'capsule',
    v_new_summary,
    v_new_description
  )
  RETURNING id INTO v_new_id;

  -- Audit: legacy delete + new insert
  INSERT INTO public.backfill_audit
    (run_id, source_table, target_table, sku, product_id, columns_loaded, applied_at)
  VALUES
    (
      v_run_id,
      'manual_152w_delete',
      'products',
      'FC-GLP1-001',
      v_legacy_id,
      jsonb_build_object(
        'action',     'delete',
        'reason',     '152w replaces glp-1-activator-complex placeholder with corrected Inferno+ formulation',
        'prompt_ref', '152w',
        'snapshot',   'products_dropped_backup_152w'
      ),
      NOW()
    ),
    (
      v_run_id,
      'manual_152w_insert',
      'products',
      'FC-INFERNO-001',
      v_new_id,
      jsonb_build_object(
        'action',     'insert',
        'slug',       v_resolved_slug,
        'fields',     jsonb_build_array('slug','name','short_name','sku','category','category_slug','format','summary','description'),
        'prompt_ref', '152w'
      ),
      NOW()
    );
END $migration$;
