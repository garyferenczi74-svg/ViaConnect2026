// Prompt #102 Workstream B — year-end 1099-NEC + T4A PDF generators.
// Minimal layout matching IRS / CRA field positions; the "real"
// e-file happens via a provider integration in a future prompt.

import { PDFDocument, StandardFonts } from 'pdf-lib';
import { formatCents } from '@/lib/payouts/statementGenerator';

export interface YearEnd1099Input {
  payerName: string;
  payerEIN: string;         // already vault-masked before hitting this fn
  recipientName: string;
  recipientTINMasked: string;
  totalNonemployeeCompensationCents: number;
  taxYear: number;
}

export async function render1099NEC(input: YearEnd1099Input): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  page.drawText(`Form 1099-NEC  —  Tax Year ${input.taxYear}`, { x: 50, y: 740, size: 14, font: bold });
  page.drawText(`Payer: ${input.payerName}  EIN: ${input.payerEIN}`, { x: 50, y: 710, size: 10, font });
  page.drawText(`Recipient: ${input.recipientName}`, { x: 50, y: 690, size: 10, font });
  page.drawText(`Recipient TIN: ${input.recipientTINMasked}`, { x: 50, y: 670, size: 10, font });
  page.drawText(
    `Box 1 (Nonemployee Compensation): ${formatCents(input.totalNonemployeeCompensationCents)}`,
    { x: 50, y: 640, size: 10, font: bold },
  );
  page.drawText(
    'This form is issued for tax reporting purposes. File electronically with the IRS via the service provider of record.',
    { x: 50, y: 60, size: 8, font },
  );
  return await doc.save();
}

export interface YearEndT4AInput {
  payerName: string;
  payerBN: string;
  recipientName: string;
  recipientSINMasked: string;
  totalBox20FeesForServicesCents: number;
  taxYear: number;
}

export async function renderT4A(input: YearEndT4AInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  page.drawText(`T4A  —  Tax Year ${input.taxYear}`, { x: 50, y: 740, size: 14, font: bold });
  page.drawText(`Payer: ${input.payerName}  Business Number: ${input.payerBN}`, { x: 50, y: 710, size: 10, font });
  page.drawText(`Recipient: ${input.recipientName}`, { x: 50, y: 690, size: 10, font });
  page.drawText(`Recipient SIN: ${input.recipientSINMasked}`, { x: 50, y: 670, size: 10, font });
  page.drawText(
    `Box 020 (Fees for services): ${formatCents(input.totalBox20FeesForServicesCents)}`,
    { x: 50, y: 640, size: 10, font: bold },
  );
  page.drawText('File with CRA via provider integration.', { x: 50, y: 60, size: 8, font });
  return await doc.save();
}
