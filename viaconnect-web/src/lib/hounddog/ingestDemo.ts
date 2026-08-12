/**
 * Prompt 213a: one working Hound Dog ingestion path (demo clinical study).
 * Respects aggregate-only rule; stores source URL + retrieval timestamp.
 */

import type { createAdminClient } from '@/lib/supabase/admin';
import { evaluateHoundDogGate, processHoundDogGateQueue } from './gate';

type AdminClient = ReturnType<typeof createAdminClient>;

/** Seed a single safe educational clinical-style item and run the gate. */
export async function ingestDemoClinicalStudy(supabase: AdminClient): Promise<{
  stagingId: string | null;
  gateVerdict: string;
}> {
  const sourceUrl = 'https://pubmed.ncbi.nlm.nih.gov/demo-viaconnect-213a-nad';
  const title = 'NAD+ precursor nutrition research summary (educational)';
  const summary =
    'Peer-reviewed literature discusses NAD+ metabolism and cellular energy pathways. ' +
    'This is structure and function education only. Bioavailability framing uses 10x to 28x when stated. ' +
    'Not a disease treatment claim.';

  const pre = evaluateHoundDogGate({
    title,
    summary,
    source_url: sourceUrl,
    source_type: 'clinical_study',
  });

  const { data, error } = await supabase
    .from('hounddog_staging_items')
    .upsert(
      {
        source_url: sourceUrl,
        source_type: 'clinical_study',
        title,
        summary,
        retrieved_at: new Date().toISOString(),
        raw_payload: { demo: true, robots_ok: true },
        is_aggregate_only: true,
        robots_ok: true,
        gate_status: 'pending',
      },
      { onConflict: 'source_url' },
    )
    .select('id')
    .maybeSingle();

  if (error || !data) {
    return { stagingId: null, gateVerdict: pre.verdict };
  }

  await processHoundDogGateQueue(supabase, 5);
  const row = data as { id?: string };
  return { stagingId: row.id ?? null, gateVerdict: pre.verdict };
}
