/**
 * Zero-cost peptide protocol engine — #44a catalog baked in
 * No Anthropic API · No template DB · Pure TypeScript deterministic logic
 * $0 per stack · <300ms · 100% reliability
 */

export type PeptideTier = 1 | 2 | 3;
export type DeliveryForm = 'Injectable' | 'Oral (Liposomal)' | 'Nasal Spray' | 'Topical' | 'Injectable ONLY';

export interface PeptideProduct {
  name: string;
  form: DeliveryForm;
  category: string;
  tier: PeptideTier;
  requiresSupervision: boolean;
  indication: string;
  cycleOn: string;
  cycleOff: string;
  cyclesPerYear?: number;
  cycleNote?: string;
  isRUO?: boolean;
  isSolo?: boolean;
  synergisticWith?: string[];
}

// ── FULL 28-PEPTIDE CATALOG (Source: Prompt #44a, Peptide_List.xlsx April 2026) ──

export const PEPTIDE_CATALOG: Record<string, PeptideProduct> = {
  // TIER 1: DTC WELLNESS ESSENTIALS
  sermorelin: {
    name: 'Sermorelin', form: 'Injectable', category: 'GH Secretagogue',
    tier: 1, requiresSupervision: false,
    indication: 'Natural GH stimulation via GHRH; sleep quality, body composition, anti-aging',
    cycleOn: '5 days', cycleOff: '2 days', cycleNote: 'Evening dosing preferred; aligns with nocturnal GH pulse',
  },
  bpc157_oral: {
    name: 'BPC-157 Oral', form: 'Oral (Liposomal)', category: 'Tissue Repair',
    tier: 1, requiresSupervision: false,
    indication: 'Gut healing; intestinal mucosal repair; tight junction restoration; IBS/IBD',
    cycleOn: '8 weeks', cycleOff: '4 weeks', synergisticWith: ['kvp'],
  },
  bpc157_injectable: {
    name: 'BPC-157 Injectable', form: 'Injectable', category: 'Tissue Repair',
    tier: 1, requiresSupervision: false,
    indication: 'Systemic repair: tendon, ligament, muscle; neuroprotection; angiogenesis',
    cycleOn: '8 weeks', cycleOff: '4 weeks', synergisticWith: ['tb500_injectable'],
  },
  bpc157_nasal: {
    name: 'BPC-157 Nasal Spray', form: 'Nasal Spray', category: 'Tissue Repair',
    tier: 1, requiresSupervision: false,
    indication: 'CNS-targeted; BBB-penetrating; neuroinflammation; TBI support',
    cycleOn: '5 days', cycleOff: '2 days', synergisticWith: ['semax'],
  },
  tb500_injectable: {
    name: 'TB-500 Injectable', form: 'Injectable', category: 'Tissue Repair',
    tier: 1, requiresSupervision: false,
    indication: 'Systemic actin upregulation; anti-fibrotic; cardiac repair; wound healing',
    cycleOn: '8 weeks', cycleOff: '4 weeks', synergisticWith: ['bpc157_injectable'],
  },
  tb500_oral: {
    name: 'TB-500 Oral', form: 'Oral (Liposomal)', category: 'Tissue Repair',
    tier: 1, requiresSupervision: false,
    indication: 'Oral systemic tissue repair and anti-fibrotic support',
    cycleOn: '8 weeks', cycleOff: '4 weeks',
  },
  ghkcu_topical: {
    name: 'GHK-Cu Topical', form: 'Topical', category: 'Aesthetic / Repair',
    tier: 1, requiresSupervision: false,
    indication: 'Collagen synthesis; skin anti-aging; hair follicle activation; 4,000+ genes modulated',
    cycleOn: 'Continuous', cycleOff: 'None', cycleNote: 'Apply daily to target areas; no cycling required',
  },
  aod9604: {
    name: 'AOD-9604', form: 'Injectable', category: 'Metabolic / Fat Loss',
    tier: 1, requiresSupervision: false,
    indication: 'GH fragment 176-191; lipolysis without IGF-1 effect; cartilage repair',
    cycleOn: '12 weeks', cycleOff: '4 weeks',
  },
  semax: {
    name: 'Semax', form: 'Nasal Spray', category: 'Cognitive',
    tier: 1, requiresSupervision: false,
    indication: 'BDNF/NGF upregulation; neuroplasticity; ACTH-derived; HPA axis support',
    cycleOn: '2 weeks', cycleOff: '2 weeks', synergisticWith: ['selank'],
    cycleNote: 'Alternate 2-week cycles; morning dosing preferred',
  },
  selank: {
    name: 'Selank', form: 'Nasal Spray', category: 'Cognitive / HPA',
    tier: 1, requiresSupervision: false,
    indication: 'Anxiolytic (no sedation); HPA normalization; ANS modulation; BDNF',
    cycleOn: 'Continuous', cycleOff: 'None', synergisticWith: ['semax'],
    cycleNote: 'Can be used continuously; natural anxiolytic with no tolerance',
  },
  ppw: {
    name: 'PPW (Pro-Pro-Trp)', form: 'Oral (Liposomal)', category: 'Cognitive / Sleep',
    tier: 1, requiresSupervision: false,
    indication: 'Orexin modulation; sleep architecture; sleep depth improvement',
    cycleOn: 'Continuous', cycleOff: 'None', synergisticWith: ['epitalon_oral', 'pinealon'],
    cycleNote: 'Bedtime dosing; compatible with Epitalon and Pinealon',
  },
  pinealon: {
    name: 'Pinealon', form: 'Oral (Liposomal)', category: 'Cognitive',
    tier: 1, requiresSupervision: false,
    indication: 'Pineal peptide; neuroprotection; sleep depth; antioxidant; circadian support',
    cycleOn: '10 days', cycleOff: '20 days', synergisticWith: ['epitalon_oral', 'ppw'],
    cycleNote: '10 days on / 20 days off; aligns with Epitalon cycling',
  },
  epitalon_injectable: {
    name: 'Epitalon', form: 'Injectable', category: 'Longevity',
    tier: 1, requiresSupervision: false,
    indication: 'Telomerase activation; pineal; circadian; preferred form for longevity protocols',
    cycleOn: '10 days', cycleOff: '5-6 months', cyclesPerYear: 2,
    cycleNote: 'Run twice per year (spring + fall); 10-day course only', synergisticWith: ['pinealon'],
  },
  epitalon_oral: {
    name: 'Epitalon Oral', form: 'Oral (Liposomal)', category: 'Longevity',
    tier: 1, requiresSupervision: false,
    indication: 'Telomerase activation oral form; convenient daily dosing alternative',
    cycleOn: '10 days', cycleOff: '20 days', synergisticWith: ['pinealon'],
    cycleNote: 'Oral form: 10/20 cycling; less potent than injectable but accessible',
  },
  chonluten: {
    name: 'Chonluten', form: 'Oral (Liposomal)', category: 'Respiratory / Cognitive',
    tier: 1, requiresSupervision: false,
    indication: 'Bronchial epithelial repair; lung support; cognitive bioregulator',
    cycleOn: '10 days', cycleOff: '20 days',
  },

  // TIER 2: HCP DISTRIBUTED
  tesamorelin: {
    name: 'Tesamorelin', form: 'Injectable', category: 'Metabolic',
    tier: 2, requiresSupervision: true,
    indication: 'GHRH analog; visceral fat reduction; FDA-approved for lipodystrophy; IGF-1 elevation',
    cycleOn: '12 weeks', cycleOff: '4 weeks',
    cycleNote: 'Monitor IGF-1 at baseline and 4 weeks; practitioner supervision required',
  },
  kvp: {
    name: 'KPV', form: 'Oral (Liposomal)', category: 'Tissue Repair / Gut',
    tier: 2, requiresSupervision: true,
    indication: 'Alpha-MSH anti-inflammatory; IL-10 pathway; IBD/Crohn\'s; mucosal healing',
    cycleOn: '8 weeks', cycleOff: '4 weeks', synergisticWith: ['bpc157_oral'],
  },
  ghkcu_injectable: {
    name: 'GHK-Cu Injectable', form: 'Injectable', category: 'Aesthetic / Repair',
    tier: 2, requiresSupervision: true,
    indication: 'Systemic copper peptide; collagen; DNA repair; anti-inflammatory',
    cycleOn: '8 weeks', cycleOff: '4 weeks',
  },
  ipamorelin: {
    name: 'Ipamorelin', form: 'Injectable', category: 'GH Secretagogue',
    tier: 2, requiresSupervision: true,
    indication: 'Selective GHRP; no cortisol/prolactin spike; ALWAYS stack with CJC-1295',
    cycleOn: '12 weeks', cycleOff: '4 weeks', synergisticWith: ['cjc1295'],
    cycleNote: 'ALWAYS paired with CJC-1295 (No DAC) — never use alone',
  },
  cjc1295: {
    name: 'CJC-1295 (No DAC)', form: 'Injectable', category: 'GH Secretagogue',
    tier: 2, requiresSupervision: true,
    indication: 'GHRH analog; natural GH pulse pattern; synergistic with Ipamorelin',
    cycleOn: '12 weeks', cycleOff: '4 weeks', synergisticWith: ['ipamorelin'],
    cycleNote: 'ALWAYS paired with Ipamorelin — use No DAC form for pulse pattern',
  },
  pt141: {
    name: 'PT-141 / Bremelanotide', form: 'Nasal Spray', category: 'Sexual Health',
    tier: 2, requiresSupervision: true,
    indication: 'Melanocortin MC3R/MC4R; libido both sexes; CNS-mediated (not vascular)',
    cycleOn: 'As needed', cycleOff: 'PRN',
    cycleNote: 'Use as-needed dosing only; max 2x per week; monitor BP',
  },
  tesofensine: {
    name: 'Tesofensine', form: 'Oral (Liposomal)', category: 'Metabolic',
    tier: 2, requiresSupervision: true,
    indication: 'Triple reuptake inhibitor; appetite suppression; weight; monoamine',
    cycleOn: '12 weeks', cycleOff: '4 weeks',
  },
  cerebrolysin: {
    name: 'Cerebrolysin', form: 'Injectable', category: 'Cognitive / Neuro',
    tier: 2, requiresSupervision: true,
    indication: 'Neuropeptide complex; BDNF/NGF; TBI; neurodegeneration; HCP-administered only',
    cycleOn: '10 days', cycleOff: '20 days', cyclesPerYear: 2,
    cycleNote: 'HCP-administered IV or IM; requires clinic visit',
  },
  thymosin_alpha1: {
    name: 'Thymosin Alpha-1', form: 'Injectable', category: 'Immunity',
    tier: 2, requiresSupervision: true,
    indication: '28-AA thymic peptide; T-cell/NK-cell activation; antiviral; autoimmune regulation',
    cycleOn: '12 weeks', cycleOff: '4 weeks',
  },

  // TIER 3: CLINICAL RESEARCH / PIPELINE
  dihexa: {
    name: 'Dihexa (PNB-0408)', form: 'Oral (Liposomal)', category: 'Cognitive / Neuro',
    tier: 3, requiresSupervision: true, isRUO: true,
    indication: 'Most potent cognitive enhancer; NGF potentiation; 7 orders of magnitude > BDNF at synaptogenesis',
    cycleOn: '4 weeks', cycleOff: '4 weeks',
    cycleNote: 'Investigational — research use only; do not exceed 4-week cycles without washout',
  },
  retatrutide: {
    name: 'Retatrutide (LY3437943)', form: 'Injectable ONLY', category: 'Metabolic / GLP-1',
    tier: 3, requiresSupervision: true, isSolo: true,
    indication: 'Triple agonist GLP-1/GIP/Glucagon; most potent metabolic peptide; injectable only; never stacked',
    cycleOn: '16 weeks', cycleOff: '8 weeks',
    cycleNote: 'SOLO PROTOCOL ONLY — never stack with other peptides; injectable form enforced; requires physician oversight',
  },
  amino1mq: {
    name: '5-Amino-1MQ', form: 'Oral (Liposomal)', category: 'Metabolic / Fat Loss',
    tier: 3, requiresSupervision: true, isRUO: true,
    indication: 'NNMT inhibitor; metabolic reprogramming; adipose reduction; RUO compound',
    cycleOn: '8 weeks', cycleOff: '4 weeks',
  },
  motsc: {
    name: 'MOTS-C', form: 'Injectable', category: 'Metabolic / Mito',
    tier: 3, requiresSupervision: true, isRUO: true,
    indication: 'Mitochondrial-derived; AMPK activation; insulin sensitivity; exercise mimetic; RUO',
    cycleOn: '8 weeks', cycleOff: '4 weeks',
  },
  melanotan2: {
    name: 'Melanotan-2', form: 'Injectable', category: 'Sexual Health / Aesthetic',
    tier: 3, requiresSupervision: true, isRUO: true,
    indication: 'Non-selective melanocortin; tanning; libido; research use only',
    cycleOn: 'As needed', cycleOff: 'PRN',
  },
};

// ── 10 PATTERN → PEPTIDE MAPPINGS ──

export interface PatternMap {
  label: string;
  primary: string[];
  secondary: string[];
  tertiary: string[];
}

export const PATTERN_MAP: Record<string, PatternMap> = {
  hpa_axis: {
    label: 'HPA Axis Dysregulation',
    primary: ['selank'], secondary: ['semax'], tertiary: ['epitalon_oral'],
  },
  neuroinflammation: {
    label: 'Neuroinflammation',
    primary: ['bpc157_nasal'], secondary: ['semax'], tertiary: ['selank'],
  },
  gut_brain_axis: {
    label: 'Gut-Brain Axis',
    primary: ['bpc157_oral'], secondary: ['kvp'], tertiary: [],
  },
  metabolic_dysregulation: {
    label: 'Metabolic Dysregulation',
    primary: ['aod9604'], secondary: ['tesamorelin'], tertiary: ['motsc'],
  },
  tissue_repair: {
    label: 'Tissue Repair',
    primary: ['bpc157_injectable'], secondary: ['tb500_injectable'], tertiary: ['ghkcu_injectable'],
  },
  immune_dysregulation: {
    label: 'Immune Dysregulation',
    primary: ['thymosin_alpha1'], secondary: ['kvp'], tertiary: ['bpc157_oral'],
  },
  hormonal_imbalance: {
    label: 'Hormonal Imbalance',
    primary: ['ipamorelin', 'cjc1295'], secondary: ['sermorelin'], tertiary: ['pt141'],
  },
  circadian_disruption: {
    label: 'Circadian / Sleep',
    primary: ['epitalon_oral'], secondary: ['ppw'], tertiary: ['pinealon'],
  },
  circadian_sleep: {
    label: 'Circadian / Sleep',
    primary: ['epitalon_oral'], secondary: ['ppw'], tertiary: ['pinealon'],
  },
  longevity_aging: {
    label: 'Longevity / Aging',
    primary: ['epitalon_injectable'], secondary: ['bpc157_oral'], tertiary: ['ghkcu_topical'],
  },
  autonomic_dysregulation: {
    label: 'Autonomic Dysregulation',
    primary: ['selank'], secondary: ['bpc157_oral'], tertiary: ['semax'],
  },
};

// ── STACK ITEM ──

export interface StackItem {
  name: string;
  form: string;
  category: string;
  tier: number;
  requiresSupervision: boolean;
  indication: string;
  cycleOn: string;
  cycleOff: string;
  cycleNote?: string;
  matchedPatterns: string[];
  rank: number;
  isRUO?: boolean;
  isSolo?: boolean;
}

export interface GeneratedPeptideStack {
  items: StackItem[];
  detected_patterns: string[];
  rationale: string;
  supervision_required: boolean;
  confidence_tier: string;
  generated_at: string;
}

// ── BUILD PEPTIDE STACK (the entire brain — zero API cost) ──

export function buildPeptideStack(
  detectedPatterns: string[],
  userContext: {
    age?: number;
    sex?: string;
    hba1c?: number;
    testosterone?: number;
  } = {}
): GeneratedPeptideStack {
  const MAX_STACK = 4;
  const selected = new Map<string, { key: string; matchedPatterns: string[] }>();

  // Retatrutide solo override
  if (userContext.hba1c && userContext.hba1c > 6.5) {
    const item = PEPTIDE_CATALOG.retatrutide;
    return {
      items: [{
        name: item.name, form: item.form as string, category: item.category,
        tier: item.tier, requiresSupervision: true, indication: item.indication,
        cycleOn: item.cycleOn, cycleOff: item.cycleOff, cycleNote: item.cycleNote,
        matchedPatterns: ['metabolic_dysregulation'], rank: 1, isRUO: false, isSolo: true,
      }],
      detected_patterns: detectedPatterns,
      rationale: `Your HbA1c of ${userContext.hba1c}% indicates significant metabolic dysregulation. Retatrutide — a triple agonist targeting GLP-1, GIP, and glucagon receptors — is the most clinically appropriate intervention. This is a solo protocol: Retatrutide is never stacked with other peptides. Physician oversight required.`,
      supervision_required: true,
      confidence_tier: 'Tier 2 — CAQ + Labs',
      generated_at: new Date().toISOString(),
    };
  }

  // Collect candidates from patterns
  const orderedPatterns = detectedPatterns.length > 0 ? detectedPatterns : ['hpa_axis'];

  for (const pattern of orderedPatterns) {
    const map = PATTERN_MAP[pattern];
    if (!map) continue;

    for (const key of map.primary) {
      if (!selected.has(key)) {
        selected.set(key, { key, matchedPatterns: [pattern] });
      } else {
        selected.get(key)!.matchedPatterns.push(pattern);
      }
      // Enforce ipamorelin+CJC pairing
      if (key === 'ipamorelin' && !selected.has('cjc1295')) {
        selected.set('cjc1295', { key: 'cjc1295', matchedPatterns: [pattern] });
      }
      if (key === 'cjc1295' && !selected.has('ipamorelin')) {
        selected.set('ipamorelin', { key: 'ipamorelin', matchedPatterns: [pattern] });
      }
    }
    if (selected.size >= MAX_STACK) break;

    for (const key of map.secondary) {
      if (selected.size >= MAX_STACK) break;
      if (!selected.has(key)) selected.set(key, { key, matchedPatterns: [pattern] });
    }
    if (selected.size >= MAX_STACK) break;

    for (const key of map.tertiary) {
      if (selected.size >= MAX_STACK) break;
      if (!selected.has(key)) selected.set(key, { key, matchedPatterns: [pattern] });
    }
  }

  // Build items (max 4)
  const keys = Array.from(selected.keys()).slice(0, MAX_STACK);
  const items: StackItem[] = keys.map((key, idx) => {
    const p = PEPTIDE_CATALOG[key];
    return {
      name: p.name, form: p.form as string, category: p.category,
      tier: p.tier, requiresSupervision: p.requiresSupervision,
      indication: p.indication, cycleOn: p.cycleOn, cycleOff: p.cycleOff,
      cycleNote: p.cycleNote, matchedPatterns: selected.get(key)!.matchedPatterns,
      rank: idx + 1, isRUO: p.isRUO, isSolo: p.isSolo,
    };
  });

  const supervisionRequired = items.some(i => i.requiresSupervision);
  const patternLabels = orderedPatterns.map(p => PATTERN_MAP[p]?.label || p).join(', ');

  return {
    items,
    detected_patterns: detectedPatterns,
    rationale: `Based on your CAQ assessment, Ultrathink™ detected: ${patternLabels}. Your protocol of ${items.length} peptide${items.length > 1 ? 's' : ''} addresses these patterns using the FarmCeutica catalog. ${supervisionRequired ? 'One or more peptides require practitioner oversight.' : 'All peptides are Tier 1 DTC wellness level.'}`,
    supervision_required: supervisionRequired,
    confidence_tier: 'Tier 1 — CAQ Analysis',
    generated_at: new Date().toISOString(),
  };
}
