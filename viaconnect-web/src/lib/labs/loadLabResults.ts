// Prompt 204c lab engine (2026-06-18): the single deterministic loader for a
// member's confirmed lab results. Reads lab_biomarkers + user_variants, enriches
// with genetic-optimal ranges, assigns panel groups, and computes the
// optimal/monitor/consult/unknown status tier (critical values force consult).
// Both /api/labs/results and the Hannah decipher flow read through this so they
// always agree.

import { buildEnrichedResults, type BiomarkerRow, type VariantRow } from './enrichBiomarkers';
import { geneForBiomarker } from '@/lib/api/lab-service';
import { panelGroupFor, biomarkerKeyFor, type PanelGroup } from './biomarkerDictionary';
import { statusForBiomarker, applicableRange, type StatusTier, type StatusDirection } from './biomarkerStatus';

export interface LabResultRow {
  name: string;
  value: number;
  unit: string;
  panelGroup: PanelGroup;
  standard: { low: number; high: number } | null;
  geneticOptimal: { low: number; high: number } | null;
  gene: string | null;
  status: string;
  tier: StatusTier;
  direction: StatusDirection;
}

export async function loadLabResults(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<LabResultRow[]> {
  const [{ data: bioData }, { data: varData }] = await Promise.all([
    supabase.from('lab_biomarkers')
      .select('name, value, unit, reference_low, reference_high')
      .eq('user_id', userId)
      .order('name', { ascending: true }),
    supabase.from('user_variants')
      .select('rsid, gene, genotype, status')
      .eq('user_id', userId),
  ]);

  const biomarkers = (bioData ?? []) as BiomarkerRow[];
  const variants = (varData ?? []) as VariantRow[];
  const enriched = buildEnrichedResults(biomarkers, variants);

  return enriched.map((b) => {
    const hasGenetic = b.genetic_optimal_low !== null && b.genetic_optimal_high !== null;
    const hasStandard = !(b.reference_range_low === 0 && b.reference_range_high === 0);
    const printedRange = hasStandard ? { low: b.reference_range_low, high: b.reference_range_high } : null;
    const tier = statusForBiomarker(biomarkerKeyFor(b.name), b.value, b.unit, applicableRange(printedRange, null));
    return {
      name: b.name,
      value: b.value,
      unit: b.unit,
      panelGroup: panelGroupFor(b.name),
      standard: printedRange,
      geneticOptimal: hasGenetic ? { low: b.genetic_optimal_low as number, high: b.genetic_optimal_high as number } : null,
      gene: hasGenetic ? geneForBiomarker(b.name) : null,
      status: b.status,
      tier: tier.tier,
      direction: tier.direction,
    };
  });
}
