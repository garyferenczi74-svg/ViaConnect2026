// Prompt #102 Workstream B — year-end 1099-NEC + T4A generator.
// Invoked Jan 1 for the prior tax year. For each practitioner whose
// total paid meets the IRS/CRA threshold, render the form PDF and
// upload to the tax-documents bucket.

// deno-lint-ignore-file no-explicit-any
import { PDFDocument, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1';
import { getSupabaseClient, jsonResponse } from '../_operations_shared/shared.ts';

const US_1099_THRESHOLD_CENTS = 600_00;
const CA_T4A_THRESHOLD_CENTS = 500_00;

Deno.serve(async (req) => {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const taxYear = Number(body.taxYear ?? new Date().getUTCFullYear() - 1);
  const supabase = getSupabaseClient() as any;

  // Aggregate paid amounts per practitioner for the tax year.
  const yearStart = `${taxYear}-01-01`;
  const yearEnd = `${taxYear}-12-31`;
  const { data: runs } = await supabase
    .from('commission_reconciliation_runs')
    .select('practitioner_id, net_payable_cents')
    .gte('period_start', yearStart)
    .lte('period_end', yearEnd)
    .eq('status', 'paid_out');

  const totals = new Map<string, number>();
  for (const r of (runs ?? []) as Array<{ practitioner_id: string; net_payable_cents: number }>) {
    totals.set(r.practitioner_id, (totals.get(r.practitioner_id) ?? 0) + Number(r.net_payable_cents));
  }

  let generated = 0;
  for (const [practitionerId, totalCents] of totals.entries()) {
    // Look up country of residence on the tax doc.
    const { data: taxDoc } = await supabase
      .from('practitioner_tax_documents')
      .select('form_type, country_of_residence, legal_name_redacted')
      .eq('practitioner_id', practitionerId)
      .eq('status', 'on_file')
      .maybeSingle();
    if (!taxDoc) continue;

    const isUS = taxDoc.country_of_residence === 'US';
    const isCA = taxDoc.country_of_residence === 'CA';
    if (isUS && totalCents < US_1099_THRESHOLD_CENTS) continue;
    if (isCA && totalCents < CA_T4A_THRESHOLD_CENTS) continue;
    if (!isUS && !isCA) continue;

    const doc = await PDFDocument.create();
    const page = doc.addPage([612, 792]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    if (isUS) {
      page.drawText(`Form 1099-NEC — Tax Year ${taxYear}`, { x: 50, y: 740, size: 14, font: bold });
      page.drawText(`Recipient: ${taxDoc.legal_name_redacted ?? 'Practitioner'}`, { x: 50, y: 700, size: 10, font });
      page.drawText(`Box 1: $${(totalCents / 100).toFixed(2)}`, { x: 50, y: 670, size: 12, font: bold });
    } else {
      page.drawText(`T4A — Tax Year ${taxYear}`, { x: 50, y: 740, size: 14, font: bold });
      page.drawText(`Recipient: ${taxDoc.legal_name_redacted ?? 'Practitioner'}`, { x: 50, y: 700, size: 10, font });
      page.drawText(`Box 020: $${(totalCents / 100).toFixed(2)}`, { x: 50, y: 670, size: 12, font: bold });
    }

    const bytes = await doc.save();
    const form = isUS ? '1099-NEC' : 'T4A';
    const storagePath = `tax-documents/${practitionerId}/${taxYear}-${form}.pdf`;
    await supabase.storage.from('tax-documents')
      .upload(storagePath, bytes, { contentType: 'application/pdf', upsert: true });
    generated += 1;
  }
  return jsonResponse({ generated, tax_year: taxYear });
});
