// Prompt 204c overlay (2026-06-18): adapt the member's stored user_variants and
// lab_biomarkers into the lab-service shapes, then enrich each biomarker with a
// genetically-adjusted optimal range. The optimal ranges and the gene/biomarker
// relationships live in lab-service.ts (functional-medicine targets, vetted by
// Hannah); this module only maps the stored data into them.

import {
  enrichLabResults,
  type Biomarker,
  type GeneticProfile,
  type EnrichedBiomarker,
} from '@/lib/api/lab-service';

export interface VariantRow {
  rsid: string;
  gene: string | null;
  genotype: string | null;
  status: string | null;
}

export interface BiomarkerRow {
  name: string;
  value: number | null;
  unit: string | null;
  reference_low: number | null;
  reference_high: number | null;
}

/** Map our +/+ +/- -/- status to the lab-service impact levels. */
export function statusToImpact(status: string | null): 'low' | 'moderate' | 'high' {
  if (status === '+/+') return 'high';
  if (status === '+/-' || status === '-/+') return 'moderate';
  return 'low';
}

export function buildEnrichedResults(
  biomarkers: BiomarkerRow[],
  variants: VariantRow[],
): EnrichedBiomarker[] {
  const profile: GeneticProfile[] = variants.map((v) => ({
    gene: v.gene ?? '',
    variant: '',
    rs_id: v.rsid,
    genotype: v.genotype ?? '',
    impact: statusToImpact(v.status),
    category: '',
  }));

  const bios: Biomarker[] = biomarkers
    .filter((b): b is BiomarkerRow & { value: number } => typeof b.value === 'number')
    .map((b) => ({
      name: b.name,
      value: b.value,
      unit: b.unit ?? '',
      reference_range_low: b.reference_low ?? 0,
      reference_range_high: b.reference_high ?? 0,
    }));

  return enrichLabResults(bios, profile);
}
