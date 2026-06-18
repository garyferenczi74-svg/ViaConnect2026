// Prompt 204c overlay (2026-06-18): the My Lab Results read endpoint. Returns
// the member's saved biomarkers, each with its standard reference range and,
// when one of their genetic variants applies, a genetically-adjusted optimal
// range plus the gene that drives it. Owner-scoped via RLS, fail-open to empty.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { buildEnrichedResults, type BiomarkerRow, type VariantRow } from '@/lib/labs/enrichBiomarkers';
import { geneForBiomarker } from '@/lib/api/lab-service';

export async function GET(): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Both tables are new and not in the generated typegen, so cast the client
    // for these reads (the genetics routes use the same pattern). RLS still
    // enforces owner-only because the client is the user-scoped server client.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    const [{ data: bioData }, { data: varData }] = await Promise.all([
      db.from('lab_biomarkers')
        .select('name, value, unit, reference_low, reference_high')
        .eq('user_id', user.id)
        .order('name', { ascending: true }),
      db.from('user_variants')
        .select('rsid, gene, genotype, status')
        .eq('user_id', user.id),
    ]);

    const biomarkers = (bioData ?? []) as BiomarkerRow[];
    const variants = (varData ?? []) as VariantRow[];
    const enriched = buildEnrichedResults(biomarkers, variants);

    const results = enriched.map((b) => {
      const hasGenetic = b.genetic_optimal_low !== null && b.genetic_optimal_high !== null;
      const hasStandard = !(b.reference_range_low === 0 && b.reference_range_high === 0);
      return {
        name: b.name,
        value: b.value,
        unit: b.unit,
        standard: hasStandard ? { low: b.reference_range_low, high: b.reference_range_high } : null,
        geneticOptimal: hasGenetic ? { low: b.genetic_optimal_low, high: b.genetic_optimal_high } : null,
        gene: hasGenetic ? geneForBiomarker(b.name) : null,
        status: b.status,
      };
    });

    return NextResponse.json({ results, totalBiomarkers: results.length });
  } catch (err) {
    safeLog.error('api.labs.results', 'read failed (returning empty)', {
      user_id: user.id, error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ results: [], totalBiomarkers: 0 });
  }
}
