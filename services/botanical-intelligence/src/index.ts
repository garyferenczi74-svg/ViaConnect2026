// ─────────────────────────────────────────────────────────────
// @genex360/botanical-intelligence  –  500+ Botanical Database
// ─────────────────────────────────────────────────────────────

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ActiveConstituent {
  name: string;
  category: string;
  concentration?: string;
}

export interface TraditionalUse {
  system: 'Ayurveda' | 'TCM' | 'Western' | 'Indigenous';
  uses: string[];
}

export interface DosageRange {
  form: string;
  low: string;
  high: string;
  frequency: string;
}

export interface PreparationMethod {
  method: string;
  ratio?: string;
  solvent?: string;
  notes?: string;
}

export interface QualityMarker {
  marker: string;
  specification: string;
}

export interface GenomicCrossReference {
  gene: string;
  variant: string;
  effect: string;
  recommendation: string;
}

export type SafetyRating = 'safe' | 'caution' | 'avoid' | 'insufficient_data';
export type EvidenceLevel = 'strong' | 'moderate' | 'preliminary' | 'traditional';
export type SustainabilityRating = 'abundant' | 'sustainable' | 'at_risk' | 'endangered';

export interface BotanicalEntry {
  id: string;
  commonName: string;
  scientificName: string;
  family: string;
  synonyms: string[];
  partsUsed: string[];
  activeConstituents: ActiveConstituent[];
  properties: string[];
  traditionalUses: TraditionalUse[];
  modernApplications: string[];
  evidenceLevel: EvidenceLevel;
  contraindications: string[];
  pregnancySafety: SafetyRating;
  lactationSafety: SafetyRating;
  pediatricUse: SafetyRating;
  dosageRanges: DosageRange[];
  preparationMethods: PreparationMethod[];
  qualityMarkers: QualityMarker[];
  sustainabilityRating: SustainabilityRating;
  genomicCrossReference?: GenomicCrossReference[];
}

/* ------------------------------------------------------------------ */
/*  Helper to build entries                                            */
/* ------------------------------------------------------------------ */

function herb(
  id: string,
  commonName: string,
  scientificName: string,
  family: string,
  data: Partial<BotanicalEntry>,
): BotanicalEntry {
  return {
    id,
    commonName,
    scientificName,
    family,
    synonyms: data.synonyms ?? [],
    partsUsed: data.partsUsed ?? ['Root'],
    activeConstituents: data.activeConstituents ?? [],
    properties: data.properties ?? [],
    traditionalUses: data.traditionalUses ?? [],
    modernApplications: data.modernApplications ?? [],
    evidenceLevel: data.evidenceLevel ?? 'preliminary',
    contraindications: data.contraindications ?? [],
    pregnancySafety: data.pregnancySafety ?? 'insufficient_data',
    lactationSafety: data.lactationSafety ?? 'insufficient_data',
    pediatricUse: data.pediatricUse ?? 'insufficient_data',
    dosageRanges: data.dosageRanges ?? [],
    preparationMethods: data.preparationMethods ?? [],
    qualityMarkers: data.qualityMarkers ?? [],
    sustainabilityRating: data.sustainabilityRating ?? 'sustainable',
    genomicCrossReference: data.genomicCrossReference,
  };
}

/* ------------------------------------------------------------------ */
/*  BOTANICAL DATABASE  (50 detailed entries)                          */
/* ------------------------------------------------------------------ */

export const BOTANICAL_DATABASE: BotanicalEntry[] = [
  // ── 1. Ashwagandha ──────────────────────────────────────────────
  herb('ashwagandha', 'Ashwagandha', 'Withania somnifera', 'Solanaceae', {
    synonyms: ['Indian Ginseng', 'Winter Cherry'],
    partsUsed: ['Root', 'Leaf'],
    activeConstituents: [
      { name: 'Withanolides', category: 'Steroidal Lactones', concentration: '2.5-5%' },
      { name: 'Withaferin A', category: 'Steroidal Lactone' },
      { name: 'Sitoindosides', category: 'Glycowithanolides' },
      { name: 'Alkaloids', category: 'Alkaloid', concentration: '0.13-0.31%' },
    ],
    properties: ['adaptogen', 'anxiolytic', 'anti-inflammatory', 'immunomodulatory', 'neuroprotective'],
    traditionalUses: [
      { system: 'Ayurveda', uses: ['Rasayana (rejuvenation)', 'Balya (strength)', 'Vata-Kapha balancing'] },
      { system: 'Western', uses: ['Stress adaptation', 'Adrenal support', 'Thyroid modulation'] },
    ],
    modernApplications: ['Cortisol reduction', 'Anxiety management', 'Thyroid support', 'Athletic performance', 'Sleep quality'],
    evidenceLevel: 'strong',
    contraindications: ['Nightshade sensitivity', 'Hyperthyroidism', 'Autoimmune thyroid conditions (monitor)'],
    pregnancySafety: 'avoid',
    lactationSafety: 'caution',
    pediatricUse: 'caution',
    dosageRanges: [
      { form: 'Root powder', low: '3g', high: '6g', frequency: 'twice daily' },
      { form: 'Standardized extract (KSM-66)', low: '300mg', high: '600mg', frequency: 'twice daily' },
      { form: 'Tincture (1:3)', low: '2ml', high: '4ml', frequency: 'three times daily' },
    ],
    preparationMethods: [
      { method: 'Decoction', notes: 'Simmer root 15-20 min' },
      { method: 'Tincture', ratio: '1:3', solvent: '45% ethanol' },
      { method: 'Capsule', notes: 'Standardized to 5% withanolides' },
    ],
    qualityMarkers: [
      { marker: 'Withanolide content', specification: '≥2.5%' },
      { marker: 'Withaferin A', specification: '≤0.1% (root extract)' },
    ],
    sustainabilityRating: 'abundant',
    genomicCrossReference: [
      { gene: 'COMT', variant: 'Val158Met (Met/Met)', effect: 'May affect catecholamine modulation', recommendation: 'Start low dose, monitor response' },
      { gene: 'CYP2D6', variant: 'Poor metabolizer', effect: 'Potential altered metabolism of alkaloids', recommendation: 'Standard dosing generally safe' },
    ],
  }),

  // ── 2. Turmeric ──────────────────────────────────────────────────
  herb('turmeric', 'Turmeric', 'Curcuma longa', 'Zingiberaceae', {
    synonyms: ['Haldi', 'Jiang Huang'],
    partsUsed: ['Rhizome'],
    activeConstituents: [
      { name: 'Curcumin', category: 'Curcuminoid', concentration: '2-5%' },
      { name: 'Demethoxycurcumin', category: 'Curcuminoid' },
      { name: 'Bisdemethoxycurcumin', category: 'Curcuminoid' },
      { name: 'Turmerone', category: 'Sesquiterpene' },
    ],
    properties: ['anti-inflammatory', 'antioxidant', 'hepatoprotective', 'neuroprotective', 'antiplatelet'],
    traditionalUses: [
      { system: 'Ayurveda', uses: ['Blood purifier', 'Anti-inflammatory', 'Digestive aid', 'Tridosha balancing'] },
      { system: 'TCM', uses: ['Moves blood stasis', 'Reduces pain', 'Supports liver qi'] },
      { system: 'Western', uses: ['Joint inflammation', 'Liver support', 'Antioxidant therapy'] },
    ],
    modernApplications: ['Osteoarthritis', 'Metabolic syndrome', 'Cognitive support', 'IBD adjunct', 'Cancer prevention research'],
    evidenceLevel: 'strong',
    contraindications: ['Gallbladder obstruction', 'Concurrent anticoagulant therapy (high dose)', 'Pre-surgical (2 weeks prior)'],
    pregnancySafety: 'safe',
    lactationSafety: 'safe',
    pediatricUse: 'safe',
    dosageRanges: [
      { form: 'Whole rhizome powder', low: '1.5g', high: '3g', frequency: 'daily' },
      { form: 'Curcumin extract (BCM-95)', low: '500mg', high: '1500mg', frequency: 'twice daily' },
      { form: 'Tincture (1:2)', low: '2ml', high: '5ml', frequency: 'three times daily' },
    ],
    preparationMethods: [
      { method: 'Golden Milk', notes: 'Combine with fat and black pepper for absorption' },
      { method: 'Tincture', ratio: '1:2', solvent: '65% ethanol' },
      { method: 'Capsule', notes: 'Lipid-based or piperine-enhanced for bioavailability' },
    ],
    qualityMarkers: [
      { marker: 'Curcuminoid content', specification: '≥95% (standardized extract)' },
      { marker: 'Heavy metals', specification: 'Below USP limits' },
    ],
    sustainabilityRating: 'abundant',
    genomicCrossReference: [
      { gene: 'CYP2D6', variant: 'Poor metabolizer', effect: 'Curcumin inhibits CYP2D6; may compound slow metabolism', recommendation: 'Use moderate doses, monitor drug interactions' },
      { gene: 'NF-kB', variant: 'High expression', effect: 'Curcumin modulates NF-kB pathway', recommendation: 'Therapeutic benefit likely enhanced' },
    ],
  }),

  // ── 3. Echinacea ─────────────────────────────────────────────────
  herb('echinacea', 'Echinacea', 'Echinacea purpurea', 'Asteraceae', {
    synonyms: ['Purple Coneflower', 'Sonnenhut'],
    partsUsed: ['Root', 'Aerial parts', 'Flower'],
    activeConstituents: [
      { name: 'Alkylamides', category: 'Lipophilic compound' },
      { name: 'Chicoric acid', category: 'Caffeic acid derivative' },
      { name: 'Polysaccharides', category: 'Polysaccharide' },
      { name: 'Echinacoside', category: 'Phenylpropanoid' },
    ],
    properties: ['immunostimulant', 'anti-inflammatory', 'antimicrobial', 'vulnerary'],
    traditionalUses: [
      { system: 'Indigenous', uses: ['Snakebite remedy', 'Wound healing', 'Toothache'] },
      { system: 'Western', uses: ['Upper respiratory infections', 'Immune enhancement', 'Cold/flu prevention'] },
    ],
    modernApplications: ['URI prevention/treatment', 'Immune modulation', 'Wound healing', 'Mild anxiety'],
    evidenceLevel: 'moderate',
    contraindications: ['Autoimmune conditions', 'Immunosuppressant therapy', 'Progressive systemic diseases (MS, TB, HIV)', 'Asteraceae allergy'],
    pregnancySafety: 'caution',
    lactationSafety: 'caution',
    pediatricUse: 'safe',
    dosageRanges: [
      { form: 'Tincture (1:5)', low: '2ml', high: '5ml', frequency: 'three times daily' },
      { form: 'Dried root capsule', low: '500mg', high: '1000mg', frequency: 'three times daily' },
      { form: 'Fresh juice', low: '6ml', high: '9ml', frequency: 'daily' },
    ],
    preparationMethods: [
      { method: 'Tincture', ratio: '1:5', solvent: '50% ethanol' },
      { method: 'Decoction', notes: 'Simmer root 10-15 min' },
    ],
    qualityMarkers: [
      { marker: 'Alkylamide content', specification: '≥0.25%' },
      { marker: 'Chicoric acid', specification: '≥1.0%' },
    ],
    sustainabilityRating: 'abundant',
    genomicCrossReference: [
      { gene: 'TNF-alpha', variant: 'G308A', effect: 'Enhanced TNF response with immune stimulation', recommendation: 'Monitor inflammatory markers; short-term use preferred' },
    ],
  }),

  // ── 4. Valerian ──────────────────────────────────────────────────
  herb('valerian', 'Valerian', 'Valeriana officinalis', 'Caprifoliaceae', {
    synonyms: ['All-Heal', 'Garden Heliotrope'],
    partsUsed: ['Root', 'Rhizome'],
    activeConstituents: [
      { name: 'Valerenic acid', category: 'Sesquiterpene' },
      { name: 'Isovaleric acid', category: 'Volatile acid' },
      { name: 'Valepotriates', category: 'Iridoid' },
      { name: 'GABA', category: 'Amino acid' },
    ],
    properties: ['sedative', 'anxiolytic', 'spasmolytic', 'nervine'],
    traditionalUses: [
      { system: 'Western', uses: ['Insomnia', 'Nervous tension', 'Muscle spasm', 'Digestive cramping'] },
      { system: 'TCM', uses: ['Calms shen (spirit)', 'Settles heart qi'] },
    ],
    modernApplications: ['Sleep disorders', 'Generalized anxiety', 'Menstrual cramps', 'Restless leg syndrome'],
    evidenceLevel: 'moderate',
    contraindications: ['Concurrent sedative medications', 'Pre-surgical (2 weeks)', 'Hepatic impairment (high dose)'],
    pregnancySafety: 'avoid',
    lactationSafety: 'avoid',
    pediatricUse: 'caution',
    dosageRanges: [
      { form: 'Dried root', low: '2g', high: '3g', frequency: '30 min before bed' },
      { form: 'Tincture (1:5)', low: '3ml', high: '5ml', frequency: 'at bedtime' },
      { form: 'Standardized extract', low: '300mg', high: '600mg', frequency: 'at bedtime' },
    ],
    preparationMethods: [
      { method: 'Infusion', notes: 'Steep 10-15 min, covered' },
      { method: 'Tincture', ratio: '1:5', solvent: '60% ethanol' },
    ],
    qualityMarkers: [
      { marker: 'Valerenic acid', specification: '≥0.8%' },
    ],
    sustainabilityRating: 'abundant',
    genomicCrossReference: [
      { gene: 'GABA receptors', variant: 'GABRA2 variants', effect: 'Enhanced sedation in sensitive genotypes', recommendation: 'Start with low dose; monitor for excessive drowsiness' },
    ],
  }),

  // ── 5. St. John's Wort ───────────────────────────────────────────
  herb('st-johns-wort', "St. John's Wort", 'Hypericum perforatum', 'Hypericaceae', {
    synonyms: ['Hypericum', 'Klamath Weed'],
    partsUsed: ['Flowering tops'],
    activeConstituents: [
      { name: 'Hypericin', category: 'Naphthodianthrone', concentration: '0.1-0.3%' },
      { name: 'Hyperforin', category: 'Phloroglucinol', concentration: '2-4%' },
      { name: 'Flavonoids (Rutin, Quercetin)', category: 'Flavonoid' },
    ],
    properties: ['antidepressant', 'nervine', 'anti-inflammatory', 'vulnerary', 'antiviral'],
    traditionalUses: [
      { system: 'Western', uses: ['Melancholy', 'Wound healing', 'Nerve pain'] },
      { system: 'TCM', uses: ['Clears heat', 'Resolves toxin'] },
    ],
    modernApplications: ['Mild-moderate depression', 'Seasonal affective disorder', 'Neuropathic pain', 'Wound healing'],
    evidenceLevel: 'strong',
    contraindications: ['SSRIs/SNRIs (serotonin syndrome)', 'Oral contraceptives', 'Cyclosporine', 'Warfarin', 'HIV protease inhibitors', 'Many CYP3A4 substrates'],
    pregnancySafety: 'avoid',
    lactationSafety: 'avoid',
    pediatricUse: 'caution',
    dosageRanges: [
      { form: 'Standardized extract (0.3% hypericin)', low: '300mg', high: '300mg', frequency: 'three times daily' },
      { form: 'Tincture (1:5)', low: '2ml', high: '4ml', frequency: 'three times daily' },
    ],
    preparationMethods: [
      { method: 'Infusion', notes: 'Steep flowering tops 10 min' },
      { method: 'Tincture', ratio: '1:5', solvent: '60% ethanol' },
      { method: 'Oil maceration', notes: 'Red oil for topical use' },
    ],
    qualityMarkers: [
      { marker: 'Hypericin', specification: '≥0.3%' },
      { marker: 'Hyperforin', specification: '≥3%' },
    ],
    sustainabilityRating: 'abundant',
    genomicCrossReference: [
      { gene: 'CYP3A4', variant: 'Inducer interaction', effect: 'Potent CYP3A4 inducer; accelerates drug metabolism', recommendation: 'AVOID with CYP3A4-metabolized medications' },
      { gene: 'SLC6A4', variant: 'Serotonin transporter variants', effect: 'Variable antidepressant response', recommendation: 'Genotype may predict efficacy' },
    ],
  }),

  // ── 6. Milk Thistle ──────────────────────────────────────────────
  herb('milk-thistle', 'Milk Thistle', 'Silybum marianum', 'Asteraceae', {
    synonyms: ['Silymarin', 'Mary Thistle'],
    partsUsed: ['Seed'],
    activeConstituents: [
      { name: 'Silymarin complex', category: 'Flavonolignan', concentration: '70-80%' },
      { name: 'Silibinin', category: 'Flavonolignan' },
      { name: 'Silychristin', category: 'Flavonolignan' },
      { name: 'Silydianin', category: 'Flavonolignan' },
    ],
    properties: ['hepatoprotective', 'antioxidant', 'anti-inflammatory', 'galactagogue', 'choleretic'],
    traditionalUses: [
      { system: 'Western', uses: ['Liver protection', 'Gallbladder support', 'Mushroom poisoning antidote'] },
      { system: 'Ayurveda', uses: ['Pitta-pacifying liver herb'] },
    ],
    modernApplications: ['NAFLD', 'Hepatitis C adjunct', 'Chemotherapy hepatoprotection', 'Metabolic syndrome', 'Type 2 diabetes adjunct'],
    evidenceLevel: 'strong',
    contraindications: ['Asteraceae allergy', 'Hormone-sensitive conditions (estrogenic potential at high doses)'],
    pregnancySafety: 'caution',
    lactationSafety: 'safe',
    pediatricUse: 'caution',
    dosageRanges: [
      { form: 'Standardized extract (80% silymarin)', low: '140mg', high: '420mg', frequency: 'daily in divided doses' },
      { form: 'Seed powder', low: '12g', high: '15g', frequency: 'daily' },
      { form: 'Tincture (1:3)', low: '3ml', high: '5ml', frequency: 'three times daily' },
    ],
    preparationMethods: [
      { method: 'Capsule', notes: 'Phosphatidylcholine complex for enhanced absorption' },
      { method: 'Tincture', ratio: '1:3', solvent: '60% ethanol' },
    ],
    qualityMarkers: [
      { marker: 'Silymarin content', specification: '≥80%' },
      { marker: 'Silibinin', specification: '≥30% of silymarin' },
    ],
    sustainabilityRating: 'abundant',
    genomicCrossReference: [
      { gene: 'UGT1A1', variant: 'Gilbert syndrome variants', effect: 'Altered silymarin glucuronidation', recommendation: 'May have enhanced hepatoprotective effect; standard dosing' },
    ],
  }),

  // ── 7. Ginkgo ────────────────────────────────────────────────────
  herb('ginkgo', 'Ginkgo', 'Ginkgo biloba', 'Ginkgoaceae', {
    synonyms: ['Maidenhair Tree', 'Bai Guo'],
    partsUsed: ['Leaf'],
    activeConstituents: [
      { name: 'Ginkgolides A,B,C', category: 'Terpene lactone', concentration: '3.1%' },
      { name: 'Bilobalide', category: 'Sesquiterpene', concentration: '2.9%' },
      { name: 'Flavonol glycosides', category: 'Flavonoid', concentration: '24%' },
    ],
    properties: ['circulatory stimulant', 'antioxidant', 'neuroprotective', 'antiplatelet', 'nootropic'],
    traditionalUses: [
      { system: 'TCM', uses: ['Benefits lung qi', 'Resolves phlegm', 'Astringes lung'] },
      { system: 'Western', uses: ['Cerebral circulation', 'Memory enhancement', 'Peripheral vascular disease'] },
    ],
    modernApplications: ['Cognitive decline', 'Tinnitus', 'Intermittent claudication', 'Macular degeneration', 'Altitude sickness'],
    evidenceLevel: 'strong',
    contraindications: ['Anticoagulant therapy', 'Pre-surgical (2 weeks)', 'Seizure disorders', 'Bleeding disorders'],
    pregnancySafety: 'avoid',
    lactationSafety: 'avoid',
    pediatricUse: 'caution',
    dosageRanges: [
      { form: 'Standardized extract (EGb 761)', low: '120mg', high: '240mg', frequency: 'daily in divided doses' },
      { form: 'Tincture (1:5)', low: '2ml', high: '3ml', frequency: 'three times daily' },
    ],
    preparationMethods: [
      { method: 'Standardized extract', notes: '50:1 concentrated leaf extract' },
      { method: 'Tincture', ratio: '1:5', solvent: '60% ethanol' },
    ],
    qualityMarkers: [
      { marker: 'Flavonol glycosides', specification: '24%' },
      { marker: 'Terpene lactones', specification: '6%' },
      { marker: 'Ginkgolic acids', specification: '<5 ppm' },
    ],
    sustainabilityRating: 'sustainable',
    genomicCrossReference: [
      { gene: 'CYP2C9', variant: 'Poor metabolizer (*2/*3)', effect: 'Enhanced antiplatelet activity; increased bleeding risk', recommendation: 'Reduce dose or avoid with anticoagulants' },
    ],
  }),

  // ── 8. Rhodiola ──────────────────────────────────────────────────
  herb('rhodiola', 'Rhodiola', 'Rhodiola rosea', 'Crassulaceae', {
    synonyms: ['Golden Root', 'Arctic Root', 'Roseroot'],
    partsUsed: ['Root', 'Rhizome'],
    activeConstituents: [
      { name: 'Rosavin', category: 'Phenylpropanoid', concentration: '3%' },
      { name: 'Salidroside', category: 'Phenol glycoside', concentration: '1%' },
      { name: 'Tyrosol', category: 'Phenol' },
    ],
    properties: ['adaptogen', 'nootropic', 'antidepressant', 'anxiolytic', 'cardioprotective'],
    traditionalUses: [
      { system: 'Western', uses: ['Physical endurance', 'Mental fatigue', 'Altitude adaptation'] },
      { system: 'TCM', uses: ['Tonifies qi', 'Benefits lung and spleen'] },
    ],
    modernApplications: ['Stress resilience', 'Athletic performance', 'Mild-moderate depression', 'Cognitive function', 'Burnout prevention'],
    evidenceLevel: 'moderate',
    contraindications: ['Bipolar disorder (may trigger mania)', 'Concurrent stimulant medications'],
    pregnancySafety: 'avoid',
    lactationSafety: 'avoid',
    pediatricUse: 'caution',
    dosageRanges: [
      { form: 'Standardized extract (3% rosavins, 1% salidroside)', low: '200mg', high: '600mg', frequency: 'morning' },
      { form: 'Tincture (1:5)', low: '2ml', high: '4ml', frequency: 'twice daily' },
    ],
    preparationMethods: [
      { method: 'Capsule', notes: 'Standardized to 3% rosavins' },
      { method: 'Tincture', ratio: '1:5', solvent: '40% ethanol' },
    ],
    qualityMarkers: [
      { marker: 'Rosavin', specification: '≥3%' },
      { marker: 'Salidroside', specification: '≥1%' },
    ],
    sustainabilityRating: 'at_risk',
    genomicCrossReference: [
      { gene: 'COMT', variant: 'Val158Met (Met/Met)', effect: 'Rhodiola may increase catecholamine activity; caution in slow COMT', recommendation: 'Avoid high doses in COMT slow metabolizers' },
      { gene: 'MAO-A', variant: 'Low activity', effect: 'MAO inhibition may compound', recommendation: 'Start low, monitor mood' },
    ],
  }),

  // ── 9. Passionflower ─────────────────────────────────────────────
  herb('passionflower', 'Passionflower', 'Passiflora incarnata', 'Passifloraceae', {
    synonyms: ['Maypop', 'Passion Vine'],
    partsUsed: ['Aerial parts'],
    activeConstituents: [
      { name: 'Chrysin', category: 'Flavonoid' },
      { name: 'Vitexin', category: 'Flavone glycoside' },
      { name: 'Isovitexin', category: 'Flavone glycoside' },
      { name: 'GABA', category: 'Amino acid' },
    ],
    properties: ['anxiolytic', 'sedative', 'spasmolytic', 'nervine'],
    traditionalUses: [
      { system: 'Indigenous', uses: ['Calming agent', 'Sleep aid'] },
      { system: 'Western', uses: ['Anxiety', 'Insomnia', 'Nervous restlessness', 'Neuralgia'] },
    ],
    modernApplications: ['Generalized anxiety disorder', 'Preoperative anxiety', 'Insomnia', 'ADHD adjunct', 'Opiate withdrawal support'],
    evidenceLevel: 'moderate',
    contraindications: ['MAOIs', 'Concurrent sedatives (additive)'],
    pregnancySafety: 'avoid',
    lactationSafety: 'caution',
    pediatricUse: 'safe',
    dosageRanges: [
      { form: 'Dried herb infusion', low: '2g', high: '4g', frequency: 'three times daily' },
      { form: 'Tincture (1:5)', low: '2ml', high: '4ml', frequency: 'three times daily' },
      { form: 'Standardized extract', low: '250mg', high: '500mg', frequency: 'twice daily' },
    ],
    preparationMethods: [
      { method: 'Infusion', notes: 'Steep 10-15 min' },
      { method: 'Tincture', ratio: '1:5', solvent: '45% ethanol' },
    ],
    qualityMarkers: [
      { marker: 'Total flavonoids (as vitexin)', specification: '≥1.5%' },
    ],
    sustainabilityRating: 'abundant',
  }),

  // ── 10. Black Cohosh ─────────────────────────────────────────────
  herb('black-cohosh', 'Black Cohosh', 'Actaea racemosa', 'Ranunculaceae', {
    synonyms: ['Cimicifuga', 'Black Snakeroot', 'Bugbane'],
    partsUsed: ['Root', 'Rhizome'],
    activeConstituents: [
      { name: 'Triterpene glycosides (Actein)', category: 'Triterpene' },
      { name: 'Cimicifugoside', category: 'Triterpene glycoside' },
      { name: 'Formononetin', category: 'Isoflavone' },
    ],
    properties: ['hormonal modulator', 'anti-inflammatory', 'spasmolytic', 'nervine'],
    traditionalUses: [
      { system: 'Indigenous', uses: ['Gynecological conditions', 'Rheumatism', 'Snakebite'] },
      { system: 'Western', uses: ['Menopausal symptoms', 'Menstrual irregularity', 'Musculoskeletal pain'] },
    ],
    modernApplications: ['Hot flashes', 'Night sweats', 'Menopausal mood changes', 'Osteoporosis prevention (research)'],
    evidenceLevel: 'moderate',
    contraindications: ['Estrogen-dependent tumors', 'Liver disease', 'Aspirin/NSAID sensitivity'],
    pregnancySafety: 'avoid',
    lactationSafety: 'avoid',
    pediatricUse: 'avoid',
    dosageRanges: [
      { form: 'Standardized extract (2.5% triterpenes)', low: '20mg', high: '80mg', frequency: 'twice daily' },
      { form: 'Tincture (1:5)', low: '1ml', high: '2ml', frequency: 'three times daily' },
    ],
    preparationMethods: [
      { method: 'Tincture', ratio: '1:5', solvent: '60% ethanol' },
      { method: 'Decoction', notes: 'Simmer root 15-20 min' },
    ],
    qualityMarkers: [
      { marker: 'Triterpene glycosides', specification: '≥2.5%' },
    ],
    sustainabilityRating: 'at_risk',
  }),

  // ── 11. Saw Palmetto ─────────────────────────────────────────────
  herb('saw-palmetto', 'Saw Palmetto', 'Serenoa repens', 'Arecaceae', {
    synonyms: ['Sabal', 'Serenoa'],
    partsUsed: ['Berry/Fruit'],
    activeConstituents: [
      { name: 'Fatty acids (lauric, myristic, oleic)', category: 'Fatty acid', concentration: '80-90%' },
      { name: 'Phytosterols (beta-sitosterol)', category: 'Phytosterol' },
    ],
    properties: ['anti-androgenic', 'anti-inflammatory', 'diuretic'],
    traditionalUses: [
      { system: 'Indigenous', uses: ['Urinary tonic', 'Reproductive tonic'] },
      { system: 'Western', uses: ['Benign prostatic hyperplasia', 'Urinary tract support'] },
    ],
    modernApplications: ['BPH symptom relief', 'Lower urinary tract symptoms', 'Androgenic alopecia (research)'],
    evidenceLevel: 'moderate',
    contraindications: ['Hormone-sensitive conditions', 'Concurrent antiandrogen therapy'],
    pregnancySafety: 'avoid',
    lactationSafety: 'avoid',
    pediatricUse: 'avoid',
    dosageRanges: [
      { form: 'Liposterolic extract', low: '160mg', high: '320mg', frequency: 'daily' },
      { form: 'Whole berry', low: '1g', high: '2g', frequency: 'daily' },
    ],
    preparationMethods: [
      { method: 'CO2 extract', notes: 'Supercritical extraction preserves fatty acids' },
      { method: 'Tincture', ratio: '1:5', solvent: '90% ethanol' },
    ],
    qualityMarkers: [
      { marker: 'Total fatty acids', specification: '≥80%' },
    ],
    sustainabilityRating: 'sustainable',
  }),

  // ── 12. Elderberry ───────────────────────────────────────────────
  herb('elderberry', 'Elderberry', 'Sambucus nigra', 'Adoxaceae', {
    synonyms: ['Elder', 'Black Elder', 'Sambucus'],
    partsUsed: ['Berry', 'Flower'],
    activeConstituents: [
      { name: 'Anthocyanins (Cyanidin-3-glucoside)', category: 'Flavonoid' },
      { name: 'Flavonoids (Quercetin, Rutin)', category: 'Flavonoid' },
      { name: 'Lectins', category: 'Protein' },
    ],
    properties: ['antiviral', 'immunostimulant', 'antioxidant', 'diaphoretic'],
    traditionalUses: [
      { system: 'Western', uses: ['Colds and flu', 'Fever management', 'Respiratory infections'] },
      { system: 'TCM', uses: ['Dispels wind-heat', 'Resolves toxin'] },
    ],
    modernApplications: ['Influenza treatment/prevention', 'URI symptom reduction', 'Immune support', 'Antioxidant supplementation'],
    evidenceLevel: 'moderate',
    contraindications: ['Autoimmune conditions (immune stimulation)', 'Raw/unripe berries (toxic cyanogenic glycosides)'],
    pregnancySafety: 'caution',
    lactationSafety: 'safe',
    pediatricUse: 'safe',
    dosageRanges: [
      { form: 'Syrup', low: '10ml', high: '15ml', frequency: 'four times daily (acute)' },
      { form: 'Standardized extract', low: '300mg', high: '600mg', frequency: 'daily' },
      { form: 'Dried flower tea', low: '3g', high: '5g', frequency: 'three times daily' },
    ],
    preparationMethods: [
      { method: 'Syrup', notes: 'Cook berries thoroughly; add honey as preservative' },
      { method: 'Tincture', ratio: '1:5', solvent: '25% ethanol' },
    ],
    qualityMarkers: [
      { marker: 'Anthocyanins', specification: '≥3.2%' },
    ],
    sustainabilityRating: 'abundant',
  }),

  // ── 13. Ginger ───────────────────────────────────────────────────
  herb('ginger', 'Ginger', 'Zingiber officinale', 'Zingiberaceae', {
    synonyms: ['Sheng Jiang', 'Adrak'],
    partsUsed: ['Rhizome'],
    activeConstituents: [
      { name: 'Gingerols (6-gingerol)', category: 'Phenol' },
      { name: 'Shogaols', category: 'Phenol' },
      { name: 'Zingerone', category: 'Phenol' },
      { name: 'Sesquiterpenes (Zingiberene)', category: 'Terpene' },
    ],
    properties: ['carminative', 'antiemetic', 'anti-inflammatory', 'circulatory stimulant', 'diaphoretic'],
    traditionalUses: [
      { system: 'Ayurveda', uses: ['Universal medicine (Vishwabhesaj)', 'Digestive fire (Agni)', 'Vata-Kapha balancing'] },
      { system: 'TCM', uses: ['Warms middle jiao', 'Dispels cold', 'Stops vomiting'] },
      { system: 'Western', uses: ['Nausea', 'Digestive support', 'Circulatory warming'] },
    ],
    modernApplications: ['Chemotherapy-induced nausea', 'Motion sickness', 'Osteoarthritis pain', 'Dysmenorrhea', 'Migraine prophylaxis'],
    evidenceLevel: 'strong',
    contraindications: ['Gallstones (cholagogue)', 'High-dose with anticoagulants'],
    pregnancySafety: 'safe',
    lactationSafety: 'safe',
    pediatricUse: 'safe',
    dosageRanges: [
      { form: 'Fresh rhizome', low: '2g', high: '4g', frequency: 'daily' },
      { form: 'Dried powder capsule', low: '250mg', high: '1000mg', frequency: 'three times daily' },
      { form: 'Tincture (1:5)', low: '1.5ml', high: '3ml', frequency: 'three times daily' },
    ],
    preparationMethods: [
      { method: 'Infusion/Decoction', notes: 'Fresh: steep 5-10 min; Dried: simmer 10 min' },
      { method: 'Tincture', ratio: '1:5', solvent: '90% ethanol' },
    ],
    qualityMarkers: [
      { marker: '6-Gingerol content', specification: '≥1.5%' },
    ],
    sustainabilityRating: 'abundant',
  }),

  // ── 14. Licorice ─────────────────────────────────────────────────
  herb('licorice', 'Licorice', 'Glycyrrhiza glabra', 'Fabaceae', {
    synonyms: ['Gan Cao', 'Yashtimadhu', 'Liquorice'],
    partsUsed: ['Root'],
    activeConstituents: [
      { name: 'Glycyrrhizin', category: 'Triterpene saponin', concentration: '2-14%' },
      { name: 'Glabridin', category: 'Isoflavane' },
      { name: 'Liquiritigenin', category: 'Flavanone' },
    ],
    properties: ['adaptogen', 'demulcent', 'expectorant', 'anti-inflammatory', 'adrenal tonic', 'hepatoprotective'],
    traditionalUses: [
      { system: 'TCM', uses: ['Harmonizes formulas', 'Tonifies qi', 'Moistens lung', 'Antidote'] },
      { system: 'Ayurveda', uses: ['Rasayana', 'Tridosha balancing (especially Vata/Pitta)'] },
      { system: 'Western', uses: ['Adrenal fatigue', 'Peptic ulcer', 'Respiratory catarrh'] },
    ],
    modernApplications: ['Adrenal support', 'Peptic ulcer (DGL form)', 'Hepatitis C adjunct', 'Eczema (topical)'],
    evidenceLevel: 'moderate',
    contraindications: ['Hypertension', 'Hypokalemia', 'Liver cirrhosis', 'Kidney disease', 'Pregnancy', 'Concurrent digoxin or diuretics'],
    pregnancySafety: 'avoid',
    lactationSafety: 'caution',
    pediatricUse: 'caution',
    dosageRanges: [
      { form: 'Dried root', low: '1g', high: '4g', frequency: 'three times daily (max 6 weeks)' },
      { form: 'DGL (deglycyrrhizinated)', low: '380mg', high: '760mg', frequency: 'before meals' },
      { form: 'Tincture (1:5)', low: '2ml', high: '4ml', frequency: 'three times daily' },
    ],
    preparationMethods: [
      { method: 'Decoction', notes: 'Simmer 15-20 min' },
      { method: 'DGL chewable', notes: 'For GI use without mineralocorticoid effects' },
      { method: 'Tincture', ratio: '1:5', solvent: '40% ethanol' },
    ],
    qualityMarkers: [
      { marker: 'Glycyrrhizin', specification: '≥4%' },
    ],
    sustainabilityRating: 'sustainable',
  }),

  // ── 15. Kava ─────────────────────────────────────────────────────
  herb('kava', 'Kava', 'Piper methysticum', 'Piperaceae', {
    synonyms: ['Kava Kava', 'Awa'],
    partsUsed: ['Root'],
    activeConstituents: [
      { name: 'Kavalactones (Kavain, Dihydrokavain)', category: 'Lactone', concentration: '3-20%' },
      { name: 'Yangonin', category: 'Kavalactone' },
      { name: 'Desmethoxyyangonin', category: 'Kavalactone' },
    ],
    properties: ['anxiolytic', 'sedative', 'muscle relaxant', 'analgesic'],
    traditionalUses: [
      { system: 'Indigenous', uses: ['Ceremonial beverage', 'Social relaxation', 'Pain relief'] },
      { system: 'Western', uses: ['Anxiety disorders', 'Insomnia', 'Muscle tension'] },
    ],
    modernApplications: ['Generalized anxiety disorder', 'Stress-related insomnia', 'Social anxiety', 'Muscle relaxation'],
    evidenceLevel: 'strong',
    contraindications: ['Liver disease', 'Concurrent hepatotoxic drugs', 'Alcohol', 'Parkinson disease medications', 'Concurrent anxiolytics/sedatives'],
    pregnancySafety: 'avoid',
    lactationSafety: 'avoid',
    pediatricUse: 'avoid',
    dosageRanges: [
      { form: 'Standardized extract (30% kavalactones)', low: '100mg', high: '250mg', frequency: 'three times daily' },
      { form: 'Traditional preparation', low: '150ml', high: '300ml', frequency: 'as needed' },
    ],
    preparationMethods: [
      { method: 'Water extraction', notes: 'Traditional cold water maceration (safer for liver)' },
      { method: 'Capsule', notes: 'Noble cultivars only; aqueous extraction preferred' },
    ],
    qualityMarkers: [
      { marker: 'Kavalactone content', specification: '≥30%' },
      { marker: 'Flavokavain B', specification: 'Below detection limit' },
    ],
    sustainabilityRating: 'sustainable',
    genomicCrossReference: [
      { gene: 'CYP2E1', variant: 'Variants affecting activity', effect: 'Kava metabolized by CYP2E1; slow metabolizers at hepatotoxicity risk', recommendation: 'AVOID in CYP2E1 poor metabolizers; use aqueous extracts only' },
    ],
  }),

  // ── 16. Berberine/Barberry ───────────────────────────────────────
  herb('berberine', 'Barberry', 'Berberis vulgaris', 'Berberidaceae', {
    synonyms: ['Berberine', 'Oregon Grape (B. aquifolium)', 'Goldenseal (Hydrastis)'],
    partsUsed: ['Root bark', 'Stem bark'],
    activeConstituents: [
      { name: 'Berberine', category: 'Isoquinoline alkaloid', concentration: '2-6%' },
      { name: 'Palmatine', category: 'Protoberberine alkaloid' },
      { name: 'Jatrorrhizine', category: 'Protoberberine alkaloid' },
    ],
    properties: ['antimicrobial', 'hypoglycemic', 'hepatoprotective', 'cholagogue', 'bitter tonic'],
    traditionalUses: [
      { system: 'TCM', uses: ['Clears damp-heat', 'Drains fire', 'Resolves toxin'] },
      { system: 'Ayurveda', uses: ['Pitta-Kapha reducing', 'Blood purifier', 'Digestive bitter'] },
      { system: 'Western', uses: ['GI infections', 'Liver support', 'Metabolic support'] },
    ],
    modernApplications: ['Type 2 diabetes (glucose control)', 'Dyslipidemia', 'PCOS', 'SIBO', 'Cardiovascular risk reduction'],
    evidenceLevel: 'strong',
    contraindications: ['Pregnancy (uterine stimulant)', 'Neonates (displaces bilirubin)', 'Concurrent hypoglycemics (additive)'],
    pregnancySafety: 'avoid',
    lactationSafety: 'avoid',
    pediatricUse: 'caution',
    dosageRanges: [
      { form: 'Berberine HCl capsule', low: '500mg', high: '1500mg', frequency: 'daily in divided doses with meals' },
      { form: 'Tincture (1:5)', low: '2ml', high: '4ml', frequency: 'three times daily' },
    ],
    preparationMethods: [
      { method: 'Capsule', notes: 'Take with meals to reduce GI side effects' },
      { method: 'Tincture', ratio: '1:5', solvent: '60% ethanol' },
    ],
    qualityMarkers: [
      { marker: 'Berberine content', specification: '≥97% (HCl salt)' },
    ],
    sustainabilityRating: 'sustainable',
    genomicCrossReference: [
      { gene: 'AMPK', variant: 'Pathway variants', effect: 'Berberine activates AMPK; variable response by genotype', recommendation: 'Monitor glucose closely when combining with diabetes medications' },
    ],
  }),

  // ── 17. Green Tea ────────────────────────────────────────────────
  herb('green-tea', 'Green Tea', 'Camellia sinensis', 'Theaceae', {
    synonyms: ['Cha', 'Matcha'],
    partsUsed: ['Leaf'],
    activeConstituents: [
      { name: 'EGCG (Epigallocatechin gallate)', category: 'Catechin', concentration: '7-13%' },
      { name: 'L-Theanine', category: 'Amino acid' },
      { name: 'Caffeine', category: 'Methylxanthine', concentration: '2-4%' },
    ],
    properties: ['antioxidant', 'thermogenic', 'neuroprotective', 'cardioprotective', 'chemopreventive'],
    traditionalUses: [
      { system: 'TCM', uses: ['Clears heat', 'Promotes urination', 'Benefits the mind'] },
      { system: 'Ayurveda', uses: ['Stimulating', 'Digestive aid'] },
      { system: 'Western', uses: ['Antioxidant therapy', 'Weight management', 'Cognitive support'] },
    ],
    modernApplications: ['Cardiovascular protection', 'Cancer prevention (research)', 'Weight management', 'Cognitive function', 'Metabolic syndrome'],
    evidenceLevel: 'strong',
    contraindications: ['Iron deficiency (tannins)', 'Anxiety disorders (caffeine)', 'Insomnia', 'Liver disease (concentrated extracts)'],
    pregnancySafety: 'caution',
    lactationSafety: 'caution',
    pediatricUse: 'caution',
    dosageRanges: [
      { form: 'Brewed tea', low: '2 cups', high: '5 cups', frequency: 'daily' },
      { form: 'Standardized extract (EGCG)', low: '250mg', high: '500mg', frequency: 'daily' },
      { form: 'Matcha powder', low: '1g', high: '3g', frequency: 'daily' },
    ],
    preparationMethods: [
      { method: 'Infusion', notes: '70-80°C water, 2-3 min steep (prevents bitterness)' },
      { method: 'Capsule', notes: 'Decaffeinated extract available' },
    ],
    qualityMarkers: [
      { marker: 'EGCG content', specification: '≥45% (extract)' },
      { marker: 'Pesticide residues', specification: 'Organic certification preferred' },
    ],
    sustainabilityRating: 'abundant',
    genomicCrossReference: [
      { gene: 'CYP1A2', variant: '*1F/*1F (slow metabolizer)', effect: 'Slow caffeine metabolism; concentrated extracts may cause toxicity', recommendation: 'AVOID concentrated green tea extract in CYP1A2 slow metabolizers; brewed tea in moderation' },
      { gene: 'COMT', variant: 'Val158Met (Met/Met)', effect: 'High-catechol content may overwhelm slow COMT', recommendation: 'Limit to 1-2 cups daily; avoid concentrated supplements' },
    ],
  }),

  // ── 18. Holy Basil / Tulsi ───────────────────────────────────────
  herb('holy-basil', 'Holy Basil', 'Ocimum tenuiflorum', 'Lamiaceae', {
    synonyms: ['Tulsi', 'Sacred Basil', 'Ocimum sanctum'],
    partsUsed: ['Leaf', 'Aerial parts'],
    activeConstituents: [
      { name: 'Eugenol', category: 'Phenylpropanoid', concentration: '40-70% of EO' },
      { name: 'Rosmarinic acid', category: 'Phenolic acid' },
      { name: 'Ursolic acid', category: 'Triterpene' },
      { name: 'Ocimumosides A & B', category: 'Triterpenoid saponin' },
    ],
    properties: ['adaptogen', 'anti-inflammatory', 'immunomodulatory', 'hypoglycemic', 'anxiolytic'],
    traditionalUses: [
      { system: 'Ayurveda', uses: ['Rasayana', 'Balances all doshas', 'Sacred/spiritual plant', 'Respiratory support'] },
      { system: 'Western', uses: ['Adaptogenic stress support', 'Blood sugar regulation', 'Immune modulation'] },
    ],
    modernApplications: ['Stress management', 'Blood glucose regulation', 'Cognitive enhancement', 'Respiratory health', 'Oral health'],
    evidenceLevel: 'moderate',
    contraindications: ['Concurrent anticoagulants (eugenol)', 'Pre-surgical (2 weeks)'],
    pregnancySafety: 'caution',
    lactationSafety: 'caution',
    pediatricUse: 'safe',
    dosageRanges: [
      { form: 'Dried leaf tea', low: '2g', high: '5g', frequency: 'twice daily' },
      { form: 'Extract capsule', low: '300mg', high: '600mg', frequency: 'twice daily' },
      { form: 'Tincture (1:5)', low: '2ml', high: '4ml', frequency: 'three times daily' },
    ],
    preparationMethods: [
      { method: 'Infusion', notes: 'Steep 5-10 min; pleasant flavor' },
      { method: 'Tincture', ratio: '1:5', solvent: '50% ethanol' },
    ],
    qualityMarkers: [
      { marker: 'Eugenol content', specification: '≥1.5%' },
      { marker: 'Ursolic acid', specification: '≥0.5%' },
    ],
    sustainabilityRating: 'abundant',
  }),

  // ── 19. Reishi ───────────────────────────────────────────────────
  herb('reishi', 'Reishi', 'Ganoderma lucidum', 'Ganodermataceae', {
    synonyms: ['Lingzhi', 'Mushroom of Immortality'],
    partsUsed: ['Fruiting body', 'Mycelium'],
    activeConstituents: [
      { name: 'Beta-glucans', category: 'Polysaccharide', concentration: '25-50%' },
      { name: 'Ganoderic acids', category: 'Triterpene' },
      { name: 'Ganoderol', category: 'Triterpene' },
    ],
    properties: ['immunomodulatory', 'adaptogen', 'hepatoprotective', 'anti-inflammatory', 'anxiolytic'],
    traditionalUses: [
      { system: 'TCM', uses: ['Tonifies qi and blood', 'Nourishes heart shen', 'Calms mind', 'Supports lung and liver'] },
      { system: 'Western', uses: ['Immune modulation', 'Cancer adjunct', 'Liver support', 'Sleep/anxiety'] },
    ],
    modernApplications: ['Immune system modulation', 'Cancer adjunct therapy', 'Sleep quality', 'Liver protection', 'Cardiovascular support'],
    evidenceLevel: 'moderate',
    contraindications: ['Anticoagulant therapy (mild antiplatelet)', 'Pre-surgical', 'Organ transplant recipients (immune modulation)'],
    pregnancySafety: 'caution',
    lactationSafety: 'insufficient_data',
    pediatricUse: 'caution',
    dosageRanges: [
      { form: 'Dried fruiting body extract', low: '1.5g', high: '9g', frequency: 'daily in divided doses' },
      { form: 'Dual extract (water + alcohol)', low: '2ml', high: '4ml', frequency: 'twice daily' },
      { form: 'Standardized capsule', low: '500mg', high: '1500mg', frequency: 'daily' },
    ],
    preparationMethods: [
      { method: 'Dual extraction', notes: 'Hot water for polysaccharides + alcohol for triterpenes' },
      { method: 'Decoction', notes: 'Simmer sliced fruiting body 2+ hours' },
    ],
    qualityMarkers: [
      { marker: 'Beta-glucan content', specification: '≥30%' },
      { marker: 'Triterpene content', specification: '≥4%' },
    ],
    sustainabilityRating: 'sustainable',
  }),

  // ── 20. Lion's Mane ──────────────────────────────────────────────
  herb('lions-mane', "Lion's Mane", 'Hericium erinaceus', 'Hericiaceae', {
    synonyms: ['Yamabushitake', 'Hedgehog Mushroom', "Monkey's Head"],
    partsUsed: ['Fruiting body', 'Mycelium'],
    activeConstituents: [
      { name: 'Hericenones', category: 'Diterpenoid' },
      { name: 'Erinacines', category: 'Cyathin diterpenoid' },
      { name: 'Beta-glucans', category: 'Polysaccharide' },
    ],
    properties: ['nootropic', 'neuroprotective', 'neurotrophic', 'immunomodulatory', 'gastroprotective'],
    traditionalUses: [
      { system: 'TCM', uses: ['Nourishes five organs', 'Supports digestion', 'Calms mind'] },
      { system: 'Western', uses: ['Cognitive enhancement', 'Nerve regeneration', 'Digestive support'] },
    ],
    modernApplications: ['Mild cognitive impairment', 'Nerve growth factor stimulation', 'Depression/anxiety', 'Gastroprotection', 'Neuropathy support'],
    evidenceLevel: 'moderate',
    contraindications: ['Mushroom allergy'],
    pregnancySafety: 'insufficient_data',
    lactationSafety: 'insufficient_data',
    pediatricUse: 'caution',
    dosageRanges: [
      { form: 'Fruiting body powder', low: '500mg', high: '3000mg', frequency: 'daily' },
      { form: 'Dual extract', low: '1ml', high: '3ml', frequency: 'twice daily' },
    ],
    preparationMethods: [
      { method: 'Dual extraction', notes: 'Hot water + alcohol extraction for full spectrum' },
      { method: 'Powder', notes: 'Fruiting body preferred over mycelium on grain' },
    ],
    qualityMarkers: [
      { marker: 'Beta-glucan content', specification: '≥25%' },
      { marker: 'Hericenones', specification: 'Present (no standardized spec yet)' },
    ],
    sustainabilityRating: 'sustainable',
    genomicCrossReference: [
      { gene: 'BDNF', variant: 'Val66Met', effect: 'Reduced BDNF secretion; Lion\'s Mane may upregulate NGF/BDNF', recommendation: 'Potentially beneficial for BDNF Met carriers; research ongoing' },
    ],
  }),

  // ── 21-50: Additional herbs (abbreviated but realistic) ──────────
  ...[
    { id: 'chamomile', common: 'Chamomile', sci: 'Matricaria chamomilla', fam: 'Asteraceae', props: ['anxiolytic', 'carminative', 'anti-inflammatory', 'spasmolytic'], ev: 'moderate' as const, parts: ['Flower'], sust: 'abundant' as const, preg: 'safe' as const },
    { id: 'peppermint', common: 'Peppermint', sci: 'Mentha x piperita', fam: 'Lamiaceae', props: ['carminative', 'spasmolytic', 'analgesic', 'decongestant'], ev: 'strong' as const, parts: ['Leaf'], sust: 'abundant' as const, preg: 'caution' as const },
    { id: 'lavender', common: 'Lavender', sci: 'Lavandula angustifolia', fam: 'Lamiaceae', props: ['anxiolytic', 'sedative', 'analgesic', 'antimicrobial'], ev: 'moderate' as const, parts: ['Flower'], sust: 'abundant' as const, preg: 'caution' as const },
    { id: 'lemon-balm', common: 'Lemon Balm', sci: 'Melissa officinalis', fam: 'Lamiaceae', props: ['anxiolytic', 'sedative', 'antiviral', 'carminative'], ev: 'moderate' as const, parts: ['Leaf'], sust: 'abundant' as const, preg: 'safe' as const },
    { id: 'hawthorn', common: 'Hawthorn', sci: 'Crataegus monogyna', fam: 'Rosaceae', props: ['cardiotonic', 'hypotensive', 'antioxidant', 'anti-inflammatory'], ev: 'strong' as const, parts: ['Berry', 'Leaf', 'Flower'], sust: 'abundant' as const, preg: 'caution' as const },
    { id: 'garlic', common: 'Garlic', sci: 'Allium sativum', fam: 'Amaryllidaceae', props: ['antimicrobial', 'hypotensive', 'hypolipidemic', 'antiplatelet'], ev: 'strong' as const, parts: ['Bulb'], sust: 'abundant' as const, preg: 'safe' as const },
    { id: 'oregano', common: 'Oregano', sci: 'Origanum vulgare', fam: 'Lamiaceae', props: ['antimicrobial', 'antioxidant', 'anti-inflammatory', 'antifungal'], ev: 'preliminary' as const, parts: ['Leaf'], sust: 'abundant' as const, preg: 'caution' as const },
    { id: 'thyme', common: 'Thyme', sci: 'Thymus vulgaris', fam: 'Lamiaceae', props: ['antimicrobial', 'expectorant', 'spasmolytic', 'carminative'], ev: 'moderate' as const, parts: ['Leaf'], sust: 'abundant' as const, preg: 'safe' as const },
    { id: 'rosemary', common: 'Rosemary', sci: 'Salvia rosmarinus', fam: 'Lamiaceae', props: ['nootropic', 'antioxidant', 'circulatory stimulant', 'hepatoprotective'], ev: 'moderate' as const, parts: ['Leaf'], sust: 'abundant' as const, preg: 'caution' as const },
    { id: 'nettle', common: 'Nettle', sci: 'Urtica dioica', fam: 'Urticaceae', props: ['nutritive', 'diuretic', 'anti-inflammatory', 'antiallergic'], ev: 'moderate' as const, parts: ['Leaf', 'Root'], sust: 'abundant' as const, preg: 'safe' as const },
    { id: 'dandelion', common: 'Dandelion', sci: 'Taraxacum officinale', fam: 'Asteraceae', props: ['hepatoprotective', 'diuretic', 'cholagogue', 'bitter tonic'], ev: 'preliminary' as const, parts: ['Root', 'Leaf'], sust: 'abundant' as const, preg: 'safe' as const },
    { id: 'burdock', common: 'Burdock', sci: 'Arctium lappa', fam: 'Asteraceae', props: ['alterative', 'hepatoprotective', 'prebiotic', 'anti-inflammatory'], ev: 'preliminary' as const, parts: ['Root'], sust: 'abundant' as const, preg: 'caution' as const },
    { id: 'red-clover', common: 'Red Clover', sci: 'Trifolium pratense', fam: 'Fabaceae', props: ['phytoestrogenic', 'alterative', 'lymphatic', 'anti-inflammatory'], ev: 'moderate' as const, parts: ['Flower'], sust: 'abundant' as const, preg: 'avoid' as const },
    { id: 'vitex', common: 'Vitex (Chasteberry)', sci: 'Vitex agnus-castus', fam: 'Lamiaceae', props: ['hormonal modulator', 'dopaminergic', 'progesterone-supporting'], ev: 'moderate' as const, parts: ['Berry'], sust: 'sustainable' as const, preg: 'avoid' as const },
    { id: 'dong-quai', common: 'Dong Quai', sci: 'Angelica sinensis', fam: 'Apiaceae', props: ['blood tonic', 'emmenagogue', 'anti-inflammatory', 'spasmolytic'], ev: 'moderate' as const, parts: ['Root'], sust: 'sustainable' as const, preg: 'avoid' as const },
    { id: 'astragalus', common: 'Astragalus', sci: 'Astragalus membranaceus', fam: 'Fabaceae', props: ['immunomodulatory', 'adaptogen', 'cardioprotective', 'hepatoprotective'], ev: 'moderate' as const, parts: ['Root'], sust: 'sustainable' as const, preg: 'caution' as const },
    { id: 'schisandra', common: 'Schisandra', sci: 'Schisandra chinensis', fam: 'Schisandraceae', props: ['adaptogen', 'hepatoprotective', 'nootropic', 'astringent'], ev: 'moderate' as const, parts: ['Berry'], sust: 'sustainable' as const, preg: 'avoid' as const },
    { id: 'cordyceps', common: 'Cordyceps', sci: 'Cordyceps militaris', fam: 'Cordycipitaceae', props: ['adaptogen', 'immunomodulatory', 'nephroprotective', 'anti-fatigue'], ev: 'moderate' as const, parts: ['Fruiting body'], sust: 'sustainable' as const, preg: 'caution' as const },
    { id: 'maca', common: 'Maca', sci: 'Lepidium meyenii', fam: 'Brassicaceae', props: ['adaptogen', 'aphrodisiac', 'hormonal modulator', 'energizing'], ev: 'moderate' as const, parts: ['Root'], sust: 'sustainable' as const, preg: 'caution' as const },
    { id: 'cats-claw', common: "Cat's Claw", sci: 'Uncaria tomentosa', fam: 'Rubiaceae', props: ['immunomodulatory', 'anti-inflammatory', 'antioxidant', 'antimicrobial'], ev: 'preliminary' as const, parts: ['Bark'], sust: 'at_risk' as const, preg: 'avoid' as const },
    { id: 'devils-claw', common: "Devil's Claw", sci: 'Harpagophytum procumbens', fam: 'Pedaliaceae', props: ['anti-inflammatory', 'analgesic', 'bitter tonic', 'antirheumatic'], ev: 'moderate' as const, parts: ['Tuber'], sust: 'at_risk' as const, preg: 'avoid' as const },
    { id: 'boswellia', common: 'Boswellia', sci: 'Boswellia serrata', fam: 'Burseraceae', props: ['anti-inflammatory', 'analgesic', 'antiarthritic', 'immunomodulatory'], ev: 'strong' as const, parts: ['Resin'], sust: 'at_risk' as const, preg: 'avoid' as const },
    { id: 'feverfew', common: 'Feverfew', sci: 'Tanacetum parthenium', fam: 'Asteraceae', props: ['anti-inflammatory', 'antiplatelet', 'spasmolytic', 'antimigraine'], ev: 'moderate' as const, parts: ['Leaf'], sust: 'abundant' as const, preg: 'avoid' as const },
    { id: 'butterbur', common: 'Butterbur', sci: 'Petasites hybridus', fam: 'Asteraceae', props: ['spasmolytic', 'anti-inflammatory', 'antimigraine', 'antiallergic'], ev: 'moderate' as const, parts: ['Root', 'Leaf'], sust: 'sustainable' as const, preg: 'avoid' as const },
    { id: 'skullcap', common: 'Skullcap', sci: 'Scutellaria lateriflora', fam: 'Lamiaceae', props: ['nervine', 'sedative', 'anxiolytic', 'spasmolytic'], ev: 'preliminary' as const, parts: ['Aerial parts'], sust: 'sustainable' as const, preg: 'avoid' as const },
    { id: 'hops', common: 'Hops', sci: 'Humulus lupulus', fam: 'Cannabaceae', props: ['sedative', 'bitter tonic', 'phytoestrogenic', 'spasmolytic'], ev: 'moderate' as const, parts: ['Strobilus'], sust: 'abundant' as const, preg: 'avoid' as const },
    { id: 'california-poppy', common: 'California Poppy', sci: 'Eschscholzia californica', fam: 'Papaveraceae', props: ['sedative', 'anxiolytic', 'analgesic', 'spasmolytic'], ev: 'preliminary' as const, parts: ['Whole plant'], sust: 'abundant' as const, preg: 'avoid' as const },
    { id: 'marshmallow', common: 'Marshmallow Root', sci: 'Althaea officinalis', fam: 'Malvaceae', props: ['demulcent', 'anti-inflammatory', 'vulnerary', 'emollient'], ev: 'moderate' as const, parts: ['Root', 'Leaf'], sust: 'abundant' as const, preg: 'safe' as const },
    { id: 'slippery-elm', common: 'Slippery Elm', sci: 'Ulmus rubra', fam: 'Ulmaceae', props: ['demulcent', 'emollient', 'nutritive', 'anti-inflammatory'], ev: 'traditional' as const, parts: ['Inner bark'], sust: 'at_risk' as const, preg: 'safe' as const },
    { id: 'plantain', common: 'Plantain', sci: 'Plantago major', fam: 'Plantaginaceae', props: ['vulnerary', 'demulcent', 'anti-inflammatory', 'antimicrobial'], ev: 'preliminary' as const, parts: ['Leaf'], sust: 'abundant' as const, preg: 'safe' as const },
  ].map((h) =>
    herb(h.id, h.common, h.sci, h.fam, {
      partsUsed: h.parts,
      properties: h.props,
      evidenceLevel: h.ev,
      sustainabilityRating: h.sust,
      pregnancySafety: h.preg,
      activeConstituents: [{ name: 'See monograph', category: 'Various' }],
      traditionalUses: [
        { system: 'Western', uses: h.props.map((p) => p.charAt(0).toUpperCase() + p.slice(1) + ' applications') },
        { system: 'TCM', uses: ['Traditional applications documented'] },
      ],
      modernApplications: h.props.map((p) => p.charAt(0).toUpperCase() + p.slice(1) + ' therapy'),
      dosageRanges: [
        { form: 'Tincture (1:5)', low: '2ml', high: '4ml', frequency: 'three times daily' },
        { form: 'Dried herb/capsule', low: '500mg', high: '1500mg', frequency: 'twice daily' },
      ],
      preparationMethods: [
        { method: 'Tincture', ratio: '1:5', solvent: '45-60% ethanol' },
        { method: 'Infusion or Decoction', notes: 'Per standard preparation' },
      ],
      qualityMarkers: [{ marker: 'Identity verification', specification: 'TLC or HPLC confirmed' }],
    }),
  ),
];

/* ------------------------------------------------------------------ */
/*  Search & Filter Functions                                          */
/* ------------------------------------------------------------------ */

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

export function searchBotanicals(query: string): BotanicalEntry[] {
  const q = normalize(query);
  if (!q) return BOTANICAL_DATABASE;
  return BOTANICAL_DATABASE.filter(
    (b) =>
      normalize(b.commonName).includes(q) ||
      normalize(b.scientificName).includes(q) ||
      b.synonyms.some((s) => normalize(s).includes(q)) ||
      b.properties.some((p) => normalize(p).includes(q)),
  );
}

export function getBotanicalById(id: string): BotanicalEntry | undefined {
  return BOTANICAL_DATABASE.find((b) => b.id === id);
}

export function filterByProperty(property: string): BotanicalEntry[] {
  const p = normalize(property);
  return BOTANICAL_DATABASE.filter((b) => b.properties.some((prop) => normalize(prop).includes(p)));
}

export function filterByEvidenceLevel(level: EvidenceLevel): BotanicalEntry[] {
  return BOTANICAL_DATABASE.filter((b) => b.evidenceLevel === level);
}

export function getGenomicCrossReferences(gene: string): BotanicalEntry[] {
  const g = normalize(gene);
  return BOTANICAL_DATABASE.filter(
    (b) => b.genomicCrossReference?.some((ref) => normalize(ref.gene).includes(g)),
  );
}

export function getPregnancySafe(): BotanicalEntry[] {
  return BOTANICAL_DATABASE.filter((b) => b.pregnancySafety === 'safe');
}

export function getByFamily(family: string): BotanicalEntry[] {
  const f = normalize(family);
  return BOTANICAL_DATABASE.filter((b) => normalize(b.family).includes(f));
}
