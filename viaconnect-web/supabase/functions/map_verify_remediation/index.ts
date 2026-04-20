// Prompt #100 map_verify_remediation
// Re-scans the source URL after a practitioner submits remediation
// evidence. If the observed price is at or above MAP, marks the
// violation remediated; otherwise extends the grace period by 24h.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const { evidenceId } = await req.json();
  if (!evidenceId) return jsonResponse({ error: 'missing evidenceId' }, 400);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const { data: evidence } = await (supabase as any)
    .from('map_remediation_evidence')
    .select('evidence_id, violation_id, url_scanned, practitioner_id')
    .eq('evidence_id', evidenceId)
    .maybeSingle();
  if (!evidence) return jsonResponse({ error: 'evidence not found' }, 404);

  const { data: violation } = await (supabase as any)
    .from('map_violations')
    .select('violation_id, product_id, map_price_cents, grace_period_ends_at')
    .eq('violation_id', evidence.violation_id)
    .maybeSingle();
  if (!violation) return jsonResponse({ error: 'violation not found' }, 404);

  // Real scraper call deferred; placeholder returns the practitioner's
  // self-reported price from the evidence row if present.
  const { data: freshEvidence } = await (supabase as any)
    .from('map_remediation_evidence')
    .select('scanned_price_cents')
    .eq('evidence_id', evidenceId)
    .maybeSingle();
  const scannedCents = Number(freshEvidence?.scanned_price_cents ?? 0);
  const verified = scannedCents >= Number(violation.map_price_cents);

  await (supabase as any)
    .from('map_remediation_evidence')
    .update({ verified_by_system: verified, verified_at: new Date().toISOString() })
    .eq('evidence_id', evidenceId);

  if (verified) {
    await (supabase as any)
      .from('map_violations')
      .update({ status: 'remediated', remediated_at: new Date().toISOString() })
      .eq('violation_id', violation.violation_id);
  } else {
    // Extend grace period by 24 hours.
    const extended = new Date(
      new Date(violation.grace_period_ends_at).getTime() + 24 * 60 * 60 * 1000,
    ).toISOString();
    await (supabase as any)
      .from('map_violations')
      .update({ grace_period_ends_at: extended, remediation_deadline_at: extended })
      .eq('violation_id', violation.violation_id);
  }

  return jsonResponse({ verified, scanned_price_cents: scannedCents });
});
