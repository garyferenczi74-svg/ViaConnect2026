// Prompt #102 Workstream B — monthly statement PDF generator (pdf-lib).
//
// Helix isolation: this module MUST NOT reference any consumer-rewards
// subsystem naming per Prompt #102 §3.1. Guardrail test asserts no
// forbidden tokens in the rendered PDF body.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const STATEMENT_TEMPLATE_VERSION = 'v2026.04.20';

export interface StatementHoldDetail {
  violationIdRef: string;
  amountCents: number;
  description: string;
}

export interface StatementInput {
  practitionerDisplayName: string;
  periodStart: string;
  periodEnd: string;
  settledOrderCount: number;
  grossAccruedCents: number;
  refundClawbacksCents: number;
  mapViolationHoldsCents: number;
  netPayableCents: number;
  rail: string;
  transactionReference: string | null;
  settlementDate: string | null;
  holdDetails: readonly StatementHoldDetail[];
  ytdGrossCents: number;
  ytdAdjustmentsCents: number;
  ytdNetPaidCents: number;
  taxFormOnFile: 'W-9' | 'W-8BEN' | 'W-8BEN-E' | 'T4A' | 'none';
  taxFormStatus: string;
}

/** Pure helper: format cents as USD currency string. */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100).toLocaleString('en-US');
  const pennies = (abs % 100).toString().padStart(2, '0');
  return `${sign}$${dollars}.${pennies}`;
}

/** Render the statement PDF to bytes. Caller uploads to Supabase
 *  Storage under practitioner_statements.storage_path. */
export async function renderStatementPDF(input: StatementInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // US Letter
  const { height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const drawLine = (y: number) =>
    page.drawLine({
      start: { x: 50, y },
      end: { x: 562, y },
      thickness: 0.5,
      color: rgb(0.6, 0.6, 0.6),
    });

  let y = height - 60;
  page.drawText('ViaCura Practitioner Payout Statement', {
    x: 50, y, size: 16, font: bold, color: rgb(0, 0, 0),
  });
  y -= 22;
  page.drawText(`${input.practitionerDisplayName}`, { x: 50, y, size: 11, font });
  page.drawText(`Period: ${input.periodStart} to ${input.periodEnd}`, { x: 380, y, size: 11, font });
  y -= 18; drawLine(y); y -= 18;

  const row = (label: string, value: string, opts: { amountFont?: typeof font; indent?: number } = {}) => {
    page.drawText(label, { x: 50 + (opts.indent ?? 0), y, size: 10, font });
    page.drawText(value, { x: 480, y, size: 10, font: opts.amountFont ?? font });
    y -= 16;
  };
  const section = (title: string) => {
    page.drawText(title, { x: 50, y, size: 10, font: bold });
    y -= 16;
  };

  section('EARNINGS');
  row('Gross Commission Accrued', formatCents(input.grossAccruedCents), { amountFont: bold });
  row(`  From ${input.settledOrderCount} settled orders`, '', { indent: 10 });
  y -= 6;

  section('ADJUSTMENTS');
  row('Refund Claw-backs', formatCents(-input.refundClawbacksCents));
  row('MAP-Violation Holds', formatCents(-input.mapViolationHoldsCents));
  y -= 6; drawLine(y); y -= 14;

  section('NET PAYABLE');
  row('Net Payable This Period', formatCents(input.netPayableCents), { amountFont: bold });
  row(`Paid via ${input.rail}`, '');
  if (input.transactionReference) row('Transaction Reference', input.transactionReference);
  if (input.settlementDate) row('Settlement Date', input.settlementDate);
  y -= 6; drawLine(y); y -= 14;

  section('HOLD DETAIL');
  if (input.holdDetails.length === 0) {
    row('  None', '', { indent: 10 });
  } else {
    for (const h of input.holdDetails) {
      row(`  Violation ${h.violationIdRef.slice(0, 8)}: ${h.description}`, formatCents(-h.amountCents), { indent: 10 });
    }
  }
  y -= 6; drawLine(y); y -= 14;

  section('YEAR-TO-DATE');
  row('YTD Gross', formatCents(input.ytdGrossCents));
  row('YTD Adjustments', formatCents(-input.ytdAdjustmentsCents));
  row('YTD Net Paid', formatCents(input.ytdNetPaidCents), { amountFont: bold });
  y -= 12; drawLine(y); y -= 14;

  page.drawText(
    `Tax Form on File: ${input.taxFormOnFile}   Status: ${input.taxFormStatus}`,
    { x: 50, y, size: 9, font },
  );

  return await doc.save();
}
