// Brief 3: protocol-match chips and protocol-tied micro rings.
// Educational only. Live nutrigen_dx is ACTN3/FTO/VDR. MTHFR folate chip
// only when the protocol has MTHFR on genex_m. No invented gene scores.

import { CLINICAL_SNPS } from '@/lib/genetics/clinicalSnps';
import { normalizeObservedPanelKey } from '@/lib/genetics/panelKeyAliases';
import {
  EDUCATIONAL_PROTOCOL_NOTE,
  LIVE_NUTRIGEN_DX_GENES,
  MTHFR_GENE,
  MTHFR_RSIDS,
  type MealCardContract,
  type ProtocolMatchChip,
  type ProtocolMatchResult,
  type ProtocolMicroRing,
  type ProtocolPanel,
  type ProtocolSynthesisInput,
  type ProtocolVariantInput,
} from './types';

const MTHFR_RSID_SET = new Set<string>(MTHFR_RSIDS.map((id) => id.toLowerCase()));
const LIVE_NUTRIGEN_SET = new Set<string>(LIVE_NUTRIGEN_DX_GENES);

interface ClinicalHit {
  gene: string;
  catalogPanel: 'methylation' | 'nutrition' | null;
}

function clinicalForRsid(rsid: string): ClinicalHit | null {
  const needle = rsid.trim().toLowerCase();
  if (!needle) return null;
  const hit = CLINICAL_SNPS.find((row) => row.rsid.toLowerCase() === needle);
  if (!hit) return null;
  const catalogPanel =
    hit.panel_key === 'methylation' || hit.panel_key === 'nutrition'
      ? hit.panel_key
      : null;
  return { gene: hit.gene.toUpperCase(), catalogPanel };
}

function protocolPanelFromVariant(panelKey: string): ProtocolPanel | null {
  const normalized = normalizeObservedPanelKey(panelKey);
  if (normalized === 'methylation') return 'genex_m';
  if (normalized === 'nutrition') return 'nutrigen_dx';
  return null;
}

function variantForGene(
  gene: string,
  variants: readonly ProtocolVariantInput[],
): ProtocolVariantInput | null {
  const upper = gene.toUpperCase();
  return variants.find((v) => (v.gene ?? '').toUpperCase() === upper) ?? null;
}

function variantForRsid(
  rsid: string,
  variants: readonly ProtocolVariantInput[],
): ProtocolVariantInput | null {
  const needle = rsid.trim().toLowerCase();
  return variants.find((v) => v.rsid.toLowerCase() === needle) ?? null;
}

/**
 * MTHFR folate chip is allowed only when the protocol cites an MTHFR rsid
 * and the member has MTHFR on genex_m (methylation). NutrigenDX must not
 * invent MTHFR.
 */
export function canShowMthfrFolateChip(
  protocol: ProtocolSynthesisInput,
  variants: readonly ProtocolVariantInput[],
): boolean {
  const protocolHasMthfr = protocol.recommended.some((item) =>
    MTHFR_RSID_SET.has(item.ruleRsid.trim().toLowerCase()),
  );
  if (!protocolHasMthfr) return false;
  return variants.some((v) => {
    const gene = (v.gene ?? '').toUpperCase();
    const rsid = v.rsid.toLowerCase();
    const isMthfr = gene === MTHFR_GENE || MTHFR_RSID_SET.has(rsid);
    return isMthfr && protocolPanelFromVariant(v.panelKey) === 'genex_m';
  });
}

function isLiveNutrigenGene(gene: string): boolean {
  return LIVE_NUTRIGEN_SET.has(gene.toUpperCase());
}

/**
 * A gene may drive a chip only from live data:
 *   MTHFR -> genex_m only
 *   ACTN3/FTO/VDR -> nutrigen_dx (and VDR may also appear on genex_m)
 * Unknown genes are skipped. No invented scores.
 */
export function allowedGenePanel(
  gene: string,
  panel: ProtocolPanel | null,
): ProtocolPanel | null {
  const upper = gene.toUpperCase();
  if (!panel) return null;
  if (upper === MTHFR_GENE) {
    return panel === 'genex_m' ? 'genex_m' : null;
  }
  if (upper === 'ACTN3' || upper === 'FTO') {
    return panel === 'nutrigen_dx' ? 'nutrigen_dx' : null;
  }
  if (upper === 'VDR') {
    if (panel === 'nutrigen_dx' || panel === 'genex_m') return panel;
    return null;
  }
  return null;
}

function haystackFromContract(contract: MealCardContract): string {
  return [contract.servingDescription, ...contract.foodNames]
    .join(' ')
    .toLowerCase();
}

const FOOD_HINTS: Readonly<Record<string, readonly string[]>> = {
  'leafy greens': ['spinach', 'kale', 'lettuce', 'greens', 'arugula', 'chard', 'folate'],
  'folic-acid-fortified grains': ['fortified', 'folic acid', 'cereal', 'white bread'],
  'high-dose folic acid supplements': ['folic acid'],
  'unfortified folic acid': ['folic acid'],
  'l-methylfolate': ['spinach', 'kale', 'lentil', 'chickpea', 'asparagus', 'folate'],
  'methylfolate': ['spinach', 'kale', 'lentil', 'chickpea', 'asparagus', 'folate'],
};

function matchesGuidance(haystack: string, item: string): boolean {
  const needle = item.trim().toLowerCase();
  if (!needle) return false;
  if (haystack.includes(needle)) return true;
  const hints = FOOD_HINTS[needle];
  if (!hints) return false;
  return hints.some((hint) => haystack.includes(hint));
}

interface EducationalMicroRef {
  nutrientKey: string;
  label: string;
  unit: string;
  refAmount: number;
}

const FORM_TO_MICRO: ReadonlyArray<{ match: RegExp; ref: EducationalMicroRef; geneGate: string }> = [
  {
    match: /methylfolate|folate|folic/,
    ref: { nutrientKey: 'folate', label: 'Folate', unit: 'mcg', refAmount: 400 },
    geneGate: MTHFR_GENE,
  },
  {
    match: /vitamin d|cholecalciferol|d3/,
    ref: { nutrientKey: 'vitamin_d', label: 'Vitamin D', unit: 'mcg', refAmount: 20 },
    geneGate: 'VDR',
  },
  {
    match: /methylcobalamin|vitamin b12|b12/,
    ref: { nutrientKey: 'vitamin_b12', label: 'Vitamin B12', unit: 'mcg', refAmount: 2.4 },
    geneGate: 'MTR',
  },
];

function chipId(kind: string, key: string): string {
  return `${kind}:${key}`.toLowerCase().replace(/[^a-z0-9:]+/g, '-');
}

function geneBody(gene: string, panel: ProtocolPanel): string {
  if (gene === MTHFR_GENE) {
    return 'Food folate on this plate is educational context for your genex_m protocol. It is not a diagnosis.';
  }
  if (gene === 'FTO') {
    return 'Protein and fiber on this plate are educational context for FTO appetite tendencies. Not a gene score.';
  }
  if (gene === 'ACTN3') {
    return 'Protein on this plate is educational context for ACTN3 training tendencies. Not a performance assay.';
  }
  if (gene === 'VDR') {
    const origin = panel === 'nutrigen_dx' ? 'NutrigenDX' : 'genex_m';
    return `Vitamin D rich foods are educational context for VDR on ${origin}. Not a diagnosis.`;
  }
  return 'Educational protocol context for this plate. Not a diagnosis.';
}

export function matchMealToProtocol(
  contract: MealCardContract,
  protocol: ProtocolSynthesisInput,
  variants: readonly ProtocolVariantInput[],
): ProtocolMatchResult {
  const chips: ProtocolMatchChip[] = [];
  const seen = new Set<string>();
  const haystack = haystackFromContract(contract);
  const mthfrOk = canShowMthfrFolateChip(protocol, variants);

  for (const item of protocol.prefer) {
    if (!matchesGuidance(haystack, item)) continue;
    const id = chipId('prefer', item);
    if (seen.has(id)) continue;
    seen.add(id);
    chips.push({
      id,
      kind: 'prefer',
      label: item,
      body: 'This plate lines up with a prefer item on your protocol. Educational, not diagnostic.',
      gene: null,
      panel: null,
    });
  }

  for (const item of protocol.avoid) {
    if (!matchesGuidance(haystack, item)) continue;
    const id = chipId('watch', item);
    if (seen.has(id)) continue;
    seen.add(id);
    chips.push({
      id,
      kind: 'watch',
      label: item,
      body: 'This plate may include an item your protocol flags to limit. Educational, not diagnostic.',
      gene: null,
      panel: null,
    });
  }

  if (mthfrOk) {
    const id = chipId('gene', 'mthfr-folate');
    seen.add(id);
    chips.push({
      id,
      kind: 'gene',
      label: 'Folate / MTHFR',
      body: geneBody(MTHFR_GENE, 'genex_m'),
      gene: MTHFR_GENE,
      panel: 'genex_m',
    });
  }

  for (const rec of protocol.recommended) {
    const clinical = clinicalForRsid(rec.ruleRsid);
    const byRsid = variantForRsid(rec.ruleRsid, variants);
    const gene = (clinical?.gene ?? byRsid?.gene ?? '').toUpperCase();
    if (!gene) continue;
    if (gene === MTHFR_GENE) continue;
    const variant = byRsid ?? variantForGene(gene, variants);
    if (!variant) continue;
    const panel = allowedGenePanel(gene, protocolPanelFromVariant(variant.panelKey));
    if (!panel) continue;
    if (panel === 'nutrigen_dx' && !isLiveNutrigenGene(gene)) continue;
    const id = chipId('gene', gene);
    if (seen.has(id)) continue;
    seen.add(id);
    chips.push({
      id,
      kind: 'gene',
      label: gene,
      body: geneBody(gene, panel),
      gene,
      panel,
    });
  }

  const rings: ProtocolMicroRing[] = [];
  const ringSeen = new Set<string>();
  for (const rec of protocol.recommended) {
    const clinical = clinicalForRsid(rec.ruleRsid);
    const byRsid = variantForRsid(rec.ruleRsid, variants);
    const gene = (clinical?.gene ?? byRsid?.gene ?? '').toUpperCase();
    const form = rec.form.toLowerCase();
    const mapped = FORM_TO_MICRO.find((row) => row.match.test(form));
    if (!mapped) continue;
    if (mapped.geneGate === MTHFR_GENE && !mthfrOk) continue;
    if (mapped.geneGate === 'MTR') {
      const variant = variantForGene('MTR', variants) ?? variantForGene('MTRR', variants);
      if (!variant || protocolPanelFromVariant(variant.panelKey) !== 'genex_m') continue;
    }
    if (mapped.geneGate === 'VDR') {
      const variant = variantForGene('VDR', variants) ?? byRsid;
      if (!variant) continue;
      const panel = allowedGenePanel('VDR', protocolPanelFromVariant(variant.panelKey));
      if (!panel) continue;
    }
    if (ringSeen.has(mapped.ref.nutrientKey)) continue;
    ringSeen.add(mapped.ref.nutrientKey);
    const amountRaw = contract.micronutrients[mapped.ref.nutrientKey];
    const unmeasured = typeof amountRaw !== 'number' || !Number.isFinite(amountRaw);
    const amount = unmeasured ? null : amountRaw;
    const fillPct = unmeasured
      ? 0
      : Math.max(0, Math.min(100, Math.round((amountRaw / mapped.ref.refAmount) * 100)));
    let panel: ProtocolPanel | null = null;
    if (mapped.geneGate === MTHFR_GENE) panel = 'genex_m';
    else if (mapped.geneGate === 'VDR') {
      const variant = variantForGene('VDR', variants) ?? byRsid;
      panel = variant ? allowedGenePanel('VDR', protocolPanelFromVariant(variant.panelKey)) : null;
    } else if (mapped.geneGate === 'MTR') {
      panel = 'genex_m';
    }
    rings.push({
      id: `ring:${mapped.ref.nutrientKey}`,
      nutrientKey: mapped.ref.nutrientKey,
      label: mapped.ref.label,
      unit: mapped.ref.unit,
      amount,
      fillPct,
      gene: gene || mapped.geneGate,
      panel,
      unmeasured,
    });
  }

  return {
    chips,
    rings,
    educationalNote: EDUCATIONAL_PROTOCOL_NOTE,
  };
}
