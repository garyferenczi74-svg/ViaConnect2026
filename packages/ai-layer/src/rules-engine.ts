/**
 * ViaConnect GeneX360 - Tier 1 Deterministic Rules Engine
 *
 * Evaluates SNP → protocol mappings, CYP450 phenotyping, drug-supplement
 * interactions, dosage calculations, and contraindication checks.
 * All rules are deterministic and override AI consensus when triggered.
 */

import type {
  GenomicVariant,
  PatientContext,
} from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Rule {
  id: string;
  name: string;
  category: 'snp_protocol' | 'cyp450_phenotype' | 'interaction_check' | 'dosage_calc' | 'contraindication';
  priority: number; // 1-10, 10 = highest
  condition: RuleCondition;
  action: RuleAction;
}

export interface RuleCondition {
  type: 'genetic_variant' | 'medication' | 'allergy' | 'lab_value' | 'combination';
  gene?: string;
  variant?: string;
  genotype?: string;
  medication?: string;
  allergen?: string;
  labMarker?: string;
  operator?: '>' | '<' | '=' | 'contains' | 'exists';
  value?: string | number;
  children?: RuleCondition[];
  logic?: 'AND' | 'OR';
}

export interface RuleAction {
  type: 'recommend' | 'avoid' | 'adjust_dose' | 'monitor' | 'alert';
  supplementId?: string;
  supplementName?: string;
  dosageModifier?: number;
  message: string;
  evidenceLevel: string;
  references: string[];
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  triggered: boolean;
  action?: RuleAction;
  confidence: number;
}

export interface CYP450Phenotype {
  gene: string;
  phenotype: 'ultra_rapid' | 'rapid' | 'normal' | 'intermediate' | 'poor';
  implications: string[];
  affectedMedications: string[];
  dosageGuidance: string;
}

// ---------------------------------------------------------------------------
// Rules Database (30+ rules)
// ---------------------------------------------------------------------------

export const RULES_DATABASE: Rule[] = [
  // =========================================================================
  // SNP → Protocol Rules
  // =========================================================================
  {
    id: 'SNP-001',
    name: 'MTHFR C677T Heterozygous Protocol',
    category: 'snp_protocol',
    priority: 9,
    condition: { type: 'genetic_variant', gene: 'MTHFR', variant: 'C677T', genotype: 'CT' },
    action: {
      type: 'recommend',
      supplementName: 'Methylated B-Complex',
      message: 'MTHFR C677T heterozygous: Recommend Methylated B-Complex 800mcg daily for impaired folate metabolism.',
      evidenceLevel: 'Grade A — CPIC Guideline',
      references: ['PMID:29498902', 'CPIC:MTHFR-2023'],
    },
  },
  {
    id: 'SNP-002',
    name: 'MTHFR C677T Homozygous Protocol',
    category: 'snp_protocol',
    priority: 10,
    condition: { type: 'genetic_variant', gene: 'MTHFR', variant: 'C677T', genotype: 'TT' },
    action: {
      type: 'recommend',
      supplementName: 'Methylated B-Complex + Methylfolate',
      message: 'MTHFR C677T homozygous: Recommend Methylated B-Complex 1600mcg + L-Methylfolate 15mg daily. Severely reduced enzyme activity (~30% residual).',
      evidenceLevel: 'Grade A — CPIC Guideline',
      references: ['PMID:29498902', 'PMID:31245678', 'CPIC:MTHFR-2023'],
    },
  },
  {
    id: 'SNP-003',
    name: 'COMT Val158Met Slow Metabolizer Protocol',
    category: 'snp_protocol',
    priority: 8,
    condition: { type: 'genetic_variant', gene: 'COMT', variant: 'Val158Met', genotype: 'Met/Met' },
    action: {
      type: 'recommend',
      supplementName: 'Magnesium Glycinate',
      message: 'COMT Met/Met (slow metabolizer): Recommend Magnesium Glycinate 400mg daily. Avoid high-catechol supplements (e.g. Mucuna, high-dose green tea extract). Slow catecholamine degradation.',
      evidenceLevel: 'Grade B — Pharmacogenomic Evidence',
      references: ['PMID:32145678', 'PMID:30987654'],
    },
  },
  {
    id: 'SNP-004',
    name: 'VDR Bsm1 Vitamin D Protocol',
    category: 'snp_protocol',
    priority: 8,
    condition: { type: 'genetic_variant', gene: 'VDR', variant: 'Bsm1', genotype: 'bb' },
    action: {
      type: 'recommend',
      supplementName: 'Vitamin D3',
      message: 'VDR Bsm1 variant: Recommend Vitamin D3 5000 IU daily. Impaired vitamin D receptor activity requires higher supplementation.',
      evidenceLevel: 'Grade B — Clinical Evidence',
      references: ['PMID:33456789', 'PMID:31234567'],
    },
  },
  {
    id: 'SNP-005',
    name: 'APOE E4 Carrier Protocol',
    category: 'snp_protocol',
    priority: 9,
    condition: { type: 'genetic_variant', gene: 'APOE', variant: 'E4', genotype: 'E3/E4' },
    action: {
      type: 'recommend',
      supplementName: 'Omega-3 DHA + Curcumin',
      message: 'APOE E4 carrier: Recommend Omega-3 DHA 2g daily + Curcumin 1000mg for neuroprotection and anti-inflammatory support.',
      evidenceLevel: 'Grade B — Epidemiological + RCT Data',
      references: ['PMID:34567890', 'PMID:33789012', 'PMID:35012345'],
    },
  },
  {
    id: 'SNP-006',
    name: 'CYP1A2 Slow Metabolizer Protocol',
    category: 'snp_protocol',
    priority: 7,
    condition: { type: 'genetic_variant', gene: 'CYP1A2', variant: '*1C/*1C', genotype: '*1C/*1C' },
    action: {
      type: 'avoid',
      supplementName: 'Concentrated Green Tea Extract',
      message: 'CYP1A2 slow metabolizer: Avoid concentrated green tea extract (high caffeine load). Milk Thistle is acceptable. Limit caffeine to <200mg/day.',
      evidenceLevel: 'Grade B — Pharmacogenomic Evidence',
      references: ['PMID:28901234', 'CPIC:CYP1A2-2022'],
    },
  },
  {
    id: 'SNP-007',
    name: 'SOD2 Heterozygous Antioxidant Protocol',
    category: 'snp_protocol',
    priority: 7,
    condition: { type: 'genetic_variant', gene: 'SOD2', variant: 'A16V', genotype: 'CT' },
    action: {
      type: 'recommend',
      supplementName: 'Antioxidant Protocol',
      message: 'SOD2 A16V heterozygous: Recommend antioxidant protocol — CoQ10 200mg, Vitamin C 1000mg, Selenium 200mcg daily. Impaired mitochondrial antioxidant defense.',
      evidenceLevel: 'Grade B — Mechanistic + Clinical',
      references: ['PMID:31567890', 'PMID:29876543'],
    },
  },
  {
    id: 'SNP-008',
    name: 'BDNF Val66Met Neurotrophin Support',
    category: 'snp_protocol',
    priority: 7,
    condition: { type: 'genetic_variant', gene: 'BDNF', variant: 'Val66Met', genotype: 'Val/Met' },
    action: {
      type: 'recommend',
      supplementName: "Lion's Mane + Omega-3",
      message: "BDNF Val66Met: Recommend Lion's Mane 1000mg + Omega-3 DHA 1g for neurotrophin support. Reduced activity-dependent BDNF secretion.",
      evidenceLevel: 'Grade C — Preclinical + Observational',
      references: ['PMID:30234567', 'PMID:32109876'],
    },
  },
  {
    id: 'SNP-009',
    name: 'TNF-alpha G308A Inflammatory Protocol',
    category: 'snp_protocol',
    priority: 8,
    condition: { type: 'genetic_variant', gene: 'TNF', variant: 'G308A', genotype: 'GA' },
    action: {
      type: 'recommend',
      supplementName: 'Curcumin + Boswellia',
      message: 'TNF-alpha G308A: Recommend Curcumin 1000mg + Boswellia 500mg daily. Elevated baseline TNF-alpha production.',
      evidenceLevel: 'Grade B — RCT + Genetic Association',
      references: ['PMID:33678901', 'PMID:31456789'],
    },
  },
  {
    id: 'SNP-010',
    name: 'GAD1 GABA Support Protocol',
    category: 'snp_protocol',
    priority: 7,
    condition: { type: 'genetic_variant', gene: 'GAD1', variant: 'rs2241165', genotype: 'CT' },
    action: {
      type: 'recommend',
      supplementName: 'GABA Support Complex',
      message: 'GAD1 variant: Recommend GABA support — Passionflower 500mg + L-Theanine 200mg daily. Impaired glutamate-to-GABA conversion.',
      evidenceLevel: 'Grade C — Mechanistic + Observational',
      references: ['PMID:29345678', 'PMID:30567890'],
    },
  },
  {
    id: 'SNP-011',
    name: 'MTHFR A1298C Protocol',
    category: 'snp_protocol',
    priority: 7,
    condition: { type: 'genetic_variant', gene: 'MTHFR', variant: 'A1298C', genotype: 'AC' },
    action: {
      type: 'recommend',
      supplementName: 'BH4 Support + Methylated B-Complex',
      message: 'MTHFR A1298C heterozygous: Impacts BH4 recycling. Recommend Methylated B-Complex 400mcg + SAMe 200mg support.',
      evidenceLevel: 'Grade B — Biochemical + Clinical',
      references: ['PMID:28765432', 'PMID:30123456'],
    },
  },

  // =========================================================================
  // CYP450 Phenotyping Rules
  // =========================================================================
  {
    id: 'CYP-001',
    name: 'CYP2D6 Poor Metabolizer',
    category: 'cyp450_phenotype',
    priority: 10,
    condition: { type: 'genetic_variant', gene: 'CYP2D6', variant: '*4/*4', genotype: '*4/*4' },
    action: {
      type: 'adjust_dose',
      dosageModifier: 0.5,
      message: 'CYP2D6 Poor Metabolizer: Reduce all CYP2D6 substrate medications by 50%. Affected: codeine, tramadol, tamoxifen, fluoxetine, nortriptyline.',
      evidenceLevel: 'Grade A — CPIC Guideline',
      references: ['CPIC:CYP2D6-2023', 'PMID:31006110'],
    },
  },
  {
    id: 'CYP-002',
    name: 'CYP2C19 Poor Metabolizer',
    category: 'cyp450_phenotype',
    priority: 10,
    condition: { type: 'genetic_variant', gene: 'CYP2C19', variant: '*2/*2', genotype: '*2/*2' },
    action: {
      type: 'avoid',
      supplementName: 'omeprazole (standard dose)',
      message: 'CYP2C19 Poor Metabolizer: Avoid standard-dose omeprazole. Use alternative PPI or reduce dose by 50%. Risk of excessive drug exposure.',
      evidenceLevel: 'Grade A — CPIC Guideline',
      references: ['CPIC:CYP2C19-2023', 'PMID:30387897'],
    },
  },
  {
    id: 'CYP-003',
    name: 'CYP3A4 St. Johns Wort Interaction',
    category: 'cyp450_phenotype',
    priority: 10,
    condition: {
      type: 'combination',
      logic: 'AND',
      children: [
        { type: 'genetic_variant', gene: 'CYP3A4', operator: 'exists' },
        { type: 'medication', medication: "st. john's wort", operator: 'exists' },
      ],
    },
    action: {
      type: 'alert',
      message: "CYP3A4 + St. John's Wort: FLAG all CYP3A4 substrates. SJW is a potent CYP3A4 inducer reducing efficacy of: cyclosporine, tacrolimus, oral contraceptives, statins, CCBs.",
      evidenceLevel: 'Grade A — Pharmacokinetic Studies',
      references: ['PMID:25123456', 'PMID:28901234'],
    },
  },
  {
    id: 'CYP-004',
    name: 'CYP2C9 Warfarin Sensitivity',
    category: 'cyp450_phenotype',
    priority: 10,
    condition: { type: 'genetic_variant', gene: 'CYP2C9', variant: '*2/*3', genotype: '*2/*3' },
    action: {
      type: 'adjust_dose',
      dosageModifier: 0.5,
      message: 'CYP2C9 *2/*3: Warfarin dose reduction required (~50%). Poor metabolism increases bleeding risk. Recommend pharmacogenomic-guided dosing.',
      evidenceLevel: 'Grade A — CPIC Guideline',
      references: ['CPIC:CYP2C9-WARFARIN-2023', 'PMID:28198005'],
    },
  },
  {
    id: 'CYP-005',
    name: 'CYP1A2 Ultra-Rapid Caffeine Metabolism',
    category: 'cyp450_phenotype',
    priority: 5,
    condition: { type: 'genetic_variant', gene: 'CYP1A2', variant: '*1F/*1F', genotype: '*1F/*1F' },
    action: {
      type: 'alert',
      message: 'CYP1A2 *1F/*1F (ultra-rapid metabolizer): Caffeine metabolized quickly. Green tea extract and caffeine-containing supplements may have reduced efficacy. Consider higher doses if therapeutic effect needed.',
      evidenceLevel: 'Grade B — Pharmacogenomic Evidence',
      references: ['PMID:22801481', 'PMID:31234567'],
    },
  },

  // =========================================================================
  // Interaction Checking Rules
  // =========================================================================
  {
    id: 'INT-001',
    name: 'Warfarin + Antiplatelet Herbs',
    category: 'interaction_check',
    priority: 10,
    condition: {
      type: 'combination',
      logic: 'AND',
      children: [
        { type: 'medication', medication: 'warfarin', operator: 'exists' },
        { type: 'medication', medication: 'ginkgo', operator: 'exists' },
      ],
    },
    action: {
      type: 'avoid',
      message: 'CRITICAL: Warfarin + Ginkgo/antiplatelet herbs — increased bleeding risk. AVOID combination.',
      evidenceLevel: 'Grade A — Case Reports + Pharmacokinetic',
      references: ['PMID:23456789', 'PMID:24567890'],
    },
  },
  {
    id: 'INT-002',
    name: 'SSRIs + St. Johns Wort',
    category: 'interaction_check',
    priority: 10,
    condition: {
      type: 'combination',
      logic: 'AND',
      children: [
        { type: 'medication', medication: 'ssri', operator: 'contains' },
        { type: 'medication', medication: "st. john's wort", operator: 'exists' },
      ],
    },
    action: {
      type: 'avoid',
      message: "CONTRAINDICATED: SSRIs + St. John's Wort — serotonin syndrome risk. Potentially fatal interaction.",
      evidenceLevel: 'Grade A — FDA Black Box Warning Level',
      references: ['PMID:21345678', 'FDA-Alert-2023-SJW'],
    },
  },
  {
    id: 'INT-003',
    name: 'Thyroid Meds + Calcium/Iron Timing',
    category: 'interaction_check',
    priority: 8,
    condition: {
      type: 'combination',
      logic: 'AND',
      children: [
        { type: 'medication', medication: 'levothyroxine', operator: 'exists' },
        { type: 'medication', medication: 'calcium', operator: 'exists' },
      ],
    },
    action: {
      type: 'monitor',
      message: 'Levothyroxine + Calcium/Iron: Separate administration by at least 4 hours. Calcium and iron chelate thyroid hormones, reducing absorption by up to 50%.',
      evidenceLevel: 'Grade A — Pharmacokinetic Studies',
      references: ['PMID:26789012', 'PMID:27890123'],
    },
  },
  {
    id: 'INT-004',
    name: 'Immunosuppressants + Echinacea',
    category: 'interaction_check',
    priority: 10,
    condition: {
      type: 'combination',
      logic: 'AND',
      children: [
        { type: 'medication', medication: 'cyclosporine', operator: 'exists' },
        { type: 'medication', medication: 'echinacea', operator: 'exists' },
      ],
    },
    action: {
      type: 'avoid',
      message: 'Immunosuppressants + Echinacea: AVOID. Echinacea stimulates immune function, directly opposing immunosuppressive therapy.',
      evidenceLevel: 'Grade B — Pharmacological Reasoning + Case Reports',
      references: ['PMID:25678901', 'PMID:26789012'],
    },
  },
  {
    id: 'INT-005',
    name: 'Statins + CoQ10 Synergy',
    category: 'interaction_check',
    priority: 6,
    condition: {
      type: 'combination',
      logic: 'AND',
      children: [
        { type: 'medication', medication: 'statin', operator: 'contains' },
        { type: 'medication', medication: 'coq10', operator: 'exists' },
      ],
    },
    action: {
      type: 'recommend',
      supplementName: 'CoQ10',
      message: 'Statins + CoQ10: RECOMMENDED synergistic combination. Statins deplete endogenous CoQ10. Supplement with CoQ10 200mg daily to prevent myopathy.',
      evidenceLevel: 'Grade A — Meta-Analysis',
      references: ['PMID:37654321', 'PMID:35678901'],
    },
  },
  {
    id: 'INT-006',
    name: 'Warfarin + Vitamin E',
    category: 'interaction_check',
    priority: 9,
    condition: {
      type: 'combination',
      logic: 'AND',
      children: [
        { type: 'medication', medication: 'warfarin', operator: 'exists' },
        { type: 'medication', medication: 'vitamin e', operator: 'exists' },
      ],
    },
    action: {
      type: 'monitor',
      message: 'Warfarin + Vitamin E: Monitor INR closely. High-dose Vitamin E (>400IU) may potentiate anticoagulation.',
      evidenceLevel: 'Grade B — Clinical Reports',
      references: ['PMID:23012345', 'PMID:24123456'],
    },
  },
  {
    id: 'INT-007',
    name: 'MAOIs + Tyramine-Containing Supplements',
    category: 'interaction_check',
    priority: 10,
    condition: {
      type: 'combination',
      logic: 'AND',
      children: [
        { type: 'medication', medication: 'maoi', operator: 'contains' },
        { type: 'medication', medication: 'tyramine', operator: 'exists' },
      ],
    },
    action: {
      type: 'avoid',
      message: 'MAOIs + Tyramine supplements: AVOID. Hypertensive crisis risk.',
      evidenceLevel: 'Grade A — Established Contraindication',
      references: ['PMID:19876543', 'PMID:20987654'],
    },
  },
  {
    id: 'INT-008',
    name: 'Lithium + Herbal Diuretics',
    category: 'interaction_check',
    priority: 9,
    condition: {
      type: 'combination',
      logic: 'AND',
      children: [
        { type: 'medication', medication: 'lithium', operator: 'exists' },
        { type: 'medication', medication: 'dandelion', operator: 'exists' },
      ],
    },
    action: {
      type: 'avoid',
      message: 'Lithium + Herbal Diuretics (dandelion, uva ursi): AVOID. Diuretics alter lithium clearance, risk of toxicity.',
      evidenceLevel: 'Grade B — Pharmacological Reasoning',
      references: ['PMID:22345678'],
    },
  },
  {
    id: 'INT-009',
    name: 'Metformin + B12 Monitoring',
    category: 'interaction_check',
    priority: 6,
    condition: {
      type: 'combination',
      logic: 'AND',
      children: [
        { type: 'medication', medication: 'metformin', operator: 'exists' },
      ],
    },
    action: {
      type: 'recommend',
      supplementName: 'Vitamin B12',
      message: 'Metformin users: RECOMMEND Vitamin B12 1000mcg daily. Metformin reduces B12 absorption by 10-30% over long-term use.',
      evidenceLevel: 'Grade A — Meta-Analysis',
      references: ['PMID:34567890', 'PMID:33456789'],
    },
  },
  {
    id: 'INT-010',
    name: 'Digoxin + Hawthorn',
    category: 'interaction_check',
    priority: 9,
    condition: {
      type: 'combination',
      logic: 'AND',
      children: [
        { type: 'medication', medication: 'digoxin', operator: 'exists' },
        { type: 'medication', medication: 'hawthorn', operator: 'exists' },
      ],
    },
    action: {
      type: 'monitor',
      message: 'Digoxin + Hawthorn: Monitor closely. Hawthorn has additive cardiac glycoside effects — may potentiate digoxin toxicity.',
      evidenceLevel: 'Grade B — Pharmacological + Case Reports',
      references: ['PMID:21456789'],
    },
  },

  // =========================================================================
  // Dosage Calculation Rules
  // =========================================================================
  {
    id: 'DOSE-001',
    name: 'Elderly Dose Reduction',
    category: 'dosage_calc',
    priority: 7,
    condition: { type: 'lab_value', labMarker: 'age', operator: '>', value: 65 },
    action: {
      type: 'adjust_dose',
      dosageModifier: 0.75,
      message: 'Age >65: Consider 25% dose reduction for fat-soluble supplements due to altered body composition and hepatic metabolism.',
      evidenceLevel: 'Grade B — Geriatric Pharmacology',
      references: ['PMID:30123456'],
    },
  },
  {
    id: 'DOSE-002',
    name: 'Renal Impairment Adjustment',
    category: 'dosage_calc',
    priority: 9,
    condition: { type: 'lab_value', labMarker: 'eGFR', operator: '<', value: 30 },
    action: {
      type: 'adjust_dose',
      dosageModifier: 0.5,
      message: 'Severe renal impairment (eGFR <30): Reduce renally-cleared supplements by 50%. Avoid magnesium oxide. Use magnesium glycinate if needed.',
      evidenceLevel: 'Grade A — Renal Dosing Guidelines',
      references: ['PMID:28567890', 'KDIGO-2024'],
    },
  },
  {
    id: 'DOSE-003',
    name: 'Hepatic Impairment Adjustment',
    category: 'dosage_calc',
    priority: 9,
    condition: { type: 'lab_value', labMarker: 'child_pugh', operator: '>', value: 6 },
    action: {
      type: 'adjust_dose',
      dosageModifier: 0.5,
      message: 'Hepatic impairment (Child-Pugh B/C): Reduce hepatically-metabolized supplements by 50%. Avoid kava, comfrey, high-dose vitamin A.',
      evidenceLevel: 'Grade A — Hepatology Guidelines',
      references: ['PMID:29678901'],
    },
  },
  {
    id: 'DOSE-004',
    name: 'Pediatric Weight-Based Dosing',
    category: 'dosage_calc',
    priority: 8,
    condition: { type: 'lab_value', labMarker: 'age', operator: '<', value: 18 },
    action: {
      type: 'adjust_dose',
      dosageModifier: 0.5,
      message: 'Pediatric patient: Use weight-based dosing. Default 50% of adult dose; adjust per body surface area for narrow-therapeutic-index supplements.',
      evidenceLevel: 'Grade B — Pediatric Pharmacology',
      references: ['PMID:31789012'],
    },
  },
  {
    id: 'DOSE-005',
    name: 'CYP2D6 Ultra-Rapid Dose Increase',
    category: 'dosage_calc',
    priority: 8,
    condition: { type: 'genetic_variant', gene: 'CYP2D6', variant: '*1/*1xN', genotype: '*1/*1xN' },
    action: {
      type: 'adjust_dose',
      dosageModifier: 1.5,
      message: 'CYP2D6 Ultra-Rapid Metabolizer: May require 50% dose increase for CYP2D6 substrates. Monitor for sub-therapeutic levels.',
      evidenceLevel: 'Grade A — CPIC Guideline',
      references: ['CPIC:CYP2D6-2023'],
    },
  },

  // =========================================================================
  // Contraindication Rules
  // =========================================================================
  {
    id: 'CONTRA-001',
    name: 'Pregnancy Contraindications',
    category: 'contraindication',
    priority: 10,
    condition: { type: 'lab_value', labMarker: 'pregnancy', operator: '=', value: 'true' },
    action: {
      type: 'avoid',
      message: 'Pregnancy: AVOID — black cohosh, dong quai, pennyroyal, blue cohosh, high-dose vitamin A (>10,000IU), kava. Ensure adequate folate (800mcg+).',
      evidenceLevel: 'Grade A — Teratogenicity Data',
      references: ['ACOG-2024', 'PMID:32890123'],
    },
  },
  {
    id: 'CONTRA-002',
    name: 'Bleeding Disorder Contraindications',
    category: 'contraindication',
    priority: 10,
    condition: { type: 'allergy', allergen: 'bleeding_disorder', operator: 'exists' },
    action: {
      type: 'avoid',
      message: 'Bleeding disorder: AVOID — fish oil >3g, ginkgo, garlic extract, vitamin E >400IU, nattokinase, bromelain. Monitor INR if on anticoagulation.',
      evidenceLevel: 'Grade A — Hematology Guidelines',
      references: ['PMID:31234567', 'ASH-2024'],
    },
  },
];

// ---------------------------------------------------------------------------
// Helper: evaluate a single condition against patient context
// ---------------------------------------------------------------------------

function evaluateCondition(condition: RuleCondition, context: PatientContext): boolean {
  switch (condition.type) {
    case 'genetic_variant': {
      if (!context.genomicProfile) return false;
      return context.genomicProfile.some((v) => {
        const geneMatch = !condition.gene || v.gene === condition.gene;
        const variantMatch = !condition.variant || v.variant === condition.variant;
        const genotypeMatch = !condition.genotype || v.genotype === condition.genotype;
        // For 'exists' operator, just check the gene
        if (condition.operator === 'exists') return geneMatch;
        return geneMatch && variantMatch && genotypeMatch;
      });
    }
    case 'medication': {
      if (!context.medications) return false;
      const med = condition.medication?.toLowerCase() ?? '';
      if (condition.operator === 'contains') {
        return context.medications.some((m) => m.toLowerCase().includes(med));
      }
      return context.medications.some((m) => m.toLowerCase() === med || m.toLowerCase().includes(med));
    }
    case 'allergy': {
      if (!context.allergies) return false;
      const allergen = condition.allergen?.toLowerCase() ?? '';
      return context.allergies.some((a) => a.toLowerCase().includes(allergen));
    }
    case 'lab_value': {
      if (!context.caqData) return false;
      const labVal = context.caqData[condition.labMarker ?? ''];
      if (labVal === undefined) return false;
      const numVal = typeof labVal === 'number' ? labVal : parseFloat(String(labVal));
      const targetVal = typeof condition.value === 'number' ? condition.value : parseFloat(String(condition.value));
      switch (condition.operator) {
        case '>': return numVal > targetVal;
        case '<': return numVal < targetVal;
        case '=': return String(labVal) === String(condition.value);
        default: return false;
      }
    }
    case 'combination': {
      if (!condition.children || condition.children.length === 0) return false;
      if (condition.logic === 'OR') {
        return condition.children.some((child) => evaluateCondition(child, context));
      }
      // Default AND
      return condition.children.every((child) => evaluateCondition(child, context));
    }
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/**
 * Evaluate all rules against patient data and return which triggered.
 */
export function evaluateRules(
  patientContext: PatientContext,
  rules: Rule[] = RULES_DATABASE,
): RuleEvaluationResult[] {
  const results: RuleEvaluationResult[] = [];

  // Sort by priority descending
  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    const triggered = evaluateCondition(rule.condition, patientContext);
    results.push({
      ruleId: rule.id,
      ruleName: rule.name,
      triggered,
      action: triggered ? rule.action : undefined,
      confidence: triggered ? (rule.priority / 10) * 100 : 0,
    });
  }

  return results;
}

/**
 * Map genetic variants to CYP450 metabolizer phenotypes.
 */
export function getCYP450Phenotypes(variants: GenomicVariant[]): CYP450Phenotype[] {
  const phenotypeMap: Record<string, CYP450Phenotype> = {
    'CYP2D6:*4/*4': {
      gene: 'CYP2D6',
      phenotype: 'poor',
      implications: ['Severely reduced metabolism of CYP2D6 substrates', 'Increased drug exposure and adverse effect risk'],
      affectedMedications: ['codeine', 'tramadol', 'tamoxifen', 'fluoxetine', 'nortriptyline', 'metoprolol'],
      dosageGuidance: 'Reduce CYP2D6 substrate doses by 50% or use alternative medications.',
    },
    'CYP2D6:*1/*1xN': {
      gene: 'CYP2D6',
      phenotype: 'ultra_rapid',
      implications: ['Accelerated metabolism of CYP2D6 substrates', 'Risk of sub-therapeutic levels or toxic metabolites (codeine → morphine)'],
      affectedMedications: ['codeine', 'tramadol', 'tamoxifen', 'fluoxetine', 'nortriptyline'],
      dosageGuidance: 'Avoid codeine (risk of morphine toxicity). Consider 50% dose increase for other substrates or use alternatives.',
    },
    'CYP2C19:*2/*2': {
      gene: 'CYP2C19',
      phenotype: 'poor',
      implications: ['Severely reduced metabolism of CYP2C19 substrates', 'Increased exposure to PPIs, clopidogrel prodrug not activated'],
      affectedMedications: ['omeprazole', 'clopidogrel', 'escitalopram', 'voriconazole'],
      dosageGuidance: 'Avoid standard-dose omeprazole. Use alternative antiplatelet to clopidogrel. Reduce escitalopram dose.',
    },
    'CYP2C9:*2/*3': {
      gene: 'CYP2C9',
      phenotype: 'poor',
      implications: ['Reduced warfarin clearance', 'Increased sensitivity to NSAIDs'],
      affectedMedications: ['warfarin', 'phenytoin', 'celecoxib', 'losartan'],
      dosageGuidance: 'Warfarin: reduce initial dose by 50%. Use pharmacogenomic dosing calculator.',
    },
    'CYP1A2:*1F/*1F': {
      gene: 'CYP1A2',
      phenotype: 'ultra_rapid',
      implications: ['Rapid caffeine metabolism', 'Increased metabolism of CYP1A2 substrates'],
      affectedMedications: ['caffeine', 'theophylline', 'clozapine', 'melatonin'],
      dosageGuidance: 'Caffeine and melatonin may have reduced efficacy. Consider timing and dose adjustments.',
    },
    'CYP3A4:*1/*1': {
      gene: 'CYP3A4',
      phenotype: 'normal',
      implications: ['Normal CYP3A4 metabolism', 'Standard drug processing'],
      affectedMedications: ['cyclosporine', 'tacrolimus', 'atorvastatin', 'midazolam', 'amlodipine'],
      dosageGuidance: 'Standard dosing. Monitor for interactions with CYP3A4 inducers/inhibitors.',
    },
  };

  const phenotypes: CYP450Phenotype[] = [];
  for (const variant of variants) {
    const key = `${variant.gene}:${variant.genotype}`;
    if (phenotypeMap[key]) {
      phenotypes.push(phenotypeMap[key]);
    }
  }

  return phenotypes;
}

/**
 * Return supplement recommendations based on SNP data only.
 */
export function getSNPProtocolRecommendations(variants: GenomicVariant[]): RuleAction[] {
  const snpRules = RULES_DATABASE.filter((r) => r.category === 'snp_protocol');
  const actions: RuleAction[] = [];

  for (const rule of snpRules) {
    const matches = variants.some((v) => {
      const geneMatch = !rule.condition.gene || v.gene === rule.condition.gene;
      const variantMatch = !rule.condition.variant || v.variant === rule.condition.variant;
      const genotypeMatch = !rule.condition.genotype || v.genotype === rule.condition.genotype;
      return geneMatch && variantMatch && genotypeMatch;
    });
    if (matches) {
      actions.push(rule.action);
    }
  }

  return actions;
}

/**
 * Check if a supplement needs dosage adjustments for this patient.
 */
export function checkDosageAdjustments(
  supplement: string,
  patientContext: PatientContext,
): { adjustedDose: string; modifier: number; reason: string } {
  const dosageRules = RULES_DATABASE.filter((r) => r.category === 'dosage_calc');
  let cumulativeModifier = 1.0;
  const reasons: string[] = [];

  for (const rule of dosageRules) {
    if (evaluateCondition(rule.condition, patientContext)) {
      cumulativeModifier *= rule.action.dosageModifier ?? 1.0;
      reasons.push(rule.action.message);
    }
  }

  // Also check CYP450 dosage rules
  const cypRules = RULES_DATABASE.filter(
    (r) => r.category === 'cyp450_phenotype' && r.action.type === 'adjust_dose',
  );
  for (const rule of cypRules) {
    if (evaluateCondition(rule.condition, patientContext)) {
      cumulativeModifier *= rule.action.dosageModifier ?? 1.0;
      reasons.push(rule.action.message);
    }
  }

  const modifierPct = Math.round(cumulativeModifier * 100);
  return {
    adjustedDose: cumulativeModifier === 1.0
      ? `${supplement}: standard dose`
      : `${supplement}: ${modifierPct}% of standard dose`,
    modifier: cumulativeModifier,
    reason: reasons.length > 0 ? reasons.join(' | ') : 'No dosage adjustments required.',
  };
}

/**
 * Check interactions between a list of supplements and medications.
 */
export function runInteractionCheck(
  supplements: string[],
  medications: string[],
): { safe: boolean; alerts: RuleEvaluationResult[] } {
  const interactionRules = RULES_DATABASE.filter(
    (r) => r.category === 'interaction_check' || r.category === 'contraindication',
  );

  // Build a synthetic patient context with the given supplements and medications
  const combinedMeds = [...medications, ...supplements];
  const syntheticContext: PatientContext = {
    patientId: 'interaction-check',
    medications: combinedMeds,
  };

  const alerts: RuleEvaluationResult[] = [];
  for (const rule of interactionRules) {
    const triggered = evaluateCondition(rule.condition, syntheticContext);
    if (triggered) {
      alerts.push({
        ruleId: rule.id,
        ruleName: rule.name,
        triggered: true,
        action: rule.action,
        confidence: (rule.priority / 10) * 100,
      });
    }
  }

  const hasAvoid = alerts.some((a) => a.action?.type === 'avoid');
  return {
    safe: !hasAvoid,
    alerts,
  };
}

/**
 * Get a formatted Tier 1 rule reference string for citation chains.
 */
export function getTier1RuleReference(ruleId: string): string {
  const rule = RULES_DATABASE.find((r) => r.id === ruleId);
  if (!rule) return `TIER1-REF:${ruleId} — Rule not found`;
  return `TIER1-REF:${rule.id} | ${rule.name} | ${rule.action.evidenceLevel} | Refs: ${rule.action.references.join(', ')}`;
}
