// FarmCeutica Peptide Database — Prompt #54b additions
// 13 clinical compounds added on top of the existing 28 FarmCeutica
// branded peptides. Distributed across 4 distribution tiers.
//
// These entries use the same PeptideProduct schema as the existing
// registry but additionally set distributionTier directly. Where the
// schema requires fields the prompt doesn't provide (performanceProfile,
// cycleProtocol, onsetTimeline, genexSynergy, targetVariants, genexPanel,
// priceRange, marketLaunch), we use neutral defaults.

import type { PeptideProduct } from "./categories-1-3";

const PLACEHOLDER_DEFAULTS = {
  performanceProfile: [] as { metric: string; value: string }[],
  cycleProtocol: "Per clinical guidance",
  onsetTimeline: "Variable per indication",
  genexSynergy: "Pending GeneX correlation studies",
  targetVariants: [] as string[],
  genexPanel: "—",
  priceRange: "Contact for pricing",
  marketLaunch: "TBD",
};

// All 4 standard delivery forms with placeholder protocols
const STANDARD_FORMS = [
  { form: "liposomal" as const, protocol: "Per practitioner direction" },
  { form: "micellar" as const, protocol: "Per practitioner direction" },
  { form: "injectable" as const, protocol: "Per clinical protocol" },
  { form: "nasal_spray" as const, protocol: "Per practitioner direction" },
];

const INJECTABLE_ONLY = [
  { form: "injectable" as const, protocol: "Clinical administration only" },
];

// ════════════════════════════════════════════════════════════════════════════
// TIER 1 — DTC WELLNESS ESSENTIALS (4 peptides)
// ════════════════════════════════════════════════════════════════════════════

const SERMORELIN: PeptideProduct = {
  id: "sermorelin",
  name: "Sermorelin",
  category: "Hormonal Balance & Endocrine",
  categoryIcon: "Heart",
  categoryColor: "#EC4899",
  type: "GHRH 1–29 Analog (29-amino-acid)",
  mechanism: "GHRH receptor agonist — natural pulsatile GH restoration",
  evidenceLevel: "strong",
  howItWorks:
    "Sermorelin is a synthetic 29-amino-acid analog of growth hormone-releasing hormone (GHRH 1–29) — the shortest fully functional fragment of native GHRH. Stimulates the pituitary gland to produce and release growth hormone in a natural, pulsatile pattern that preserves the hypothalamic feedback loop.",
  keyHighlights: [
    "Natural pulsatile GH restoration (not exogenous replacement)",
    "Deep sleep enhancement via nocturnal GH pulse amplification",
    "Lean body composition and visceral fat reduction",
    "Skin elasticity, collagen synthesis, and wound healing support",
    "Immune function restoration and thymic regeneration",
  ],
  ...PLACEHOLDER_DEFAULTS,
  dosingForms: STANDARD_FORMS,
  distributionTier: "tier1_dtc",
  clinicalTierNote:
    "Tier 1 — DTC Wellness Essential. Established safety profile with 30+ years of clinical data.",
  keyStudies:
    "FDA-approved diagnostic agent (Geref®). Extensive clinical data spanning 30+ years.",
  contraindications:
    "Contraindicated in active malignancy. Use with caution in patients with hypothyroidism. Monitor IGF-1 levels.",
  practitionerNotes:
    "The gentlest GH secretagogue — ideal first-line for GH restoration in aging adults. Pairs well with Ipamorelin for synergistic GH pulse. Administer at bedtime to align with natural nocturnal GH surge.",
  isStackable: true,
};

const PPW: PeptideProduct = {
  id: "ppw-pro-pro-trp",
  name: "PPW (Pro-Pro-Trp)",
  category: "Neuro/Cognitive & Mood",
  categoryIcon: "Brain",
  categoryColor: "#2563EB",
  type: "Tripeptide (Pro-Pro-Trp)",
  mechanism: "Serotonin/melatonin precursor + GABA-A modulator",
  evidenceLevel: "moderate",
  howItWorks:
    "PPW is a naturally occurring tripeptide derived from milk protein hydrolysate that promotes relaxation, sleep quality, and cognitive calm through multiple complementary mechanisms. The L-tryptophan residue serves as a serotonin/melatonin precursor while the proline-proline sequence enhances blood-brain barrier penetration and provides anxiolytic effects through GABA-A receptor modulation.",
  keyHighlights: [
    "Sleep quality improvement via serotonin/melatonin precursor pathway",
    "Anxiolytic effects without sedation or dependence",
    "GABA-A positive modulation for cognitive calm",
    "Enhanced blood-brain barrier penetration as intact tripeptide",
    "ACE inhibition reducing stress-hormone-driven anxiety",
  ],
  ...PLACEHOLDER_DEFAULTS,
  dosingForms: STANDARD_FORMS,
  distributionTier: "tier1_dtc",
  clinicalTierNote:
    "Tier 1 — DTC Wellness Essential. Naturally derived tripeptide with food-grade origin.",
  keyStudies:
    "Derived from α-lactalbumin milk protein research. Demonstrated sleep latency reduction and GABA-A binding in preclinical models.",
  contraindications:
    "Avoid concurrent use with SSRIs or MAOIs without practitioner supervision. Milk protein allergy consideration for source-derived preparations.",
  practitionerNotes:
    "Excellent option for patients who want sleep and calm support without melatonin dependency. Pairs well with RELAX+ Sleep Support and NeuroCalm+.",
  isStackable: true,
};

const PINEALON: PeptideProduct = {
  id: "pinealon",
  name: "Pinealon",
  category: "Neuro/Cognitive & Mood",
  categoryIcon: "Brain",
  categoryColor: "#2563EB",
  type: "Tripeptide bioregulator (Glu-Asp-Arg)",
  mechanism: "Khavinson pineal-targeting bioregulator",
  evidenceLevel: "moderate",
  howItWorks:
    "Pinealon (Glu-Asp-Arg) is a synthetic tripeptide bioregulator from the St. Petersburg Institute of Bioregulation and Gerontology. It specifically targets the pineal gland and central nervous system, promoting healthy melatonin synthesis, circadian rhythm regulation, and neuroprotective gene expression.",
  keyHighlights: [
    "Pineal gland function restoration and melatonin synthesis",
    "Circadian rhythm normalization",
    "Neuroprotective gene expression activation",
    "Cognitive function preservation in aging models",
    "Antioxidant enzyme upregulation in neural tissue",
  ],
  ...PLACEHOLDER_DEFAULTS,
  dosingForms: STANDARD_FORMS,
  distributionTier: "tier1_dtc",
  clinicalTierNote:
    "Tier 1 — DTC Wellness Essential. Tripeptide bioregulator with favorable safety profile.",
  keyStudies:
    "Khavinson Institute studies on pineal restoration and cortical neuron protection.",
  contraindications:
    "Limited Western clinical trial data. Khavinson bioregulators have extensive Russian clinical use but fewer Western RCTs.",
  practitionerNotes:
    "Pairs synergistically with Epitalon (pineal + telomerase) and Chonluten. Part of the Khavinson tripeptide bioregulator family.",
  isStackable: true,
};

const CHONLUTEN: PeptideProduct = {
  id: "chonluten",
  name: "Chonluten",
  category: "Neuro/Cognitive & Mood",
  categoryIcon: "Brain",
  categoryColor: "#2563EB",
  type: "Tripeptide bioregulator (Glu-Asp-Gly)",
  mechanism: "Khavinson respiratory + cognitive bioregulator",
  evidenceLevel: "moderate",
  howItWorks:
    "Chonluten is a synthetic tripeptide bioregulator that targets both bronchopulmonary and central nervous system tissue. Normalizes gene expression in lung epithelial cells while supporting neuronal function — uniquely positioned for combined respiratory and cognitive concerns.",
  keyHighlights: [
    "Bronchopulmonary tissue regeneration and mucociliary function",
    "Lung epithelial gene expression normalization",
    "Neuroprotective effects in cortical neurons",
    "BDNF upregulation for cognitive support",
    "Anti-inflammatory cytokine modulation in respiratory tissue",
  ],
  ...PLACEHOLDER_DEFAULTS,
  dosingForms: STANDARD_FORMS,
  distributionTier: "tier1_dtc",
  clinicalTierNote: "Tier 1 — DTC Wellness Essential. Khavinson tripeptide bioregulator.",
  keyStudies:
    "Khavinson Institute studies on bronchial epithelial restoration and neuroprotection.",
  contraindications: "Limited Western clinical trial data. Generally well-tolerated in reported use.",
  practitionerNotes:
    "Consider for post-respiratory-illness recovery (lung + brain fog). Pairs with Pinealon and Thymosin Alpha-1.",
  isStackable: true,
};

// ════════════════════════════════════════════════════════════════════════════
// TIER 2 — HCP DISTRIBUTED / CLINICAL PARTNERS (6 peptides)
// ════════════════════════════════════════════════════════════════════════════

const GHK_CU_INJECTABLE: PeptideProduct = {
  id: "ghk-cu-injectable",
  name: "GHK-Cu (Injectable)",
  category: "Longevity & Core Bioregulator",
  categoryIcon: "Dna",
  categoryColor: "#7C3AED",
  type: "Copper tripeptide complex (parenteral)",
  mechanism: "Systemic copper peptide gene expression reset (4,000+ genes)",
  evidenceLevel: "strong",
  howItWorks:
    "The injectable formulation of GHK-Cu delivers systemic copper peptide signaling for whole-body tissue remodeling. Activates the same 4,000+ gene expression reset toward youthful patterns as topical GHK-Cu but achieves systemic distribution, reaching joint tissue, internal organs, vasculature, and bone marrow.",
  keyHighlights: [
    "Systemic 4,000+ gene expression reset (not limited to skin)",
    "Deep tissue repair: joints, organs, vasculature, bone marrow",
    "Post-surgical and injury recovery acceleration",
    "Systemic collagen remodeling and fibrosis reduction",
    "Stem cell mobilization to injury sites throughout the body",
  ],
  ...PLACEHOLDER_DEFAULTS,
  dosingForms: INJECTABLE_ONLY,
  distributionTier: "tier2_hcp",
  clinicalTierNote: "Tier 2 — HCP Distributed. Injectable administration requires clinical oversight.",
  keyStudies:
    "GHK-Cu gene expression studies (Pickart et al.) demonstrate activation of 4,000+ genes.",
  contraindications:
    "Wilson's disease or copper metabolism disorders. Monitor serum copper and ceruloplasmin. Injectable administration requires clinical setting.",
  practitionerNotes:
    "Use injectable for systemic targets (joints, post-surgical, organ repair). Reserve topical GHK-Cu for skin/aesthetic applications. Do not combine with high-dose zinc supplementation (copper-zinc antagonism).",
  isInjectableOnly: true,
  isStackable: true,
};

const IPAMORELIN_STANDALONE: PeptideProduct = {
  id: "ipamorelin-standalone",
  name: "Ipamorelin",
  category: "Hormonal Balance & Endocrine",
  categoryIcon: "Heart",
  categoryColor: "#EC4899",
  type: "Selective GHS-R1a agonist pentapeptide",
  mechanism: "Selective ghrelin receptor agonist — clean GH release",
  evidenceLevel: "strong",
  howItWorks:
    "Ipamorelin is the most selective growth hormone secretagogue available — a pentapeptide that activates the ghrelin receptor (GHS-R1a) to trigger pulsatile GH release from the pituitary without the cortisol, ACTH, or prolactin elevation caused by less selective secretagogues.",
  keyHighlights: [
    "Cleanest GH secretagogue — no cortisol or prolactin elevation",
    "Pulsatile GH release mimicking natural physiology",
    "Safe for long-term use with excellent tolerability",
    "Synergistic with GHRH analogs (Sermorelin, CJC-1295)",
    "Sleep quality improvement via nocturnal GH pulse support",
  ],
  ...PLACEHOLDER_DEFAULTS,
  dosingForms: STANDARD_FORMS,
  distributionTier: "tier2_hcp",
  clinicalTierNote:
    "Tier 2 — HCP Distributed. Practitioner guidance recommended for dosing and monitoring.",
  keyStudies:
    "Demonstrated GH-specific release without cortisol, ACTH, or prolactin elevation (Raun et al., 1998).",
  contraindications:
    "Active malignancy. Uncontrolled diabetes. Monitor IGF-1 levels during use.",
  practitionerNotes:
    "The 'release' half of the stack — combine with Sermorelin or CJC-1295 No DAC for the 'accelerator' signal. Bedtime administration preferred.",
  isStackable: true,
};

const CJC_1295_NO_DAC: PeptideProduct = {
  id: "cjc-1295-no-dac",
  name: "CJC-1295 (No DAC)",
  category: "Hormonal Balance & Endocrine",
  categoryIcon: "Heart",
  categoryColor: "#EC4899",
  type: "GHRH analog (Modified GRF 1–29)",
  mechanism: "Stable GHRH analog — physiological pulsatile GH stimulation",
  evidenceLevel: "strong",
  howItWorks:
    "CJC-1295 without Drug Affinity Complex, also known as Modified GRF 1–29, is a synthetic GHRH analog with enhanced stability over native GHRH. Unlike the DAC version which provides multi-day sustained release, No DAC gives acute pulsatile GH stimulation that more closely mimics natural physiology.",
  keyHighlights: [
    "Enhanced GHRH stability (30 min vs. 7 min native)",
    "Physiological pulsatile GH stimulation (more natural than DAC version)",
    "Synergistic with Ipamorelin for maximum GH pulse amplitude",
    "Lean body composition and fat metabolism support",
    "Deep sleep enhancement when dosed at bedtime",
  ],
  ...PLACEHOLDER_DEFAULTS,
  dosingForms: STANDARD_FORMS,
  distributionTier: "tier2_hcp",
  clinicalTierNote: "Tier 2 — HCP Distributed. Practitioner-guided dosing protocol required.",
  keyStudies:
    "Modified GRF 1–29 extensively characterized in clinical research. Demonstrated 2 to 10x increase in GH pulse amplitude when combined with GHSR agonists.",
  contraindications: "Same as Sermorelin — active malignancy, uncontrolled diabetes. Monitor IGF-1.",
  practitionerNotes:
    "The 'accelerator' half for pulsatile protocols. Pair with Ipamorelin at bedtime. No DAC preferred over DAC version for physiological pulsing.",
  isStackable: true,
};

const PT_141: PeptideProduct = {
  id: "pt-141-bremelanotide",
  name: "PT-141 (Bremelanotide)",
  category: "Hormonal Balance & Endocrine",
  categoryIcon: "Heart",
  categoryColor: "#EC4899",
  type: "Melanocortin receptor agonist",
  mechanism: "Central MC3R/MC4R agonism — sexual desire activation",
  evidenceLevel: "strong",
  howItWorks:
    "PT-141 (Bremelanotide, FDA-approved as Vyleesi®) is a synthetic melanocortin receptor agonist and the only FDA-approved peptide for hypoactive sexual desire disorder in premenopausal women. Acts directly on the central nervous system — activating MC3R and MC4R melanocortin receptors in the hypothalamus to stimulate sexual desire at its neurological origin.",
  keyHighlights: [
    "FDA-approved for female hypoactive sexual desire disorder (Vyleesi®)",
    "Central nervous system mechanism — addresses desire, not just blood flow",
    "Effective in both men and women",
    "Works independently of hormonal status",
    "Onset within 45 minutes, duration 12 to 24 hours",
  ],
  ...PLACEHOLDER_DEFAULTS,
  dosingForms: STANDARD_FORMS,
  distributionTier: "tier2_hcp",
  clinicalTierNote: "Tier 2 — HCP Distributed. FDA-approved compound requiring prescriber oversight.",
  keyStudies:
    "FDA-approved 2019 (Vyleesi®). Phase 3 RECONNECT trials demonstrated improvement in desire and reduction in distress.",
  contraindications:
    "Uncontrolled hypertension. Nausea is common (40% in trials). Not for use with PDE5 inhibitors without medical supervision. Cardiovascular disease — use with caution.",
  practitionerNotes:
    "FDA-approved indication is premenopausal HSDD. Off-label use in men and postmenopausal women is common in clinical practice. PRN dosing, not daily.",
  isStackable: true,
};

const TESOFENSINE: PeptideProduct = {
  id: "tesofensine",
  name: "Tesofensine",
  category: "Metabolic / GLP-1 Class",
  categoryIcon: "TrendingDown",
  categoryColor: "#B75E18",
  type: "Triple monoamine reuptake inhibitor",
  mechanism: "5-HT/NE/DA reuptake inhibition — central appetite + thermogenesis",
  evidenceLevel: "moderate",
  howItWorks:
    "Tesofensine is a triple monoamine reuptake inhibitor (serotonin, norepinephrine, dopamine) originally developed for Alzheimer's and Parkinson's disease that demonstrated remarkable weight loss effects in Phase 2 trials — with subjects losing 12.8% body weight at the 1.0mg dose over 24 weeks.",
  keyHighlights: [
    "Triple monoamine reuptake inhibition (5-HT, NE, DA)",
    "12.8% body weight loss in Phase 2 trials (1.0mg dose)",
    "Central appetite suppression via brain reward circuit normalization",
    "Thermogenesis increase via norepinephrine pathway",
    "Complementary mechanism to GLP-1 agonists",
  ],
  ...PLACEHOLDER_DEFAULTS,
  dosingForms: STANDARD_FORMS,
  distributionTier: "tier2_hcp",
  clinicalTierNote: "Tier 2 — HCP Distributed. Cardiovascular monitoring required.",
  keyStudies:
    "Phase 2 TIPO trials demonstrated 12.8% weight loss (1.0mg) and 11.3% (0.5mg) over 24 weeks.",
  contraindications:
    "Uncontrolled hypertension, cardiovascular disease, history of stroke. Contraindicated with MAOIs. Use caution with SSRIs/SNRIs.",
  practitionerNotes:
    "Present in FarmCeutica's Inferno + GLP-1 Activator Complex as a botanical analog mimic. The pharmaceutical compound requires HCP oversight.",
  isStackable: true,
};

const CEREBROLYSIN: PeptideProduct = {
  id: "cerebrolysin",
  name: "Cerebrolysin",
  category: "Neuro/Cognitive & Mood",
  categoryIcon: "Brain",
  categoryColor: "#2563EB",
  type: "Porcine brain-derived neuropeptide complex",
  mechanism: "BDNF/NGF/CNTF mimetic — neurotrophic signaling activation",
  evidenceLevel: "strong",
  howItWorks:
    "Cerebrolysin is a porcine brain-derived peptide preparation containing a standardized mixture of low-molecular-weight neuropeptides and free amino acids that mimics endogenous neurotrophic factors. Approved in over 40 countries for stroke recovery, traumatic brain injury, and dementia. The most clinically validated neuropeptide complex in existence with over 200 clinical studies.",
  keyHighlights: [
    "Approved in 40+ countries for stroke and TBI recovery",
    "Over 200 clinical studies supporting efficacy",
    "Mimics BDNF, NGF, and CNTF neurotrophic signaling",
    "Alzheimer's cognitive stabilization and improvement",
    "Synaptic plasticity and dendritic spine formation",
  ],
  ...PLACEHOLDER_DEFAULTS,
  dosingForms: INJECTABLE_ONLY,
  distributionTier: "tier2_hcp",
  clinicalTierNote: "Tier 2 — HCP Distributed. Injectable administration in clinical setting only.",
  keyStudies:
    "Registered in 40+ countries. Cochrane Review of stroke recovery trials. Over 200 published clinical studies.",
  contraindications:
    "Epilepsy (may lower seizure threshold). Severe renal impairment. Porcine protein allergy. Injectable only — requires clinical administration.",
  practitionerNotes:
    "The gold standard for neuropeptide therapy. IV or IM administration. Typical protocol: 10–30ml IV, 5 days/week for 4 weeks. Consider for post-stroke, TBI, early dementia.",
  isInjectableOnly: true,
  isStackable: true,
};

// ════════════════════════════════════════════════════════════════════════════
// TIER 3 — PREMIUM THERAPEUTICS / CLINICAL RESEARCH (2 peptides)
// ════════════════════════════════════════════════════════════════════════════

const FR_ALPHA_BINDING: PeptideProduct = {
  id: "fr-alpha-binding-peptides",
  name: "FR-Alpha Binding Peptides",
  category: "Neuro/Cognitive & Mood",
  categoryIcon: "Brain",
  categoryColor: "#2563EB",
  type: "Folate receptor alpha targeting peptide class",
  mechanism: "FRα receptor-mediated CNS folate delivery",
  evidenceLevel: "emerging",
  howItWorks:
    "Folate receptor alpha (FRα) binding peptides are a class of investigational compounds designed to selectively target the folate receptor alpha — a protein overexpressed in certain brain pathologies that mediates folate transport across the blood-brain barrier. Bypasses the limitations of systemic drug delivery to deliver therapeutic payloads directly into the CNS.",
  keyHighlights: [
    "Targeted CNS folate delivery via FRα receptor",
    "Bypasses RFC1 transport limitations (relevant to RFC1 gene variants)",
    "Cerebral folate deficiency correction",
    "Potential carrier for CNS-targeted therapeutic payloads",
    "Relevant for autism spectrum (FRα autoantibody subtype) research",
  ],
  ...PLACEHOLDER_DEFAULTS,
  dosingForms: [
    { form: "injectable" as const, protocol: "Clinical research protocol" },
    { form: "nasal_spray" as const, protocol: "Clinical research protocol" },
  ],
  distributionTier: "tier3_premium",
  clinicalTierNote: "Tier 3 — Premium Therapeutics / Clinical Research. Investigational compound class.",
  keyStudies:
    "FRα biology extensively published (Grapp et al., Nature Medicine). FRα-targeting peptide conjugates in preclinical development.",
  contraindications:
    "Investigational compound class. Not for use outside clinical research settings. Folate receptor-positive malignancy screening recommended.",
  practitionerNotes:
    "Most relevant for patients with confirmed FRα autoantibodies, RFC1 variants (see RFC1 Support+™), or cerebral folate transport deficiency.",
  isStackable: true,
};

const CDK5_BLOCKING: PeptideProduct = {
  id: "cdk5-blocking-peptides",
  name: "CDK5-Blocking Peptides",
  category: "Neuro/Cognitive & Mood",
  categoryIcon: "Brain",
  categoryColor: "#2563EB",
  type: "CDK5/p25 interaction inhibitor peptide class",
  mechanism: "Selective CDK5 hyperactivation blockade — tau phosphorylation reduction",
  evidenceLevel: "emerging",
  howItWorks:
    "CDK5-blocking peptides represent an emerging class of neuroprotective compounds targeting hyperactivation of CDK5 — a kinase that, when dysregulated by p25, drives tau hyperphosphorylation, neurofibrillary tangle formation, amyloid-beta toxicity, and neuronal death. These blocking peptides competitively inhibit the p25-CDK5 interaction while preserving normal p35-CDK5 signaling essential for healthy brain function.",
  keyHighlights: [
    "Selective blockade of pathological CDK5 hyperactivation",
    "Tau hyperphosphorylation reduction (Alzheimer's target)",
    "Preservation of normal CDK5 function (unlike pan-CDK inhibitors)",
    "Neuroprotective against amyloid-beta toxicity",
    "Potential for ALS, Parkinson's, and stroke neuroprotection",
  ],
  ...PLACEHOLDER_DEFAULTS,
  dosingForms: [
    { form: "injectable" as const, protocol: "Clinical research protocol" },
    { form: "nasal_spray" as const, protocol: "Clinical research protocol" },
  ],
  distributionTier: "tier3_premium",
  clinicalTierNote:
    "Tier 3 — Premium Therapeutics / Clinical Research. Investigational neuroprotective compounds.",
  keyStudies:
    "p5 peptide (CDK5 inhibitory peptide) demonstrated neuroprotection in transgenic Alzheimer's mouse models. TFP5 peptide reduced tau pathology in 5XFAD mice.",
  contraindications:
    "Investigational compound class. CDK5 has essential roles in neurodevelopment — use only in adult neurodegeneration contexts.",
  practitionerNotes:
    "The most targeted tau-pathology intervention in the peptide space. Consider for early-stage Alzheimer's or high-risk patients with confirmed tau biomarkers.",
  isStackable: true,
};

// ════════════════════════════════════════════════════════════════════════════
// ADDITIONAL — RUO / PIPELINE COMPOUNDS (1 peptide)
// ════════════════════════════════════════════════════════════════════════════

const MELANOTAN_2: PeptideProduct = {
  id: "melanotan-2",
  name: "Melanotan-2",
  category: "Hormonal Balance & Endocrine",
  categoryIcon: "Heart",
  categoryColor: "#EC4899",
  type: "Non-selective melanocortin receptor agonist",
  mechanism: "MC1R/MC3R/MC4R/MC5R agonism — pigmentation + central effects",
  evidenceLevel: "moderate",
  howItWorks:
    "Melanotan-2 is a synthetic analog of alpha-melanocyte-stimulating hormone that activates MC1R, MC3R, MC4R, and MC5R melanocortin receptors — producing skin tanning, sexual arousal, appetite suppression, and fat oxidation. The parent compound from which PT-141/Bremelanotide was derived. Remains a research compound without regulatory approval.",
  keyHighlights: [
    "Melanogenesis activation (UV-independent tanning)",
    "Sexual desire and arousal enhancement (MC3R/MC4R)",
    "Appetite suppression and fat oxidation",
    "Photoprotection via increased melanin density",
    "Parent compound for FDA-approved PT-141",
  ],
  ...PLACEHOLDER_DEFAULTS,
  dosingForms: STANDARD_FORMS,
  distributionTier: "ruo_pipeline",
  clinicalTierNote:
    "RUO / Pipeline — Research-use-only. Not approved for clinical use. Direct patients to FDA-approved PT-141 for sexual health indications.",
  keyStudies:
    "Extensive preclinical and observational human data. Parent compound for FDA-approved PT-141.",
  contraindications:
    "History of melanoma or dysplastic nevi (MC1R activation may stimulate melanocyte proliferation). Cardiovascular conditions. Nausea common. Priapism risk in males at higher doses. NOT FDA-approved.",
  practitionerNotes:
    "Not for clinical prescription. Include in catalog for educational completeness. If patient is interested in sexual health benefits, direct to PT-141 (Tier 2, FDA-approved) instead.",
  isStackable: true,
};

// ════════════════════════════════════════════════════════════════════════════
// EXPORT — All 13 new peptides
// ════════════════════════════════════════════════════════════════════════════

export const NEW_PEPTIDES_54B: PeptideProduct[] = [
  // Tier 1 — DTC (4)
  SERMORELIN,
  PPW,
  PINEALON,
  CHONLUTEN,
  // Tier 2 — HCP (6)
  GHK_CU_INJECTABLE,
  IPAMORELIN_STANDALONE,
  CJC_1295_NO_DAC,
  PT_141,
  TESOFENSINE,
  CEREBROLYSIN,
  // Tier 3 — Premium (2)
  FR_ALPHA_BINDING,
  CDK5_BLOCKING,
  // RUO / Pipeline (1)
  MELANOTAN_2,
];
