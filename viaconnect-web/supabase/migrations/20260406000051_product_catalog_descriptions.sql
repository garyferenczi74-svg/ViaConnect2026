-- ============================================================
-- Add short_description to product_catalog
-- Source: FarmCeutica_Product_Catalog_Descriptions.docx
-- 60 products · verbatim marketing copy
-- ============================================================

ALTER TABLE product_catalog
  ADD COLUMN IF NOT EXISTS short_description text;

-- ── PROPRIETARY BASE ────────────────────────────────────────

UPDATE product_catalog SET short_description =
'A fully methylated B-complex engineered for individuals with compromised methylation pathways, MethylB Complete+™ delivers all eight essential B vitamins in their most bioactive forms — including 5-MTHF folate and methylcobalamin B12 — wrapped in FarmCeutica''s dual liposomal-micellar delivery system for 10–27× greater absorption than standard supplements. This foundational formula serves as the methylation backbone across the entire FarmCeutica product line, ensuring your body can convert nutrients into cellular energy, support neurotransmitter production, and maintain optimal homocysteine levels from day one.'
WHERE name ILIKE '%MethylB%' OR name ILIKE '%Methyl B%';

UPDATE product_catalog SET short_description =
'Six precision-selected forms of magnesium — bisglycinate, citrate, malate, orotate, taurate, and L-threonate — working in concert to target every major body system simultaneously. FarmCeutica''s Magnesium Synergy Matrix goes beyond single-form supplements by delivering tissue-specific magnesium where it matters most: L-threonate crosses the blood-brain barrier for cognitive support, taurate supports cardiovascular rhythm, malate fuels mitochondrial ATP production, and bisglycinate calms the nervous system — all in one comprehensive daily capsule.'
WHERE name ILIKE '%Magnesium Synergy%';

UPDATE product_catalog SET short_description =
'Powered by an innovative Effervescent Hydrogen Matrix, this advanced electrolyte formula goes far beyond basic hydration by combining magnesium citrate, potassium citrate, pure Himalayan sea salt sodium, and zinc bisglycinate with molecular hydrogen support. Designed for athletes, high-performers, and anyone navigating demanding daily routines, FarmCeutica''s Electrolyte Blend restores mineral balance at the cellular level while supporting antioxidant defense — delivering clean, bioavailable hydration without artificial sweeteners, fillers, or unnecessary stimulants.'
WHERE name ILIKE '%Electrolyte%';

UPDATE product_catalog SET short_description =
'A metabolic powerhouse combining berberine HCl, BHB ketone salts, L-carnitine tartrate, and chromium picolinate with FarmCeutica''s proprietary GLP-1 activation pathway — including EGCG green tea extract, conjugated linoleic acid, and a 10-billion CFU probiotic blend. Inferno + GLP-1 Activator Complex is engineered to support healthy blood sugar metabolism, activate natural satiety signaling, and promote thermogenic fat oxidation through multiple complementary mechanisms, making it the ideal foundation for precision weight management protocols.'
WHERE name ILIKE '%Inferno%' OR name ILIKE '%GLP-1 Activator%';

UPDATE product_catalog SET short_description =
'FarmCeutica''s exogenous ketone formula delivers a tri-salt BHB complex — calcium, magnesium, and sodium beta-hydroxybutyrate — enhanced with liposomal organic MCT oil for sustained ketone elevation and rapid fuel switching. Whether you''re supporting a ketogenic lifestyle, seeking enhanced mental clarity during intermittent fasting, or fueling endurance performance, BHB Ketone Salts provide clean, crash-free energy by giving your brain and muscles their preferred high-efficiency fuel source.'
WHERE name ILIKE '%BHB Ketone%';

UPDATE product_catalog SET short_description =
'A sophisticated neurotransmitter precursor formula built around the tetrahydrobiopterin (BH4) pathway — the master cofactor behind dopamine, serotonin, and nitric oxide synthesis. Featuring L-Dopa from Mucuna pruriens, liposomal L-tyrosine, PQQ, CoQ10 ubiquinol, and 5-MTHF folate alongside L-citrulline and L-arginine for vascular support, NeuroCalm BH4 Complex addresses the biochemical roots of mood, motivation, and cognitive clarity rather than masking symptoms with stimulants.'
WHERE name ILIKE '%NeuroCalm BH4 Complex%' AND name NOT ILIKE '%Advanced%' AND name NOT ILIKE '%+%';

UPDATE product_catalog SET short_description =
'A 100% plant-based omega-3 formula delivering pharmaceutical-grade DHA and EPA from sustainably harvested algal sources — the same origin fish get their omega-3s from — enhanced with natural astaxanthin and an algal phospholipid matrix for superior brain and cellular membrane absorption. FarmCeutica''s Algal Omega-3 eliminates concerns about ocean contaminants, heavy metals, and fishy aftertaste while providing the essential fatty acids critical for neurological health, cardiovascular function, and systemic inflammation management.'
WHERE name ILIKE '%Omega-3%' OR name ILIKE '%DHA%EPA%';

UPDATE product_catalog SET short_description =
'A triple-action environmental detoxification formula combining calcium bentonite clay, clinoptilolite zeolite, and chlorella into a comprehensive toxin-binding complex. ToxiBind Matrix™ leverages the unique cation-exchange capacity of zeolite, the broad-spectrum adsorption properties of bentonite, and chlorella''s heavy-metal chelation abilities to support your body''s natural elimination of environmental pollutants, mycotoxins, and metabolic waste — making it an essential companion to any detox, cleanse, or environmental exposure protocol.'
WHERE name ILIKE '%ToxiBind%';

-- ── ADVANCED FORMULAS ───────────────────────────────────────

UPDATE product_catalog SET short_description =
'Engineered for sustained cognitive performance, FOCUS+ combines micellar Lion''s Mane extract with 30% polysaccharides, Bacopa monnieri at 50% bacosides, liposomal paraxanthine (enfinity®), Suntheanine® L-theanine, Kaneka QH® ubiquinol, and Ginkgo biloba in a synergistic nootropic stack. This is not a caffeine-based stimulant — it''s a precision neurotrophin formula designed to support nerve growth factor production, acetylcholine signaling, and cerebral blood flow for clean, jitter-free mental clarity that builds over time.'
WHERE name ILIKE '%FOCUS+%';

UPDATE product_catalog SET short_description =
'A multi-pathway sleep architecture formula featuring liposomal extended-release melatonin, tart cherry extract, 5-HTP, pharmaceutical-grade L-glycine, apigenin from chamomile, magnesium bisglycinate, and a proprietary broad-spectrum CBD/CBN blend. RELAX+ doesn''t just help you fall asleep — it supports all four stages of sleep architecture, promoting deeper slow-wave recovery sleep and healthy REM cycling so you wake genuinely restored, not groggy, with your circadian rhythm reinforced rather than disrupted.'
WHERE name ILIKE '%RELAX+%';

UPDATE product_catalog SET short_description =
'Far more than a daily multivitamin, CATALYST+ is a mitochondrial energy production system featuring the complete Magnesium Synergy Matrix, methylated B-complex, fat-soluble vitamins D3/K2/A/E in their most bioactive forms, a full trace mineral complex, and targeted antioxidants including astaxanthin, CoQ10, and alpha-lipoic acid — totaling 27 precision-dosed ingredients. Delivered through FarmCeutica''s dual liposomal-micellar system, CATALYST+ transforms the daily multivitamin from a checkbox habit into a genuine cellular performance upgrade.'
WHERE name ILIKE '%CATALYST+%';

UPDATE product_catalog SET short_description =
'A comprehensive 22-ingredient liver support and detoxification formula built around liposomal glutathione, NAC, milk thistle, TUDCA, and curcumin — the gold-standard combination for Phase I and Phase II hepatic detoxification — enhanced with berberine, dandelion root, artichoke extract, and alpha-lipoic acid. Clean+ supports the liver''s natural ability to process and eliminate toxins, metabolic byproducts, and pharmaceutical residues while protecting hepatocytes from oxidative damage, making it essential for anyone in modern urban environments.'
WHERE name ILIKE '%Clean+%' OR name ILIKE '%Detox%Liver%';

UPDATE product_catalog SET short_description =
'A therapeutic-grade gut restoration formula combining liposomal BPC-157 peptide with L-glutamine, N-acetyl glucosamine, curcumin, Saccharomyces boulardii, quercetin, sodium butyrate, and PepZin GI® zinc carnosine across 18 targeted ingredients. Balance+ addresses the gut lining, microbiome diversity, and mucosal immune function simultaneously — supporting tight junction integrity, reducing intestinal permeability, and creating the optimal environment for beneficial bacterial colonization and long-term digestive resilience.'
WHERE name ILIKE '%Balance+%' OR name ILIKE '%Gut Repair%';

UPDATE product_catalog SET short_description =
'A premium joint and systemic inflammation formula featuring a proprietary omega-3 phospholipid complex, liposomal curcumin, AprèsFlex® boswellia serrata, Quercefit® quercetin phytosome, low-molecular-weight hyaluronic acid, UC-II® type II collagen, MSM, and AstaPure® astaxanthin. FLEX+ targets inflammatory mediators through multiple complementary pathways while simultaneously supporting cartilage regeneration, synovial fluid viscosity, and connective tissue repair — providing comprehensive musculoskeletal support without the risks of chronic NSAID use.'
WHERE name ILIKE '%FLEX+%' OR name ILIKE '%Joint%Inflammation%';

UPDATE product_catalog SET short_description =
'A precision-engineered vascular performance formula combining liposomal L-citrulline malate, methylfolate, methylcobalamin, P-5-P, vitamin C, micellar beetroot extract, Nitrosigine® bonded arginine silicate, and BioPerine® to maximize endogenous nitric oxide production through both the NOS enzyme and nitrate-nitrite pathways. BLAST+ supports vasodilation, blood flow, exercise endurance, and cardiovascular health while addressing the methylation cofactors essential for maintaining healthy nitric oxide synthase function.'
WHERE name ILIKE '%BLAST+%' OR name ILIKE '%Nitric Oxide%';

UPDATE product_catalog SET short_description =
'An advanced cellular longevity formula centered on liposomal NMN — the direct precursor to NAD+ — synergized with pterostilbene, CoQ10 ubiquinol, PQQ, urolithin A, calcium alpha-ketoglutarate, pentadecanoic acid (C15:0), and spermidine. Replenish NAD+ targets the age-related decline of nicotinamide adenine dinucleotide through multiple converging pathways: boosting NAD+ synthesis, activating sirtuins, supporting mitophagy, and protecting telomere integrity — a comprehensive approach to cellular aging rooted in the latest longevity research.'
WHERE name ILIKE '%Replenish NAD%' OR name ILIKE '%NAD+%';

UPDATE product_catalog SET short_description =
'A botanical adaptogen complex featuring KSM-66® ashwagandha, rhodiola rosea, schisandra chinensis, holy basil, affron® saffron extract, Suntheanine® L-theanine, PharmaGABA®, and Lion''s Mane mushroom — ten clinically studied ingredients working across the HPA axis, GABAergic, and serotonergic pathways. NeuroCalm+ helps modulate the cortisol stress response, promote parasympathetic nervous system activation, and support emotional resilience without sedation, making it ideal for high-stress professionals who need calm focus, not drowsiness.'
WHERE name ILIKE '%NeuroCalm+%' AND name NOT ILIKE '%BH4%';

UPDATE product_catalog SET short_description =
'Building on the foundational NeuroCalm BH4 Complex, this advanced formulation deepens neurotransmitter precursor support with enhanced doses of L-Dopa, liposomal L-tyrosine, PQQ, CoQ10 ubiquinol, and 5-MTHF alongside additional cofactors for individuals requiring more intensive BH4 pathway optimization. Designed for practitioners managing complex neurochemical imbalances, BH4+ provides the raw materials and enzymatic cofactors necessary for robust dopamine, serotonin, and catecholamine synthesis.'
WHERE name ILIKE '%NeuroCalm BH4+%' OR name ILIKE '%BH4+%' OR (name ILIKE '%BH4%' AND name ILIKE '%Advanced%');

UPDATE product_catalog SET short_description =
'A comprehensive hematological support formula pairing highly bioavailable iron bisglycinate with the full spectrum of red blood cell cofactors — liposomal vitamins D3 and K2, selenium, vitamin C for iron absorption, quercetin, copper and zinc bisglycinate, and B-vitamins essential for erythropoiesis. IRON+ is designed to restore healthy hemoglobin and ferritin levels without the gastrointestinal distress common to standard iron supplements, making it ideal for women, athletes, and individuals with chronic iron-deficiency patterns.'
WHERE name ILIKE '%IRON+%' OR name ILIKE '%Red Blood Cell%';

UPDATE product_catalog SET short_description =
'A next-generation performance formula built on creatine hydrochloride — the most soluble and stomach-friendly form of creatine — enhanced with HMB free acid, CarnoSyn® beta-alanine, R-alpha lipoic acid, glycine, L-ergothioneine, BioPerine®, and methylated B-vitamins. Creatine HCL+ delivers the proven strength, power, and cognitive benefits of creatine supplementation while adding anti-catabolic HMB support and buffering capacity via beta-alanine, all without the bloating and water retention associated with conventional creatine monohydrate.'
WHERE name ILIKE '%Creatine%';

UPDATE product_catalog SET short_description =
'A broad-spectrum digestive enzyme formula featuring acid-stable protease, amylase, lipase, lactase, cellulase, bromelain, papain, micellar ginger root extract, and additional specialized enzymes to support complete macronutrient breakdown. DigestiZorb+™ addresses the enzymatic decline that occurs naturally with age and stress, ensuring efficient protein, fat, carbohydrate, and fiber digestion — reducing bloating, gas, and post-meal discomfort while maximizing nutrient extraction from every meal you eat.'
WHERE name ILIKE '%DigestiZorb%' OR name ILIKE '%Enzyme Complex%';

UPDATE product_catalog SET short_description =
'A comprehensive histamine management formula combining FarmCeutica''s BioB Fusion™ methylated B complex, DigestiZorb probiotic blend, liposomal BPC-157 peptide, quercetin, magnesium and zinc bisglycinate, curcumin, DAO enzyme, and vitamin C across 16 targeted ingredients. Histamine Relief Protocol™ addresses histamine intolerance at every level — reducing mast cell degranulation, supporting DAO enzyme activity for histamine breakdown, healing the gut lining to prevent excess histamine absorption, and stabilizing the immune response.'
WHERE name ILIKE '%Histamine Relief%';

UPDATE product_catalog SET short_description =
'A cutting-edge longevity formula targeting telomere length maintenance through astragalus, cycloastragenol, and AC-11® Cat''s Claw extract — three of the most researched telomerase activators — combined with Centella asiatica, liposomal D3/K2, trans-resveratrol, and vitamin C. Teloprime+ represents FarmCeutica''s commitment to translating the latest in aging biology into practical supplementation, supporting the cellular structures that protect your DNA with every division and directly influence biological versus chronological age.'
WHERE name ILIKE '%Teloprime%' OR name ILIKE '%Telomere%';

UPDATE product_catalog SET short_description =
'A research-backed male hormonal optimization formula combining micellar Tongkat Ali (200:1), Fadogia agrestis, KSM-66® ashwagandha, horny goat weed, and shilajit with L-citrulline malate, zinc bisglycinate, and DIM for estrogen metabolism balance. RISE+ supports natural testosterone production, free testosterone levels, and healthy estrogen clearance through multiple complementary pathways — designed for men seeking to maintain peak hormonal vitality, lean body composition, libido, and physical performance as they age.'
WHERE name ILIKE '%RISE+%' OR name ILIKE '%Male Testosterone%';

UPDATE product_catalog SET short_description =
'A comprehensive women''s hormonal vitality formula featuring micellar Tongkat Ali, tribulus terrestris, shilajit, sea moss, maca root, ashwagandha, L-citrulline, and schisandra chinensis across 17 synergistic ingredients. DESIRE+ is formulated to support healthy female libido, hormonal balance, adrenal function, and sexual wellness by addressing the interconnected axes of stress adaptation, blood flow, and reproductive hormone optimization — empowering women to reclaim vitality at every stage of life.'
WHERE name ILIKE '%DESIRE+%' OR name ILIKE '%Female Hormonal%';

-- ── WOMEN'S HEALTH ──────────────────────────────────────────

UPDATE product_catalog SET short_description =
'A precision prenatal built on FarmCeutica''s MethylB Complete+™ backbone, delivering iron bisglycinate, calcium, liposomal D3/K2, choline alpha-GPC, iodine, and the complete Magnesium Synergy Matrix in their most bioavailable forms. Grow+ provides the critical methylation support, neural tube development nutrients, and mineral cofactors that both mother and developing baby need — with liposomal delivery to maximize absorption during a time when nutrient demands are highest and digestive comfort matters most.'
WHERE name ILIKE '%Grow+%' OR name ILIKE '%Pre-Natal%' OR name ILIKE '%Prenatal%';

UPDATE product_catalog SET short_description =
'Formulated specifically for menstrual cycle support, CycleSync+ combines liposomal Vitex agnus-castus, DIM, black cohosh, evening primrose oil, calcium D-glucarate, myo-inositol, and magnesium glycinate across 14 targeted ingredients. This formula supports healthy estrogen metabolism, progesterone balance, and prostaglandin regulation throughout all four phases of the menstrual cycle — helping to ease PMS symptoms, support regular cycles, and promote hormonal equilibrium without synthetic intervention.'
WHERE name ILIKE '%CycleSync%';

UPDATE product_catalog SET short_description =
'A botanical-forward menopause support formula featuring liposomal red clover isoflavones, black cohosh, DIM, wild yam, dong quai, phosphatidylserine, ashwagandha, and maca root across 14 ingredients designed to ease the menopausal transition. MenoBalance+ addresses hot flashes, night sweats, mood fluctuations, and bone density concerns through phytoestrogenic support and adaptogenic stress modulation — providing women with a comprehensive natural alternative for navigating perimenopause and menopause with confidence and comfort.'
WHERE name ILIKE '%MenoBalance%';

UPDATE product_catalog SET short_description =
'A beauty-from-within formula delivering liposomal astaxanthin, ubiquinol CoQ10, mixed tocopherols and tocotrienols, evening primrose GLA, ceramide complex, lutein, zeaxanthin, and biotin across 16 skin, hair, and nail support ingredients. Radiance+ works at the cellular level — protecting against UV-induced oxidative damage, supporting collagen synthesis, maintaining skin lipid barrier integrity, and nourishing follicular health — because true radiance starts with the nutrients your cells receive, not what you apply on the surface.'
WHERE name ILIKE '%Radiance+%';

UPDATE product_catalog SET short_description =
'A targeted thyroid optimization formula combining liposomal ashwagandha, selenium selenomethionine, guggulsterones, bladderwrack, L-tyrosine, iodine, and zinc across 15 ingredients that support every stage of thyroid hormone production, conversion, and receptor sensitivity. ThyroBalance+ addresses the full thyroid cascade — from TSH signaling through T4-to-T3 conversion to cellular receptor activation — making it ideal for women experiencing subclinical thyroid imbalances, fatigue, weight resistance, or temperature sensitivity.'
WHERE name ILIKE '%ThyroBalance%';

UPDATE product_catalog SET short_description =
'A revolutionary post-natal recovery formula uniquely combining BPC-157 gut-healing peptide with FarmCeutica''s MethylB Complete+™, NeuroCalm BH4 Complex, and GLP-1 Activator Complex alongside magnesium, omega-3 DHA, iron, and vitamin D3. Thrive+ addresses the three pillars of postpartum recovery simultaneously — metabolic recalibration through GLP-1 pathway activation, neurochemical rebalancing for mood support, and tissue repair via BPC-157 — helping new mothers restore energy, body composition, and emotional wellness.'
WHERE name ILIKE '%Thrive+%' OR name ILIKE '%Post-Natal GLP%';

UPDATE product_catalog SET short_description =
'A comprehensive postnatal replenishment formula delivering FarmCeutica''s MethylB Complete+™, algal omega-3 DHA/EPA, full-spectrum amino acid matrix, 10-billion CFU probiotic blend, NeuroCalm BH4 Complex, Magnesium Synergy Matrix, iron bisglycinate, and vitamin D3 across 16+ essential recovery ingredients. Revitalizher Postnatal+ is designed to rebuild the nutrient stores depleted during pregnancy and breastfeeding while supporting lactation, immune resilience, bone health, and the demanding energy requirements of new motherhood.'
WHERE name ILIKE '%Revitalizher%' OR name ILIKE '%Postnatal+%';

-- ── CHILDREN'S ──────────────────────────────────────────────

UPDATE product_catalog SET short_description =
'A complete children''s multivitamin gummy built on FarmCeutica''s methylated B-complex and Magnesium Synergy Matrix foundations, delivering omega-3 DHA/EPA from algal oil, a 10-billion CFU probiotic blend, liposomal fat-soluble vitamins A/D3/E/K2, and essential minerals including iron, zinc, selenium, and iodine in a taste-friendly gummy format. Sproutables Children Gummies provide growing bodies with the bioavailable, methylated nutrition they need for cognitive development, immune strength, and healthy growth — without artificial colors, flavors, or synthetic fillers.'
WHERE name ILIKE '%Children Gummies%' OR name ILIKE '%Sproutables Children%';

UPDATE product_catalog SET short_description =
'Specifically formulated for toddlers aged 1–3, this chewable tablet delivers FarmCeutica''s methylated B-complex, Magnesium Synergy Matrix, algal omega-3 DHA/EPA, a 10-billion CFU probiotic blend, and liposomal vitamins A/D3/E/K2 alongside age-appropriate doses of iron, zinc, selenium, and iodine. Sproutables Toddler Tablets support the rapid neurological development, immune system maturation, and bone growth demands of the toddler years in a gentle, easy-to-chew format designed for little mouths.'
WHERE name ILIKE '%Toddler Tablets%' OR name ILIKE '%Sproutables Toddler%';

UPDATE product_catalog SET short_description =
'A liquid tincture formulated for infants from birth to 12 months, delivering FarmCeutica''s methylated B-complex, a specialized probiotic blend, and liposomal vitamins A, D3, E, K1, and C alongside iron bisglycinate, zinc, and DHA in precisely dosed drops. Sproutables Infant Tincture provides the essential micronutrients that support healthy brain development, immune priming, and bone mineralization during the most critical growth window of life — in a gentle liquid form that''s easy to administer with feeding.'
WHERE name ILIKE '%Infant Tincture%' OR name ILIKE '%Sproutables Infant%';

-- ── METHYLATION SUPPORT (GENEX360) ──────────────────────────

UPDATE product_catalog SET short_description =
'Precision-formulated for individuals carrying MTHFR gene variants, this formula delivers methylated B2, P-5-P B6, liposomal 5-MTHF folate, dual-form B12 (methylcobalamin + adenosylcobalamin), SAMe, magnesium bisglycinate, choline alpha-GPC, and zinc across 13 cofactors. MTHFR+™ bypasses the impaired methylenetetrahydrofolate reductase enzyme entirely, providing the downstream methylated nutrients your body needs for homocysteine clearance, DNA repair, neurotransmitter synthesis, and healthy cellular methylation cycles.'
WHERE name ILIKE '%MTHFR+%' OR name ILIKE '%Folate Metabolism%';

UPDATE product_catalog SET short_description =
'Designed for individuals with catechol-O-methyltransferase (COMT) gene variants who may experience slow catecholamine clearance, this formula provides liposomal magnesium bisglycinate, SAMe, methylated B2/B6, liposomal folate and dual-form B12, lithium orotate, and L-theanine. COMT+™ supports balanced dopamine and norepinephrine metabolism — helping modulate the stress response, support emotional stability, and maintain healthy neurotransmitter turnover for individuals prone to anxiety, irritability, or estrogen dominance.'
WHERE name ILIKE '%COMT+%' OR name ILIKE '%Neurotransmitter Balance%';

UPDATE product_catalog SET short_description =
'Formulated for individuals with cystathionine beta-synthase (CBS) upregulations who may overproduce sulfur metabolites, this formula features molybdenum glycinate, P-5-P B6, L-serine, liposomal NAC, L-carnitine tartrate, taurine, TMG, and reduced glutathione. CBS Support+™ helps redirect sulfur metabolism through healthier pathways, supports ammonia detoxification, and provides the specific cofactors needed to maintain balanced transsulfuration without the sulfur overload that can drive fatigue, brain fog, and inflammation.'
WHERE name ILIKE '%CBS Support%' OR name ILIKE '%Sulfur Pathway%';

UPDATE product_catalog SET short_description =
'Targeted for individuals with monoamine oxidase A (MAOA) gene variants affecting serotonin and norepinephrine breakdown, this formula provides SAMe, methylated B2/B6, liposomal 5-MTHF and dual-form B12, L-theanine, magnesium bisglycinate, GABA, and curcumin. MAOA+™ supports balanced monoamine metabolism and healthy neurotransmitter clearance — addressing the biochemical patterns behind mood swings, impulsivity, carbohydrate cravings, and sleep disruption that can accompany MAOA polymorphisms.'
WHERE name ILIKE '%MAOA+%' OR name ILIKE '%Neurochemical Balance%';

UPDATE product_catalog SET short_description =
'Designed for individuals carrying methionine synthase (MTR) gene variants, this formula delivers methylated B2/B6, liposomal 5-MTHF, dual-form B12, SAMe, betaine anhydrous (TMG), magnesium bisglycinate, and choline alpha-GPC to support the methionine cycle''s critical conversion of homocysteine back to methionine. MTR+™ ensures adequate methyl group supply for DNA methylation, creatine synthesis, and phospholipid production even when the primary B12-dependent remethylation pathway is compromised.'
WHERE name ILIKE '%MTR+%' OR name ILIKE '%Methylation Matrix%';

UPDATE product_catalog SET short_description =
'Formulated for individuals with methionine synthase reductase (MTRR) variants who struggle to regenerate active methylcobalamin, this formula features methylated B2, nicotinamide riboside (B3), liposomal 5-MTHF, dual-form B12, SAMe, magnesium, choline, and zinc. MTRR+™ provides the specific reducing cofactors needed to keep methylcobalamin in its active state — ensuring continuous methionine synthase function and preventing the functional B12 deficiency that can occur even with adequate B12 intake.'
WHERE name ILIKE '%MTRR+%' OR name ILIKE '%Methylcobalamin Regen%';

UPDATE product_catalog SET short_description =
'Targeted for individuals needing betaine-homocysteine methyltransferase (BHMT) pathway support, this formula delivers betaine anhydrous (TMG), DMG, zinc bisglycinate, liposomal magnesium L-threonate, taurine, choline alpha-GPC, liposomal 5-MTHF, and methylcobalamin. BHMT+™ activates the alternative homocysteine remethylation pathway that operates independently of folate — providing a critical backup methylation route for individuals with combined MTHFR and MTR variants who need multiple pathways working simultaneously.'
WHERE name ILIKE '%BHMT+%';

UPDATE product_catalog SET short_description =
'Precision-formulated for individuals with acetylcholinesterase-related gene variants, ACHY+ delivers liposomal choline alpha-GPC, acetyl-L-carnitine, citicoline (CDP-choline), micellar Bacopa monnieri, pantethine B5, methylcobalamin, phosphatidylserine, and huperzine A across 14 cholinergic support ingredients. This formula supports acetylcholine synthesis, availability, and receptor sensitivity — the neurotransmitter essential for memory consolidation, learning speed, neuromuscular function, and parasympathetic nervous system tone.'
WHERE name ILIKE '%ACHY+%' OR name ILIKE '%Acetylcholine Support%';

UPDATE product_catalog SET short_description =
'Designed for individuals with acetyl-CoA acetyltransferase (ACAT) gene variants affecting mitochondrial energy metabolism, this formula delivers liposomal acetyl-L-carnitine, methylated B2/B3/B5, liposomal 5-MTHF and methylcobalamin, CoQ10, and alpha-lipoic acid across 14 mitochondrial cofactors. ACAT+™ supports the acetyl-CoA pathway critical for fatty acid oxidation, ketone body production, and Krebs cycle efficiency — ensuring your mitochondria have every cofactor needed to generate optimal cellular energy.'
WHERE name ILIKE '%ACAT+%' OR name ILIKE '%Mitochondrial Support%';

UPDATE product_catalog SET short_description =
'Formulated for individuals carrying vitamin D receptor (VDR) gene variants that reduce cellular vitamin D responsiveness, VDR+™ delivers liposomal D3, K2 (MK-7), 5-MTHF, methylcobalamin, magnesium bisglycinate, boron citrate, zinc, and quercetin. This formula addresses VDR polymorphisms by providing both the active hormone and the receptor-sensitizing cofactors needed to maximize vitamin D signaling — supporting immune modulation, calcium metabolism, bone density, and the hundreds of genes regulated by the vitamin D receptor.'
WHERE name ILIKE '%VDR+%' OR name ILIKE '%Receptor Activation%';

UPDATE product_catalog SET short_description =
'Targeted for individuals with diamine oxidase (DAO) gene variants predisposing them to histamine intolerance, this formula delivers P-5-P B6, liposomal vitamin C, copper and zinc bisglycinate, liposomal quercetin, DAO enzyme from non-GMO porcine kidney, magnesium, and Quatrefolic® 5-MTHF. DAO+™ supports both the production and supplementation of the DAO enzyme responsible for breaking down dietary histamine in the gut — addressing the root enzymatic cause of histamine sensitivity rather than just blocking symptoms.'
WHERE name ILIKE '%DAO+%' OR name ILIKE '%Histamine Balance%';

UPDATE product_catalog SET short_description =
'Designed for individuals with glutathione S-transferase (GST) gene deletions or variants impairing Phase II detoxification, this formula features liposomal reduced glutathione, NAC, R-alpha-lipoic acid, selenomethionine, methylated B2/B6, 5-MTHF, and dual-form B12. GST+™ bypasses compromised GST enzyme activity by directly supplying the master antioxidant glutathione alongside its recycling cofactors — supporting the body''s ability to conjugate and eliminate environmental toxins, heavy metals, and oxidative stress byproducts.'
WHERE name ILIKE '%GST+%' OR name ILIKE '%Cellular Detox%';

UPDATE product_catalog SET short_description =
'Formulated for individuals with superoxide dismutase (SOD) gene variants affecting their primary antioxidant defense, this formula delivers methylated B2/B6, liposomal 5-MTHF, methylcobalamin, supplemental SOD enzyme, selenium, zinc, and manganese alongside curcumin and alpha-lipoic acid. SOD+™ reinforces the body''s frontline defense against superoxide radicals — the most damaging reactive oxygen species — by providing both the enzyme itself and every mineral cofactor required for SOD1, SOD2, and SOD3 isoform function.'
WHERE name ILIKE '%SOD+%' OR name ILIKE '%Antioxidant Defense%';

UPDATE product_catalog SET short_description =
'Precision-formulated for individuals with nitric oxide synthase (NOS) gene variants compromising endothelial function, NOS+™ delivers the complete MethylB Complex, L-citrulline malate, L-arginine, L-norvaline, magnesium, zinc, NeuroCalm BH4 Complex, and liposomal CoQ10 ubiquinol. This formula provides every substrate, cofactor, and antioxidant the NOS enzyme needs to produce nitric oxide efficiently — supporting blood pressure regulation, vascular elasticity, and cardiovascular health at the genetic level.'
WHERE name ILIKE '%NOS+%' OR name ILIKE '%Vascular Integrity%';

UPDATE product_catalog SET short_description =
'Targeted for individuals with sulfite oxidase (SUOX) gene variants impairing the conversion of toxic sulfites to harmless sulfates, this formula delivers methylated B2/B6, liposomal 5-MTHF, methylcobalamin, molybdenum glycinate chelate, selenium, zinc, and reduced glutathione. SUOX+™ provides the critical molybdenum cofactor that sulfite oxidase requires, along with antioxidant support to manage the oxidative burden of sulfite accumulation — essential for individuals with sulfite sensitivity, wine intolerance, or chronic headaches.'
WHERE name ILIKE '%SUOX+%' OR name ILIKE '%Sulfite Clearance%';

UPDATE product_catalog SET short_description =
'Formulated for individuals with N-acetyltransferase (NAT) gene variants affecting Phase II acetylation detoxification, this formula provides methylated B2/B5/B6, liposomal 5-MTHF, dual-form B12, acetyl-L-carnitine, magnesium, choline alpha-GPC, liposomal NAC, and reduced glutathione. NAT Support+™ ensures adequate acetyl-CoA availability and antioxidant buffering for individuals who are slow acetylators — helping them process aromatic amines, pharmaceutical compounds, and environmental chemicals more effectively.'
WHERE name ILIKE '%NAT Support%' OR name ILIKE '%Acetylation%';

UPDATE product_catalog SET short_description =
'Designed for individuals with transcobalamin II (TCN2) gene variants that impair vitamin B12 transport into cells, this formula delivers methylated B2, liposomal 5-MTHF, and three forms of B12 — methylcobalamin, adenosylcobalamin, and hydroxocobalamin — alongside zinc, magnesium, and TMG. TCN2+™ saturates all available transport pathways with multiple B12 forms to overcome transport protein inefficiencies, ensuring adequate intracellular B12 levels for methylation, energy production, and neurological function.'
WHERE name ILIKE '%TCN2+%' OR name ILIKE '%B12 Transport%';

UPDATE product_catalog SET short_description =
'Targeted for individuals with reduced folate carrier 1 (RFC1) gene variants limiting cellular folate uptake, this formula features methylated B2/B6, liposomal 5-MTHF, dual-form B12, folinic acid (calcium folinate), TMG, magnesium, and zinc across 14 ingredients. RFC1 Support+™ provides both methylfolate and folinic acid — two different folate forms using different transport mechanisms — to bypass RFC1 transport limitations and ensure cells receive adequate folate for DNA synthesis, repair, and methylation.'
WHERE name ILIKE '%RFC1%' OR name ILIKE '%Folate Transport%';

UPDATE product_catalog SET short_description =
'Formulated for individuals with serine hydroxymethyltransferase (SHMT) gene variants disrupting the glycine-folate interconversion pathway, this formula delivers methylated B2/B6, liposomal 5-MTHF, dual-form B12, folinic acid, L-glycine, magnesium, and zinc across 15 ingredients. SHMT+™ supports the one-carbon metabolism cycle that feeds into both nucleotide synthesis and methylation — providing the glycine and folate substrates needed when SHMT enzyme efficiency is reduced by genetic variation.'
WHERE name ILIKE '%SHMT+%' OR name ILIKE '%Glycine-Folate%';

UPDATE product_catalog SET short_description =
'Designed for individuals with adenosine deaminase-related gene variants affecting purine metabolism, this formula features methylated B2, liposomal 5-MTHF, methylcobalamin, ATP, liposomal NAC, L-theanine, curcumin, and SAMe across 12 targeted ingredients. ADO Support+™ addresses the purine salvage and degradation pathways that influence immune cell function, energy metabolism, and adenosine signaling — supporting individuals who may experience immune dysregulation, fatigue, or neurological sensitivity related to purine pathway imbalances.'
WHERE name ILIKE '%ADO Support%' OR name ILIKE '%Purine Metabolism%';

-- ── FUNCTIONAL MUSHROOMS ─────────────────────────────────────

UPDATE product_catalog SET short_description =
'Featuring a potent micellar Lion''s Mane extract standardized to 30% polysaccharides and enhanced with liposomal sunflower lecithin phospholipids for superior absorption, this single-mushroom formula delivers the neurotrophin-stimulating compounds — hericenones and erinacines — that have made Lion''s Mane the most studied functional mushroom for cognitive health. Supports nerve growth factor (NGF) production, memory, focus, and neuroplasticity in a clean, high-potency format.'
WHERE name ILIKE '%Lion''s Mane%' OR name ILIKE '%Lions Mane%';

UPDATE product_catalog SET short_description =
'A premium micellar Reishi extract standardized to 30% polysaccharides and delivered with liposomal phospholipids for enhanced bioavailability. Known as the ''Mushroom of Immortality'' in traditional medicine, Reishi contains triterpenes and beta-glucans that support immune modulation, stress adaptation, and healthy sleep patterns — making it the ideal functional mushroom for individuals seeking deep recovery, immune resilience, and calm nervous system support.'
WHERE name ILIKE '%Reishi%';

UPDATE product_catalog SET short_description =
'A high-potency micellar Chaga extract at a concentrated 10:1 ratio from organic sources, enhanced with liposomal sunflower lecithin phospholipids. Chaga delivers one of nature''s highest concentrations of antioxidants — including superoxide dismutase, melanin, and betulinic acid — supporting immune defense, oxidative stress protection, and healthy inflammatory response. This ancient adaptogenic mushroom supports cellular vitality and longevity in a modern, bioavailable delivery format.'
WHERE name ILIKE '%Chaga%';

UPDATE product_catalog SET short_description =
'Featuring micellar Cordyceps extract standardized to 7% polysaccharides with liposomal phospholipid delivery, this formula harnesses the oxygen-utilization and ATP-production benefits that have made Cordyceps legendary in athletic performance and traditional medicine. Supports mitochondrial energy production, VO2 max, exercise endurance, respiratory function, and adrenal vitality — the ideal functional mushroom for athletes, high-performers, and anyone seeking sustained natural energy without stimulants.'
WHERE name ILIKE '%Cordyceps%';

UPDATE product_catalog SET short_description =
'A potent micellar Turkey Tail extract standardized to 30% polysaccharides — including the clinically studied PSK and PSP beta-glucan compounds — delivered with liposomal phospholipids for maximum absorption. Turkey Tail is the most extensively researched functional mushroom for immune system support, with studies demonstrating its ability to modulate both innate and adaptive immunity. An essential daily formula for immune resilience, gut microbiome health, and overall wellness defense.'
WHERE name ILIKE '%Turkey Tail%';
