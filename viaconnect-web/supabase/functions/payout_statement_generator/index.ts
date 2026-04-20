// Prompt #102 Workstream B — monthly statement PDF generator.
// For a given batch line, fetches the practitioner's reconciliation
// run + YTD totals, renders the statement PDF via pdf-lib, uploads to
// private storage bucket practitioner-statements, writes a row in
// practitioner_statements.

// deno-lint-ignore-file no-explicit-any
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';
import { getSupabaseClient, jsonResponse } from '../_operations_shared/shared.ts';

function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100).toLocaleString('en-US');
  const pennies = (abs % 100).toString().padStart(2, '0');
  return `${sign}$${dollars}.${pennies}`;
}

Deno.serve(async (req) => {
  const { batchLineId } = await req.json().catch(() => ({} as Record<string, unknown>));
  if (!batchLineId) return jsonResponse({ error: 'missing batchLineId' }, 400);
  const supabase = getSupabaseClient() as any;

  const { data: line } = await supabase
    .from('payout_batch_lines')
    .select('line_id, batch_id, practitioner_id, reconciliation_run_id, net_payable_cents, rail_used, transaction_reference, paid_at')
    .eq('line_id', batchLineId)
    .maybeSingle();
  if (!line) return jsonResponse({ error: 'line_not_found' }, 404);

  const { data: run } = await supabase
    .from('commission_reconciliation_runs')
    .select('period_start, period_end, gross_accrued_cents, total_clawbacks_cents, total_holds_cents')
    .eq('run_id', line.reconciliation_run_id).maybeSingle();
  if (!run) return jsonResponse({ error: 'run_not_found' }, 404);

  const { data: practitioner } = await supabase
    .from('practitioners')
    .select('display_name')
    .eq('id', line.practitioner_id).maybeSingle();

  // YTD totals — sum of all statements in the current year.
  const yearStart = `${new Date().getUTCFullYear()}-01-01`;
  const { data: ytdRows } = await supabase
    .from('practitioner_statements')
    .select('net_payable_cents')
    .eq('practitioner_id', line.practitioner_id)
    .gte('period_start', yearStart);
  const ytdPaidCents = (ytdRows ?? []).reduce(
    (sum: number, r: { net_payable_cents: number }) => sum + Number(r.net_payable_cents ?? 0),
    0,
  ) + Number(line.net_payable_cents);

  // Render the PDF inline (pdf-lib is bundle-compatible via esm.sh).
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let y = 732;
  page.drawText('ViaCura Practitioner Payout Statement', { x: 50, y, size: 16, font: bold, color: rgb(0, 0, 0) });
  y -= 22;
  page.drawText(practitioner?.display_name ?? 'Practitioner', { x: 50, y, size: 11, font });
  page.drawText(`Period: ${run.period_start} to ${run.period_end}`, { x: 380, y, size: 11, font });
  y -= 24;

  const row = (label: string, value: string, isBold = false) => {
    page.drawText(label, { x: 50, y, size: 10, font });
    page.drawText(value, { x: 480, y, size: 10, font: isBold ? bold : font });
    y -= 16;
  };
  page.drawText('EARNINGS', { x: 50, y, size: 10, font: bold }); y -= 16;
  row('Gross Commission Accrued', formatCents(Number(run.gross_accrued_cents)), true);
  y -= 4;
  page.drawText('ADJUSTMENTS', { x: 50, y, size: 10, font: bold }); y -= 16;
  row('Refund Claw-backs', formatCents(-Number(run.total_clawbacks_cents)));
  row('MAP-Violation Holds', formatCents(-Number(run.total_holds_cents)));
  y -= 4;
  page.drawText('NET PAYABLE', { x: 50, y, size: 10, font: bold }); y -= 16;
  row('Net Payable This Period', formatCents(Number(line.net_payable_cents)), true);
  if (line.rail_used) row('Paid via', line.rail_used);
  if (line.transaction_reference) row('Transaction Reference', line.transaction_reference);
  if (line.paid_at) row('Settlement Date', String(line.paid_at).slice(0, 10));
  y -= 4;
  page.drawText('YEAR-TO-DATE', { x: 50, y, size: 10, font: bold }); y -= 16;
  row('YTD Net Paid', formatCents(ytdPaidCents), true);

  const bytes = await doc.save();
  const storagePath = `statements/${line.practitioner_id}/${run.period_start}_${run.period_end}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from('practitioner-statements')
    .upload(storagePath, bytes, { contentType: 'application/pdf', upsert: true });
  if (uploadError) return jsonResponse({ error: uploadError.message }, 500);

  await supabase.from('practitioner_statements').upsert({
    practitioner_id: line.practitioner_id,
    period_start: run.period_start,
    period_end: run.period_end,
    template_version: 'v2026.04.20',
    storage_path: storagePath,
    net_payable_cents: line.net_payable_cents,
    ytd_paid_cents: ytdPaidCents,
  }, { onConflict: 'practitioner_id,period_start,period_end' });

  return jsonResponse({ generated: true, storage_path: storagePath, bytes: bytes.byteLength });
});
