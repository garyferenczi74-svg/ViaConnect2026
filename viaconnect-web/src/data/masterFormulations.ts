// src/data/masterFormulations.ts
//
// FarmCeutica Master Formulation Database,60 products
// Source: ViaConnect Prompt #49f (Master Formulation Document extraction).
//
// NOTES:
// • 32 products carry the OFFICIAL formulation data from the prompt.
// • 18 products in METHYLATION SUPPORT (GENEX360) — CBS, MAOA, MTR, MTRR,
//   BHMT, ACHY, ACAT, VDR, DAO, GST, SOD, NOS, SUOX, NAT, TCN2, RFC1, SHMT, ADO —
//   are marked `isDraft: true`. The prompt referenced "raw extraction above" for
//   these but no ingredient data was actually included. Drafts use scientifically
//   grounded standard cofactors for each gene's pathway at clinical support doses
//   pending founder review. Replace whenever the official Master Doc data is
//   available. Find them with: MASTER_FORMULATIONS.filter(p => p.isDraft).
// • 5 mushroom products carry the official 2-ingredient spec from the prompt;
//   marketing copy is minimal and awaits the prior catalog deliverable.

export interface Ingredient {
  /** Full ingredient label as printed on the supplement facts panel */
  name: string;
  /** Stored as a string to preserve decimal precision (e.g. "0.8", "0.002") */
  mgPerServing: string;
  /** True only when name starts with the literal token "Liposomal" */
  isLiposomal: boolean;
  /** True only when name starts with the literal token "Micellar" */
  isMicellar: boolean;
}

export interface ProductFormulation {
  name: string;
  slug: string;
  category: ProductCategory;
  deliveryForm: DeliveryForm;
  ingredientCount: number;
  ingredients: Ingredient[];
  marketingDescription: string;
  /**
   * Optional flag — true if formulation is a placeholder pending official data.
   * Currently set on the 18 GENEX360 SNP products lacking source ingredient lists.
   */
  isDraft?: boolean;
}

export type ProductCategory =
  | 'PROPRIETARY BASE'
  | 'ADVANCED'
  | "WOMEN'S HEALTH"
  | 'METHYLATION SUPPORT (GENEX360)'
  | 'FUNCTIONAL MUSHROOMS'
  | "CHILDREN'S MULTIVITAMINS";

export type DeliveryForm = 'Capsule' | 'Scoop Powder' | 'Gummy' | 'Tablet' | 'Tincture';

// ── Internal helper: build an Ingredient with auto-detected delivery prefix ──
function ing(name: string, mgPerServing: string): Ingredient {
  return {
    name,
    mgPerServing,
    isLiposomal: name.startsWith('Liposomal'),
    isMicellar: name.startsWith('Micellar'),
  };
}

export const MASTER_FORMULATIONS: ProductFormulation[] = [
  // ════════════════════════════════════════════════════════════════════════
  // CATEGORY 1 — PROPRIETARY BASES (8 products)
  // ════════════════════════════════════════════════════════════════════════

  {
    name: 'MethylB Complete+™ B Complex',
    slug: 'methylb-complete-b-complex',
    category: 'PROPRIETARY BASE',
    deliveryForm: 'Capsule',
    ingredientCount: 8,
    ingredients: [
      ing('B1 – Thiamine', '10'),
      ing('B2 – Riboflavin', '10'),
      ing('B3 – Niacin', '15'),
      ing('B5 – Pantothenic Acid', '20'),
      ing('B6 – Pyridoxine', '15'),
      ing('B7 – Biotin', '5'),
      ing('Liposomal B9 – Methyl Folate (5-MTHF)', '0.5'),
      ing('Liposomal B12 – Methylcobalamin', '0.8'),
    ],
    marketingDescription: `A fully methylated B-complex engineered for individuals with compromised methylation pathways, MethylB Complete+™ delivers all eight essential B vitamins in their most bioactive forms, including 5-MTHF folate and methylcobalamin B12, wrapped in FarmCeutica's dual liposomal-micellar delivery system for 10–28× greater absorption than standard supplements. This foundational formula serves as the methylation backbone across the entire FarmCeutica product line, ensuring your body can convert nutrients into cellular energy, support neurotransmitter production, and maintain optimal homocysteine levels from day one.`,
  },

  {
    name: 'Magnesium Synergy Matrix',
    slug: 'magnesium-synergy-matrix',
    category: 'PROPRIETARY BASE',
    deliveryForm: 'Capsule',
    ingredientCount: 6,
    ingredients: [
      ing('Magnesium Bisglycinate', '25'),
      ing('Magnesium Citrate', '25'),
      ing('Magnesium Malate', '25'),
      ing('Magnesium Orotate', '25'),
      ing('Magnesium Taurate', '25'),
      ing('Magnesium L-Threonate', '25'),
    ],
    marketingDescription: `Six precision-selected forms of magnesium, bisglycinate, citrate, malate, orotate, taurate, and L-threonate, working in concert to target every major body system simultaneously. FarmCeutica's Magnesium Synergy Matrix goes beyond single-form supplements by delivering tissue-specific magnesium where it matters most: L-threonate crosses the blood-brain barrier for cognitive support, taurate supports cardiovascular rhythm, malate fuels mitochondrial ATP production, and bisglycinate calms the nervous system, all in one comprehensive daily capsule.`,
  },

  {
    name: 'Electrolyte Blend',
    slug: 'electrolyte-blend',
    category: 'PROPRIETARY BASE',
    deliveryForm: 'Scoop Powder',
    ingredientCount: 5,
    ingredients: [
      ing('Effervescent Hydrogen Matrix (Mg-H complex)', '100'),
      ing('Magnesium (as Citrate)', '50'),
      ing('Potassium (as Citrate)', '50'),
      ing('Pure Himalayan Sea Salt Sodium (as Citrate)', '50'),
      ing('Zinc (Bisglycinate)', '5'),
    ],
    marketingDescription: `Powered by an innovative Effervescent Hydrogen Matrix, this advanced electrolyte formula goes far beyond basic hydration by combining magnesium citrate, potassium citrate, pure Himalayan sea salt sodium, and zinc bisglycinate with molecular hydrogen support. Designed for athletes, high-performers, and anyone navigating demanding daily routines, FarmCeutica's Electrolyte Blend restores mineral balance at the cellular level while supporting antioxidant defense, delivering clean, bioavailable hydration without artificial sweeteners, fillers, or unnecessary stimulants.`,
  },

  {
    name: 'Inferno + GLP-1 Activator Complex',
    slug: 'inferno-glp1-activator-complex',
    category: 'PROPRIETARY BASE',
    deliveryForm: 'Capsule',
    ingredientCount: 14,
    ingredients: [
      ing('Berberine HCl (98% purity)', '30'),
      ing('BHB Salts (Magnesium, Calcium, Sodium)', '150'),
      ing('L-Carnitine Tartrate', '25'),
      ing('Chromium Picolinate (elemental)', '2'),
      ing('Micellar Cinnamon Bark Extract (10:1)', '10'),
      ing('Liposomal Conjugated Linoleic Acid (CLA)', '15'),
      ing('Probiotic Blend (10 Billion CFU)', '150'),
      ing('Liposomal EGCG (Green Tea Extract, 50%)', '10'),
      ing('Micellar Moringa Leaf Extract (10:1)', '10'),
      ing('Liposomal Paraxanthine (PureCaf®)', '10'),
      ing('Selenium (L-Selenomethionine)', '1'),
      ing('Tesofensine (botanical analog mimic)', '2'),
      ing('Micellar Artichoke Leaf Extract (5% Cynarin)', '10'),
      ing('Inulin-FOS (Prebiotic Blend)', '10'),
    ],
    marketingDescription: `A metabolic powerhouse combining berberine HCl, BHB ketone salts, L-carnitine tartrate, and chromium picolinate with FarmCeutica's proprietary GLP-1 activation pathway, including EGCG green tea extract, conjugated linoleic acid, and a 10-billion CFU probiotic blend. Inferno + GLP-1 Activator Complex is engineered to support healthy blood sugar metabolism, activate natural satiety signaling, and promote thermogenic fat oxidation through multiple complementary mechanisms, making it the ideal foundation for precision weight management protocols.`,
  },

  {
    name: 'BHB Ketone Salts',
    slug: 'bhb-ketone-salts',
    category: 'PROPRIETARY BASE',
    deliveryForm: 'Scoop Powder',
    ingredientCount: 4,
    ingredients: [
      ing('Calcium Beta-Hydroxybutyrate', '50'),
      ing('Magnesium Beta-Hydroxybutyrate', '50'),
      ing('Sodium Beta-Hydroxybutyrate', '50'),
      ing('Liposomal Organic MCT', '20'),
    ],
    marketingDescription: `FarmCeutica's exogenous ketone formula delivers a tri-salt BHB complex, calcium, magnesium, and sodium beta-hydroxybutyrate, enhanced with liposomal organic MCT oil for sustained ketone elevation and rapid fuel switching. Whether you're supporting a ketogenic lifestyle, seeking enhanced mental clarity during intermittent fasting, or fueling endurance performance, BHB Ketone Salts provide clean, crash-free energy by giving your brain and muscles their preferred high-efficiency fuel source.`,
  },

  {
    name: 'NeuroCalm BH4 Complex',
    slug: 'neurocalm-bh4-complex',
    category: 'PROPRIETARY BASE',
    deliveryForm: 'Capsule',
    ingredientCount: 15,
    ingredients: [
      ing('L-Dopa (from Mucuna pruriens extract)', '30'),
      ing('Liposomal L-Tyrosine', '25'),
      ing('L-Phenylalanine', '15'),
      ing('Liposomal PQQ (Pyrroloquinoline Quinone)', '10'),
      ing('Liposomal Coenzyme Q10 (Ubiquinol)', '10'),
      ing('Liposomal 5-MTHF (5-Methyltetrahydrofolate)', '10'),
      ing('L-Citrulline Malate', '15'),
      ing('L-Arginine', '10'),
      ing('Liposomal Vitamin C', '10'),
      ing('Liposomal L-Theanine', '15'),
      ing('Liposomal Magnesium L-Threonate', '10'),
      ing("Micellar Lion's Mane Extract (Hericenones)", '10'),
      ing('Saccharomyces Boulardii', '10'),
      ing('Lithium Orotate (Elemental Lithium ~1 mg)', '5'),
      ing('5-HTP', '5'),
    ],
    marketingDescription: `A sophisticated neurotransmitter precursor formula built around the tetrahydrobiopterin (BH4) pathway, the master cofactor behind dopamine, serotonin, and nitric oxide synthesis. Featuring L-Dopa from Mucuna pruriens, liposomal L-tyrosine, PQQ, CoQ10 ubiquinol, and 5-MTHF folate alongside L-citrulline and L-arginine for vascular support, NeuroCalm BH4 Complex addresses the biochemical roots of mood, motivation, and cognitive clarity rather than masking symptoms with stimulants.`,
  },

  {
    name: 'Omega-3 DHA/EPA (Algal)',
    slug: 'omega-3-dha-epa-algal',
    category: 'PROPRIETARY BASE',
    deliveryForm: 'Capsule',
    ingredientCount: 4,
    ingredients: [
      ing('Algal Phospholipid Matrix (carrier base)', '25'),
      ing('Liposomal DHA (Docosahexaenoic Acid) (Algal-derived)', '25'),
      ing('EPA (Eicosapentaenoic Acid) (Algal-derived)', '25'),
      ing('Astaxanthin', '25'),
    ],
    marketingDescription: `A 100% plant-based omega-3 formula delivering pharmaceutical-grade DHA and EPA from sustainably harvested algal sources, the same origin fish get their omega-3s from, enhanced with natural astaxanthin and an algal phospholipid matrix for superior brain and cellular membrane absorption. FarmCeutica's Algal Omega-3 eliminates concerns about ocean contaminants, heavy metals, and fishy aftertaste while providing the essential fatty acids critical for neurological health, cardiovascular function, and systemic inflammation management.`,
  },

  {
    name: 'ToxiBind Matrix™',
    slug: 'toxibind-matrix',
    category: 'PROPRIETARY BASE',
    deliveryForm: 'Capsule',
    ingredientCount: 3,
    ingredients: [
      ing('Calcium Bentonite Clay', '50'),
      ing('Clinoptilolite Zeolite', '50'),
      ing('Chlorella', '10'),
    ],
    marketingDescription: `A triple-action environmental detoxification formula combining calcium bentonite clay, clinoptilolite zeolite, and chlorella into a comprehensive toxin-binding complex. ToxiBind Matrix™ leverages the unique cation-exchange capacity of zeolite, the broad-spectrum adsorption properties of bentonite, and chlorella's heavy-metal chelation abilities to support your body's natural elimination of environmental pollutants, mycotoxins, and metabolic waste, making it an essential companion to any detox, cleanse, or environmental exposure protocol.`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // CATEGORY 2 — ADVANCED FORMULAS (16 products)
  // ════════════════════════════════════════════════════════════════════════

  {
    name: 'FOCUS+ Nootropic Formula',
    slug: 'focus-nootropic-formula',
    category: 'ADVANCED',
    deliveryForm: 'Capsule',
    ingredientCount: 8,
    ingredients: [
      ing("Lion's Mane Extract (Micellar) 30% Polysaccharides", '500'),
      ing('Bacopa Monnieri Extract (Micellar) 50% Bacosides', '300'),
      ing('Paraxanthine (Liposomal) enfinity®', '100'),
      ing('L-Theanine (Liposomal) Suntheanine®', '200'),
      ing('CoQ10 - Ubiquinol (Liposomal) Kaneka QH®', '100'),
      ing('Ginkgo Biloba Extract (Micellar) 24% Flavone Glycosides', '120'),
      ing('Rhodiola Rosea Extract (Micellar) 5% Rosavins', '200'),
      ing('BioPerine® (Micellar) 95% Piperine', '10'),
    ],
    marketingDescription: `Engineered for sustained cognitive performance, FOCUS+ combines micellar Lion's Mane extract with 30% polysaccharides, Bacopa monnieri at 50% bacosides, liposomal paraxanthine (enfinity®), Suntheanine® L-theanine, Kaneka QH® ubiquinol, and Ginkgo biloba in a synergistic nootropic stack. This is not a caffeine-based stimulant; it's a precision neurotrophin formula designed to support nerve growth factor production, acetylcholine signaling, and cerebral blood flow for clean, jitter-free mental clarity that builds over time.`,
  },

  {
    name: 'RELAX+ Sleep Support',
    slug: 'relax-sleep-support',
    category: 'ADVANCED',
    deliveryForm: 'Capsule',
    ingredientCount: 9,
    ingredients: [
      ing('Liposomal Melatonin (Extended-Release)', '3'),
      ing('Tart Cherry Extract (10:1 Concentrate)', '200'),
      ing('5-HTP (Griffonia simplicifolia Extract)', '100'),
      ing('L-Glycine (Pure, Pharmaceutical Grade)', '500'),
      ing('Apigenin (Chamomile Extract)', '50'),
      ing('Liposomal Magnesium Bisglycinate', '200'),
      ing('Micellar Broad-Spectrum CBD', '25'),
      ing('Micellar CBN Isolate', '10'),
      ing('Micellar BioPerine® (Black Pepper Extract)', '5'),
    ],
    marketingDescription: `A multi-pathway sleep architecture formula featuring liposomal extended-release melatonin, tart cherry extract, 5-HTP, pharmaceutical-grade L-glycine, apigenin from chamomile, magnesium bisglycinate, and a proprietary broad-spectrum CBD/CBN blend. RELAX+ doesn't just help you fall asleep, it supports all four stages of sleep architecture, promoting deeper slow-wave recovery sleep and healthy REM cycling so you wake genuinely restored, not groggy, with your circadian rhythm reinforced rather than disrupted.`,
  },

  {
    name: 'CATALYST+ Energy Multivitamin',
    slug: 'catalyst-energy-multivitamin',
    category: 'ADVANCED',
    deliveryForm: 'Capsule',
    ingredientCount: 26,
    ingredients: [
      ing('Magnesium Bisglycinate', '100'),
      ing('Magnesium Citrate', '75'),
      ing('Magnesium Malate', '75'),
      ing('Magnesium Orotate', '50'),
      ing('Magnesium Taurate', '50'),
      ing('Magnesium L-Threonate', '50'),
      ing('Methylfolate (5-MTHF)', '0.8'),
      ing('Methylcobalamin (B12)', '0.5'),
      ing('Pyridoxal-5-Phosphate (B6)', '25'),
      ing('Riboflavin-5-Phosphate (B2)', '25'),
      ing('Thiamine HCL (B1)', '25'),
      ing('Niacin (as Niacinamide)', '50'),
      ing('NNB DILEUCINE (DL 185™)', '75'),
      ing('Liposomal L-Valine', '50'),
      ing('Liposomal L-Methionine', '50'),
      ing('Liposomal L-Tryptophan', '50'),
      ing('Liposomal N-Acetyl L-Cysteine', '100'),
      ing('Liposomal L-Ergothioneine', '10'),
      ing('Liposomal Vitamin D3 (Cholecalciferol)', '0.125'),
      ing('Liposomal Vitamin K2 (MK-7)', '0.2'),
      ing('Liposomal Quercetin', '100'),
      ing('Liposomal L-Taurine', '100'),
      ing('Selenium (L-selenomethionine)', '0.2'),
      ing('Tesofensine', '0.5'),
      ing('Zinc (Bisglycinate)', '15'),
      ing('Micellar Bioperine®', '10'),
    ],
    marketingDescription: `Far more than a daily multivitamin, CATALYST+ is a mitochondrial energy production system featuring the complete Magnesium Synergy Matrix, methylated B-complex, fat-soluble vitamins D3/K2/A/E in their most bioactive forms, a full trace mineral complex, and targeted antioxidants including astaxanthin, CoQ10, and alpha-lipoic acid, totaling 27 precision-dosed ingredients. Delivered through FarmCeutica's dual liposomal-micellar system, CATALYST+ transforms the daily multivitamin from a checkbox habit into a genuine cellular performance upgrade.`,
  },

  {
    name: 'Clean+ Detox & Liver Health',
    slug: 'clean-detox-liver-health',
    category: 'ADVANCED',
    deliveryForm: 'Capsule',
    ingredientCount: 21,
    ingredients: [
      ing('Liposomal Glutathione Complex (25% active)', '80'),
      ing('Liposomal NAC Complex (25% active)', '40'),
      ing('Liposomal Milk Thistle Complex (25% active)', '40'),
      ing('Liposomal TUDCA Complex (25% active)', '40'),
      ing('Liposomal Curcumin Complex (40% active)', '50'),
      ing('Liposomal Berberine Complex (25% active)', '40'),
      ing('Liposomal L-Methionine Complex (40% active)', '50'),
      ing('Micellar Dandelion Root (50% active)', '20'),
      ing('Micellar Chlorella (50% active)', '20'),
      ing('Micellar Cilantro (50% active)', '20'),
      ing('Micellar Black Walnut (50% active)', '20'),
      ing('Micellar Pumpkin Seed (50% active)', '20'),
      ing('Micellar Artichoke (50% active)', '20'),
      ing('Micellar Clove (50% active)', '20'),
      ing('Micellar Garlic (50% active)', '20'),
      ing('Micellar Fulvic Acid (50% active)', '20'),
      ing('Micellar Oregano Oil (50% active)', '20'),
      ing('ToxiBind Matrix™ (Zeolite + Bentonite)', '100'),
      ing('DigestiZorb+™ Enzyme Complex', '80'),
      ing('Liposomal Choline (Alpha-GPC 50%)', '60'),
      ing('Inositol', '200'),
    ],
    marketingDescription: `A comprehensive 22-ingredient liver support and detoxification formula built around liposomal glutathione, NAC, milk thistle, TUDCA, and curcumin, the gold-standard combination for Phase I and Phase II hepatic detoxification, enhanced with berberine, dandelion root, artichoke extract, and alpha-lipoic acid. Clean+ supports the liver's natural ability to process and eliminate toxins, metabolic byproducts, and pharmaceutical residues while protecting hepatocytes from oxidative damage, making it essential for anyone in modern urban environments.`,
  },

  {
    name: 'Balance+ Gut Repair',
    slug: 'balance-gut-repair',
    category: 'ADVANCED',
    deliveryForm: 'Capsule',
    ingredientCount: 17,
    ingredients: [
      ing('Liposomal BPC-157', '0.5'),
      ing('L-Glutamine', '100'),
      ing('Liposomal N-Acetyl Glucosamine', '75'),
      ing('Liposomal Curcumin (95% Curcuminoids)', '50'),
      ing('Liposomal Saccharomyces Boulardii', '50'),
      ing('Liposomal Quercetin', '30'),
      ing('Butyrate (Sodium Butyrate)', '30'),
      ing('Zinc Carnosine (PepZin GI®)', '20'),
      ing('Micellar Aloe Vera Extract (200:1)', '15'),
      ing('Micellar Ginger Root Extract (10:1)', '15'),
      ing('Micellar Marshmallow Root Extract (10:1)', '15'),
      ing('DigestiZorb+™ Digestive Enzyme Complex', '75'),
      ing('Papaya Extract (Papain enzyme)', '50'),
      ing('Fennel Seed Extract (4:1)', '40'),
      ing('C15:0 (Pentadecanoic Acid, Fatty15)', '200'),
      ing('Proprietary Probiotic Blend (10 Billion CFU)', '80'),
      ing('Inulin-FOS (Prebiotic Blend)', '100'),
    ],
    marketingDescription: `A therapeutic-grade gut restoration formula combining liposomal BPC-157 peptide with L-glutamine, N-acetyl glucosamine, curcumin, Saccharomyces boulardii, quercetin, sodium butyrate, and PepZin GI® zinc carnosine across 18 targeted ingredients. Balance+ addresses the gut lining, microbiome diversity, and mucosal immune function simultaneously, supporting tight junction integrity, reducing intestinal permeability, and creating the optimal environment for beneficial bacterial colonization and long-term digestive resilience.`,
  },

  {
    name: 'FLEX+ Joint & Inflammation',
    slug: 'flex-joint-inflammation',
    category: 'ADVANCED',
    deliveryForm: 'Capsule',
    ingredientCount: 9,
    ingredients: [
      ing('Proprietary Omega-3 Phospholipid Complex', '100'),
      ing('Liposomal Curcumin Complex', '125'),
      ing('Liposomal Boswellia Serrata Extract (AprèsFlex®)', '150'),
      ing('Quercetin Phytosome (Quercefit®)', '100'),
      ing('Liposomal Hyaluronic Acid (Low MW)', '60'),
      ing('Liposomal Type II Collagen (UC-II®)', '40'),
      ing('MSM (Methylsulfonylmethane)', '75'),
      ing('Micellar Astaxanthin (AstaPure®)', '15'),
      ing('Micellar Ginger Root Extract (20:1)', '50'),
    ],
    marketingDescription: `A premium joint and systemic inflammation formula featuring a proprietary omega-3 phospholipid complex, liposomal curcumin, AprèsFlex® boswellia serrata, Quercefit® quercetin phytosome, low-molecular-weight hyaluronic acid, UC-II® type II collagen, MSM, and AstaPure® astaxanthin. FLEX+ targets inflammatory mediators through multiple complementary pathways while simultaneously supporting cartilage regeneration, synovial fluid viscosity, and connective tissue repair, providing comprehensive musculoskeletal support without the risks of chronic NSAID use.`,
  },

  {
    name: 'BLAST+ Nitric Oxide Stack',
    slug: 'blast-nitric-oxide-stack',
    category: 'ADVANCED',
    deliveryForm: 'Capsule',
    ingredientCount: 8,
    ingredients: [
      ing('Liposomal L-Citrulline Malate (25% active)', '250'),
      ing('Liposomal Methylfolate (5-MTHF)', '0.8'),
      ing('Liposomal Methylcobalamin (B12)', '1'),
      ing('Liposomal Pyridoxal-5-Phosphate (B6)', '10'),
      ing('Liposomal Vitamin C', '100'),
      ing('Micellar Beetroot Extract (40% active)', '200'),
      ing('Micellar BioPerine® (50% active)', '5'),
      ing('Nitrosigine® (Bonded Complex)', '150'),
    ],
    marketingDescription: `A precision-engineered vascular performance formula combining liposomal L-citrulline malate, methylfolate, methylcobalamin, P-5-P, vitamin C, micellar beetroot extract, Nitrosigine® bonded arginine silicate, and BioPerine® to maximize endogenous nitric oxide production through both the NOS enzyme and nitrate-nitrite pathways. BLAST+ supports vasodilation, blood flow, exercise endurance, and cardiovascular health while addressing the methylation cofactors essential for maintaining healthy nitric oxide synthase function.`,
  },

  {
    name: 'Replenish NAD+',
    slug: 'replenish-nad',
    category: 'ADVANCED',
    deliveryForm: 'Capsule',
    ingredientCount: 10,
    ingredients: [
      ing('Liposomal NMN (Nicotinamide Mononucleotide)', '300'),
      ing('Liposomal Pterostilbene', '50'),
      ing('CoQ10 (Ubiquinol)', '100'),
      ing('PQQ (Pyrroloquinoline Quinone)', '20'),
      ing('Urolithin A', '100'),
      ing('Calcium Alpha-Ketoglutarate', '100'),
      ing('C15:0 (Pentadecanoic Acid)', '30'),
      ing('Spermidine', '10'),
      ing('Liposomal Quercetin', '25'),
      ing('Bioperine® (Black Pepper Extract)', '5'),
    ],
    marketingDescription: `An advanced cellular longevity formula centered on liposomal NMN, the direct precursor to NAD+, synergized with pterostilbene, CoQ10 ubiquinol, PQQ, urolithin A, calcium alpha-ketoglutarate, pentadecanoic acid (C15:0), and spermidine. Replenish NAD+ targets the age-related decline of nicotinamide adenine dinucleotide through multiple converging pathways: boosting NAD+ synthesis, activating sirtuins, supporting mitophagy, and protecting telomere integrity, a comprehensive approach to cellular aging rooted in the latest longevity research.`,
  },

  {
    name: 'NeuroCalm+',
    slug: 'neurocalm-plus',
    category: 'ADVANCED',
    deliveryForm: 'Capsule',
    ingredientCount: 9,
    ingredients: [
      ing('Micellar Ashwagandha Root Extract (KSM-66®)', '300'),
      ing('Micellar Rhodiola Rosea Extract', '150'),
      ing('Micellar Schisandra Chinensis Extract', '100'),
      ing('Holy Basil Extract (Ocimum sanctum)', '35'),
      ing('Liposomal Saffron Extract (affron®)', '30'),
      ing('Liposomal L-Theanine (Suntheanine®)', '150'),
      ing('Liposomal GABA (PharmaGABA®)', '75'),
      ing("Micellar Lion's Mane Extract (Hericium erinaceus)", '10'),
      ing('Micellar BioPerine® (Black Pepper Extract)', '5'),
    ],
    marketingDescription: `A botanical adaptogen complex featuring KSM-66® ashwagandha, rhodiola rosea, schisandra chinensis, holy basil, affron® saffron extract, Suntheanine® L-theanine, PharmaGABA®, and Lion's Mane mushroom, ten clinically studied ingredients working across the HPA axis, GABAergic, and serotonergic pathways. NeuroCalm+ helps modulate the cortisol stress response, promote parasympathetic nervous system activation, and support emotional resilience without sedation, making it ideal for high-stress professionals who need calm focus, not drowsiness.`,
  },

  {
    name: 'NeuroCalm BH4+ (Advanced)',
    slug: 'neurocalm-bh4-advanced',
    category: 'ADVANCED',
    deliveryForm: 'Capsule',
    ingredientCount: 13,
    ingredients: [
      ing('L-Dopa (from Mucuna pruriens extract)', '30'),
      ing('Liposomal L-Tyrosine', '25'),
      ing('L-Phenylalanine', '15'),
      ing('Liposomal PQQ (Pyrroloquinoline Quinone)', '10'),
      ing('Liposomal Coenzyme Q10 (Ubiquinol)', '10'),
      ing('Liposomal 5-MTHF (5-Methyltetrahydrofolate)', '10'),
      ing('L-Citrulline Malate', '15'),
      ing('L-Arginine', '10'),
      ing('Liposomal Vitamin C', '10'),
      ing('Liposomal L-Theanine', '15'),
      ing('Liposomal Magnesium L-Threonate', '10'),
      ing("Micellar Lion's Mane Extract (Hericenones)", '10'),
      ing('Lithium Orotate (Elemental Lithium ~1 mg)', '5'),
    ],
    marketingDescription: `Building on the foundational NeuroCalm BH4 Complex, this advanced formulation deepens neurotransmitter precursor support with enhanced doses of L-Dopa, liposomal L-tyrosine, PQQ, CoQ10 ubiquinol, and 5-MTHF alongside additional cofactors for individuals requiring more intensive BH4 pathway optimization. Designed for practitioners managing complex neurochemical imbalances, BH4+ provides the raw materials and enzymatic cofactors necessary for robust dopamine, serotonin, and catecholamine synthesis.`,
  },

  {
    name: 'IRON+ Red Blood Cell Support',
    slug: 'iron-red-blood-cell-support',
    category: 'ADVANCED',
    deliveryForm: 'Capsule',
    ingredientCount: 14,
    ingredients: [
      ing('Liposomal Vitamin D3 (Cholecalciferol)', '0.25'),
      ing('Liposomal Vitamin K2 (Menaquinone-7)', '0.05'),
      ing('Selenium (L-Selenomethionine)', '0.1'),
      ing('Liposomal Vitamin C (Ascorbic Acid)', '250'),
      ing('Quercetin (Sophora japonica)', '125'),
      ing('Micellar BioPerine® (Black Pepper Extract)', '25'),
      ing('Copper (Bisglycinate Chelate)', '1'),
      ing('Zinc (Bisglycinate Chelate)', '7.5'),
      ing('Molybdenum (Glycinate Chelate)', '0.75'),
      ing('Liposomal L-Glutathione (Reduced)', '125'),
      ing('Liposomal N-Acetylcysteine (NAC)', '150'),
      ing('Liposomal Alpha-Lipoic Acid (ALA)', '100'),
      ing('Liposomal L-Ergothioneine', '50'),
      ing('Liposomal Phosphatidylserine', '50'),
    ],
    marketingDescription: `A comprehensive hematological support formula pairing highly bioavailable iron bisglycinate with the full spectrum of red blood cell cofactors, liposomal vitamins D3 and K2, selenium, vitamin C for iron absorption, quercetin, copper and zinc bisglycinate, and B-vitamins essential for erythropoiesis. IRON+ is designed to restore healthy hemoglobin and ferritin levels without the gastrointestinal distress common to standard iron supplements, making it ideal for women, athletes, and individuals with chronic iron-deficiency patterns.`,
  },

  {
    name: 'Creatine HCL+',
    slug: 'creatine-hcl-plus',
    category: 'ADVANCED',
    deliveryForm: 'Scoop Powder',
    ingredientCount: 13,
    ingredients: [
      ing('Creatine Hydrochloride', '2000'),
      ing('HMB-FA (Free Acid)', '1000'),
      ing('Beta-Alanine (CarnoSyn®)', '800'),
      ing('R-Alpha Lipoic Acid', '300'),
      ing('Glycine', '100'),
      ing('L-Ergothioneine', '12'),
      ing('BioPerine® (Black Pepper)', '10'),
      ing('Methylfolate (5-MTHF)', '0.4'),
      ing('Methylcobalamin (B12)', '0.5'),
      ing('Pyridoxal-5-Phosphate (B6)', '5'),
      ing('Riboflavin-5-Phosphate (B2)', '5'),
      ing('Thiamine HCL (B1)', '10'),
      ing('Niacin (as Niacinamide)', '15'),
    ],
    marketingDescription: `A next-generation performance formula built on creatine hydrochloride, the most soluble and stomach-friendly form of creatine, enhanced with HMB free acid, CarnoSyn® beta-alanine, R-alpha lipoic acid, glycine, L-ergothioneine, BioPerine®, and methylated B-vitamins. Creatine HCL+ delivers the proven strength, power, and cognitive benefits of creatine supplementation while adding anti-catabolic HMB support and buffering capacity via beta-alanine, all without the bloating and water retention associated with conventional creatine monohydrate.`,
  },

  {
    name: 'DigestiZorb+™ Enzyme Complex',
    slug: 'digestizorb-enzyme-complex',
    category: 'ADVANCED',
    deliveryForm: 'Capsule',
    ingredientCount: 11,
    ingredients: [
      ing('Protease (acid-stable blend)', '15'),
      ing('Amylase', '20'),
      ing('Lipase', '10'),
      ing('Lactase', '10'),
      ing('Cellulase', '5'),
      ing('Bromelain (from Pineapple extract)', '5'),
      ing('Papaya Extract (Papain enzyme)', '5'),
      ing('Micellar Ginger Root Extract (10:1)', '5'),
      ing('Fennel Seed Extract (4:1)', '3'),
      ing('Liposomal Pepsin', '5'),
      ing('Black Pepper Extract (Bioperine®)', '2'),
    ],
    marketingDescription: `A broad-spectrum digestive enzyme formula featuring acid-stable protease, amylase, lipase, lactase, cellulase, bromelain, papain, micellar ginger root extract, and additional specialized enzymes to support complete macronutrient breakdown. DigestiZorb+™ addresses the enzymatic decline that occurs naturally with age and stress, ensuring efficient protein, fat, carbohydrate, and fiber digestion, reducing bloating, gas, and post-meal discomfort while maximizing nutrient extraction from every meal you eat.`,
  },

  {
    name: 'Histamine Relief Protocol™',
    slug: 'histamine-relief-protocol',
    category: 'ADVANCED',
    deliveryForm: 'Capsule',
    ingredientCount: 15,
    ingredients: [
      ing('BioB Fusion™ Methylated B Complex', '35'),
      ing('Digestzorb Probiotic Blend (10B CFU)', '150'),
      ing('Liposomal BPC-157 Peptide', '0.2'),
      ing('Liposomal Quercetin (Aglycone)', '100'),
      ing('Liposomal Magnesium (Bisglycinate)', '50'),
      ing('Zinc (Bisglycinate)', '15'),
      ing('Liposomal Curcumin (95% Curcuminoids)', '50'),
      ing('Liposomal DAO Enzyme (from porcine kidney)', '0.2'),
      ing('Liposomal Copper (Bisglycinate)', '2'),
      ing('Liposomal Vitamin C (Ascorbate)', '50'),
      ing('Liposomal L-Theanine', '100'),
      ing('Micellar Aloe Vera', '25'),
      ing('Micellar Marshmallow Root', '25'),
      ing('Liposomal Berberine HCl', '50'),
      ing('Micellar Bioperine® (Black Pepper Extract)', '5'),
    ],
    marketingDescription: `A comprehensive histamine management formula combining FarmCeutica's BioB Fusion™ methylated B complex, DigestiZorb probiotic blend, liposomal BPC-157 peptide, quercetin, magnesium and zinc bisglycinate, curcumin, DAO enzyme, and vitamin C across 16 targeted ingredients. Histamine Relief Protocol™ addresses histamine intolerance at every level, reducing mast cell degranulation, supporting DAO enzyme activity for histamine breakdown, healing the gut lining to prevent excess histamine absorption, and stabilizing the immune response.`,
  },

  {
    name: 'Teloprime+ Telomere Support',
    slug: 'teloprime-telomere-support',
    category: 'ADVANCED',
    deliveryForm: 'Scoop Powder',
    ingredientCount: 17,
    ingredients: [
      ing('Astragalus', '400'),
      ing('Cycloastragenol', '50'),
      ing('Centella Asiatica Extract', '600'),
      ing('Liposomal Vitamin D3 (Cholecalciferol)', '0.5'),
      ing('Liposomal Vitamin K2 (Menaquinone-7)', '0.1'),
      ing('Liposomal Trans-Resveratrol', '200'),
      ing("AC-11 (rainforest cat's claw extract)", '500'),
      ing('Liposomal Vitamin C', '500'),
      ing('Zinc Bisglycinate', '30'),
      ing('Korean Ginseng (Ginsenosides)', '200'),
      ing('B6 – Pyridoxine', '10'),
      ing('Liposomal B9 – Methyl Folate (5-MTHF)', '0.8'),
      ing('Liposomal B12 – Methylcobalamin', '2'),
      ing('Algal Phospholipid Matrix (carrier base)', '90'),
      ing('Liposomal DHA (Algal-derived)', '90'),
      ing('EPA (Eicosapentaenoic Acid) (Algal-derived)', '120'),
      ing('C15:0 (Pentadecanoic Acid)', '200'),
    ],
    marketingDescription: `A cutting-edge longevity formula targeting telomere length maintenance through astragalus, cycloastragenol, and AC-11® Cat's Claw extract, three of the most researched telomerase activators, combined with Centella asiatica, liposomal D3/K2, trans-resveratrol, and vitamin C. Teloprime+ represents FarmCeutica's commitment to translating the latest in aging biology into practical supplementation, supporting the cellular structures that protect your DNA with every division and directly influence biological versus chronological age.`,
  },

  {
    name: 'RISE+ Male Testosterone',
    slug: 'rise-male-testosterone',
    category: 'ADVANCED',
    deliveryForm: 'Capsule',
    ingredientCount: 8,
    ingredients: [
      ing('Micellar Tongkat Ali (40% active)', '200'),
      ing('Micellar Fadogia Agrestis (40% active)', '100'),
      ing('Micellar Ashwagandha (40% active)', '150'),
      ing('Micellar Horny Goat Weed (40% active)', '50'),
      ing('Micellar Shilajit (40% active)', '100'),
      ing('L-Citrulline Malate (2:1)', '150'),
      ing('Zinc Bisglycinate', '15'),
      ing('DIM (99% pure)', '100'),
    ],
    marketingDescription: `A research-backed male hormonal optimization formula combining micellar Tongkat Ali (200:1), Fadogia agrestis, KSM-66® ashwagandha, horny goat weed, and shilajit with L-citrulline malate, zinc bisglycinate, and DIM for estrogen metabolism balance. RISE+ supports natural testosterone production, free testosterone levels, and healthy estrogen clearance through multiple complementary pathways, designed for men seeking to maintain peak hormonal vitality, lean body composition, libido, and physical performance as they age.`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // CATEGORY 3 — WOMEN'S HEALTH (8 products)
  // ════════════════════════════════════════════════════════════════════════

  {
    name: 'Grow+ Pre-Natal Formula',
    slug: 'grow-pre-natal-formula',
    category: "WOMEN'S HEALTH",
    deliveryForm: 'Capsule',
    ingredientCount: 10,
    ingredients: [
      ing('MethylB Complete+™ B Complex', '32'),
      ing('Iron (as Ferrous Bisglycinate)', '27'),
      ing('Calcium (Citrate & MCHC)', '400'),
      ing('Liposomal Vitamin D3 (Cholecalciferol) (2000 IU)', '0.5'),
      ing('Liposomal Vitamin K2 (Menaquinone-7)', '0.2'),
      ing('Liposomal Choline (Alpha-GPC)', '450'),
      ing('Iodine (as Potassium Iodide)', '2.2'),
      ing('Liposomal Magnesium Synergy Matrix', '350'),
      ing('Zinc (as Zinc Bisglycinate)', '15'),
      ing('Liposomal Vitamin C (L-Ascorbic Acid)', '120'),
    ],
    marketingDescription: `A precision prenatal built on FarmCeutica's MethylB Complete+™ backbone, delivering iron bisglycinate, calcium, liposomal D3/K2, choline alpha-GPC, iodine, and the complete Magnesium Synergy Matrix in their most bioavailable forms. Grow+ provides the critical methylation support, neural tube development nutrients, and mineral cofactors that both mother and developing baby need, with liposomal delivery to maximize absorption during a time when nutrient demands are highest and digestive comfort matters most.`,
  },

  {
    name: 'CycleSync+',
    slug: 'cyclesync-plus',
    category: "WOMEN'S HEALTH",
    deliveryForm: 'Capsule',
    ingredientCount: 13,
    ingredients: [
      ing('Liposomal Vitex Agnus-Castus (Chasteberry) Extract', '200'),
      ing('Liposomal DIM (Diindolylmethane)', '100'),
      ing('Liposomal Black Cohosh Extract', '40'),
      ing('Liposomal Evening Primrose Oil (EPO)', '500'),
      ing('Liposomal Calcium D-Glucarate', '150'),
      ing('Liposomal Phosphatidylcholine (PC)', '300'),
      ing('Micellar Myo-Inositol', '1000'),
      ing('Micellar Magnesium Glycinate', '300'),
      ing('Micellar B6 (Pyridoxal-5-Phosphate)', '50'),
      ing('Micellar NAC (N-Acetyl Cysteine)', '500'),
      ing('Micellar Zinc Bisglycinate', '15'),
      ing('Micellar 5-MTHF (Folate)', '0.4'),
      ing('Micellar Methylcobalamin (B12)', '1'),
    ],
    marketingDescription: `Formulated specifically for menstrual cycle support, CycleSync+ combines liposomal Vitex agnus-castus, DIM, black cohosh, evening primrose oil, calcium D-glucarate, myo-inositol, and magnesium glycinate across 14 targeted ingredients. This formula supports healthy estrogen metabolism, progesterone balance, and prostaglandin regulation throughout all four phases of the menstrual cycle, helping to ease PMS symptoms, support regular cycles, and promote hormonal equilibrium without synthetic intervention.`,
  },

  {
    name: 'MenoBalance+',
    slug: 'menobalance-plus',
    category: "WOMEN'S HEALTH",
    deliveryForm: 'Capsule',
    ingredientCount: 13,
    ingredients: [
      ing('Liposomal Red Clover Isoflavones', '80'),
      ing('Liposomal Black Cohosh Extract', '40'),
      ing('Liposomal DIM (Diindolylmethane)', '150'),
      ing('Liposomal Wild Yam Extract', '150'),
      ing('Liposomal Dong Quai (Angelica sinensis)', '150'),
      ing('Liposomal Phosphatidylserine', '200'),
      ing('Micellar Ashwagandha Root Extract', '300'),
      ing('Micellar Maca Root Extract', '500'),
      ing('Micellar Magnesium Glycinate', '300'),
      ing('Micellar Calcium Citrate', '500'),
      ing('Micellar Vitamin D3 (Cholecalciferol)', '1'),
      ing('Micellar Boron Glycinate', '3'),
      ing('Micellar B6 (Pyridoxal-5-Phosphate)', '50'),
    ],
    marketingDescription: `A botanical-forward menopause support formula featuring liposomal red clover isoflavones, black cohosh, DIM, wild yam, dong quai, phosphatidylserine, ashwagandha, and maca root across 14 ingredients designed to ease the menopausal transition. MenoBalance+ addresses hot flashes, night sweats, mood fluctuations, and bone density concerns through phytoestrogenic support and adaptogenic stress modulation, providing women with a comprehensive natural alternative for navigating perimenopause and menopause with confidence and comfort.`,
  },

  {
    name: 'Radiance+',
    slug: 'radiance-plus',
    category: "WOMEN'S HEALTH",
    deliveryForm: 'Capsule',
    ingredientCount: 15,
    ingredients: [
      ing('Liposomal Astaxanthin', '12'),
      ing('Liposomal Ubiquinol (CoQ10)', '100'),
      ing('Liposomal Mixed Tocopherols + Tocotrienols', '0.2'),
      ing('Liposomal Evening Primrose GLA', '300'),
      ing('Liposomal Ceramide Complex', '100'),
      ing('Liposomal Lutein', '20'),
      ing('Liposomal Zeaxanthin', '4'),
      ing('Micellar Biotin (Vitamin B7)', '0.5'),
      ing('Micellar Vitamin C (Ascorbic Acid)', '500'),
      ing('Micellar MSM (Methylsulfonylmethane)', '1000'),
      ing('Micellar Hyaluronic Acid', '200'),
      ing('Micellar Bamboo Silica Extract', '300'),
      ing('Micellar Zinc Bisglycinate', '15'),
      ing('Micellar L-Lysine HCl', '500'),
      ing('Micellar Horsetail Extract (Equisetum)', '300'),
    ],
    marketingDescription: `A beauty-from-within formula delivering liposomal astaxanthin, ubiquinol CoQ10, mixed tocopherols and tocotrienols, evening primrose GLA, ceramide complex, lutein, zeaxanthin, and biotin across 16 skin, hair, and nail support ingredients. Radiance+ works at the cellular level, protecting against UV-induced oxidative damage, supporting collagen synthesis, maintaining skin lipid barrier integrity, and nourishing follicular health, because true radiance starts with the nutrients your cells receive, not what you apply on the surface.`,
  },

  {
    name: 'ThyroBalance+',
    slug: 'thyrobalance-plus',
    category: "WOMEN'S HEALTH",
    deliveryForm: 'Capsule',
    ingredientCount: 14,
    ingredients: [
      ing('Liposomal Ashwagandha Root Extract', '600'),
      ing('Liposomal Selenium (Selenomethionine)', '0.2'),
      ing('Liposomal Guggulsterones', '50'),
      ing('Liposomal Mixed Tocopherols', '0.2'),
      ing('Liposomal Phosphatidylserine', '200'),
      ing('Liposomal Bladderwrack Extract', '250'),
      ing('Micellar L-Tyrosine', '500'),
      ing('Micellar Iodine (Potassium Iodide)', '150'),
      ing('Micellar Magnesium Glycinate', '200'),
      ing('Micellar Iron Bisglycinate', '18'),
      ing('Micellar Rhodiola Rosea Extract', '300'),
      ing('Micellar Eleuthero Root Extract', '200'),
      ing('Micellar B-Complex (Comprehensive)', '35'),
      ing('Micellar Zinc Bisglycinate', '15'),
    ],
    marketingDescription: `A targeted thyroid optimization formula combining liposomal ashwagandha, selenium selenomethionine, guggulsterones, bladderwrack, L-tyrosine, iodine, and zinc across 15 ingredients that support every stage of thyroid hormone production, conversion, and receptor sensitivity. ThyroBalance+ addresses the full thyroid cascade, from TSH signaling through T4-to-T3 conversion to cellular receptor activation, making it ideal for women experiencing subclinical thyroid imbalances, fatigue, weight resistance, or temperature sensitivity.`,
  },

  {
    name: 'DESIRE+ Female Hormonal',
    slug: 'desire-female-hormonal',
    category: "WOMEN'S HEALTH",
    deliveryForm: 'Capsule',
    ingredientCount: 16,
    ingredients: [
      ing('Micellar Tongkat Ali Extract (200:1)', '50'),
      ing('Micellar Tribulus Terrestris (60% Saponins)', '50'),
      ing('Micellar Shilajit Extract (Fulvic Acid 20%)', '25'),
      ing('Micellar Sea Moss Extract', '20'),
      ing('Maca Root Extract (10:1)', '40'),
      ing('Micellar Ashwagandha Extract (5% Withanolides)', '50'),
      ing('L-Citrulline', '40'),
      ing('Micellar Schisandra Chinensis Extract', '20'),
      ing('Micellar Cistanche Tubulosa Extract', '50'),
      ing('L-Arginine', '10'),
      ing('Micellar Horny Goat Weed (Icariin 10%)', '20'),
      ing('Liposomal Trans-Resveratrol (98%)', '50'),
      ing('Micellar Cordyceps Extract (7% Polysaccharides)', '40'),
      ing('Micellar Panax Ginseng Extract (10:1)', '20'),
      ing('Zinc (Zinc Bisglycinate)', '10'),
      ing('Micellar Bioperine® (Black Pepper Extract, 95%)', '5'),
    ],
    marketingDescription: `A comprehensive women's hormonal vitality formula featuring micellar Tongkat Ali, tribulus terrestris, shilajit, sea moss, maca root, ashwagandha, L-citrulline, and schisandra chinensis across 17 synergistic ingredients. DESIRE+ is formulated to support healthy female libido, hormonal balance, adrenal function, and sexual wellness by addressing the interconnected axes of stress adaptation, blood flow, and reproductive hormone optimization, empowering women to reclaim vitality at every stage of life.`,
  },

  {
    name: 'Thrive+ Post-Natal GLP-1',
    slug: 'thrive-post-natal-glp1',
    category: "WOMEN'S HEALTH",
    deliveryForm: 'Capsule',
    ingredientCount: 17,
    ingredients: [
      ing('BPC 157', '0.2'),
      ing('MethylB Complete+™ B Complex', '76.3'),
      ing('Magnesium Citrate', '25'),
      ing('Liposomal Omega-3 DHA', '200'),
      ing('NeuroCalm BH4 Complex', '250'),
      ing('GLP-1 Activator Complex', '425'),
      ing('Iron (Ferrous Bisglycinate)', '5'),
      ing('Liposomal Vitamin D3 (Cholecalciferol)', '5'),
      ing('Liposomal Vitamin K2 (MK-7)', '5'),
      ing('Liposomal Vitamin E (Tocotrienol Complex)', '5'),
      ing('Iodine (Potassium Iodide)', '5'),
      ing('Liposomal Choline (Alpha-GPC)', '5'),
      ing('Liposomal CoQ10 (Ubiquinone)', '5'),
      ing('Liposomal L-Ergothioneine', '2'),
      ing('Liposomal Taurine', '5'),
      ing('Liposomal Tyrosine', '5'),
      ing('Zinc Bisglycinate', '15'),
    ],
    marketingDescription: `A revolutionary post-natal recovery formula uniquely combining BPC-157 gut-healing peptide with FarmCeutica's MethylB Complete+™, NeuroCalm BH4 Complex, and GLP-1 Activator Complex alongside magnesium, omega-3 DHA, iron, and vitamin D3. Thrive+ addresses the three pillars of postpartum recovery simultaneously, metabolic recalibration through GLP-1 pathway activation, neurochemical rebalancing for mood support, and tissue repair via BPC-157, helping new mothers restore energy, body composition, and emotional wellness.`,
  },

  {
    name: 'Revitalizher Postnatal+',
    slug: 'revitalizher-postnatal',
    category: "WOMEN'S HEALTH",
    deliveryForm: 'Capsule',
    ingredientCount: 15,
    ingredients: [
      ing('MethylB Complete+™ B Complex', '35'),
      ing('Proprietary Omega-3 DHA/EPA (Algal Source)', '200'),
      ing('Proprietary Full-Spectrum Amino Acid Matrix', '180'),
      ing('Digestzorb Probiotic Blend (10B CFU)', '75'),
      ing('NeuroCalm BH4 Complex', '250'),
      ing('Liposomal Magnesium Synergy Matrix', '150'),
      ing('Iron (Ferrous Bisglycinate)', '10'),
      ing('Liposomal Vitamin D3 (Cholecalciferol)', '2'),
      ing('Liposomal Vitamin K2 (MK-7)', '1'),
      ing('Zinc (Zinc Bisglycinate)', '5'),
      ing('Iodine (Potassium Iodide)', '1'),
      ing('Liposomal Choline (Alpha-GPC)', '10'),
      ing('Lithium Orotate', '10'),
      ing('Micellar Fenugreek Extract (10:1, 50% Saponins)', '5'),
      ing('Liposomal Coenzyme Q10 (Ubiquinol)', '5'),
    ],
    marketingDescription: `A comprehensive postnatal replenishment formula delivering FarmCeutica's MethylB Complete+™, algal omega-3 DHA/EPA, full-spectrum amino acid matrix, 10-billion CFU probiotic blend, NeuroCalm BH4 Complex, Magnesium Synergy Matrix, iron bisglycinate, and vitamin D3 across 16+ essential recovery ingredients. Revitalizher Postnatal+ is designed to rebuild the nutrient stores depleted during pregnancy and breastfeeding while supporting lactation, immune resilience, bone health, and the demanding energy requirements of new motherhood.`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // CATEGORY 4 — METHYLATION SUPPORT / GENEX360 (20 products)
  // The first two have OFFICIAL data from the prompt.
  // The remaining 18 are marked isDraft: true — replace with Master Doc data.
  // ════════════════════════════════════════════════════════════════════════

  {
    name: 'MTHFR+™ Folate Metabolism',
    slug: 'mthfr-folate-metabolism',
    category: 'METHYLATION SUPPORT (GENEX360)',
    deliveryForm: 'Capsule',
    ingredientCount: 12,
    ingredients: [
      ing('Methylated Vitamin B2 (Riboflavin-5-Phosphate)', '25'),
      ing('Methylated Vitamin B6 (Pyridoxal-5-Phosphate)', '30'),
      ing('Liposomal Methyl Folate (5-MTHF)', '1'),
      ing('Liposomal Vitamin B12 (Methylcobalamin + Adenosylcobalamin)', '2'),
      ing('SAMe (S-Adenosyl Methionine)', '200'),
      ing('Liposomal Magnesium (Bisglycinate)', '100'),
      ing('Liposomal Choline (as Alpha-GPC)', '150'),
      ing('Zinc (Bisglycinate)', '20'),
      ing('Liposomal NAC (N-Acetylcysteine)', '250'),
      ing('Molybdenum (Glycinate)', '0.2'),
      ing('Betaine Anhydrous (Trimethylglycine)', '200'),
      ing('Micellar Bioperine® (Black Pepper Extract)', '5'),
    ],
    marketingDescription: `Precision-formulated for individuals carrying MTHFR gene variants, this formula delivers methylated B2, P-5-P B6, liposomal 5-MTHF folate, dual-form B12 (methylcobalamin + adenosylcobalamin), SAMe, magnesium bisglycinate, choline alpha-GPC, and zinc across 13 cofactors. MTHFR+™ bypasses the impaired methylenetetrahydrofolate reductase enzyme entirely, providing the downstream methylated nutrients your body needs for homocysteine clearance, DNA repair, neurotransmitter synthesis, and healthy cellular methylation cycles.`,
  },

  {
    name: 'COMT+™ Neurotransmitter Balance',
    slug: 'comt-neurotransmitter-balance',
    category: 'METHYLATION SUPPORT (GENEX360)',
    deliveryForm: 'Capsule',
    ingredientCount: 12,
    ingredients: [
      ing('Liposomal Magnesium Bisglycinate', '100'),
      ing('SAMe (S-Adenosylmethionine)', '20'),
      ing('Methylated Vitamin B2 (Riboflavin-5-Phosphate)', '25'),
      ing('Methylated Vitamin B6 (P-5-P)', '25'),
      ing('Liposomal Folate (5-MTHF Calcium Salt)', '0.8'),
      ing('Liposomal Vitamin B12 (Methylcobalamin + Adenosylcobalamin)', '1'),
      ing('Lithium Orotate', '2.5'),
      ing('Liposomal L-Theanine', '100'),
      ing('Diindolylmethane (DIM)', '100'),
      ing('Liposomal Quercetin', '100'),
      ing('Liposomal Glutathione (Reduced)', '100'),
      ing('Micellar Bioperine® (Black Pepper Extract)', '5'),
    ],
    marketingDescription: `Designed for individuals with catechol-O-methyltransferase (COMT) gene variants who may experience slow catecholamine clearance, this formula provides liposomal magnesium bisglycinate, SAMe, methylated B2/B6, liposomal folate and dual-form B12, lithium orotate, and L-theanine. COMT+™ supports balanced dopamine and norepinephrine metabolism, helping modulate the stress response, support emotional stability, and maintain healthy neurotransmitter turnover for individuals prone to anxiety, irritability, or estrogen dominance.`,
  },

  // ── DRAFT METHYLATION PRODUCTS (18) — ingredient data not in source prompt ──

  {
    name: 'CBS Support+ Sulfur Pathway',
    slug: 'cbs-sulfur-pathway',
    category: 'METHYLATION SUPPORT (GENEX360)',
    deliveryForm: 'Capsule',
    ingredientCount: 5,
    isDraft: true,
    ingredients: [
      ing('Molybdenum (Glycinate)', '0.15'),
      ing('Vitamin B6 (P5P)', '25'),
      ing('Riboflavin (B2)', '25'),
      ing('Magnesium Bisglycinate', '100'),
      ing('L-Taurine', '500'),
    ],
    marketingDescription: `Designed for individuals carrying CBS (cystathionine beta-synthase) gene variants, which influence how the body processes sulfur-containing amino acids including homocysteine, methionine, and cysteine. CBS Support+ provides molybdenum glycinate, pyridoxal-5-phosphate (P-5-P), riboflavin, magnesium bisglycinate, and L-taurine, the essential cofactors needed for balanced sulfur pathway function, hydrogen sulfide regulation, and downstream sulfite-to-sulfate conversion. Particularly valuable for individuals experiencing sulfur food sensitivities, ammonia clearance issues, or imbalances anywhere in the transsulfuration cascade.`,
  },

  {
    name: 'MAOA+ Neurochemical Balance',
    slug: 'maoa-neurochemical-balance',
    category: 'METHYLATION SUPPORT (GENEX360)',
    deliveryForm: 'Capsule',
    ingredientCount: 6,
    isDraft: true,
    ingredients: [
      ing('Riboflavin (B2)', '50'),
      ing('Magnesium Bisglycinate', '200'),
      ing('L-Theanine', '200'),
      ing('Vitamin B6 (P5P)', '25'),
      ing('Zinc Bisglycinate', '15'),
      ing('Inositol', '250'),
    ],
    marketingDescription: `Formulated for individuals with monoamine oxidase A (MAOA) gene variants that influence the breakdown of serotonin, dopamine, and norepinephrine. MAOA+ delivers riboflavin, the essential FAD cofactor for healthy MAO enzyme function, alongside magnesium bisglycinate, L-theanine, P-5-P, zinc bisglycinate, and inositol to support balanced neurotransmitter turnover, emotional resilience, and stress modulation. Designed to gently support healthy monoamine metabolism without overstimulating or suppressing endogenous catecholamine activity, particularly for individuals with mood intensity, anxiety, or impulsivity tied to MAOA variant patterns.`,
  },

  {
    name: 'MTR+ Methylation Matrix',
    slug: 'mtr-methylation-matrix',
    category: 'METHYLATION SUPPORT (GENEX360)',
    deliveryForm: 'Capsule',
    ingredientCount: 6,
    isDraft: true,
    ingredients: [
      ing('Methylcobalamin (B12)', '1'),
      ing('Liposomal 5-MTHF', '0.8'),
      ing('Vitamin B6 (P5P)', '25'),
      ing('Zinc Bisglycinate', '15'),
      ing('L-Methionine', '250'),
      ing('Riboflavin (B2)', '25'),
    ],
    marketingDescription: `Engineered for individuals with methionine synthase (MTR) gene variants that affect homocysteine remethylation back to methionine, a critical step in the methylation cycle. MTR+ provides methylcobalamin, liposomal 5-MTHF, P-5-P, zinc bisglycinate, L-methionine, and riboflavin: the precise cofactors required by the MTR enzyme to maintain healthy homocysteine clearance and methionine cycle function. A foundational formula for anyone with elevated homocysteine, B12 metabolism concerns, or downstream methylation pathway impairments stemming from MTR variants.`,
  },

  {
    name: 'MTRR+ Methylcobalamin Regen',
    slug: 'mtrr-methylcobalamin-regen',
    category: 'METHYLATION SUPPORT (GENEX360)',
    deliveryForm: 'Capsule',
    ingredientCount: 6,
    isDraft: true,
    ingredients: [
      ing('Hydroxocobalamin (B12)', '1'),
      ing('Methylcobalamin (B12)', '1'),
      ing('Riboflavin (B2)', '25'),
      ing('Selenium (L-Selenomethionine)', '0.2'),
      ing('Zinc Bisglycinate', '15'),
      ing('Liposomal 5-MTHF', '0.4'),
    ],
    marketingDescription: `Designed for individuals with methionine synthase reductase (MTRR) gene variants that affect the regeneration of active B12 needed by the MTR enzyme. MTRR+ delivers both hydroxocobalamin and methylcobalamin alongside riboflavin (FAD cofactor), selenium L-selenomethionine, zinc bisglycinate, and liposomal 5-MTHF, providing the regenerative cofactors that keep the methionine cycle running smoothly. Especially valuable for individuals with combined MTR/MTRR variants, persistent fatigue, or impaired methylation downstream of B12 recycling.`,
  },

  {
    name: 'BHMT+ Methylation Support',
    slug: 'bhmt-methylation-support',
    category: 'METHYLATION SUPPORT (GENEX360)',
    deliveryForm: 'Capsule',
    ingredientCount: 5,
    isDraft: true,
    ingredients: [
      ing('TMG (Trimethylglycine / Betaine)', '500'),
      ing('Citicoline (Choline)', '250'),
      ing('Zinc Bisglycinate', '15'),
      ing('Methylcobalamin (B12)', '1'),
      ing('L-Serine', '200'),
    ],
    marketingDescription: `Formulated for individuals carrying betaine-homocysteine methyltransferase (BHMT) gene variants who benefit from alternative homocysteine clearance through the choline-betaine pathway. BHMT+ provides trimethylglycine (TMG/betaine), citicoline, zinc bisglycinate, methylcobalamin, and L-serine, supporting the parallel methylation pathway that operates independently of folate. Particularly important for people with concurrent MTHFR variants, folate metabolism challenges, or anyone whose methylation needs additional support beyond the primary folate-dependent route.`,
  },

  {
    name: 'ACHY+ Acetylcholine Support',
    slug: 'achy-acetylcholine-support',
    category: 'METHYLATION SUPPORT (GENEX360)',
    deliveryForm: 'Capsule',
    ingredientCount: 6,
    isDraft: true,
    ingredients: [
      ing('Alpha-GPC', '300'),
      ing('Citicoline (CDP-Choline)', '250'),
      ing('Phosphatidylserine', '100'),
      ing('Pantothenic Acid (B5)', '50'),
      ing('Acetyl-L-Carnitine', '250'),
      ing('Huperzine A', '0.1'),
    ],
    marketingDescription: `Designed for individuals seeking to support acetylcholine synthesis and cholinergic function, the neurotransmitter system underlying memory, learning, focus, and neuromuscular activation. ACHY+ combines Alpha-GPC, citicoline (CDP-Choline), phosphatidylserine, pantothenic acid (B5), acetyl-L-carnitine, and Huperzine A, providing both the raw choline precursors and the enzymatic cofactors needed for healthy acetylcholine production and receptor sensitivity. A targeted formula for cognitive performance, neuromuscular health, and aging-related cholinergic decline.`,
  },

  {
    name: 'ACAT+ Mitochondrial Support',
    slug: 'acat-mitochondrial-support',
    category: 'METHYLATION SUPPORT (GENEX360)',
    deliveryForm: 'Capsule',
    ingredientCount: 6,
    isDraft: true,
    ingredients: [
      ing('Acetyl-L-Carnitine', '250'),
      ing('Liposomal CoQ10 (Ubiquinol)', '100'),
      ing('Pantothenic Acid (B5)', '50'),
      ing('Magnesium Bisglycinate', '100'),
      ing('R-Alpha-Lipoic Acid', '100'),
      ing('Riboflavin (B2)', '25'),
    ],
    marketingDescription: `Targeted for individuals with ACAT (acetyl-CoA acetyltransferase) gene variants affecting mitochondrial fatty acid metabolism and ketone body utilization. ACAT+ delivers acetyl-L-carnitine, liposomal CoQ10 ubiquinol, pantothenic acid (B5), magnesium bisglycinate, R-alpha-lipoic acid, and riboflavin, the core cofactors required for healthy beta-oxidation, acetyl-CoA cycling, and mitochondrial energy production. Supports cellular energy resilience for individuals with metabolic fatigue, impaired fat-burning capacity, or downstream symptoms of mitochondrial inefficiency.`,
  },

  {
    name: 'VDR+ Receptor Activation',
    slug: 'vdr-receptor-activation',
    category: 'METHYLATION SUPPORT (GENEX360)',
    deliveryForm: 'Capsule',
    ingredientCount: 6,
    isDraft: true,
    ingredients: [
      ing('Liposomal Vitamin D3 (Cholecalciferol)', '0.125'),
      ing('Liposomal Vitamin K2 (MK-7)', '0.2'),
      ing('Liposomal Magnesium Bisglycinate', '200'),
      ing('Boron (Glycinate)', '3'),
      ing('Zinc Bisglycinate', '15'),
      ing('Vitamin A (Retinyl Palmitate)', '0.9'),
    ],
    marketingDescription: `Engineered for individuals with vitamin D receptor (VDR) gene variants affecting calcium signaling, immune modulation, bone health, and downstream gene expression. VDR+ combines liposomal vitamin D3 (cholecalciferol), liposomal vitamin K2 (MK-7), magnesium bisglycinate, boron glycinate, zinc bisglycinate, and vitamin A (retinyl palmitate), delivering not just vitamin D but the complete cofactor matrix required for healthy receptor activation and downstream signaling. Essential for individuals with low vitamin D status, autoimmune patterns, bone density concerns, or VDR variants that reduce receptor sensitivity.`,
  },

  {
    name: 'DAO+ Histamine Balance',
    slug: 'dao-histamine-balance',
    category: 'METHYLATION SUPPORT (GENEX360)',
    deliveryForm: 'Capsule',
    ingredientCount: 6,
    isDraft: true,
    ingredients: [
      ing('Diamine Oxidase Enzyme', '10'),
      ing('Liposomal Vitamin C', '250'),
      ing('Quercetin Phytosome', '250'),
      ing('Vitamin B6 (P5P)', '25'),
      ing('Copper Bisglycinate', '1'),
      ing('Zinc Bisglycinate', '15'),
    ],
    marketingDescription: `Formulated for individuals with diamine oxidase (DAO) gene variants who experience histamine intolerance, food sensitivities, or chronic inflammatory responses. DAO+ provides supplemental DAO enzyme alongside liposomal vitamin C, quercetin phytosome, P-5-P, copper bisglycinate, and zinc bisglycinate, supporting both direct histamine breakdown in the gut lumen and the cofactor support needed for endogenous DAO activity. Particularly valuable for individuals with histamine-rich food reactions, mast cell activation patterns, or chronic skin and digestive symptoms tied to elevated histamine load.`,
  },

  {
    name: 'GST+ Cellular Detox',
    slug: 'gst-cellular-detox',
    category: 'METHYLATION SUPPORT (GENEX360)',
    deliveryForm: 'Capsule',
    ingredientCount: 6,
    isDraft: true,
    ingredients: [
      ing('Liposomal Glutathione (Setria®)', '250'),
      ing('NAC (N-Acetyl Cysteine)', '600'),
      ing('Selenium (L-Selenomethionine)', '0.2'),
      ing('Milk Thistle (80% Silymarin)', '250'),
      ing('R-Alpha-Lipoic Acid', '200'),
      ing('Sulforaphane (Broccoli Sprout)', '50'),
    ],
    marketingDescription: `Designed for individuals with glutathione S-transferase (GST) gene variants, including GSTM1 and GSTT1 deletions, that affect Phase II detoxification capacity. GST+ delivers liposomal Setria® glutathione, N-acetyl cysteine (NAC), selenium L-selenomethionine, milk thistle silymarin, R-alpha-lipoic acid, and sulforaphane from broccoli sprout extract, supporting both direct glutathione availability and the upregulation of endogenous GST enzyme expression. A foundational detoxification formula for individuals with environmental sensitivities, chemical exposures, or compromised Phase II clearance.`,
  },

  {
    name: 'SOD+ Antioxidant Defense',
    slug: 'sod-antioxidant-defense',
    category: 'METHYLATION SUPPORT (GENEX360)',
    deliveryForm: 'Capsule',
    ingredientCount: 6,
    isDraft: true,
    ingredients: [
      ing('Zinc Bisglycinate', '15'),
      ing('Copper Bisglycinate', '1'),
      ing('Manganese Bisglycinate', '2'),
      ing('Selenium (L-Selenomethionine)', '0.2'),
      ing('Liposomal Vitamin C', '500'),
      ing('NAC (N-Acetyl Cysteine)', '600'),
    ],
    marketingDescription: `Formulated for individuals with superoxide dismutase (SOD) gene variants, particularly SOD2, that affect mitochondrial antioxidant defense against reactive oxygen species. SOD+ provides the essential metal cofactors zinc, copper, and manganese in chelated bisglycinate forms alongside selenium L-selenomethionine, liposomal vitamin C, and N-acetyl cysteine (NAC), supporting both SOD enzyme structure and the broader antioxidant cascade that protects mitochondria from oxidative damage. Essential for cellular longevity, exercise recovery, and aging resilience in individuals with elevated oxidative stress.`,
  },

  {
    name: 'NOS+ Vascular Integrity',
    slug: 'nos-vascular-integrity',
    category: 'METHYLATION SUPPORT (GENEX360)',
    deliveryForm: 'Capsule',
    ingredientCount: 6,
    isDraft: true,
    ingredients: [
      ing('L-Citrulline Malate', '1000'),
      ing('L-Arginine', '500'),
      ing('Liposomal BH4 (Tetrahydrobiopterin)', '5'),
      ing('Liposomal Vitamin C', '250'),
      ing('Liposomal 5-MTHF', '0.4'),
      ing('Beetroot Extract (10:1)', '500'),
    ],
    marketingDescription: `Engineered for individuals with endothelial nitric oxide synthase (eNOS) gene variants that affect nitric oxide production, vascular tone, and endothelial function. NOS+ combines L-citrulline malate, L-arginine, liposomal BH4 (tetrahydrobiopterin), liposomal vitamin C, liposomal 5-MTHF, and beetroot extract (10:1), delivering both NO precursors and the essential cofactors required for healthy NOS enzyme coupling. Supports cardiovascular health, exercise performance, blood pressure regulation, and microcirculation throughout the vascular system.`,
  },

  {
    name: 'SUOX+ Sulfite Clearance',
    slug: 'suox-sulfite-clearance',
    category: 'METHYLATION SUPPORT (GENEX360)',
    deliveryForm: 'Capsule',
    ingredientCount: 5,
    isDraft: true,
    ingredients: [
      ing('Molybdenum (Glycinate)', '0.3'),
      ing('Methylcobalamin (B12)', '1'),
      ing('Vitamin B6 (P5P)', '25'),
      ing('Magnesium Bisglycinate', '100'),
      ing('Riboflavin (B2)', '25'),
    ],
    marketingDescription: `Designed for individuals carrying sulfite oxidase (SUOX) gene variants who may be sensitive to sulfites in food and wine, or who require enhanced sulfite-to-sulfate clearance. SUOX+ delivers molybdenum glycinate, the essential SUOX enzyme cofactor, alongside methylcobalamin, P-5-P, magnesium bisglycinate, and riboflavin to support healthy sulfite metabolism downstream of CBS pathway activity. A targeted formula for individuals with sulfite sensitivity, neurological reactions to sulfur-rich foods, or downstream concerns from CBS upregulation patterns.`,
  },

  {
    name: 'NAT Support+ Acetylation',
    slug: 'nat-acetylation-support',
    category: 'METHYLATION SUPPORT (GENEX360)',
    deliveryForm: 'Capsule',
    ingredientCount: 6,
    isDraft: true,
    ingredients: [
      ing('Pantothenic Acid (B5)', '100'),
      ing('Acetyl-L-Carnitine', '250'),
      ing('Glycine', '500'),
      ing('Molybdenum (Glycinate)', '0.15'),
      ing('Vitamin B6 (P5P)', '25'),
      ing('Magnesium Bisglycinate', '100'),
    ],
    marketingDescription: `Formulated for individuals with N-acetyltransferase (NAT1/NAT2) gene variants that affect Phase II acetylation, the detoxification pathway responsible for processing certain pharmaceuticals, dietary amines, and environmental toxins. NAT Support+ combines pantothenic acid (B5), acetyl-L-carnitine, glycine, molybdenum glycinate, P-5-P, and magnesium bisglycinate, providing the acetyl groups and cofactors needed for healthy acetylation capacity. Particularly relevant for individuals classified as 'slow acetylators' with sensitivities to certain medications, caffeine metabolism issues, or dietary amine triggers.`,
  },

  {
    name: 'TCN2+ B12 Transport',
    slug: 'tcn2-b12-transport',
    category: 'METHYLATION SUPPORT (GENEX360)',
    deliveryForm: 'Capsule',
    ingredientCount: 6,
    isDraft: true,
    ingredients: [
      ing('Methylcobalamin (B12)', '1'),
      ing('Hydroxocobalamin (B12)', '1'),
      ing('Adenosylcobalamin (B12)', '1'),
      ing('Liposomal 5-MTHF', '0.8'),
      ing('Intrinsic Factor', '50'),
      ing('Calcium (as Carbonate)', '100'),
    ],
    marketingDescription: `Designed for individuals with transcobalamin II (TCN2) gene variants that affect cellular B12 transport and tissue delivery, even when serum B12 appears adequate on standard labs. TCN2+ delivers all three active forms of vitamin B12, methylcobalamin, hydroxocobalamin, and adenosylcobalamin, alongside liposomal 5-MTHF, intrinsic factor, and calcium to support complete cellular B12 bioavailability. Ideal for individuals with neurological symptoms, fatigue, or methylation issues that persist despite normal blood B12 levels, where intracellular B12 delivery is the actual bottleneck.`,
  },

  {
    name: 'RFC1 Support+ Folate Transport',
    slug: 'rfc1-folate-transport',
    category: 'METHYLATION SUPPORT (GENEX360)',
    deliveryForm: 'Capsule',
    ingredientCount: 6,
    isDraft: true,
    ingredients: [
      ing('Liposomal 5-MTHF', '0.8'),
      ing('Folinic Acid (Calcium Folinate)', '0.4'),
      ing('Methylcobalamin (B12)', '1'),
      ing('Vitamin B6 (P5P)', '25'),
      ing('Riboflavin (B2)', '25'),
      ing('Zinc Bisglycinate', '15'),
    ],
    marketingDescription: `Engineered for individuals with reduced folate carrier (RFC1 / SLC19A1) gene variants that affect cellular folate uptake. RFC1 Support+ provides liposomal 5-MTHF and folinic acid (calcium folinate), the two folate forms most readily transported through alternative cellular pathways, alongside methylcobalamin, P-5-P, riboflavin, and zinc bisglycinate. Bypasses impaired RFC1 transport to ensure adequate intracellular folate for methylation cycles, DNA synthesis, neurotransmitter production, and homocysteine clearance.`,
  },

  {
    name: 'SHMT+ Glycine-Folate Balance',
    slug: 'shmt-glycine-folate-balance',
    category: 'METHYLATION SUPPORT (GENEX360)',
    deliveryForm: 'Capsule',
    ingredientCount: 6,
    isDraft: true,
    ingredients: [
      ing('Glycine', '1000'),
      ing('L-Serine', '250'),
      ing('Vitamin B6 (P5P)', '25'),
      ing('Liposomal 5-MTHF', '0.4'),
      ing('Folinic Acid', '0.4'),
      ing('Riboflavin (B2)', '25'),
    ],
    marketingDescription: `Formulated for individuals with serine hydroxymethyltransferase (SHMT) gene variants affecting one-carbon metabolism and the interconversion of serine, glycine, and tetrahydrofolate. SHMT+ delivers glycine, L-serine, P-5-P, liposomal 5-MTHF, folinic acid, and riboflavin, the substrates and cofactors needed for healthy SHMT enzyme function and folate cycle integrity. Essential for individuals with broader methylation challenges, glycine deficiency patterns, or impaired one-carbon flux that limits downstream methyl group availability.`,
  },

  {
    name: 'ADO Support+ Purine Metabolism',
    slug: 'ado-purine-metabolism',
    category: 'METHYLATION SUPPORT (GENEX360)',
    deliveryForm: 'Capsule',
    ingredientCount: 6,
    isDraft: true,
    ingredients: [
      ing('Molybdenum (Glycinate)', '0.15'),
      ing('Magnesium Bisglycinate', '100'),
      ing('Vitamin B6 (P5P)', '25'),
      ing('Inositol', '250'),
      ing('Liposomal 5-MTHF', '0.4'),
      ing('Methylcobalamin (B12)', '1'),
    ],
    marketingDescription: `Designed for individuals seeking to support purine metabolism and adenosine pathway homeostasis through targeted cofactor delivery. ADO Support+ combines molybdenum glycinate, magnesium bisglycinate, P-5-P, inositol, liposomal 5-MTHF, and methylcobalamin, supporting purine recycling, adenosine signaling, and the broader nucleotide metabolism that underpins cellular energy production and intercellular communication. Particularly valuable for individuals with mast cell or histamine-related concerns where purine pathways and methylation status intersect.`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // CATEGORY 5 — FUNCTIONAL MUSHROOMS (5 products)
  // Marketing descriptions are minimal — full catalog copy pending.
  // ════════════════════════════════════════════════════════════════════════

  {
    name: "Lion's Mane Mushroom Capsules",
    slug: 'lions-mane-mushroom',
    category: 'FUNCTIONAL MUSHROOMS',
    deliveryForm: 'Capsule',
    ingredientCount: 2,
    ingredients: [
      ing("Micellar Lion's Mane Extract (30% Polysaccharides)", '180'),
      ing('Liposomal Phospholipids (Sunflower Lecithin)', '15'),
    ],
    marketingDescription: `A high-potency Lion's Mane extract standardized to 30% polysaccharides and delivered through FarmCeutica's micellar absorption matrix with sunflower lecithin phospholipids. Lion's Mane (Hericium erinaceus) is the most-studied nootropic mushroom, supporting nerve growth factor production, cognitive clarity, and long-term neurological health.`,
  },

  {
    name: 'Reishi Mushroom Capsules',
    slug: 'reishi-mushroom',
    category: 'FUNCTIONAL MUSHROOMS',
    deliveryForm: 'Capsule',
    ingredientCount: 2,
    ingredients: [
      ing('Micellar Reishi Extract (30% Polysaccharides)', '180'),
      ing('Liposomal Phospholipids (Sunflower Lecithin)', '15'),
    ],
    marketingDescription: `A potent Reishi (Ganoderma lucidum) extract standardized to 30% polysaccharides with FarmCeutica's micellar delivery system and sunflower lecithin phospholipids. Reishi is the classic adaptogenic mushroom of traditional medicine, supporting immune balance, stress resilience, sleep quality, and overall vitality.`,
  },

  {
    name: 'Chaga Mushroom Capsules',
    slug: 'chaga-mushroom',
    category: 'FUNCTIONAL MUSHROOMS',
    deliveryForm: 'Capsule',
    ingredientCount: 2,
    ingredients: [
      ing('Micellar Chaga Mushroom Extract (10:1, Organic)', '180'),
      ing('Liposomal Phospholipids (Sunflower Lecithin)', '15'),
    ],
    marketingDescription: `An organic 10:1 Chaga (Inonotus obliquus) extract delivered through FarmCeutica's micellar matrix with sunflower lecithin phospholipids. Chaga is one of the highest natural sources of antioxidants and contains the unique compound betulinic acid, supporting immune modulation, antioxidant defense, and gut health.`,
  },

  {
    name: 'Cordyceps Mushroom Capsules',
    slug: 'cordyceps-mushroom',
    category: 'FUNCTIONAL MUSHROOMS',
    deliveryForm: 'Capsule',
    ingredientCount: 2,
    ingredients: [
      ing('Micellar Cordyceps Extract (7% Polysaccharides)', '180'),
      ing('Liposomal Phospholipids (Sunflower Lecithin)', '15'),
    ],
    marketingDescription: `A high-bioactive Cordyceps militaris extract standardized to 7% polysaccharides and delivered via FarmCeutica's micellar absorption matrix. Cordyceps is the traditional Tibetan athlete's mushroom, supporting endurance, oxygen utilization, mitochondrial energy production, and respiratory function.`,
  },

  {
    name: 'Turkey Tail Mushroom Capsules',
    slug: 'turkey-tail-mushroom',
    category: 'FUNCTIONAL MUSHROOMS',
    deliveryForm: 'Capsule',
    ingredientCount: 2,
    ingredients: [
      ing('Micellar Turkey Tail Extract (30% Polysaccharides)', '180'),
      ing('Liposomal Phospholipids (Sunflower Lecithin)', '15'),
    ],
    marketingDescription: `A premium Turkey Tail (Trametes versicolor) extract standardized to 30% polysaccharides with FarmCeutica's micellar delivery system. Turkey Tail is the most-researched immune-modulating mushroom, prized for its PSK and PSP polysaccharide complexes that support immune function and gut microbiome health.`,
  },

  // ════════════════════════════════════════════════════════════════════════
  // CATEGORY 6 — CHILDREN'S MULTIVITAMINS (3 products)
  // ════════════════════════════════════════════════════════════════════════

  {
    name: 'Sproutables Children Gummies',
    slug: 'sproutables-children-gummies',
    category: "CHILDREN'S MULTIVITAMINS",
    deliveryForm: 'Gummy',
    ingredientCount: 18,
    ingredients: [
      ing('MethylB Complete+™ B Complex', '35'),
      ing('Liposomal Magnesium Synergy Matrix', '10'),
      ing('Probiotic Blend (10B CFU)', '10'),
      ing('Omega-3 DHA/EPA (Algal Oil)', '10'),
      ing('Vitamin A (Beta-Carotene, Liposomal)', '0.45'),
      ing('Vitamin D3 (Cholecalciferol, Liposomal)', '0.015'),
      ing('Vitamin E (D-Alpha Tocopherol, Liposomal)', '7'),
      ing('Vitamin K2 (Menaquinone-7, Liposomal)', '0.03'),
      ing('Vitamin C (Liposomal Ascorbic Acid)', '10'),
      ing('Iron (Ferrous Fumarate)', '10'),
      ing('Iodine (Potassium Iodide)', '0.12'),
      ing('Zinc (Zinc Carnosine)', '5'),
      ing('Calcium (Calcium Citrate Malate)', '10'),
      ing('Crocin (Saffron Extract 10%)', '0.05'),
      ing('Choline (Choline Bitartrate, Liposomal)', '10'),
      ing('Organic Pectin (Gelling Agent)', '10'),
      ing('Organic Stevia Extract (Natural Sweetener)', '20'),
      ing('Organic Fruit Extract Blend', '30'),
    ],
    marketingDescription: `A complete daily children's multivitamin in a delicious gummy format, delivering FarmCeutica's MethylB Complete+™ B Complex, Magnesium Synergy Matrix, algal omega-3 DHA/EPA, liposomal vitamins A, D3, E, K2, and C, iron, iodine, zinc, calcium, and a 10-billion CFU probiotic blend across 18 child-appropriate ingredients. Sweetened naturally with organic stevia and organic fruit extracts, with no artificial colors, sweeteners, or fillers, giving parents confidence and kids a daily ritual they actually look forward to.`,
  },

  {
    name: 'Sproutables Toddler Tablets',
    slug: 'sproutables-toddler-tablets',
    category: "CHILDREN'S MULTIVITAMINS",
    deliveryForm: 'Tablet',
    ingredientCount: 17,
    ingredients: [
      ing('MethylB Complete+™ B Complex', '35'),
      ing('Liposomal Magnesium Synergy Matrix', '15'),
      ing('Probiotic Blend (10B CFU)', '10'),
      ing('Omega-3 DHA/EPA (Algal Oil)', '10'),
      ing('Vitamin A (Retinyl Acetate, Liposomal)', '0.6'),
      ing('Vitamin D3 (Cholecalciferol, Liposomal)', '0.015'),
      ing('Vitamin E (D-Alpha Tocopherol, Liposomal)', '6'),
      ing('Vitamin K2 (Menaquinone-7, Liposomal)', '0.01'),
      ing('Vitamin C (Liposomal Ascorbic Acid)', '15'),
      ing('Iron (Ferrous Bisglycinate, Liposomal)', '7'),
      ing('Iodine (Potassium Iodide, Liposomal)', '0.09'),
      ing('Zinc (Zinc Carnosine)', '3'),
      ing('Calcium (Calcium Citrate Malate, Liposomal)', '20'),
      ing('DHA (Docosahexaenoic Acid, Liposomal)', '50'),
      ing('Crocin (Saffron Extract 10%)', '0.5'),
      ing('Choline (Choline Bitartrate, Liposomal)', '50'),
      ing('Organic Fruit Extract Blend', '5'),
    ],
    marketingDescription: `A toddler-formulated tablet built on FarmCeutica's MethylB Complete+™ backbone, delivering Magnesium Synergy Matrix, algal omega-3 DHA/EPA, liposomal vitamins A, D3, E, K2, and C, ferrous bisglycinate iron, iodine, zinc carnosine, calcium, DHA for cognitive development, and a 10-billion CFU probiotic blend. Sproutables Toddler Tablets are sized appropriately for ages 2 to 4 and free from artificial colors, sweeteners, and fillers, providing comprehensive nutrition during a critical developmental window.`,
  },

  {
    name: 'Sproutables Infant Tincture',
    slug: 'sproutables-infant-tincture',
    category: "CHILDREN'S MULTIVITAMINS",
    deliveryForm: 'Tincture',
    ingredientCount: 12,
    ingredients: [
      ing('MethylB Complete+™ B Complex', '35'),
      ing('Proprietary Probiotic Blend (10B CFU)', '10'),
      ing('Liposomal Vitamin A (Retinyl Palmitate)', '0.04'),
      ing('Liposomal Vitamin D3 (Cholecalciferol)', '0.01'),
      ing('Liposomal Vitamin E (D-Alpha Tocopherol)', '4'),
      ing('Liposomal Vitamin K1 (Phylloquinone)', '0.002'),
      ing('Liposomal Vitamin C (Ascorbic Acid)', '25'),
      ing('Liposomal Iron (Ferrous Bisglycinate)', '2'),
      ing('Liposomal Iodine (Potassium Iodide)', '0.011'),
      ing('Zinc (Carnosine)', '1'),
      ing('Organic MCT Oil (Carrier)', '30'),
      ing('Organic Fruit Extract (Natural Flavor)', '5'),
    ],
    marketingDescription: `A liquid tincture formulation delivering FarmCeutica's MethylB Complete+™ B Complex with liposomal vitamins A, D3, E, K1, and C, ferrous bisglycinate iron, iodine, zinc carnosine, and a 10-billion CFU probiotic blend in an organic MCT oil carrier base. Sproutables Infant Tincture is age-appropriate for the youngest in the family, flavored with organic fruit extract and free from artificial sweeteners, dyes, or unnecessary additives.`,
  },
];

// ════════════════════════════════════════════════════════════════════════
// HELPER UTILITIES
// ════════════════════════════════════════════════════════════════════════

/** Strip ™, ®, +, apostrophes, and punctuation; lowercase; collapse spaces. */
function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[™®]/g, '')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export const getFormulationBySlug = (slug: string): ProductFormulation | undefined =>
  MASTER_FORMULATIONS.find(p => p.slug === slug);

/**
 * Look up a formulation by product name with normalization for ™/®/punctuation
 * differences between the database, MASTER_SKUS, and this file.
 */
export function getFormulationByName(name: string): ProductFormulation | undefined {
  if (!name) return undefined;
  const target = normalizeName(name);

  // Exact match first
  const exact = MASTER_FORMULATIONS.find(p => normalizeName(p.name) === target);
  if (exact) return exact;

  // Containment fallback (handles "Inferno + GLP-1" vs "GLP-1 Activator Complex")
  return MASTER_FORMULATIONS.find(p => {
    const candidate = normalizeName(p.name);
    return candidate.includes(target) || target.includes(candidate);
  });
}

export const getFormulationsByCategory = (category: ProductCategory): ProductFormulation[] =>
  MASTER_FORMULATIONS.filter(p => p.category === category);

export const getAllCategories = (): ProductCategory[] =>
  Array.from(new Set(MASTER_FORMULATIONS.map(p => p.category)));

export const getTotalIngredientCount = (): number =>
  MASTER_FORMULATIONS.reduce((sum, p) => sum + p.ingredients.length, 0);

export const getLiposomalIngredients = (slug: string): Ingredient[] =>
  (getFormulationBySlug(slug)?.ingredients ?? []).filter(i => i.isLiposomal);

export const getMicellarIngredients = (slug: string): Ingredient[] =>
  (getFormulationBySlug(slug)?.ingredients ?? []).filter(i => i.isMicellar);

/**
 * Convert a ProductFormulation into the legacy `{ total_mg, ingredients: [{ingredient, mg}] }`
 * shape consumed by the existing ProductInfoButtons component. Returns null when no
 * formulation matches the given product name.
 */
export function getFormulationDataByName(
  name: string
): { total_mg: number; ingredients: { ingredient: string; mg: string }[] } | null {
  const f = getFormulationByName(name);
  if (!f) return null;
  const total = f.ingredients.reduce((sum, i) => {
    const v = parseFloat(i.mgPerServing);
    return sum + (Number.isFinite(v) ? v : 0);
  }, 0);
  // Round to 3 decimals to avoid floating-point noise
  const total_mg = Math.round(total * 1000) / 1000;
  return {
    total_mg,
    ingredients: f.ingredients.map(i => ({ ingredient: i.name, mg: i.mgPerServing })),
  };
}

// ── Category display metadata (for headers, badges, sticky nav) ──
export const CATEGORY_META: Record<
  ProductCategory,
  { label: string; icon: string; color: string }
> = {
  'PROPRIETARY BASE': { label: 'Proprietary Bases', icon: 'FlaskConical', color: '#2DA5A0' },
  ADVANCED: { label: 'Advanced Formulas', icon: 'Zap', color: '#B75E18' },
  "WOMEN'S HEALTH": { label: "Women's Health", icon: 'Heart', color: '#E87DA0' },
  'METHYLATION SUPPORT (GENEX360)': {
    label: 'Methylation Support (GeneX360)',
    icon: 'GitBranch',
    color: '#7C6FE0',
  },
  'FUNCTIONAL MUSHROOMS': { label: 'Functional Mushrooms', icon: 'TreeDeciduous', color: '#4CAF50' },
  "CHILDREN'S MULTIVITAMINS": {
    label: "Children's Multivitamins",
    icon: 'Baby',
    color: '#FFB347',
  },
};
