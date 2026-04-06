-- ============================================================
-- Rules Engine Update — Real FarmCeutica Product Names
-- Migration: 20260404000041_rules_real_products.sql
-- Replaces all invented product names with actual SKUs
--
-- Record-keeping migration — SQL already executed on
-- Supabase project nnhkcufyqjojdbvdrpky.
-- ============================================================

-- Clear all existing rules and re-seed with correct product names
DELETE FROM protocol_rules;

INSERT INTO protocol_rules (
  rule_id, rule_name, trigger_type, trigger_field, trigger_operator,
  trigger_value, priority, product_name, product_category, delivery_form,
  dosage, frequency, timing, rationale_template, health_signals_template,
  bioavailability_note, evidence_level, is_active
) VALUES

-- ── LAB VALUE RULES ──────────────────────────────────────────────────────────

('vit_d_critical','Critically Low Vitamin D','lab_value','vitamin_d','lt','20',
 'high','VDR+™ Receptor Activation','Methylation / GeneX360','Capsule',
 '2 capsules daily','daily','{morning}',
 'Your Vitamin D of {{vitamin_d}} ng/mL is critically low (optimal: 50–80 ng/mL). VDR+™ delivers liposomal D3 with K2 (MK-7), Magnesium, Boron, and Quercetin to maximize receptor activation — especially important if you carry a VDR gene variant.',
 '{{"Vitamin D critically low: {{vitamin_d}} ng/mL","Optimal range: 50-80 ng/mL"}}',
 '10–27× more bioavailable than standard D3 softgels; MK-7 K2 directs calcium correctly','strong', true),

('vit_d_low','Low Vitamin D','lab_value','vitamin_d','lt','30',
 'high','CATALYST+ Energy Multivitamin','Multivitamin / Energy','Capsule',
 '2 capsules daily','daily','{morning}',
 'Your Vitamin D of {{vitamin_d}} ng/mL is below optimal range (50–80 ng/mL). CATALYST+ provides Liposomal D3/K2 plus 6-form Magnesium, methylated B vitamins, NAC, and Quercetin — a comprehensive energy and immune foundation.',
 '{{"Vitamin D {{vitamin_d}} ng/mL — below optimal"}}',
 '10–27× more bioavailable — comprehensive multivitamin baseline','strong', true),

('vit_d_suboptimal','Suboptimal Vitamin D','lab_value','vitamin_d','lt','50',
 'medium','CATALYST+ Energy Multivitamin','Multivitamin / Energy','Capsule',
 '2 capsules daily','daily','{morning}',
 'Your Vitamin D of {{vitamin_d}} ng/mL falls short of the optimal 50–80 ng/mL range. CATALYST+ delivers comprehensive daily micronutrient support with Liposomal D3/K2 and the full Magnesium Synergy Matrix.',
 '{{"Vitamin D {{vitamin_d}} ng/mL — suboptimal"}}',
 '10–27× more bioavailable — comprehensive multivitamin baseline','strong', true),

('b12_low','Low B12','lab_value','vitamin_b12','lt','400',
 'high','MethylB Complete+™ B Complex','Methylation / B Vitamins','Capsule',
 '1 capsule daily','daily','{morning}',
 'Your B12 of {{vitamin_b12}} pg/mL is below optimal (500–900 pg/mL). MethylB Complete+™ delivers liposomal methylcobalamin and 5-MTHF — the active forms that bypass conversion steps impaired by FUT2 variants and other absorption issues.',
 '{{"B12 {{vitamin_b12}} pg/mL — below optimal: 500-900 pg/mL"}}',
 '10–27× more bioavailable than standard cyanocobalamin; active methylated form','strong', true),

('homocysteine_high','Elevated Homocysteine','lab_value','homocysteine','gt','12',
 'high','MTHFR+™ Folate Metabolism','Methylation / GeneX360','Capsule',
 '2 capsules daily','daily','{morning}',
 'Your homocysteine of {{homocysteine}} mcmol/L is elevated (optimal <10). MTHFR+™ targets the methylation cycle directly with 5-MTHF, methylated B2/B6, dual-form B12, SAMe, Betaine, and Choline — the key drivers of homocysteine clearance.',
 '{{"Elevated homocysteine: {{homocysteine}} mcmol/L","Cardiovascular and cognitive risk"}}',
 '10–27× more bioavailable — methylated forms critical for homocysteine metabolism','strong', true),

('crp_high','Elevated Systemic Inflammation','lab_value','crp','gt','3',
 'high','FLEX+ Joint & Inflammation','Joint / Anti-Inflammatory','Capsule',
 '2 capsules daily','daily','{morning,evening}',
 'Your hsCRP of {{crp}} mg/L indicates significant systemic inflammation (optimal <1.0). FLEX+ combines Liposomal Curcumin, Boswellia AprèsFlex®, Quercefit® Quercetin, and Omega-3 in a single comprehensive anti-inflammatory protocol.',
 '{{"hsCRP {{crp}} mg/L — elevated systemic inflammation","Optimal: <1.0 mg/L"}}',
 '10–27× more bioavailable — Liposomal Curcumin achieves therapeutic plasma concentrations standard turmeric cannot','strong', true),

('ferritin_low','Low Ferritin','lab_value','ferritin','lt','30',
 'high','IRON+ Red Blood Cell Support','Anemia / Blood Health','Capsule',
 '2 capsules daily with iron supplement','daily','{with_breakfast}',
 'Your ferritin of {{ferritin}} ng/mL is below optimal (30–150 ng/mL). IRON+ maximizes iron absorption and utilization with Liposomal Vitamin C, Glutathione, NAC, ALA, and Quercetin — take alongside your iron supplement (iron not included in IRON+).',
 '{{"Low ferritin: {{ferritin}} ng/mL","Optimal: 30-150 ng/mL","Iron absorption support"}}',
 '10–27× more bioavailable Vitamin C dramatically enhances non-heme iron absorption','strong', true),

('hba1c_prediabetic','Pre-Diabetic HbA1c','lab_value','hba1c','gt','5.6',
 'high','GLP-1 Activator Complex','Metabolic / Blood Sugar','Capsule',
 '2 capsules before meals','twice-daily','{before_breakfast,before_dinner}',
 'Your HbA1c of {{hba1c}}% is in the pre-diabetic range. GLP-1 Activator Complex combines Berberine HCl (activates AMPK), BHB Salts, Chromium Picolinate, EGCG, Cinnamon, and Selenium for comprehensive metabolic glucose support.',
 '{{"HbA1c {{hba1c}}% — pre-diabetic range","GLP-1 and insulin sensitivity support"}}',
 '10–27× more bioavailable — Berberine HCl 98% purity, Micellar EGCG and Cinnamon','strong', true),

('triglycerides_high','Elevated Triglycerides','lab_value','triglycerides','gt','150',
 'high','Omega-3 DHA/EPA (Algal)','Omega-3 / Essential Fatty Acids','Capsule',
 '2 capsules daily with dinner','daily','{with_dinner}',
 'Your triglycerides of {{triglycerides}} mg/dL are elevated (optimal <150 mg/dL). Therapeutic-dose Algal EPA/DHA is the most evidence-based nutritional intervention for triglyceride reduction — and our vegan algal source avoids heavy metal contamination from fish oil.',
 '{{"Triglycerides {{triglycerides}} mg/dL — elevated","Optimal: <150 mg/dL"}}',
 '10–27× more bioavailable — Liposomal DHA in algal phospholipid matrix','strong', true),

('testosterone_low_male','Low Testosterone (Male)','lab_value','testosterone_total','lt','400',
 'high','RISE+ Male Testosterone','Hormonal / Male Health','Capsule',
 '2 capsules daily','daily','{morning}',
 'Your total testosterone of {{testosterone_total}} ng/dL is below optimal for males (400–900 ng/dL). RISE+ combines the most clinically studied testosterone-supporting botanicals: Tongkat Ali, Fadogia Agrestis, Ashwagandha, Shilajit, L-Citrulline, Zinc, and DIM.',
 '{{"Total testosterone {{testosterone_total}} ng/dL — below optimal","Optimal: 400-900 ng/dL"}}',
 '10–27× more bioavailable — Micellar extraction of all botanical actives','strong', true),

-- ── GENETIC RULES ────────────────────────────────────────────────────────────

('mthfr_any','MTHFR Gene Variant','genetic','mthfr_status','in','heterozygous,homozygous',
 'high','MTHFR+™ Folate Metabolism','Methylation / GeneX360','Capsule',
 '2 capsules daily','daily','{morning}',
 'Your {{mthfr_status}} MTHFR variant reduces your ability to convert folic acid to active 5-MTHF by up to 70%. MTHFR+™ is specifically designed for this variant — providing 5-MTHF (1mg), methylated B2/B6, dual-form B12, SAMe, Betaine, and Choline alpha-GPC.',
 '{{"MTHFR {{mthfr_status}} variant","Methylation pathway impaired up to 70%"}}',
 '10–27× more bioavailable — liposomal 5-MTHF bypasses the blocked MTHFR enzyme completely','strong', true),

('apoe4_carrier','APOE4 Carrier — Cardiovascular & Cognitive Risk','genetic','apoe_status','contains','e4',
 'high','Teloprime+ Telomere Support','Longevity / Telomere','Powder',
 '1 scoop daily','daily','{morning}',
 'Your APOE {{apoe_status}} genotype increases cardiovascular and cognitive risk. Teloprime+ provides Resveratrol, Astragalus/Cycloastragenol (telomere support), AC-11, Algal DHA/EPA, Centella Asiatica, and C15:0 — a comprehensive longevity stack for APOE4 carriers.',
 '{{"APOE {{apoe_status}} variant","Elevated cardiovascular and cognitive risk"}}',
 '10–27× more bioavailable — liposomal resveratrol has <1% oral bioavailability in standard form','strong', true),

('vdr_variant','VDR Receptor Variant','genetic','vdr_status','in','ff,ff_variant,variant',
 'high','VDR+™ Receptor Activation','Methylation / GeneX360','Capsule',
 '2 capsules daily','daily','{morning}',
 'Your VDR variant reduces vitamin D receptor sensitivity — meaning you require higher D3 levels and/or receptor-sensitizing cofactors to achieve normal cellular response. VDR+™ was designed specifically for this, adding Magnesium, Boron, Zinc, Quercetin, Resveratrol, and DHA alongside D3/K2.',
 '{{"VDR variant — reduced receptor sensitivity","Enhanced D3 support required"}}',
 '10–27× more bioavailable — critical for VDR variants where receptor sensitivity is compromised','strong', true),

('comt_variant','COMT Neurotransmitter Variant','genetic','comt_status','in','met/met,slow',
 'high','COMT+™ Neurotransmitter Balance','Methylation / GeneX360','Capsule',
 '2 capsules daily','daily','{morning}',
 'Your COMT {{comt_status}} variant slows catecholamine breakdown, potentially leading to dopamine and estrogen excess. COMT+™ provides the cofactors (Magnesium, SAMe, methylated B2/B6) and modulators (DIM, L-Theanine, Quercetin) to balance this pathway.',
 '{{"COMT {{comt_status}} variant","Catecholamine and estrogen metabolism support"}}',
 '10–27× more bioavailable — Liposomal Magnesium, Quercetin, and DIM for COMT pathway','strong', true),

-- ── MEDICATION RULES ─────────────────────────────────────────────────────────

('statin_coq10','Statin — CoQ10 Depletion','medication','medications','contains','statin',
 'high','Replenish NAD+','Longevity / NAD+','Capsule',
 '2 capsules daily','daily','{morning}',
 'Statin medications deplete CoQ10 by blocking the same HMG-CoA reductase pathway that produces cholesterol. Replenish NAD+ provides Liposomal CoQ10 (Ubiquinol), NMN, Pterostilbene, PQQ, and Urolithin A for comprehensive mitochondrial restoration.',
 '{{"Statin medication — CoQ10 depletion risk","Mitochondrial support required"}}',
 '10–27× more bioavailable — Ubiquinol form and liposomal delivery essential for therapeutic levels','strong', true),

('metformin_b12','Metformin — B12 Depletion','medication','medications','contains','metformin',
 'high','MethylB Complete+™ B Complex','Methylation / B Vitamins','Capsule',
 '1 capsule daily','daily','{morning}',
 'Metformin impairs B12 absorption in the ileum, with studies showing deficiency in 10–30% of long-term users. MethylB Complete+™ delivers liposomal methylcobalamin — bypassing the intrinsic factor-dependent absorption pathway that metformin disrupts.',
 '{{"Metformin use — B12 absorption impaired","Liposomal methylcobalamin bypass"}}',
 '10–27× more bioavailable — liposomal delivery bypasses metformin-impaired gut absorption','strong', true),

('ppi_magnesium','PPI — Magnesium Depletion','medication','medications','contains','omeprazole,pantoprazole,esomeprazole,lansoprazole,rabeprazole',
 'high','Magnesium Synergy Matrix','Mineral / Magnesium','Capsule',
 '2 capsules daily','daily','{evening}',
 'Proton pump inhibitors significantly impair magnesium absorption from the gut, with prolonged use linked to hypomagnesemia. The Magnesium Synergy Matrix provides all 6 forms of magnesium targeting different tissues — Bisglycinate for muscle and nerve, L-Threonate for CNS.',
 '{{"PPI medication — magnesium depletion risk","Six-form magnesium replacement"}}',
 '10–27× more bioavailable — six synergistic forms; dramatically superior to magnesium oxide','strong', true),

-- ── SYMPTOM RULES ────────────────────────────────────────────────────────────

('poor_sleep','Sleep Difficulties','symptom','lifestyle.sleep_quality','in','poor,very poor',
 'high','RELAX+ Sleep Support','Sleep / Recovery','Capsule',
 '2 capsules 30 minutes before bed','daily','{30_min_before_bed}',
 'Poor sleep quality is one of the most impactful health issues, affecting every metabolic system. RELAX+ addresses sleep architecture comprehensively: Extended-Release Liposomal Melatonin, 5-HTP (serotonin→melatonin), Glycine (deep sleep), Apigenin (GABA-A), Magnesium (nervous system), Tart Cherry, and Broad-Spectrum CBD/CBN.',
 '{{"Poor sleep quality: {{sleep_quality}}","Multiple sleep pathway support"}}',
 '10–27× more bioavailable — extended-release liposomal melatonin maintains levels through the night','strong', true),

('chronic_fatigue','Chronic Fatigue','symptom','physicalSymptoms','contains','fatigue',
 'high','Replenish NAD+','Longevity / NAD+','Capsule',
 '2 capsules daily','daily','{morning}',
 'Chronic fatigue frequently involves mitochondrial dysfunction and declining NAD+ levels. Replenish NAD+ directly addresses this with Liposomal NMN (NAD+ precursor), CoQ10 (ATP production cofactor), PQQ (mitochondrial biogenesis), Urolithin A (mitophagy), and Spermidine.',
 '{{"Chronic fatigue","Mitochondrial and NAD+ depletion pattern"}}',
 '10–27× more bioavailable — liposomal NMN achieves systemic NAD+ repletion standard powder cannot','strong', true),

('brain_fog','Brain Fog / Cognitive Symptoms','symptom','neuroSymptoms','contains','brain fog',
 'high','FOCUS+ Nootropic Formula','Cognitive / Nootropic','Capsule',
 '2 capsules daily','daily','{morning}',
 'Brain fog often reflects suboptimal NGF signaling and reduced cerebral blood flow. FOCUS+ delivers the highest-potency cognitive stack available: Micellar Lion''s Mane (500mg NGF stimulant), Bacopa Monnieri (300mg memory), Paraxanthine enfinity®, Kaneka QH® CoQ10, Ginkgo Biloba, and Rhodiola Rosea.',
 '{{"Brain fog / cognitive symptoms","NGF and cerebral circulation support"}}',
 '10–27× more bioavailable — micellar Lion''s Mane and Bacopa achieve therapeutic CNS concentrations','strong', true),

('high_stress','High Stress / Burnout','symptom','lifestyle.stress_level','gt','6',
 'high','NeuroCalm+','Stress / Adaptogen','Capsule',
 '2 capsules daily','daily','{morning}',
 'A stress level of {{stress_level}}/10 indicates significant HPA axis activation. NeuroCalm+ combines the most evidence-based adaptogens and calming agents: Ashwagandha KSM-66® (cortisol reduction), Rhodiola (stress resilience), Suntheanine® L-Theanine, PharmaGABA®, and affron® Saffron.',
 '{{"Stress level {{stress_level}}/10","HPA axis dysregulation"}}',
 '10–27× more bioavailable — KSM-66® standardized extract in micellar delivery','strong', true),

('gut_symptoms','Gut / Digestive Symptoms','symptom','physicalSymptoms','contains_any','bloating,IBS,constipation,diarrhea,GERD,reflux,leaky gut',
 'high','Balance+ Gut Repair','Gut Health / Digestive','Capsule',
 '2 capsules twice daily','twice-daily','{morning,evening}',
 'Digestive symptoms indicate gut barrier disruption and microbiome imbalance. Balance+ is the most comprehensive gut repair formula available: Liposomal BPC-157 (intestinal lining regeneration), L-Glutamine, Curcumin, Quercetin, Butyrate, Zinc Carnosine, C15:0, Probiotics, and DigestiZorb+™ enzymes.',
 '{{"Digestive symptoms","Gut barrier and microbiome repair"}}',
 '10–27× more bioavailable — liposomal BPC-157 and curcumin for targeted gut lining repair','strong', true),

('joint_pain','Joint Pain / Inflammation','symptom','physicalSymptoms','contains','joint pain',
 'medium','FLEX+ Joint & Inflammation','Joint / Anti-Inflammatory','Capsule',
 '2 capsules daily','daily','{morning}',
 'Joint pain and inflammation indicate cartilage stress and systemic inflammatory burden. FLEX+ provides the most complete joint support stack: Liposomal Curcumin, Boswellia AprèsFlex®, Quercefit® Quercetin, Type II Collagen UC-II®, Liposomal Hyaluronic Acid, MSM, and AstaPure® Astaxanthin.',
 '{{"Joint pain / inflammation","Cartilage and systemic anti-inflammatory support"}}',
 '10–27× more bioavailable — liposomal curcumin achieves therapeutic plasma concentrations','strong', true),

-- ── DEMOGRAPHIC / BASELINE RULES ────────────────────────────────────────────

('longevity_over45','Longevity Optimization (Age 45+)','demographic','demographics.age','gt','45',
 'low','Replenish NAD+','Longevity / NAD+','Capsule',
 '2 capsules daily','daily','{morning}',
 'At {{age}} years old, NAD+ levels have declined by approximately 50% from peak. Replenish NAD+ addresses the core drivers of biological aging: NMN (NAD+ restoration), Pterostilbene (sirtuin activation), Urolithin A (mitophagy), C15:0, CoQ10, PQQ, and Spermidine.',
 '{{"Age {{age}} — longevity optimization","NAD+ decline up to 50% from peak"}}',
 '10–27× more bioavailable — liposomal NMN critical for systemic NAD+ repletion','moderate', true),

('magnesium_baseline','Magnesium Baseline','demographic','demographics.age','gt','18',
 'low','Magnesium Synergy Matrix','Mineral / Magnesium','Capsule',
 '1 capsule daily','daily','{evening}',
 'Magnesium insufficiency affects an estimated 50–68% of adults due to soil depletion and processed food diets, yet it is required for over 300 enzymatic reactions. The Magnesium Synergy Matrix''s six-form blend ensures coverage across all tissue types with superior absorption in every form.',
 '{{"Magnesium insufficiency affects ~60% of adults","300+ enzyme reactions require magnesium"}}',
 '10–27× more bioavailable than magnesium oxide; six forms target different tissues','strong', true)

ON CONFLICT (rule_id) DO UPDATE SET
  product_name = EXCLUDED.product_name,
  rationale_template = EXCLUDED.rationale_template,
  health_signals_template = EXCLUDED.health_signals_template,
  bioavailability_note = EXCLUDED.bioavailability_note,
  is_active = EXCLUDED.is_active;
