// Prompt #111 — VAT/GST invoice PDF generation using pdf-lib.
// Approved per memory project_prompt_105_deps_approved (pdf-lib over Puppeteer).
// Invoice numbers come from allocate_vat_invoice_number() Postgres RPC;
// sequence name is jurisdiction-scoped (vat_invoice_seq_eu / _uk / _au).
//
// Regulatory fields per Sherlock review (2026-04-22):
//   EU   : Art 226 Dir 2006/112/EC — supplier legal address, supplier VAT,
//          customer name/address (+VAT if B2B), supply date, invoice date,
//          unique invoice number, per-line VAT rate + amount, gross/net totals,
//          reverse-charge annotation when applicable.
//   UK   : HMRC Notice 700 §16.3.2 (full VAT invoice >£250) — supplier VAT,
//          supplier address, invoice number, supply date, customer address,
//          per-line rate + VAT amount, net/VAT/gross totals, currency code
//          if non-GBP.
//   AU   : A New Tax System (GST) Act s.29-70(1)(c) — document titled
//          "TAX INVOICE", supplier ABN, GST amount.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CurrencyCode } from "./types";
import { CURRENCY_SYMBOL } from "./types";

export type VatJurisdiction = "EU" | "UK" | "AU";

export interface VatInvoiceLineItem {
  description: string;
  quantity: number;
  unit_price_cents: number;
  net_cents: number;
  vat_rate_pct: number;
  vat_cents: number;
}

export interface VatInvoiceInput {
  jurisdiction: VatJurisdiction;
  orderId: string;
  supplyDate: string; // YYYY-MM-DD
  customerName: string;
  customerAddress: string;
  customerVatNumber: string | null;
  customerVatValidated: boolean | null;
  supplierName: string;
  supplierAddress: string;
  supplierVatNumber: string;
  supplierAbn?: string; // Required when jurisdiction === 'AU'
  currency: CurrencyCode;
  netAmountCents: number;
  vatRatePct: number;
  vatAmountCents: number;
  grossAmountCents: number;
  reverseChargeApplied: boolean;
  lineItems: VatInvoiceLineItem[];
}

export interface VatInvoiceResult {
  invoiceId: string;
  invoiceNumber: string;
  pdfBytes: Uint8Array;
  pdfSha256: string;
}

const SEQUENCE_NAME: Record<VatJurisdiction, string> = {
  EU: "vat_invoice_seq_eu",
  UK: "vat_invoice_seq_uk",
  AU: "vat_invoice_seq_au",
};

const INVOICE_TITLE: Record<VatJurisdiction, string> = {
  // AU ATO s.29-70(1)(c) requires the literal text "TAX INVOICE".
  // EU/UK do not mandate the word "TAX", but "VAT INVOICE" is the industry standard label.
  EU: "VAT INVOICE",
  UK: "VAT INVOICE",
  AU: "TAX INVOICE",
};

function formatMoney(cents: number, currency: CurrencyCode): string {
  const major = cents / 100;
  return `${CURRENCY_SYMBOL[currency]}${major.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Allocates the next gap-less invoice number for the jurisdiction, renders
 * the PDF, persists the invoice row, and returns the PDF bytes + SHA-256.
 * The caller is responsible for uploading the PDF to storage and updating
 * invoice_pdf_vault_ref + invoice_pdf_sha256 on the row.
 */
export async function generateVatInvoice(input: VatInvoiceInput): Promise<VatInvoiceResult> {
  if (input.jurisdiction === "AU" && !input.supplierAbn) {
    throw new Error("Prompt #111 VAT invoice: supplierAbn is required for AU jurisdiction (ATO s.29-70).");
  }

  const admin = createAdminClient();

  const seqName = SEQUENCE_NAME[input.jurisdiction];
  const { data: numData, error: numErr } = await admin.rpc("allocate_vat_invoice_number", {
    p_sequence_name: seqName,
  });
  if (numErr || !numData) {
    throw new Error(`Prompt #111 VAT invoice: sequence allocation failed: ${numErr?.message ?? "no number"}`);
  }
  const invoiceNumber = numData as unknown as string;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.102, 0.153, 0.267);

  let y = 780;
  const draw = (text: string, x: number, yy: number, size = 11, bold = false) => {
    page.drawText(text, { x, y: yy, size, font: bold ? helvBold : helv, color: navy });
  };

  draw(INVOICE_TITLE[input.jurisdiction], 40, y, 20, true); y -= 30;
  draw(`Invoice No: ${invoiceNumber}`, 40, y); y -= 16;
  draw(`Issue Date: ${new Date().toISOString().slice(0, 10)}`, 40, y); y -= 16;
  draw(`Supply Date: ${input.supplyDate}`, 40, y); y -= 16;
  draw(`Jurisdiction: ${input.jurisdiction}`, 40, y); y -= 16;
  draw(`Currency: ${input.currency}`, 40, y); y -= 24;

  draw("Supplier", 40, y, 12, true); y -= 14;
  draw(input.supplierName, 40, y); y -= 14;
  for (const line of input.supplierAddress.split("\n")) { draw(line, 40, y); y -= 14; }
  draw(`VAT Number: ${input.supplierVatNumber}`, 40, y); y -= 14;
  if (input.jurisdiction === "AU" && input.supplierAbn) {
    draw(`ABN: ${input.supplierAbn}`, 40, y); y -= 14;
  }
  y -= 8;

  draw("Customer", 40, y, 12, true); y -= 14;
  draw(input.customerName, 40, y); y -= 14;
  for (const line of input.customerAddress.split("\n")) { draw(line, 40, y); y -= 14; }
  if (input.customerVatNumber) {
    const validatedSuffix = input.customerVatValidated ? " (validated)" : "";
    draw(`Customer VAT: ${input.customerVatNumber}${validatedSuffix}`, 40, y);
    y -= 18;
  } else {
    y -= 4;
  }

  draw("Description", 40, y, 11, true);
  draw("Qty",    255, y, 11, true);
  draw("Unit",   290, y, 11, true);
  draw("Net",    370, y, 11, true);
  draw("VAT %",  440, y, 11, true);
  draw("VAT",    485, y, 11, true);
  y -= 14;
  for (const li of input.lineItems) {
    draw(li.description.slice(0, 40), 40, y);
    draw(String(li.quantity), 255, y);
    draw(formatMoney(li.unit_price_cents, input.currency), 290, y, 9);
    draw(formatMoney(li.net_cents, input.currency), 370, y, 9);
    draw(`${li.vat_rate_pct.toFixed(1)}%`, 440, y);
    draw(formatMoney(li.vat_cents, input.currency), 485, y, 9);
    y -= 14;
  }
  y -= 10;
  draw(`Net Total: ${formatMoney(input.netAmountCents, input.currency)}`, 340, y); y -= 14;
  draw(`VAT @ ${input.vatRatePct.toFixed(2)}%: ${formatMoney(input.vatAmountCents, input.currency)}`, 340, y); y -= 14;
  draw(`Gross Total: ${formatMoney(input.grossAmountCents, input.currency)}`, 340, y, 12, true); y -= 22;

  if (input.reverseChargeApplied) {
    draw("Reverse Charge: VAT to be accounted for by the recipient (EU B2B cross-border).", 40, y, 10);
    y -= 14;
  }
  draw("This invoice meets jurisdictional record-keeping requirements.", 40, 60, 9);

  const pdfBytes = await pdf.save();
  const pdfSha256 = await sha256Hex(pdfBytes);

  const { data: inserted, error: insErr } = await admin
    .from("international_vat_invoices")
    .insert({
      order_id: input.orderId,
      invoice_number: invoiceNumber,
      jurisdiction_code: input.jurisdiction,
      supply_date: input.supplyDate,
      customer_name: input.customerName,
      customer_address: input.customerAddress,
      customer_vat_number: input.customerVatNumber,
      customer_vat_validated: input.customerVatValidated,
      supplier_vat_number: input.supplierVatNumber,
      currency_code: input.currency,
      net_amount_cents: input.netAmountCents,
      vat_rate_pct: input.vatRatePct,
      vat_amount_cents: input.vatAmountCents,
      gross_amount_cents: input.grossAmountCents,
      reverse_charge_applied: input.reverseChargeApplied,
      status: "issued",
      invoice_pdf_sha256: pdfSha256,
    })
    .select("invoice_id")
    .single();

  if (insErr || !inserted) {
    throw new Error(`Prompt #111 VAT invoice insert failed: ${insErr?.message ?? "unknown"}`);
  }

  return {
    invoiceId: (inserted as { invoice_id: string }).invoice_id,
    invoiceNumber,
    pdfBytes,
    pdfSha256,
  };
}
