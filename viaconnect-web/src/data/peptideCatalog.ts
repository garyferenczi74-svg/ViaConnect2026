// src/data/peptideCatalog.ts
//
// Prompt #53 — Peptide Catalog dataset.
//
// 29 FarmCeutica portfolio peptides organized into 7 therapeutic
// categories. Powers the /shop/peptides catalog and detail pages.
//
// Important rules baked into this data:
//   - Semaglutide (#6) is reference-only and never recommended.
//   - Retatrutide (#8) is injectable-only and never stacked.
//   - Bioavailability for liposomal/micellar forms is stated as 10–27×.
//   - Liposomal and Micellar are always separate delivery forms.

export type PeptideCategory =
  | "Gut Health & Tissue Repair"
  | "Weight Management & Metabolic"
  | "Mitochondrial & Energy"
  | "Cognitive & Neuroprotection"
  | "Longevity & Cellular"
  | "Immune & Recovery"
  | "Hormonal & Performance";

export type PeptideDeliveryForm =
  | "Liposomal"
  | "Micellar"
  | "Injectable"
  | "Nasal Spray";

export type PeptideResearchStatus = "established" | "emerging" | "novel";

export interface PeptideProduct {
  id: number;
  name: string;
  slug: string;
  category: PeptideCategory;
  categoryNumber: number;
  description: string;
  mechanismOfAction: string;
  primaryBenefits: string[];
  deliveryForms: PeptideDeliveryForm[];
  isInjectableOnly: boolean;
  isStackable: boolean;
  researchStatus: PeptideResearchStatus;
  keyStudies?: string;
  contraindications?: string;
  practitionerNotes?: string;
}

export interface PeptideCategoryMeta {
  name: PeptideCategory;
  number: number;
  slug: string;
  icon: string;
  color: string;
  description: string;
  peptideCount: number;
}

// ── Category metadata ──────────────────────────────────────────────────

export const PEPTIDE_CATEGORIES: PeptideCategoryMeta[] = [
  {
    name: "Gut Health & Tissue Repair",
    number: 1,
    slug: "gut-health-tissue-repair",
    icon: "Heart",
    color: "#E87DA0",
    description:
      "Peptides supporting gastrointestinal healing, mucosal integrity, and systemic tissue repair pathways.",
    peptideCount: 5,
  },
  {
    name: "Weight Management & Metabolic",
    number: 2,
    slug: "weight-management-metabolic",
    icon: "Flame",
    color: "#B75E18",
    description:
      "GLP-1 receptor agonists and metabolic peptides supporting healthy body composition, appetite regulation, and insulin sensitivity.",
    peptideCount: 5,
  },
  {
    name: "Mitochondrial & Energy",
    number: 3,
    slug: "mitochondrial-energy",
    icon: "Zap",
    color: "#FFB347",
    description:
      "Peptides targeting mitochondrial biogenesis, ATP production, and cellular energy metabolism.",
    peptideCount: 4,
  },
  {
    name: "Cognitive & Neuroprotection",
    number: 4,
    slug: "cognitive-neuroprotection",
    icon: "Brain",
    color: "#7C6FE0",
    description:
      "Neuropeptides supporting memory, focus, neuroplasticity, and protection against neurodegenerative processes.",
    peptideCount: 4,
  },
  {
    name: "Longevity & Cellular",
    number: 5,
    slug: "longevity-cellular",
    icon: "Clock",
    color: "#2DA5A0",
    description:
      "Peptides targeting telomere maintenance, senescent cell clearance, NAD+ metabolism, and biological age reversal.",
    peptideCount: 4,
  },
  {
    name: "Immune & Recovery",
    number: 6,
    slug: "immune-recovery",
    icon: "Shield",
    color: "#4CAF50",
    description:
      "Thymic peptides and immune modulators supporting immune system reconditioning, recovery, and resilience.",
    peptideCount: 4,
  },
  {
    name: "Hormonal & Performance",
    number: 7,
    slug: "hormonal-performance",
    icon: "TrendingUp",
    color: "#E85D75",
    description:
      "Growth hormone secretagogues and hormonal optimization peptides for body composition, recovery, and vitality.",
    peptideCount: 3,
  },
];

// ── Catalog ────────────────────────────────────────────────────────────

export const PEPTIDE_CATALOG: PeptideProduct[] = [
  // ═══ CATEGORY 1: GUT HEALTH & TISSUE REPAIR (5) ═══
  {
    id: 1,
    name: "BPC-157",
    slug: "bpc-157",
    category: "Gut Health & Tissue Repair",
    categoryNumber: 1,
    description:
      "Body Protection Compound-157 is a pentadecapeptide derived from human gastric juice that demonstrates remarkable tissue-healing properties across multiple organ systems. BPC-157 accelerates the healing of tendons, ligaments, muscles, intestinal lining, and bone while promoting angiogenesis and modulating nitric oxide pathways. It is the most extensively studied peptide for gut barrier repair and is the cornerstone of FarmCeutica's Balance+ Gut Repair formulation.",
    mechanismOfAction:
      "Upregulates VEGF and growth hormone receptors, modulates the NO system, promotes tight junction protein expression (claudin, occludin), and activates the FAK-paxillin pathway for accelerated wound healing.",
    primaryBenefits: [
      "Gut lining repair and intestinal permeability reduction",
      "Tendon, ligament, and muscle injury healing",
      "Anti-inflammatory and cytoprotective effects",
      "Counteracts NSAID-induced gut damage",
      "Neuroprotective in brain injury models",
    ],
    deliveryForms: ["Liposomal", "Micellar", "Injectable", "Nasal Spray"],
    isInjectableOnly: false,
    isStackable: true,
    researchStatus: "established",
    keyStudies:
      "Over 100 peer-reviewed studies since 1993. Demonstrated efficacy in GI healing, musculoskeletal repair, and neuroprotection in animal models.",
    contraindications:
      "Limited human clinical trial data. Avoid during active cancer treatment (angiogenesis concern).",
    practitionerNotes:
      "Oral/liposomal preferred for GI targets. Injectable or nasal for systemic tissue repair. Pairs well with TB-500 for musculoskeletal protocols.",
  },
  {
    id: 2,
    name: "Larazotide Acetate",
    slug: "larazotide-acetate",
    category: "Gut Health & Tissue Repair",
    categoryNumber: 1,
    description:
      "Larazotide acetate is a synthetic octapeptide that acts as a tight junction regulator, specifically targeting zonulin-mediated intestinal permeability. Originally developed for celiac disease, Larazotide is the most advanced peptide specifically designed to seal the gut barrier — making it uniquely valuable for individuals with leaky gut, gluten sensitivity, and autoimmune conditions driven by intestinal hyperpermeability.",
    mechanismOfAction:
      "Antagonizes the zonulin receptor, preventing zonulin-triggered disassembly of tight junction proteins. Restores paracellular barrier function without affecting transcellular transport.",
    primaryBenefits: [
      "Tight junction integrity restoration",
      "Zonulin pathway regulation",
      "Intestinal permeability reduction",
      "Celiac disease symptom management",
      "Autoimmune trigger reduction via gut barrier",
    ],
    deliveryForms: ["Liposomal", "Micellar", "Injectable", "Nasal Spray"],
    isInjectableOnly: false,
    isStackable: true,
    researchStatus: "established",
    keyStudies:
      "Phase 3 clinical trials for celiac disease (Innovate Biopharmaceuticals). Demonstrated statistically significant reduction in GI symptoms and intestinal permeability markers.",
    contraindications:
      "No major contraindications identified in clinical trials. Monitor in patients on immunosuppressants.",
  },
  {
    id: 3,
    name: "KPV (Tripeptide)",
    slug: "kpv-tripeptide",
    category: "Gut Health & Tissue Repair",
    categoryNumber: 1,
    description:
      "KPV is a C-terminal tripeptide fragment of alpha-melanocyte-stimulating hormone (α-MSH) with potent anti-inflammatory properties specifically targeting the gastrointestinal tract. KPV enters colonic epithelial cells, inhibits NF-κB inflammatory signaling, and reduces pro-inflammatory cytokine production — making it one of the most targeted anti-inflammatory peptides available for IBD, colitis, and chronic gut inflammation.",
    mechanismOfAction:
      "Penetrates intestinal epithelial cells and directly inhibits NF-κB nuclear translocation. Reduces TNF-α, IL-6, and IL-1β production at the mucosal level without systemic immunosuppression.",
    primaryBenefits: [
      "NF-κB inflammatory pathway inhibition",
      "Colonic inflammation reduction",
      "IBD and colitis symptom management",
      "Mucosal immune modulation",
      "Pairs with BPC-157 for comprehensive gut protocols",
    ],
    deliveryForms: ["Liposomal", "Micellar", "Injectable", "Nasal Spray"],
    isInjectableOnly: false,
    isStackable: true,
    researchStatus: "emerging",
  },
  {
    id: 4,
    name: "TB-500 (Thymosin Beta-4)",
    slug: "tb-500",
    category: "Gut Health & Tissue Repair",
    categoryNumber: 1,
    description:
      "Thymosin Beta-4 is a naturally occurring 43-amino-acid peptide present in virtually all human cells that plays a central role in tissue repair, cell migration, and angiogenesis. TB-500 promotes healing by upregulating actin polymerization — the cellular scaffolding required for cell movement into damaged tissue sites. It is the primary systemic tissue repair peptide and pairs synergistically with BPC-157 for comprehensive injury recovery.",
    mechanismOfAction:
      "Sequesters G-actin monomers, promoting actin polymerization and lamellipodium formation for cell migration. Upregulates VEGF for angiogenesis and reduces inflammatory cytokines at injury sites.",
    primaryBenefits: [
      "Systemic tissue repair and wound healing",
      "Cardiac tissue protection and repair",
      "Hair regrowth stimulation",
      "Anti-fibrotic properties",
      "Synergistic with BPC-157 for musculoskeletal healing",
    ],
    deliveryForms: ["Liposomal", "Micellar", "Injectable", "Nasal Spray"],
    isInjectableOnly: false,
    isStackable: true,
    researchStatus: "established",
  },
  {
    id: 5,
    name: "Pentadecapeptide (BPC-157 Analog)",
    slug: "pentadecapeptide-bpc157-analog",
    category: "Gut Health & Tissue Repair",
    categoryNumber: 1,
    description:
      "A next-generation stable analog of BPC-157 engineered for enhanced oral bioavailability and extended half-life. This pentadecapeptide variant retains the full tissue-repair signaling profile of native BPC-157 while incorporating structural modifications that resist enzymatic degradation in the GI tract — making it particularly suited for oral and liposomal delivery routes targeting gut repair.",
    mechanismOfAction:
      "Same VEGF/NO/FAK-paxillin pathway modulation as BPC-157 with improved resistance to pepsin and trypsin degradation.",
    primaryBenefits: [
      "Enhanced oral bioavailability vs. native BPC-157",
      "Extended half-life for sustained gut healing",
      "Same tissue repair profile with improved stability",
      "Optimized for liposomal delivery",
    ],
    deliveryForms: ["Liposomal", "Micellar", "Injectable", "Nasal Spray"],
    isInjectableOnly: false,
    isStackable: true,
    researchStatus: "novel",
  },

  // ═══ CATEGORY 2: WEIGHT MANAGEMENT & METABOLIC (5) ═══
  {
    id: 6,
    name: "Semaglutide (Reference Only)",
    slug: "semaglutide-reference",
    category: "Weight Management & Metabolic",
    categoryNumber: 2,
    description:
      "Semaglutide is included in this catalog as a reference compound only. As a GLP-1 receptor agonist approved for type 2 diabetes and chronic weight management, it provides the clinical benchmark against which other metabolic peptides are evaluated. FarmCeutica does not recommend, include in protocols, or provide information supporting the use of semaglutide through our platform.",
    mechanismOfAction:
      "GLP-1 receptor agonist with 94% homology to native GLP-1. Enhances glucose-dependent insulin secretion, suppresses glucagon, slows gastric emptying, and acts on hypothalamic appetite centers.",
    primaryBenefits: [
      "FDA-approved GLP-1 receptor agonist",
      "Clinical benchmark for metabolic peptides",
      "Reference compound — NOT recommended by FarmCeutica",
    ],
    deliveryForms: ["Injectable"],
    isInjectableOnly: true,
    isStackable: false,
    researchStatus: "established",
    contraindications:
      "EXCLUDED FROM ALL FARMCEUTICA PROTOCOLS AND RECOMMENDATIONS. Listed for reference and comparison purposes only.",
    practitionerNotes:
      "FarmCeutica does not recommend semaglutide. See Tirzepatide and Retatrutide for dual/triple-agonist alternatives.",
  },
  {
    id: 7,
    name: "Tirzepatide",
    slug: "tirzepatide",
    category: "Weight Management & Metabolic",
    categoryNumber: 2,
    description:
      "Tirzepatide is a dual GIP/GLP-1 receptor agonist that represents the next evolution in incretin-based metabolic therapy. By activating both the glucose-dependent insulinotropic polypeptide (GIP) and glucagon-like peptide-1 (GLP-1) receptors simultaneously, Tirzepatide achieves superior glycemic control and weight reduction compared to single-agonist approaches — demonstrating up to 22.5% body weight reduction in the SURMOUNT clinical trial series.",
    mechanismOfAction:
      "Dual agonism at GIP and GLP-1 receptors. GIP activation enhances fat oxidation, improves insulin sensitivity in adipose tissue, and potentiates GLP-1 appetite suppression effects.",
    primaryBenefits: [
      "Dual GIP/GLP-1 receptor activation",
      "Superior weight reduction vs. single agonists",
      "Improved glycemic control and insulin sensitivity",
      "Cardiovascular risk reduction signals",
      "Fat oxidation enhancement via GIP pathway",
    ],
    deliveryForms: ["Liposomal", "Micellar", "Injectable", "Nasal Spray"],
    isInjectableOnly: false,
    isStackable: true,
    researchStatus: "established",
  },
  {
    id: 8,
    name: "Retatrutide",
    slug: "retatrutide",
    category: "Weight Management & Metabolic",
    categoryNumber: 2,
    description:
      "Retatrutide is the world's first triple-hormone receptor agonist — simultaneously activating GLP-1, GIP, and glucagon receptors. This triple-agonist mechanism achieved unprecedented 24.2% body weight reduction in Phase 2 trials, surpassing both semaglutide and tirzepatide. The glucagon receptor activation adds direct hepatic fat oxidation and thermogenesis on top of the incretin appetite and insulin effects.",
    mechanismOfAction:
      "Triple agonism at GLP-1 (appetite suppression + insulin), GIP (fat oxidation + insulin sensitivity), and glucagon (hepatic fat burning + thermogenesis) receptors.",
    primaryBenefits: [
      "First-in-class triple-agonist mechanism",
      "Record 24.2% body weight reduction in trials",
      "Direct hepatic fat oxidation via glucagon receptor",
      "Thermogenesis enhancement",
      "Potential NASH / fatty liver disease benefit",
    ],
    deliveryForms: ["Injectable"],
    isInjectableOnly: true,
    isStackable: false,
    researchStatus: "emerging",
    contraindications:
      "Injectable only. Never stacked with other GLP-1 agonists. Phase 2 data only — Phase 3 ongoing.",
    practitionerNotes:
      "INJECTABLE ONLY, NEVER STACKED. Most potent metabolic peptide in the portfolio. Reserve for patients requiring maximum intervention.",
  },
  {
    id: 9,
    name: "5-Amino-1MQ",
    slug: "5-amino-1mq",
    category: "Weight Management & Metabolic",
    categoryNumber: 2,
    description:
      "5-Amino-1MQ is a small-molecule NNMT (nicotinamide N-methyltransferase) inhibitor that addresses obesity and metabolic dysfunction through a completely different mechanism than GLP-1 agonists. By blocking NNMT — an enzyme overexpressed in adipose tissue that drives fat storage and suppresses cellular energy expenditure — 5-Amino-1MQ shifts metabolism back toward fat oxidation and NAD+ conservation.",
    mechanismOfAction:
      "Selectively inhibits NNMT in adipocytes, preventing SAMe-dependent methylation of nicotinamide. Preserves intracellular NAD+ pools, increases SAM availability, and shifts adipocyte metabolism from storage to oxidation.",
    primaryBenefits: [
      "NNMT enzyme inhibition in adipose tissue",
      "Fat cell metabolism shift from storage to oxidation",
      "NAD+ conservation in adipocytes",
      "Complementary mechanism to GLP-1 agonists",
      "No appetite suppression side effects",
    ],
    deliveryForms: ["Liposomal", "Micellar", "Injectable", "Nasal Spray"],
    isInjectableOnly: false,
    isStackable: true,
    researchStatus: "emerging",
  },
  {
    id: 10,
    name: "AOD-9604",
    slug: "aod-9604",
    category: "Weight Management & Metabolic",
    categoryNumber: 2,
    description:
      "AOD-9604 is a modified fragment (amino acids 177–191) of human growth hormone specifically designed to stimulate lipolysis without the growth-promoting or diabetogenic effects of full HGH. This peptide targets fat metabolism directly, activating beta-3 adrenergic receptors on adipocytes to release stored fatty acids while simultaneously inhibiting lipogenesis — making it one of the cleanest fat-loss peptides available.",
    mechanismOfAction:
      "Activates the beta-3 adrenergic receptor on adipocytes, stimulating hormone-sensitive lipase. Inhibits lipogenesis via suppression of acetyl-CoA carboxylase. No effect on IGF-1 or blood glucose.",
    primaryBenefits: [
      "Targeted fat metabolism without HGH side effects",
      "Lipolysis activation via beta-3 adrenergic pathway",
      "Lipogenesis inhibition",
      "No impact on blood glucose or IGF-1",
      "Cartilage repair properties (secondary benefit)",
    ],
    deliveryForms: ["Liposomal", "Micellar", "Injectable", "Nasal Spray"],
    isInjectableOnly: false,
    isStackable: true,
    researchStatus: "established",
  },

  // ═══ CATEGORY 3: MITOCHONDRIAL & ENERGY (4) ═══
  {
    id: 11,
    name: "MOTS-c",
    slug: "mots-c",
    category: "Mitochondrial & Energy",
    categoryNumber: 3,
    description:
      "MOTS-c is a mitochondrial-derived peptide encoded within the 12S rRNA gene of mitochondrial DNA — making it one of the few known peptides produced directly by mitochondria rather than nuclear DNA. MOTS-c activates AMPK, the master cellular energy sensor, promoting glucose uptake, fatty acid oxidation, and mitochondrial biogenesis. It is the foundational peptide for metabolic resilience and exercise mimetic effects.",
    mechanismOfAction:
      "Activates AMPK via folate-methionine cycle modulation. Promotes GLUT4 translocation for glucose uptake, stimulates PGC-1α for mitochondrial biogenesis, and enhances fatty acid beta-oxidation.",
    primaryBenefits: [
      "AMPK activation (cellular energy sensor)",
      "Exercise mimetic effects",
      "Mitochondrial biogenesis stimulation",
      "Insulin sensitivity improvement",
      "Aging-associated metabolic protection",
    ],
    deliveryForms: ["Liposomal", "Micellar", "Injectable", "Nasal Spray"],
    isInjectableOnly: false,
    isStackable: true,
    researchStatus: "emerging",
  },
  {
    id: 12,
    name: "Humanin",
    slug: "humanin",
    category: "Mitochondrial & Energy",
    categoryNumber: 3,
    description:
      "Humanin is a 24-amino-acid mitochondrial-derived peptide encoded within the 16S rRNA region of mitochondrial DNA. It acts as a powerful cytoprotective signal, protecting cells against apoptosis, oxidative stress, and mitochondrial dysfunction. Humanin levels decline with age and are inversely correlated with Alzheimer's disease, cardiovascular disease, and type 2 diabetes — making it a key longevity-associated peptide.",
    mechanismOfAction:
      "Binds IGFBP-3, BAX (pro-apoptotic), and formyl peptide receptor-like 1 (FPRL1). Activates STAT3 survival signaling, inhibits mitochondrial outer membrane permeabilization, and protects against amyloid-beta toxicity.",
    primaryBenefits: [
      "Mitochondrial cytoprotection",
      "Anti-apoptotic cell survival signaling",
      "Neuroprotection against amyloid-beta",
      "Cardiovascular protection",
      "Insulin sensitization",
    ],
    deliveryForms: ["Liposomal", "Micellar", "Injectable", "Nasal Spray"],
    isInjectableOnly: false,
    isStackable: true,
    researchStatus: "emerging",
  },
  {
    id: 13,
    name: "SS-31 (Elamipretide)",
    slug: "ss-31-elamipretide",
    category: "Mitochondrial & Energy",
    categoryNumber: 3,
    description:
      "SS-31 (Elamipretide) is a mitochondria-targeted tetrapeptide that selectively concentrates in the inner mitochondrial membrane, binding to cardiolipin — the phospholipid essential for electron transport chain complex assembly. By stabilizing cardiolipin, SS-31 restores electron transport efficiency, reduces reactive oxygen species production at the source, and reverses age-related mitochondrial dysfunction.",
    mechanismOfAction:
      "Penetrates cells and concentrates 1000–5000× in mitochondria. Binds cardiolipin on the inner mitochondrial membrane, stabilizing Complex III and IV assembly, reducing electron leak, and restoring membrane potential.",
    primaryBenefits: [
      "Direct mitochondrial inner membrane targeting",
      "Cardiolipin stabilization",
      "Electron transport chain efficiency restoration",
      "ROS reduction at the source",
      "Heart failure and renal function protection (clinical trials)",
    ],
    deliveryForms: ["Liposomal", "Micellar", "Injectable", "Nasal Spray"],
    isInjectableOnly: false,
    isStackable: true,
    researchStatus: "established",
  },
  {
    id: 14,
    name: "SLU-PP-332",
    slug: "slu-pp-332",
    category: "Mitochondrial & Energy",
    categoryNumber: 3,
    description:
      'SLU-PP-332 is a pan-ERR (estrogen-related receptor) agonist — the first compound to simultaneously activate ERRα, ERRβ, and ERRγ, the master transcription factors governing mitochondrial biogenesis, oxidative phosphorylation, and fatty acid oxidation gene programs. Dubbed the "exercise in a pill" compound, SLU-PP-332 mimics the molecular effects of endurance exercise by switching on the same transcriptional programs that running and cycling activate.',
    mechanismOfAction:
      "Pan-agonist of ERRα/β/γ nuclear receptors. Activates PGC-1α coactivator complex, upregulates mitochondrial biogenesis gene programs (OXPHOS, FAO, TCA cycle), and increases type I oxidative muscle fiber markers.",
    primaryBenefits: [
      "Pan-ERR agonist — first in class",
      "Exercise mimetic transcriptional activation",
      "Mitochondrial biogenesis upregulation",
      "Fatty acid oxidation enhancement",
      "Type I muscle fiber marker increase",
    ],
    deliveryForms: ["Liposomal", "Micellar", "Injectable", "Nasal Spray"],
    isInjectableOnly: false,
    isStackable: true,
    researchStatus: "novel",
    practitionerNotes:
      "Peptide #29 in the FarmCeutica portfolio. Category 3 Mito/Energy. Pan-ERR agonist — novel mechanism, pre-clinical data.",
  },

  // ═══ CATEGORY 4: COGNITIVE & NEUROPROTECTION (4) ═══
  {
    id: 15,
    name: "Dihexa",
    slug: "dihexa",
    category: "Cognitive & Neuroprotection",
    categoryNumber: 4,
    description:
      "Dihexa is a hexapeptide analog of angiotensin IV that crosses the blood-brain barrier and demonstrates extraordinary potency in promoting cognitive function — approximately 10 million times more potent than BDNF at promoting hepatocyte growth factor (HGF) signaling in the brain. Dihexa drives new synapse formation (synaptogenesis), enhances dendritic spine density, and reverses cognitive deficits in animal models of Alzheimer's disease and aging.",
    mechanismOfAction:
      "Binds HGF/c-Met receptor in the brain, amplifying HGF neurotrophic signaling. Promotes synaptogenesis, dendritic spine formation, and long-term potentiation. Inhibits HGF degradation by hepatocyte growth factor activator inhibitor (HAI-1).",
    primaryBenefits: [
      "Extreme potency for synapse formation",
      "HGF/c-Met neurotrophic signaling amplification",
      "Memory and learning enhancement",
      "Dendritic spine density increase",
      "Alzheimer's cognitive deficit reversal in models",
    ],
    deliveryForms: ["Liposomal", "Micellar", "Injectable", "Nasal Spray"],
    isInjectableOnly: false,
    isStackable: true,
    researchStatus: "emerging",
  },
  {
    id: 16,
    name: "Selank",
    slug: "selank",
    category: "Cognitive & Neuroprotection",
    categoryNumber: 4,
    description:
      "Selank is a synthetic analog of the endogenous immunomodulatory peptide tuftsin, developed at the Russian Academy of Sciences' Institute of Molecular Genetics. It functions as both an anxiolytic and nootropic — reducing anxiety through GABA modulation while simultaneously enhancing memory, attention, and learning through BDNF upregulation and serotonin metabolism optimization.",
    mechanismOfAction:
      "Modulates GABA-A receptor allosterically (anxiolytic), upregulates BDNF expression (nootropic), stabilizes enkephalin degradation, and influences IL-6 expression (immune modulation).",
    primaryBenefits: [
      "Anxiolytic without sedation or dependence",
      "BDNF upregulation for neuroplasticity",
      "Memory and attention enhancement",
      "Immune modulation via tuftsin pathway",
      "Nasal spray delivery for rapid CNS access",
    ],
    deliveryForms: ["Liposomal", "Micellar", "Injectable", "Nasal Spray"],
    isInjectableOnly: false,
    isStackable: true,
    researchStatus: "established",
  },
  {
    id: 17,
    name: "Semax",
    slug: "semax",
    category: "Cognitive & Neuroprotection",
    categoryNumber: 4,
    description:
      "Semax is a synthetic analog of ACTH(4–10), the heptapeptide fragment of adrenocorticotropic hormone responsible for cognitive enhancement effects without the adrenal cortisol stimulation of full ACTH. Developed alongside Selank in Russia, Semax is approved there as a nootropic and neuroprotective agent, and is used clinically for stroke recovery, cognitive impairment, and ADHD.",
    mechanismOfAction:
      "Activates melanocortin receptors (MC3/MC4) in the brain. Upregulates BDNF and NGF expression. Modulates dopamine and serotonin turnover. Enhances cerebral blood flow without affecting cortisol.",
    primaryBenefits: [
      "BDNF and NGF upregulation",
      "Stroke recovery and neuroprotection",
      "ADHD attention and focus improvement",
      "Cerebral blood flow enhancement",
      "No cortisol stimulation (unlike full ACTH)",
    ],
    deliveryForms: ["Liposomal", "Micellar", "Injectable", "Nasal Spray"],
    isInjectableOnly: false,
    isStackable: true,
    researchStatus: "established",
  },
  {
    id: 18,
    name: "PE-22-28 (Spadin)",
    slug: "pe-22-28-spadin",
    category: "Cognitive & Neuroprotection",
    categoryNumber: 4,
    description:
      "PE-22-28 (Spadin) is a heptapeptide that acts as a specific antagonist of the TREK-1 potassium channel — a two-pore domain channel highly expressed in the brain that, when overactive, is strongly associated with treatment-resistant depression. By blocking TREK-1, Spadin produces rapid antidepressant effects (within 4 days in animal models) while simultaneously enhancing hippocampal neurogenesis and BDNF signaling.",
    mechanismOfAction:
      "Selective TREK-1 (KCNK2) potassium channel antagonist. Blocking TREK-1 depolarizes serotonergic neurons, increases 5-HT release, promotes hippocampal neurogenesis, and upregulates BDNF.",
    primaryBenefits: [
      "Rapid antidepressant onset (days vs. weeks)",
      "TREK-1 channel antagonism — novel mechanism",
      "Hippocampal neurogenesis promotion",
      "BDNF upregulation",
      "Potential for treatment-resistant depression",
    ],
    deliveryForms: ["Liposomal", "Micellar", "Injectable", "Nasal Spray"],
    isInjectableOnly: false,
    isStackable: true,
    researchStatus: "novel",
  },

  // ═══ CATEGORY 5: LONGEVITY & CELLULAR (4) ═══
  {
    id: 19,
    name: "Epitalon (Epithalon)",
    slug: "epitalon",
    category: "Longevity & Cellular",
    categoryNumber: 5,
    description:
      "Epitalon is a synthetic tetrapeptide (Ala-Glu-Asp-Gly) analog of epithalamin, the natural peptide produced by the pineal gland. It is the most studied peptide for direct telomerase activation — the enzyme that rebuilds telomere caps on chromosomes. Epitalon activates telomerase in human somatic cells, extends cellular lifespan, and has demonstrated lifespan extension in multiple animal models, making it the cornerstone of peptide-based longevity protocols.",
    mechanismOfAction:
      "Activates hTERT (human telomerase reverse transcriptase) gene expression. Restores telomerase activity in aging somatic cells, extends telomere length, and modulates pineal melatonin production rhythms.",
    primaryBenefits: [
      "Direct telomerase activation (hTERT)",
      "Telomere length extension",
      "Cellular lifespan extension",
      "Pineal gland function and melatonin regulation",
      "Lifespan extension demonstrated in animal models",
    ],
    deliveryForms: ["Liposomal", "Micellar", "Injectable", "Nasal Spray"],
    isInjectableOnly: false,
    isStackable: true,
    researchStatus: "established",
  },
  {
    id: 20,
    name: "GHK-Cu (Copper Peptide)",
    slug: "ghk-cu",
    category: "Longevity & Cellular",
    categoryNumber: 5,
    description:
      "GHK-Cu is a naturally occurring tripeptide-copper complex (glycyl-L-histidyl-L-lysine) that declines dramatically with age — from 200 ng/mL at age 20 to 80 ng/mL by age 60. It functions as a genome-wide reset signal, activating over 4,000 genes toward a healthier expression pattern. GHK-Cu promotes wound healing, collagen synthesis, stem cell attraction, anti-inflammatory signaling, and DNA repair — making it one of the most broadly beneficial peptides for systemic rejuvenation.",
    mechanismOfAction:
      "Copper chelation modulates gene expression across 4,000+ genes. Activates TGF-β, VEGF, and FGF for tissue repair. Upregulates collagen I/III, elastin, and glycosaminoglycans. Activates proteasome for damaged protein clearance.",
    primaryBenefits: [
      "4,000+ gene expression reset toward youth",
      "Collagen and elastin synthesis",
      "Wound healing and skin rejuvenation",
      "Stem cell attraction to injury sites",
      "DNA repair and antioxidant enzyme upregulation",
    ],
    deliveryForms: ["Liposomal", "Micellar", "Injectable", "Nasal Spray"],
    isInjectableOnly: false,
    isStackable: true,
    researchStatus: "established",
  },
  {
    id: 21,
    name: "FOXO4-DRI",
    slug: "foxo4-dri",
    category: "Longevity & Cellular",
    categoryNumber: 5,
    description:
      'FOXO4-DRI is a D-retro-inverso peptide that selectively induces apoptosis in senescent cells — the "zombie cells" that accumulate with age, resist normal cell death, and secrete inflammatory SASP (senescence-associated secretory phenotype) factors that damage neighboring healthy tissue. FOXO4-DRI is the most targeted senolytic peptide available, disrupting the FOXO4-p53 interaction that keeps senescent cells alive.',
    mechanismOfAction:
      "Competitively disrupts the FOXO4-p53 protein interaction in senescent cells. Frees p53 to translocate to mitochondria and trigger intrinsic apoptosis. Healthy cells are unaffected because they don't rely on FOXO4-p53 binding for survival.",
    primaryBenefits: [
      "Selective senescent cell clearance (senolytic)",
      "SASP inflammatory burden reduction",
      "Tissue rejuvenation via senescent cell removal",
      "Hair regrowth in aged mice (published study)",
      "Restores tissue homeostasis",
    ],
    deliveryForms: ["Liposomal", "Micellar", "Injectable", "Nasal Spray"],
    isInjectableOnly: false,
    isStackable: true,
    researchStatus: "emerging",
  },
  {
    id: 22,
    name: "NAD+ Precursor Peptide Complex",
    slug: "nad-precursor-peptide",
    category: "Longevity & Cellular",
    categoryNumber: 5,
    description:
      "A proprietary peptide complex designed to enhance the NAD+ salvage pathway beyond what NMN and NR supplementation alone can achieve. This complex targets NAMPT (the rate-limiting enzyme in NAD+ biosynthesis) activation while simultaneously inhibiting CD38 — the primary NAD+-consuming enzyme that increases with age and inflammation. The dual mechanism preserves and produces NAD+ simultaneously.",
    mechanismOfAction:
      "Activates NAMPT enzymatic activity for NAD+ biosynthesis. Inhibits CD38 ectoenzyme NAD+ hydrolysis. Enhances SIRT1/SIRT3 sirtuin activation downstream of elevated NAD+ levels.",
    primaryBenefits: [
      "NAMPT activation for NAD+ biosynthesis",
      "CD38 inhibition to prevent NAD+ degradation",
      "Sirtuin pathway activation",
      "Complements NMN/NR supplementation",
      "Mitochondrial NAD+ pool restoration",
    ],
    deliveryForms: ["Liposomal", "Micellar", "Injectable", "Nasal Spray"],
    isInjectableOnly: false,
    isStackable: true,
    researchStatus: "novel",
  },

  // ═══ CATEGORY 6: IMMUNE & RECOVERY (4) ═══
  {
    id: 23,
    name: "Thymosin Alpha-1 (Tα1)",
    slug: "thymosin-alpha-1",
    category: "Immune & Recovery",
    categoryNumber: 6,
    description:
      "Thymosin Alpha-1 is a 28-amino-acid peptide naturally produced by the thymus gland that serves as the master regulator of adaptive immune function. It is FDA-approved in over 35 countries for hepatitis B/C and as an immune adjuvant. Tα1 restores the age-related decline in T-cell function (immunosenescence), enhances dendritic cell maturation, and modulates the balance between Th1/Th2 immune responses.",
    mechanismOfAction:
      "Activates toll-like receptors TLR2 and TLR9 on dendritic cells. Promotes T-cell maturation, CD4+/CD8+ differentiation, and NK cell activity. Modulates IDO enzyme expression for immune tolerance.",
    primaryBenefits: [
      "Thymic function restoration",
      "T-cell maturation and differentiation",
      "NK cell activity enhancement",
      "Vaccine response improvement",
      "Approved in 35+ countries for immune support",
    ],
    deliveryForms: ["Liposomal", "Micellar", "Injectable", "Nasal Spray"],
    isInjectableOnly: false,
    isStackable: true,
    researchStatus: "established",
  },
  {
    id: 24,
    name: "LL-37 (Cathelicidin)",
    slug: "ll-37-cathelicidin",
    category: "Immune & Recovery",
    categoryNumber: 6,
    description:
      "LL-37 is the only human cathelicidin antimicrobial peptide — a 37-amino-acid peptide that forms part of the innate immune system's first line of defense. Beyond its direct antimicrobial activity against bacteria, viruses, and fungi, LL-37 modulates inflammation, promotes wound healing, and serves as a chemokine to recruit immune cells to infection sites. It is vitamin D-dependent, linking sun exposure to immune competence.",
    mechanismOfAction:
      "Disrupts microbial membranes via electrostatic interaction with negatively charged lipid bilayers. Activates FPRL1 for immune cell chemotaxis. Neutralizes LPS endotoxin. Expression regulated by vitamin D receptor.",
    primaryBenefits: [
      "Broad-spectrum antimicrobial activity",
      "Biofilm disruption",
      "LPS/endotoxin neutralization",
      "Immune cell recruitment and activation",
      "Wound healing promotion",
    ],
    deliveryForms: ["Liposomal", "Micellar", "Injectable", "Nasal Spray"],
    isInjectableOnly: false,
    isStackable: true,
    researchStatus: "established",
  },
  {
    id: 25,
    name: "Thymulin (FTS-Zn)",
    slug: "thymulin",
    category: "Immune & Recovery",
    categoryNumber: 6,
    description:
      "Thymulin is a zinc-dependent nonapeptide secreted by thymic epithelial cells that is essential for T-cell differentiation and maturation within the thymus. Thymulin levels peak in adolescence and decline dramatically after age 35 as the thymus involutes — directly contributing to immunosenescence. Supplemental thymulin restores the thymic hormonal signal needed for naive T-cell production.",
    mechanismOfAction:
      "Binds to high-affinity receptors on T-cell precursors in the thymus. Requires zinc as a cofactor for biological activity. Promotes CD4+ T-helper cell differentiation and modulates IL-2 production.",
    primaryBenefits: [
      "Thymic hormone replacement",
      "Naive T-cell production restoration",
      "Age-related immune decline reversal",
      "Zinc-dependent activation (pairs with zinc supplementation)",
      "Autoimmune modulation potential",
    ],
    deliveryForms: ["Liposomal", "Micellar", "Injectable", "Nasal Spray"],
    isInjectableOnly: false,
    isStackable: true,
    researchStatus: "established",
  },
  {
    id: 26,
    name: "VIP (Vasoactive Intestinal Peptide)",
    slug: "vip-vasoactive-intestinal",
    category: "Immune & Recovery",
    categoryNumber: 6,
    description:
      "VIP is a 28-amino-acid neuropeptide with broad anti-inflammatory, neuroprotective, and immune-regulating properties. It is particularly relevant for chronic inflammatory response syndrome (CIRS), mold illness, and biotoxin-related conditions — where it restores immune regulation and reduces the inflammatory cytokine storm characteristic of these conditions.",
    mechanismOfAction:
      "Activates VPAC1 and VPAC2 receptors. Inhibits NF-κB, reduces TNF-α/IL-6/IL-12 production, shifts immune balance from Th1 to Th2/Treg, and stabilizes mast cells. Restores pulmonary artery pressure in CIRS.",
    primaryBenefits: [
      "CIRS and mold illness immune regulation",
      "Systemic inflammation reduction",
      "Mast cell stabilization",
      "Pulmonary hypertension improvement",
      "Neuroprotection and circadian rhythm support",
    ],
    deliveryForms: ["Liposomal", "Micellar", "Injectable", "Nasal Spray"],
    isInjectableOnly: false,
    isStackable: true,
    researchStatus: "established",
  },

  // ═══ CATEGORY 7: HORMONAL & PERFORMANCE (3) ═══
  {
    id: 27,
    name: "Tesamorelin",
    slug: "tesamorelin",
    category: "Hormonal & Performance",
    categoryNumber: 7,
    description:
      "Tesamorelin is a synthetic analog of growth hormone-releasing hormone (GHRH) that stimulates the pituitary gland to produce and release its own natural growth hormone in a physiological pulsatile pattern. FDA-approved for HIV-associated lipodystrophy, Tesamorelin offers a cleaner GH elevation approach than exogenous HGH — preserving the hypothalamic feedback loop and avoiding the supraphysiological spikes that cause HGH side effects.",
    mechanismOfAction:
      "Binds GHRH receptor on pituitary somatotrophs. Stimulates endogenous GH synthesis and pulsatile secretion. Maintains negative feedback via somatostatin, preventing GH excess.",
    primaryBenefits: [
      "Physiological GH elevation (not exogenous)",
      "Visceral fat reduction (FDA-approved indication)",
      "Preserved pulsatile GH release pattern",
      "IGF-1 normalization without supraphysiological spikes",
      "Cognitive function improvement signals",
    ],
    deliveryForms: ["Liposomal", "Micellar", "Injectable", "Nasal Spray"],
    isInjectableOnly: false,
    isStackable: true,
    researchStatus: "established",
  },
  {
    id: 28,
    name: "CJC-1295 / Ipamorelin",
    slug: "cjc-1295-ipamorelin",
    category: "Hormonal & Performance",
    categoryNumber: 7,
    description:
      'The CJC-1295 / Ipamorelin combination is the most widely used GH secretagogue stack in clinical practice. CJC-1295 (a GHRH analog with Drug Affinity Complex for extended half-life) provides the "accelerator" signal to produce GH, while Ipamorelin (a selective ghrelin receptor agonist) provides the "release" signal — together producing a synergistic GH pulse that mimics the natural nocturnal GH surge without the hunger, cortisol, or prolactin side effects of less selective secretagogues.',
    mechanismOfAction:
      "CJC-1295: GHRH receptor agonist with DAC albumin binding (half-life ~6–8 days). Ipamorelin: Selective GHS-R1a agonist triggering GH release without affecting cortisol, ACTH, or prolactin.",
    primaryBenefits: [
      "Synergistic GH pulse mimicking natural patterns",
      "Extended half-life via DAC technology",
      "No cortisol or prolactin elevation (Ipamorelin selectivity)",
      "Lean body mass improvement",
      "Sleep quality enhancement via nocturnal GH support",
    ],
    deliveryForms: ["Liposomal", "Micellar", "Injectable", "Nasal Spray"],
    isInjectableOnly: false,
    isStackable: true,
    researchStatus: "established",
  },
  {
    id: 29,
    name: "MK-677 (Ibutamoren)",
    slug: "mk-677-ibutamoren",
    category: "Hormonal & Performance",
    categoryNumber: 7,
    description:
      "MK-677 (Ibutamoren) is an orally active, non-peptide growth hormone secretagogue that mimics the GH-stimulating action of ghrelin by activating the GHS-R1a receptor. Unlike injectable GH secretagogues, MK-677 is taken orally with sustained 24-hour GH elevation and IGF-1 increase. It is particularly valued for its ability to improve sleep quality, increase lean mass, preserve muscle during caloric deficit, and enhance bone mineral density.",
    mechanismOfAction:
      "Non-peptide ghrelin receptor (GHS-R1a) agonist. Stimulates pituitary GH release, increases circulating IGF-1 by 40–60%, and maintains elevated GH for 24 hours from a single oral dose.",
    primaryBenefits: [
      "Oral bioavailability (no injection needed)",
      "Sustained 24-hour GH and IGF-1 elevation",
      "Sleep quality improvement (deep sleep enhancement)",
      "Lean mass preservation during caloric deficit",
      "Bone mineral density increase",
    ],
    deliveryForms: ["Liposomal", "Micellar", "Injectable", "Nasal Spray"],
    isInjectableOnly: false,
    isStackable: true,
    researchStatus: "established",
  },
];

// ── Lookup helpers ─────────────────────────────────────────────────────

export function getPeptideBySlug(slug: string): PeptideProduct | undefined {
  return PEPTIDE_CATALOG.find((p) => p.slug === slug);
}

export function getPeptidesByCategory(
  category: PeptideCategory,
): PeptideProduct[] {
  return PEPTIDE_CATALOG.filter((p) => p.category === category);
}

export function getCategoryMeta(
  category: PeptideCategory,
): PeptideCategoryMeta | undefined {
  return PEPTIDE_CATEGORIES.find((c) => c.name === category);
}
