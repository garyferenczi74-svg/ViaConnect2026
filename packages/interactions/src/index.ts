// ─────────────────────────────────────────────────────────────
// @genex360/interactions  –  Drug-Supplement Interaction Engine
// ─────────────────────────────────────────────────────────────

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type Severity = 'GREEN' | 'YELLOW' | 'RED' | 'BLUE';

export interface InteractionResult {
  id: string;
  substance1: string;
  substance2: string;
  severity: Severity;
  severityLabel: string;
  mechanism: string;
  onsetTiming: string;
  mitigationStrategies: string[];
  evidenceCitations: string[];
  source: string;
}

export interface SubstanceEntry {
  id: string;
  name: string;
  type: 'drug' | 'supplement' | 'herb';
  category?: string;
}

export interface CheckContext {
  trigger:
    | 'medication_add'
    | 'protocol_creation'
    | 'ehr_import'
    | 'formulation_building';
  patientId?: string;
  geneticVariants?: string[];
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                    */
/* ------------------------------------------------------------------ */

interface RawInteraction {
  id: string;
  names1: string[];
  names2: string[];
  severity: Severity;
  mechanism: string;
  onsetTiming: string;
  mitigationStrategies: string[];
  evidenceCitations: string[];
  source: string;
}

const SEVERITY_ORDER: Record<Severity, number> = {
  RED: 0,
  YELLOW: 1,
  GREEN: 2,
  BLUE: 3,
};

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function namesMatch(
  substance: string,
  aliases: string[],
): boolean {
  const n = normalize(substance);
  return aliases.some((a) => normalize(a) === n);
}

/* ------------------------------------------------------------------ */
/*  Mock Interaction Database (20+ entries)                            */
/* ------------------------------------------------------------------ */

const INTERACTION_DATABASE: RawInteraction[] = [
  // 1 – Warfarin + Fish Oil
  {
    id: 'INT-001',
    names1: ['Warfarin', 'Coumadin'],
    names2: ['Fish Oil', 'Omega-3', 'EPA/DHA'],
    severity: 'YELLOW',
    mechanism:
      'Omega-3 fatty acids inhibit thromboxane A2-mediated platelet aggregation and may potentiate the anticoagulant effect of warfarin, increasing INR and bleeding risk.',
    onsetTiming: '1-2 weeks of concurrent use',
    mitigationStrategies: [
      'Monitor INR weekly for the first month after adding fish oil',
      'Limit fish oil dose to ≤2 g/day EPA+DHA',
      'Educate patient on signs of bleeding (bruising, dark stools)',
    ],
    evidenceCitations: ['PMID: 32456789', 'PMID: 29871234'],
    source: 'NMCD',
  },

  // 2 – Warfarin + Vitamin K
  {
    id: 'INT-002',
    names1: ['Warfarin', 'Coumadin'],
    names2: ['Vitamin K', 'Phytonadione', 'Vitamin K2', 'MK-7'],
    severity: 'RED',
    mechanism:
      'Vitamin K is required for hepatic synthesis of clotting factors II, VII, IX, and X. Supplemental vitamin K directly antagonizes warfarin's mechanism of action, potentially rendering anticoagulation therapy ineffective and increasing thromboembolic risk.',
    onsetTiming: '24-48 hours',
    mitigationStrategies: [
      'Avoid concurrent supplementation unless under strict medical supervision',
      'If vitamin K is necessary, use a consistent low dose (≤50 mcg/day) and monitor INR closely',
      'Consider alternative anticoagulants (DOACs) that are not vitamin K–dependent',
    ],
    evidenceCitations: ['PMID: 31245678', 'PMID: 28934561'],
    source: 'PharmGKB',
  },

  // 3 – SSRIs + St. John's Wort
  {
    id: 'INT-003',
    names1: ['SSRI', 'Sertraline', 'Fluoxetine', 'Citalopram', 'Escitalopram', 'Paroxetine'],
    names2: ["St. John's Wort", 'Hypericum perforatum', 'Hypericum'],
    severity: 'RED',
    mechanism:
      "St. John's Wort induces CYP3A4 and CYP1A2 while also inhibiting serotonin reuptake. Combining it with SSRIs produces additive serotonergic activity, risking serotonin syndrome (hyperthermia, agitation, clonus, autonomic instability).",
    onsetTiming: 'Immediate to 1 week',
    mitigationStrategies: [
      'Contraindicated — do not combine',
      "Allow a 2-week washout period after discontinuing St. John's Wort before starting an SSRI",
      'Educate patient on symptoms of serotonin syndrome',
    ],
    evidenceCitations: ['PMID: 30567812', 'PMID: 27654321'],
    source: 'NMCD',
  },

  // 4 – Metformin + B12
  {
    id: 'INT-004',
    names1: ['Metformin', 'Glucophage'],
    names2: ['Vitamin B12', 'Methylcobalamin', 'Cyanocobalamin', 'B12'],
    severity: 'YELLOW',
    mechanism:
      'Metformin alters calcium-dependent membrane transport in the ileum, reducing intrinsic factor–mediated uptake of vitamin B12. Long-term use (>6 months) can lower serum B12 by 10-30%, potentially causing megaloblastic anemia and peripheral neuropathy.',
    onsetTiming: 'Cumulative over 6-12 months',
    mitigationStrategies: [
      'Monitor serum B12 and methylmalonic acid annually',
      'Consider prophylactic B12 supplementation (1000 mcg/day sublingual)',
      'Screen for neuropathy symptoms at each visit',
    ],
    evidenceCitations: ['PMID: 33456123', 'PMID: 30987654'],
    source: 'ClinVar',
  },

  // 5 – Statins + CoQ10
  {
    id: 'INT-005',
    names1: ['Statin', 'Atorvastatin', 'Rosuvastatin', 'Simvastatin', 'Pravastatin', 'Lovastatin'],
    names2: ['CoQ10', 'Coenzyme Q10', 'Ubiquinol', 'Ubiquinone'],
    severity: 'BLUE',
    mechanism:
      'Statins inhibit HMG-CoA reductase, which is upstream of the mevalonate pathway used to synthesize CoQ10. Statin therapy depletes endogenous CoQ10 levels by 20-40%. Supplementation repletes mitochondrial CoQ10, may reduce statin-associated myalgia, and supports cardiac bioenergetics.',
    onsetTiming: '2-4 weeks for symptom improvement',
    mitigationStrategies: [
      'Recommended: CoQ10 100-300 mg/day (ubiquinol form preferred)',
      'Take CoQ10 with a fat-containing meal for optimal absorption',
      'Monitor creatine kinase if myalgia persists',
    ],
    evidenceCitations: ['PMID: 31234567', 'PMID: 29876543', 'PMID: 33215678'],
    source: 'Internal',
  },

  // 6 – Statins + Red Yeast Rice
  {
    id: 'INT-006',
    names1: ['Statin', 'Atorvastatin', 'Rosuvastatin', 'Simvastatin', 'Pravastatin', 'Lovastatin'],
    names2: ['Red Yeast Rice', 'Monascus purpureus', 'Monacolin K'],
    severity: 'RED',
    mechanism:
      'Red yeast rice contains monacolin K, which is chemically identical to lovastatin. Combining with prescribed statins results in additive HMG-CoA reductase inhibition, substantially increasing the risk of rhabdomyolysis, hepatotoxicity, and severe myopathy.',
    onsetTiming: '1-4 weeks',
    mitigationStrategies: [
      'Contraindicated — do not combine',
      'Discontinue red yeast rice prior to initiating statin therapy',
      'If patient prefers red yeast rice, monitor CK and liver enzymes as with statin therapy',
    ],
    evidenceCitations: ['PMID: 30876543', 'PMID: 28765432'],
    source: 'NMCD',
  },

  // 7 – Blood Pressure Meds + Magnesium
  {
    id: 'INT-007',
    names1: ['Amlodipine', 'Lisinopril', 'Losartan', 'Metoprolol', 'Hydrochlorothiazide', 'ACE Inhibitor', 'ARB', 'Calcium Channel Blocker'],
    names2: ['Magnesium', 'Magnesium Glycinate', 'Magnesium Citrate', 'Magnesium Oxide'],
    severity: 'YELLOW',
    mechanism:
      'Magnesium acts as a natural calcium channel blocker and vasodilator. When combined with antihypertensive agents, additive blood pressure lowering may cause symptomatic hypotension, dizziness, or syncope, particularly on standing.',
    onsetTiming: '1-3 days',
    mitigationStrategies: [
      'Start magnesium at a low dose (200 mg/day) and titrate slowly',
      'Monitor blood pressure regularly during the first 2 weeks',
      'Advise patient to rise slowly from sitting/lying positions',
    ],
    evidenceCitations: ['PMID: 31987654', 'PMID: 29654321'],
    source: 'NMCD',
  },

  // 8 – Thyroid Meds + Calcium
  {
    id: 'INT-008',
    names1: ['Levothyroxine', 'Synthroid', 'Armour Thyroid', 'Thyroid Medication'],
    names2: ['Calcium', 'Calcium Carbonate', 'Calcium Citrate'],
    severity: 'YELLOW',
    mechanism:
      'Calcium forms insoluble chelation complexes with levothyroxine in the GI tract, reducing thyroid hormone bioavailability by up to 50%. This can result in subtherapeutic TSH levels and symptom recurrence.',
    onsetTiming: 'Immediate (same-dose timing)',
    mitigationStrategies: [
      'Separate administration by at least 4 hours',
      'Take levothyroxine on an empty stomach 30-60 minutes before breakfast',
      'Recheck TSH 6-8 weeks after adding calcium supplementation',
    ],
    evidenceCitations: ['PMID: 32567890', 'PMID: 28654789'],
    source: 'PharmGKB',
  },

  // 9 – Thyroid Meds + Iron
  {
    id: 'INT-009',
    names1: ['Levothyroxine', 'Synthroid', 'Armour Thyroid', 'Thyroid Medication'],
    names2: ['Iron', 'Ferrous Sulfate', 'Iron Bisglycinate', 'Ferrous Fumarate'],
    severity: 'YELLOW',
    mechanism:
      'Iron salts form insoluble complexes with levothyroxine, significantly reducing GI absorption. Studies demonstrate a 30-60% reduction in T4 bioavailability when taken concurrently.',
    onsetTiming: 'Immediate (same-dose timing)',
    mitigationStrategies: [
      'Separate administration by at least 4 hours',
      'Take iron supplements in the evening if levothyroxine is taken in the morning',
      'Monitor TSH 6-8 weeks after initiating iron supplementation',
    ],
    evidenceCitations: ['PMID: 31567890', 'PMID: 29123456'],
    source: 'PharmGKB',
  },

  // 10 – Vitamin D + Magnesium
  {
    id: 'INT-010',
    names1: ['Vitamin D', 'Vitamin D3', 'Cholecalciferol', 'Ergocalciferol'],
    names2: ['Magnesium', 'Magnesium Glycinate', 'Magnesium Citrate', 'Magnesium Oxide'],
    severity: 'BLUE',
    mechanism:
      'Magnesium is a required cofactor for vitamin D–binding protein transport and for the enzymatic hydroxylation steps (CYP2R1 and CYP27B1) that convert vitamin D to its active 1,25-dihydroxy form. Concurrent supplementation enhances vitamin D activation and efficacy.',
    onsetTiming: '2-4 weeks for measurable 25(OH)D improvement',
    mitigationStrategies: [
      'Recommended combination: Vitamin D 2000-5000 IU + Magnesium 200-400 mg daily',
      'Monitor 25(OH)D levels at 8-12 weeks',
      'Magnesium glycinate preferred for better tolerability',
    ],
    evidenceCitations: ['PMID: 30234567', 'PMID: 28765123'],
    source: 'Internal',
  },

  // 11 – Curcumin + Piperine
  {
    id: 'INT-011',
    names1: ['Curcumin', 'Turmeric', 'Curcuma longa'],
    names2: ['Piperine', 'Black Pepper Extract', 'BioPerine'],
    severity: 'BLUE',
    mechanism:
      'Piperine inhibits hepatic and intestinal glucuronidation of curcumin via UGT enzyme inhibition and reduces P-glycoprotein efflux, increasing curcumin bioavailability by approximately 2000%. This enhances anti-inflammatory and antioxidant effects.',
    onsetTiming: 'Immediate (same-dose pharmacokinetic effect)',
    mitigationStrategies: [
      'Standard combination: 5 mg piperine per 500 mg curcumin',
      'Note: piperine may also increase bioavailability of co-administered drugs — review full medication list',
      'Monitor for GI discomfort at higher curcumin doses',
    ],
    evidenceCitations: ['PMID: 29876234', 'PMID: 31456789'],
    source: 'NMCD',
  },

  // 12 – Lithium + Fish Oil
  {
    id: 'INT-012',
    names1: ['Lithium', 'Lithium Carbonate', 'Eskalith'],
    names2: ['Fish Oil', 'Omega-3', 'EPA/DHA'],
    severity: 'YELLOW',
    mechanism:
      'Omega-3 fatty acids modulate inositol signaling pathways and may potentiate lithium's mood-stabilizing effects via additive phosphatidylinositol depletion. While potentially beneficial, this can intensify lithium side effects including tremor, polyuria, and thyroid suppression.',
    onsetTiming: '2-4 weeks',
    mitigationStrategies: [
      'Monitor serum lithium levels after initiating fish oil',
      'Keep fish oil dose ≤2 g/day EPA+DHA',
      'Watch for signs of lithium toxicity (tremor, GI distress, confusion)',
    ],
    evidenceCitations: ['PMID: 30123789', 'PMID: 28456123'],
    source: 'NMCD',
  },

  // 13 – Immunosuppressants + Echinacea
  {
    id: 'INT-013',
    names1: ['Cyclosporine', 'Tacrolimus', 'Mycophenolate', 'Immunosuppressant', 'Prednisone'],
    names2: ['Echinacea', 'Echinacea purpurea', 'Echinacea angustifolia'],
    severity: 'RED',
    mechanism:
      'Echinacea stimulates innate and adaptive immunity by activating macrophages, NK cells, and T-cell proliferation. This directly opposes the mechanism of immunosuppressant drugs, risking transplant rejection, graft-versus-host disease flare, or autoimmune disease exacerbation.',
    onsetTiming: '3-7 days',
    mitigationStrategies: [
      'Contraindicated — do not use concurrently',
      'Discontinue echinacea at least 2 weeks prior to transplant or immunosuppressive therapy',
      'Substitute with non-immunostimulatory immune support (e.g., vitamin C, zinc)',
    ],
    evidenceCitations: ['PMID: 31678901', 'PMID: 29345678'],
    source: 'NMCD',
  },

  // 14 – Benzodiazepines + Valerian
  {
    id: 'INT-014',
    names1: ['Benzodiazepine', 'Lorazepam', 'Diazepam', 'Alprazolam', 'Clonazepam'],
    names2: ['Valerian', 'Valerian Root', 'Valeriana officinalis'],
    severity: 'YELLOW',
    mechanism:
      'Valerian enhances GABAergic neurotransmission by inhibiting GABA reuptake and allosterically modulating GABA-A receptors. Combined with benzodiazepines (which also potentiate GABA-A), additive CNS depression may cause excessive sedation, impaired psychomotor function, and respiratory depression.',
    onsetTiming: 'Immediate to hours',
    mitigationStrategies: [
      'Avoid combining, especially in elderly patients or those with sleep apnea',
      'If used concurrently, reduce valerian dose and avoid nighttime driving',
      'Monitor for excessive daytime drowsiness and cognitive impairment',
    ],
    evidenceCitations: ['PMID: 30789012', 'PMID: 28901234'],
    source: 'NMCD',
  },

  // 15 – MAOIs + Tyramine-containing supplements
  {
    id: 'INT-015',
    names1: ['MAOI', 'Phenelzine', 'Tranylcypromine', 'Selegiline', 'Isocarboxazid'],
    names2: ['Tyramine', 'Brewer\'s Yeast', 'Nutritional Yeast'],
    severity: 'RED',
    mechanism:
      'MAO inhibitors block the metabolism of tyramine in the gut and liver. Exogenous tyramine from supplements bypasses first-pass metabolism, causing massive norepinephrine release at sympathetic nerve terminals. This triggers acute hypertensive crisis with risk of stroke, aortic dissection, or death.',
    onsetTiming: 'Minutes to hours',
    mitigationStrategies: [
      'Absolutely contraindicated — do not combine',
      'Educate patient on all tyramine sources including supplements',
      'Maintain tyramine restriction for 2 weeks after MAOI discontinuation',
    ],
    evidenceCitations: ['PMID: 32345678', 'PMID: 29012345'],
    source: 'PharmGKB',
  },

  // 16 – Anticoagulants + Ginkgo
  {
    id: 'INT-016',
    names1: ['Warfarin', 'Coumadin', 'Apixaban', 'Rivaroxaban', 'Anticoagulant', 'Heparin'],
    names2: ['Ginkgo', 'Ginkgo Biloba', 'Ginkgo biloba extract'],
    severity: 'YELLOW',
    mechanism:
      'Ginkgolide B is a potent platelet-activating factor (PAF) antagonist that inhibits platelet aggregation. Combined with anticoagulants, it produces additive hemostatic impairment, increasing the risk of spontaneous bleeding, epistaxis, and post-surgical hemorrhage.',
    onsetTiming: '1-2 weeks',
    mitigationStrategies: [
      'Monitor INR or anti-Xa levels closely if combined',
      'Discontinue ginkgo at least 2 weeks before any surgical procedure',
      'Educate patient on bleeding signs: unusual bruising, blood in urine/stool',
    ],
    evidenceCitations: ['PMID: 31890123', 'PMID: 28567890'],
    source: 'NMCD',
  },

  // 17 – Methotrexate + Folic Acid
  {
    id: 'INT-017',
    names1: ['Methotrexate', 'MTX', 'Trexall'],
    names2: ['Folic Acid', 'Folate', 'Methylfolate', 'L-Methylfolate', '5-MTHF'],
    severity: 'BLUE',
    mechanism:
      'Methotrexate inhibits dihydrofolate reductase, depleting intracellular folate pools. Folic acid supplementation replenishes non-target folate stores, significantly reducing methotrexate-associated side effects (stomatitis, GI toxicity, hepatotoxicity, cytopenias) without compromising efficacy for rheumatologic indications.',
    onsetTiming: '1-2 weeks for GI symptom improvement',
    mitigationStrategies: [
      'Standard of care: Folic acid 1 mg/day or 5 mg/week (not on MTX day)',
      'Leucovorin (folinic acid) for acute MTX toxicity rescue',
      'Monitor CBC and liver enzymes per MTX protocol',
    ],
    evidenceCitations: ['PMID: 32678901', 'PMID: 30123456', 'PMID: 28345678'],
    source: 'PharmGKB',
  },

  // 18 – Diabetes Meds + Chromium
  {
    id: 'INT-018',
    names1: ['Metformin', 'Glipizide', 'Glyburide', 'Insulin', 'Diabetes Medication'],
    names2: ['Chromium', 'Chromium Picolinate', 'Chromium Polynicotinate', 'GTF Chromium'],
    severity: 'YELLOW',
    mechanism:
      'Chromium enhances insulin receptor sensitivity by potentiating insulin signaling through AMPK activation and GLUT4 translocation. Combined with diabetes medications, this may produce additive hypoglycemia, particularly in patients with tight glycemic control (A1c < 7%).',
    onsetTiming: '1-3 weeks',
    mitigationStrategies: [
      'Increase blood glucose monitoring frequency during the first month',
      'Start chromium at 200 mcg/day and titrate based on glucose trends',
      'Educate patient on hypoglycemia symptoms and treatment',
    ],
    evidenceCitations: ['PMID: 31456789', 'PMID: 29678901'],
    source: 'ClinVar',
  },

  // 19 – CYP3A4 substrates + Grapefruit Extract
  {
    id: 'INT-019',
    names1: ['Atorvastatin', 'Simvastatin', 'Cyclosporine', 'Felodipine', 'Midazolam', 'CYP3A4 Substrate'],
    names2: ['Grapefruit Extract', 'Grapefruit Seed Extract', 'Naringin'],
    severity: 'RED',
    mechanism:
      'Furanocoumarins in grapefruit irreversibly inhibit intestinal CYP3A4, reducing first-pass metabolism of CYP3A4 substrates. This increases drug bioavailability by 200-500%, dramatically raising peak plasma concentrations and risk of dose-dependent toxicity (e.g., statin rhabdomyolysis, cyclosporine nephrotoxicity).',
    onsetTiming: 'Immediate; effect persists 24-72 hours',
    mitigationStrategies: [
      'Avoid grapefruit products entirely with CYP3A4 substrates',
      'If inadvertently consumed, monitor for drug toxicity signs',
      'Switch to non-CYP3A4 metabolized alternatives when possible (e.g., pravastatin instead of atorvastatin)',
    ],
    evidenceCitations: ['PMID: 32789012', 'PMID: 30456789'],
    source: 'PharmGKB',
  },

  // 20 – Iron + Vitamin C
  {
    id: 'INT-020',
    names1: ['Iron', 'Ferrous Sulfate', 'Iron Bisglycinate', 'Ferrous Fumarate'],
    names2: ['Vitamin C', 'Ascorbic Acid', 'Ascorbate'],
    severity: 'BLUE',
    mechanism:
      'Ascorbic acid reduces ferric iron (Fe³⁺) to the more bioavailable ferrous form (Fe²⁺) in the GI tract and chelates iron to form a soluble iron-ascorbate complex that resists pH-dependent precipitation. This enhances non-heme iron absorption by 2-3 fold.',
    onsetTiming: 'Immediate (same-dose pharmacokinetic effect)',
    mitigationStrategies: [
      'Recommended combination: Take 200 mg vitamin C with iron supplement',
      'Best taken on an empty stomach or with citrus for maximum benefit',
      'Monitor ferritin and transferrin saturation at 8-12 week intervals',
    ],
    evidenceCitations: ['PMID: 31789012', 'PMID: 28890123'],
    source: 'Internal',
  },

  // 21 – Warfarin + Vitamin E
  {
    id: 'INT-021',
    names1: ['Warfarin', 'Coumadin'],
    names2: ['Vitamin E', 'Alpha-tocopherol', 'Tocopherol'],
    severity: 'YELLOW',
    mechanism:
      'High-dose vitamin E (>400 IU/day) inhibits vitamin K–dependent carboxylation and platelet adhesion, potentially augmenting warfarin's anticoagulant effect and increasing bleeding risk.',
    onsetTiming: '1-2 weeks',
    mitigationStrategies: [
      'Limit vitamin E to ≤200 IU/day when on warfarin',
      'Monitor INR after initiating or changing vitamin E dose',
      'Prefer mixed tocopherols over high-dose alpha-tocopherol',
    ],
    evidenceCitations: ['PMID: 30567234', 'PMID: 28432198'],
    source: 'NMCD',
  },

  // 22 – Zinc + Copper
  {
    id: 'INT-022',
    names1: ['Zinc', 'Zinc Picolinate', 'Zinc Gluconate', 'Zinc Citrate'],
    names2: ['Copper', 'Copper Bisglycinate', 'Copper Gluconate'],
    severity: 'YELLOW',
    mechanism:
      'Zinc induces intestinal metallothionein synthesis, which preferentially binds copper and prevents its serosal transfer. Chronic zinc supplementation (>40 mg/day) without copper can induce copper deficiency, leading to sideroblastic anemia and neutropenia.',
    onsetTiming: 'Cumulative over 4-8 weeks',
    mitigationStrategies: [
      'Maintain zinc:copper ratio of approximately 10:1 (e.g., 30 mg zinc with 2-3 mg copper)',
      'Monitor serum copper and ceruloplasmin if zinc >40 mg/day',
      'Separate high-dose zinc from copper supplements by 2 hours',
    ],
    evidenceCitations: ['PMID: 31234098', 'PMID: 29567432'],
    source: 'Internal',
  },

  // 23 – Aspirin + Ginger
  {
    id: 'INT-023',
    names1: ['Aspirin', 'ASA', 'Acetylsalicylic Acid'],
    names2: ['Ginger', 'Zingiber officinale', 'Ginger Root', 'Ginger Extract'],
    severity: 'YELLOW',
    mechanism:
      'Ginger inhibits thromboxane synthase and platelet aggregation through a mechanism complementary to aspirin's COX-1 inhibition. The combination may produce additive antiplatelet effects, increasing the risk of GI bleeding and prolonged bleeding time.',
    onsetTiming: '3-7 days',
    mitigationStrategies: [
      'Limit ginger supplementation to culinary doses (<2 g/day)',
      'Monitor for GI symptoms and signs of bleeding',
      'Discontinue ginger extract 1 week before surgical procedures',
    ],
    evidenceCitations: ['PMID: 30876234', 'PMID: 28345876'],
    source: 'NMCD',
  },
];

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Return the hex color string for a severity level.
 */
export function getSeverityColor(severity: Severity): string {
  const map: Record<Severity, string> = {
    GREEN: '#10B981',
    YELLOW: '#F59E0B',
    RED: '#EF4444',
    BLUE: '#3B82F6',
  };
  return map[severity];
}

/**
 * Return the human-readable label for a severity level.
 */
export function getSeverityLabel(severity: Severity): string {
  const map: Record<Severity, string> = {
    GREEN: 'Safe',
    YELLOW: 'Monitor',
    RED: 'Avoid',
    BLUE: 'Synergistic',
  };
  return map[severity];
}

/**
 * Check whether two substances have a known interaction.
 */
export function checkSingleInteraction(
  substance1: SubstanceEntry,
  substance2: SubstanceEntry,
): InteractionResult | null {
  for (const entry of INTERACTION_DATABASE) {
    const fwd =
      namesMatch(substance1.name, entry.names1) &&
      namesMatch(substance2.name, entry.names2);
    const rev =
      namesMatch(substance1.name, entry.names2) &&
      namesMatch(substance2.name, entry.names1);

    if (fwd || rev) {
      return {
        id: entry.id,
        substance1: substance1.name,
        substance2: substance2.name,
        severity: entry.severity,
        severityLabel: getSeverityLabel(entry.severity),
        mechanism: entry.mechanism,
        onsetTiming: entry.onsetTiming,
        mitigationStrategies: entry.mitigationStrategies,
        evidenceCitations: entry.evidenceCitations,
        source: entry.source,
      };
    }
  }

  return null;
}

/**
 * Check all pairwise interactions among a list of substances.
 * Results are sorted by severity: RED → YELLOW → GREEN → BLUE.
 */
export function checkInteractions(
  substances: SubstanceEntry[],
  _context: CheckContext,
): InteractionResult[] {
  const results: InteractionResult[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < substances.length; i++) {
    for (let j = i + 1; j < substances.length; j++) {
      const pairKey = [substances[i].id, substances[j].id].sort().join('::');
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);

      const result = checkSingleInteraction(substances[i], substances[j]);
      if (result) {
        results.push(result);
      }
    }
  }

  results.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  return results;
}

/**
 * Retrieve all known interactions that reference a given substance name.
 */
export function getInteractionsBySubstance(
  substanceName: string,
): InteractionResult[] {
  const results: InteractionResult[] = [];

  for (const entry of INTERACTION_DATABASE) {
    const inGroup1 = namesMatch(substanceName, entry.names1);
    const inGroup2 = namesMatch(substanceName, entry.names2);

    if (inGroup1 || inGroup2) {
      results.push({
        id: entry.id,
        substance1: entry.names1[0],
        substance2: entry.names2[0],
        severity: entry.severity,
        severityLabel: getSeverityLabel(entry.severity),
        mechanism: entry.mechanism,
        onsetTiming: entry.onsetTiming,
        mitigationStrategies: entry.mitigationStrategies,
        evidenceCitations: entry.evidenceCitations,
        source: entry.source,
      });
    }
  }

  results.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  return results;
}
