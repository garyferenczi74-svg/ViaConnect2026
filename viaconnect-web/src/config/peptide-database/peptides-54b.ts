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
// PROMPT #53 BACKFILL — 8 peptides that were missed during the original
// #53 execution. Categories chosen to match existing CATEGORY_CONFIG labels
// so the ALL_CATEGORIES enrichment in registry.ts surfaces them automatically.
// ════════════════════════════════════════════════════════════════════════════

// ── TIER 1 — DTC (3) ──

const AOD_9604: PeptideProduct = {
  id: "aod-9604",
  name: "AOD-9604",
  category: "Metabolic / GLP-1 Class",
  categoryIcon: "TrendingDown",
  categoryColor: "#B75E18",
  type: "Modified HGH fragment (amino acids 177–191)",
  mechanism: "Beta-3 adrenergic lipolysis activator without HGH side effects",
  evidenceLevel: "strong",
  howItWorks:
    "AOD-9604 is a modified fragment (amino acids 177–191) of human growth hormone specifically engineered to stimulate lipolysis without the growth-promoting or diabetogenic effects of full-length HGH. Targets fat metabolism directly by activating beta-3 adrenergic receptors on adipocytes to release stored fatty acids while inhibiting lipogenesis. AOD-9604 has also demonstrated cartilage repair benefits, earning GRAS status from the FDA in some food supplement formulations.",
  keyHighlights: [
    "Targeted fat metabolism without any HGH side effects",
    "Lipolysis activation via beta-3 adrenergic pathway",
    "Lipogenesis inhibition — blocks new fat storage",
    "No impact on blood glucose, IGF-1, or insulin sensitivity",
    "Cartilage repair and regeneration (secondary benefit)",
  ],
  ...PLACEHOLDER_DEFAULTS,
  dosingForms: STANDARD_FORMS,
  distributionTier: "tier1_dtc",
  clinicalTierNote:
    "Tier 1 — DTC Wellness Essential. FDA GRAS status for certain formulations. Established safety profile.",
  keyStudies:
    "Phase 2 clinical trials for obesity (Metabolic Pharmaceuticals). Demonstrated significant fat reduction vs. placebo without affecting IGF-1 or glucose. FDA GRAS determination for certain oral formulations.",
  contraindications:
    "Generally well-tolerated with minimal reported side effects. No known drug interactions at standard doses. Monitor in patients with thyroid dysfunction.",
  practitionerNotes:
    "One of the safest metabolic peptides — ideal for patients who want fat-targeted support without GH axis manipulation. Can be stacked with GLP-1 pathway peptides for complementary mechanisms.",
  isStackable: true,
};

const SEMAX: PeptideProduct = {
  id: "semax",
  name: "Semax",
  category: "Neuro/Cognitive & Mood",
  categoryIcon: "Brain",
  categoryColor: "#2563EB",
  type: "Synthetic ACTH(4-10) heptapeptide analog",
  mechanism: "Melanocortin MC3R/MC4R agonist — BDNF/NGF upregulation",
  evidenceLevel: "strong",
  howItWorks:
    "Semax is a synthetic heptapeptide analog of ACTH(4–10) that retains cognitive enhancement effects without the adrenal cortisol stimulation of full ACTH. Approved in Russia as a prescription nootropic and neuroprotective agent for stroke recovery, cognitive impairment, optic nerve disease, and ADHD. Upregulates BDNF and NGF expression, modulates dopamine and serotonin metabolism, and enhances cerebral blood flow.",
  keyHighlights: [
    "BDNF and NGF upregulation for neuroplasticity and memory",
    "Stroke recovery and acute neuroprotection (approved indication in Russia)",
    "ADHD attention, focus, and executive function improvement",
    "Cerebral blood flow enhancement without systemic cardiovascular effects",
    "No cortisol stimulation — unlike full-length ACTH",
  ],
  ...PLACEHOLDER_DEFAULTS,
  dosingForms: STANDARD_FORMS,
  distributionTier: "tier1_dtc",
  clinicalTierNote:
    "Tier 1 — DTC Wellness Essential. Approved nootropic with 20+ years of clinical use history.",
  keyStudies:
    "Approved in Russia and several CIS countries since 2001 (0.1% nasal solution). Published clinical studies in stroke recovery, optic nerve atrophy, and cognitive enhancement. Excellent safety profile across 20+ years of clinical use.",
  contraindications:
    "Avoid in patients with acute psychotic episodes. Use caution with concurrent anticoagulants. Pregnancy and lactation — insufficient data.",
  practitionerNotes:
    "Nasal spray is the clinically validated delivery route. Pairs synergistically with Selank for combined nootropic + anxiolytic effects (the 'Russian stack'). Typical dosing: 200–600mcg intranasal, 1–2x daily.",
  isStackable: true,
};

const SELANK: PeptideProduct = {
  id: "selank",
  name: "Selank",
  category: "Neuro/Cognitive & Mood",
  categoryIcon: "Brain",
  categoryColor: "#2563EB",
  type: "Synthetic tuftsin analog (heptapeptide)",
  mechanism: "GABA-A allosteric modulator + BDNF upregulator",
  evidenceLevel: "strong",
  howItWorks:
    "Selank is a synthetic heptapeptide analog of the endogenous immunomodulatory peptide tuftsin. Approved in Russia as a prescription anxiolytic and nootropic, Selank combines anti-anxiety effects through GABA-A receptor modulation with cognitive enhancement via BDNF upregulation — providing calm, focused mental clarity without sedation, tolerance, or withdrawal.",
  keyHighlights: [
    "Anxiolytic effects without sedation, tolerance, or dependence",
    "BDNF upregulation for neuroplasticity and memory consolidation",
    "Immune modulation via tuftsin-derived pathway",
    "Enkephalin stabilization for endogenous stress resilience",
    "Nasal spray delivery for rapid CNS access",
  ],
  ...PLACEHOLDER_DEFAULTS,
  dosingForms: STANDARD_FORMS,
  distributionTier: "tier1_dtc",
  clinicalTierNote:
    "Tier 1 — DTC Wellness Essential. Approved anxiolytic/nootropic with established safety profile.",
  keyStudies:
    "Approved in Russia since 2009 (0.15% nasal solution). Studies demonstrate anxiolytic efficacy comparable to low-dose benzodiazepines without cognitive impairment or dependency.",
  contraindications:
    "Generally well-tolerated. Avoid concurrent use with high-dose benzodiazepines. Pregnancy and lactation — insufficient data.",
  practitionerNotes:
    "The 'calm focus' peptide — pairs with Semax for the classic Russian nootropic stack. Ideal for patients with anxiety-driven cognitive impairment who can't tolerate stimulant nootropics. Typical dosing: 250–500mcg intranasal, 1–3x daily.",
  isStackable: true,
};

// ── TIER 2 — HCP (2) ──

const KPV_TRIPEPTIDE: PeptideProduct = {
  id: "kpv-tripeptide",
  name: "KPV (Tripeptide)",
  category: "Gut & Detox Support",
  categoryIcon: "Leaf",
  categoryColor: "#84CC16",
  type: "Alpha-MSH C-terminal tripeptide (Lys-Pro-Val)",
  mechanism: "Intracellular NF-κB inhibition for localized gut inflammation",
  evidenceLevel: "moderate",
  howItWorks:
    "KPV is a C-terminal tripeptide fragment of alpha-melanocyte-stimulating hormone that retains the anti-inflammatory properties of the parent hormone while being small enough to penetrate intestinal epithelial cells directly. Enters colonic epithelial cells and inhibits NF-κB inflammatory signaling at the nuclear level, reducing pro-inflammatory cytokine production locally without systemic immunosuppression.",
  keyHighlights: [
    "Direct NF-κB inhibition inside intestinal epithelial cells",
    "Localized gut inflammation reduction without systemic immunosuppression",
    "IBD, colitis, and Crohn's symptom management support",
    "Mucosal immune modulation at the site of inflammation",
    "Synergistic with BPC-157 for comprehensive gut healing protocols",
  ],
  ...PLACEHOLDER_DEFAULTS,
  dosingForms: STANDARD_FORMS,
  distributionTier: "tier2_hcp",
  clinicalTierNote:
    "Tier 2 — HCP Distributed. Practitioner guidance recommended for inflammatory bowel conditions.",
  keyStudies:
    "Studies demonstrate KPV's ability to reduce colonic inflammation in DSS-induced colitis models by 60–70%. NF-κB inhibition mechanism characterized in human colonic epithelial cell lines (Caco-2, HT-29). Dalmasso et al., Journal of Biological Chemistry.",
  contraindications:
    "Limited human clinical trial data. Theoretical concern: long-term NF-κB suppression in the gut could affect mucosal immune surveillance. Monitor in immunocompromised patients.",
  practitionerNotes:
    "Oral/liposomal delivery preferred for GI targets (reaches colonic epithelium intact). Pairs with BPC-157 + Larazotide Acetate for the most comprehensive gut protocol. Do NOT use as a replacement for prescribed IBD medications without gastroenterologist collaboration.",
  isStackable: true,
};

const THYMOSIN_ALPHA_1: PeptideProduct = {
  id: "thymosin-alpha-1",
  name: "Thymosin Alpha-1 (Tα1)",
  category: "Immune & Regenerative",
  categoryIcon: "Shield",
  categoryColor: "#059669",
  type: "28-amino-acid thymic peptide (Zadaxin®)",
  mechanism: "TLR2/TLR9 dendritic cell activation + T-cell maturation",
  evidenceLevel: "strong",
  howItWorks:
    "Thymosin Alpha-1 is a 28-amino-acid peptide naturally produced by thymic epithelial cells that serves as the master regulator of adaptive immune function. Approved in over 35 countries (marketed as Zadaxin®) for hepatitis B, hepatitis C, and as an immune adjuvant. Restores age-related decline in T-cell function, enhances dendritic cell antigen presentation, and modulates the Th1/Th2 immune balance.",
  keyHighlights: [
    "Approved in 35+ countries for immune support (Zadaxin®)",
    "Thymic function restoration and T-cell maturation enhancement",
    "NK cell activity and cytotoxicity increase",
    "Vaccine response improvement — proven immune adjuvant",
    "Immunosenescence reversal in aging populations",
  ],
  ...PLACEHOLDER_DEFAULTS,
  dosingForms: STANDARD_FORMS,
  distributionTier: "tier2_hcp",
  clinicalTierNote:
    "Tier 2 — HCP Distributed. Approved pharmaceutical compound — practitioner dosing guidance recommended.",
  keyStudies:
    "FDA orphan drug status for hepatitis B. Approved in 35+ countries as Zadaxin® (SciClone Pharmaceuticals). Over 4,400 patients in published clinical trials.",
  contraindications:
    "Generally very well-tolerated. Contraindicated in organ transplant recipients on immunosuppression. Use caution in autoimmune conditions. Monitor in patients on immunosuppressive therapy.",
  practitionerNotes:
    "The most evidence-backed immune peptide available. Standard dosing: 1.6mg subcutaneous, 2x weekly. Pairs with Thymulin for comprehensive thymic restoration. Consider adding to pre-surgical, pre-travel, or seasonal immune protocols.",
  isStackable: true,
};

// ── TIER 3 — PREMIUM (1) ──

const DIHEXA: PeptideProduct = {
  id: "dihexa",
  name: "Dihexa (PNB-0408)",
  category: "Neuro/Cognitive & Mood",
  categoryIcon: "Brain",
  categoryColor: "#2563EB",
  type: "Angiotensin IV hexapeptide analog",
  mechanism: "HGF/c-Met agonist — extreme synaptogenic potency",
  evidenceLevel: "moderate",
  howItWorks:
    "Dihexa is a hexapeptide analog of angiotensin IV that crosses the blood-brain barrier and demonstrates extraordinary potency in promoting cognitive function — approximately 10 million times more potent than BDNF at promoting hepatocyte growth factor (HGF) signaling in the brain. Drives new synapse formation, increases dendritic spine density, enhances long-term potentiation, and has reversed cognitive deficits in animal models of Alzheimer's disease.",
  keyHighlights: [
    "Most potent synaptogenic compound characterized (10^7x more potent than BDNF at HGF/c-Met)",
    "New synapse formation and dendritic spine density increase",
    "Memory and learning enhancement via LTP facilitation",
    "Alzheimer's cognitive deficit reversal in animal models",
    "Blood-brain barrier penetrant — systemic administration reaches CNS targets",
  ],
  ...PLACEHOLDER_DEFAULTS,
  dosingForms: STANDARD_FORMS,
  distributionTier: "tier3_premium",
  clinicalTierNote:
    "Tier 3 — Premium Therapeutics / Clinical Research. No human clinical trials. Clinical oversight required.",
  keyStudies:
    "Published by Harding, Wright et al. at Washington State University (Journal of Pharmacology and Experimental Therapeutics, 2013). Demonstrated complete reversal of scopolamine-induced cognitive deficits in rats at picomolar doses.",
  contraindications:
    "No human clinical trial safety data. Theoretical concern: HGF/c-Met pathway activation could promote tumor growth in patients with existing c-Met-positive malignancies. Not for use in patients with active or history of cancer without oncologist clearance.",
  practitionerNotes:
    "The most potent cognitive peptide in the portfolio but with the thinnest human safety data. Reserve for patients with significant cognitive decline unresponsive to Tier 1/2 nootropic peptides. Start at lowest effective dose and titrate. Monitor for any signs of aberrant tissue growth.",
  isStackable: true,
};

// ── RUO / PIPELINE (2) ──

const FIVE_AMINO_1MQ: PeptideProduct = {
  id: "5-amino-1mq",
  name: "5-Amino-1MQ",
  category: "Metabolic / GLP-1 Class",
  categoryIcon: "TrendingDown",
  categoryColor: "#B75E18",
  type: "NNMT inhibitor (small molecule)",
  mechanism: "Adipocyte NNMT inhibition — fat oxidation shift",
  evidenceLevel: "moderate",
  howItWorks:
    "5-Amino-1MQ is a selective small-molecule inhibitor of nicotinamide N-methyltransferase (NNMT) — a metabolic enzyme overexpressed in white adipose tissue that drives fat storage, suppresses cellular energy expenditure, and depletes intracellular NAD+ and SAMe pools. By blocking NNMT, 5-Amino-1MQ shifts adipocyte metabolism from lipid storage to fatty acid oxidation, preserves NAD+ for mitochondrial function, and increases SAMe availability for methylation reactions.",
  keyHighlights: [
    "NNMT enzyme inhibition — shifts fat cell metabolism from storage to oxidation",
    "NAD+ conservation in adipose tissue (supports sirtuin activation)",
    "SAMe preservation for methylation capacity in fat cells",
    "Complementary mechanism to GLP-1 agonists and sympathomimetics",
    "No appetite suppression or CNS stimulation side effects",
  ],
  ...PLACEHOLDER_DEFAULTS,
  dosingForms: STANDARD_FORMS,
  distributionTier: "ruo_pipeline",
  clinicalTierNote:
    "RUO / Pipeline — Research-use-only compound. No human clinical trials. Preclinical data only.",
  keyStudies:
    "NNMT identified as obesity target (Kraus et al., Nature, 2014). 5-Amino-1MQ characterized as selective NNMT inhibitor with anti-adipogenic effects in 3T3-L1 adipocyte models. Neelakantan et al., Biochemical Pharmacology.",
  contraindications:
    "No human clinical trials published. Preclinical compound. Potential interaction with methylation-dependent pathways. NNMT also expressed in liver — monitor hepatic function in extended use.",
  practitionerNotes:
    "Research compound, not for clinical prescription. The most novel metabolic mechanism in the portfolio — entirely independent of the GLP-1/GIP axis. Theoretical stacking: 5-Amino-1MQ + AOD-9604 + Tirzepatide for triple-mechanism fat loss.",
  isStackable: true,
};

const MOTS_C: PeptideProduct = {
  id: "mots-c",
  name: "MOTS-c",
  category: "Mitochondrial/Energy",
  categoryIcon: "Battery",
  categoryColor: "#F59E0B",
  type: "Mitochondrial-derived 16-amino-acid peptide",
  mechanism: "AMPK activator — exercise mimetic mitochondrial biogenesis",
  evidenceLevel: "moderate",
  howItWorks:
    "MOTS-c is a 16-amino-acid mitochondrial-derived peptide encoded directly by mitochondrial DNA rather than the nuclear genome. Activates AMPK, promotes glucose uptake independent of insulin, stimulates fatty acid oxidation, and drives mitochondrial biogenesis — essentially mimicking the molecular effects of endurance exercise. Circulating MOTS-c levels decline with age, correlating with metabolic syndrome and insulin resistance.",
  keyHighlights: [
    "AMPK activation — master cellular energy sensor engagement",
    "Exercise mimetic molecular effects (glucose uptake, fat oxidation, mito biogenesis)",
    "Insulin-independent glucose uptake (GLUT4 translocation)",
    "Mitochondrial biogenesis stimulation via PGC-1α",
    "Age-related metabolic decline protection (MOTS-c declines with aging)",
  ],
  ...PLACEHOLDER_DEFAULTS,
  dosingForms: STANDARD_FORMS,
  distributionTier: "ruo_pipeline",
  clinicalTierNote:
    "RUO / Pipeline — Research-use-only. Human clinical trials for therapeutic use pending.",
  keyStudies:
    "Discovered by Lee et al. at USC Leonard Davis School of Gerontology (Cell Metabolism, 2015). Human studies show MOTS-c levels correlate with exercise capacity and decline with age. Kim et al., Nature Communications — MOTS-c nuclear translocation under metabolic stress.",
  contraindications:
    "No human clinical trials for therapeutic use published. Hypoglycemia theoretical risk in patients on insulin or sulfonylureas. Folate cycle interaction — consider in patients with MTHFR variants.",
  practitionerNotes:
    "Research compound. The most compelling exercise mimetic peptide with direct mitochondrial genomic origin. Relevant for sedentary patients unable to exercise, age-related metabolic decline, and insulin resistance unresponsive to lifestyle intervention. Pair with MTHFR+™ in patients with known methylation variants.",
  isStackable: true,
};

// ════════════════════════════════════════════════════════════════════════════
// EXPORT — All 21 new peptides (13 from #54b + 8 from #53 backfill)
// ════════════════════════════════════════════════════════════════════════════

export const NEW_PEPTIDES_54B: PeptideProduct[] = [
  // Tier 1 — DTC (7: 4 from #54b + 3 from backfill)
  SERMORELIN,
  PPW,
  PINEALON,
  CHONLUTEN,
  AOD_9604,
  SEMAX,
  SELANK,
  // Tier 2 — HCP (8: 6 from #54b + 2 from backfill)
  GHK_CU_INJECTABLE,
  IPAMORELIN_STANDALONE,
  CJC_1295_NO_DAC,
  PT_141,
  TESOFENSINE,
  CEREBROLYSIN,
  KPV_TRIPEPTIDE,
  THYMOSIN_ALPHA_1,
  // Tier 3 — Premium (3: 2 from #54b + 1 from backfill)
  FR_ALPHA_BINDING,
  CDK5_BLOCKING,
  DIHEXA,
  // RUO / Pipeline (3: 1 from #54b + 2 from backfill)
  MELANOTAN_2,
  FIVE_AMINO_1MQ,
  MOTS_C,
];
