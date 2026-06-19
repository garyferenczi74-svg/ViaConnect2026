// Prompt 204c lab engine (2026-06-18): the single deterministic loader for a
// member's confirmed lab results. Reads lab_biomarkers (now history, multiple
// dated rows per marker) + user_variants, picks the latest value per marker,
// enriches with genetic-optimal ranges, assigns panel groups, computes the
// optimal/monitor/consult/unknown tier (critical values force consult), and
// attaches the per-value confidence and a trend across repeat results. Both
// /api/labs/results and the Hannah decipher flow read through this so they agree.

import { buildEnrichedResults, type BiomarkerRow, type VariantRow } from './enrichBiomarkers';
import { geneForBiomarker } from '@/lib/api/lab-service';
import { panelGroupFor, biomarkerKeyFor, type PanelGroup } from './biomarkerDictionary';
import { statusForBiomarker, applicableRange, type StatusTier, type StatusDirection } from './biomarkerStatus';

export interface TrendPoint {
  date: string;
  value: number;
}

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
  confidence: string | null;
  collectionDate: string | null;
  /** Chronological history when the marker has more than one confirmed result. */
  trend: TrendPoint[] | null;
}

interface RawRow {
  name: string;
  value: number;
  unit: string | null;
  reference_low: number | null;
  reference_high: number | null;
  confidence: string | null;
  collection_date: string | null;
}

export async function loadLabResults(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<LabResultRow[]> {
  const [{ data: bioData }, { data: varData }] = await Promise.all([
    supabase.from('lab_biomarkers')
      .select('name, value, unit, reference_low, reference_high, confidence, collection_date')
      .eq('user_id', userId)
      .order('collection_date', { ascending: true }),
    supabase.from('user_variants')
      .select('rsid, gene, genotype, status')
      .eq('user_id', userId),
  ]);

  const variants = (varData ?? []) as VariantRow[];

  // Group the dated rows by marker name, keeping chronological order.
  const byName = new Map<string, RawRow[]>();
  for (const r of (bioData ?? []) as RawRow[]) {
    const list = byName.get(r.name);
    if (list) list.push(r);
    else byName.set(r.name, [r]);
  }

  const latest: BiomarkerRow[] = [];
  const meta = new Map<string, { confidence: string | null; collectionDate: string | null; trend: TrendPoint[] | null }>();
  for (const [name, rows] of byName) {
    const last = rows[rows.length - 1];
    latest.push({
      name,
      value: last.value,
      unit: last.unit,
      reference_low: last.reference_low,
      reference_high: last.reference_high,
    });
    meta.set(name, {
      confidence: last.confidence,
      collectionDate: last.collection_date,
      trend: rows.length > 1 ? rows.map((r) => ({ date: r.collection_date ?? '', value: r.value })) : null,
    });
  }

  const enriched = buildEnrichedResults(latest, variants);

  return enriched.map((b) => {
    const hasGenetic = b.genetic_optimal_low !== null && b.genetic_optimal_high !== null;
    const hasStandard = !(b.reference_range_low === 0 && b.reference_range_high === 0);
    const printedRange = hasStandard ? { low: b.reference_range_low, high: b.reference_range_high } : null;
    const tier = statusForBiomarker(biomarkerKeyFor(b.name), b.value, b.unit, applicableRange(printedRange, null));
    const m = meta.get(b.name);
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
      confidence: m?.confidence ?? null,
      collectionDate: m?.collectionDate ?? null,
      trend: m?.trend ?? null,
    };
  });
}
