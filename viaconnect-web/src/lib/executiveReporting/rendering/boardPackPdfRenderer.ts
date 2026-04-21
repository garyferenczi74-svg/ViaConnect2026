// Prompt #105 Phase 2b.2 — board pack PDF renderer.
//
// Single-pass PDF build from a pack + its sections + KPI snapshots. Two
// modes:
//   - admin preview: no watermark (fileKind='preview')
//   - recipient copy: per-recipient watermark footer on every page
//     (fileKind='distribution', requires recipient info)
//
// Fiduciary invariants enforced at render time:
//   - All KPI values must reference an aggregation_snapshot whose state
//     is 'cfo_approved' or 'locked'. The caller is responsible for
//     passing only locked-state KPI rows.
//   - Forbidden-upstream guardrail re-applied on section content before
//     emission (defensive belt-and-suspenders over DB guardrail).

import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { scanForForbiddenExecTokens } from '../guardrails';
import { buildWatermarkFooterText } from '../distribution/watermarker';

export interface PackKPIRow {
  kpiId: string;
  displayName: string;
  unit: string;
  computedValueNumeric: number | null;
  computedValueInteger: number | null;
  priorPeriodValue: number | null;
  comparisonDeltaPct: number | null;
}

export interface PackSectionRow {
  sectionOrder: number;
  title: string;
  commentaryMd: string | null;
  commentarySource: 'system' | 'ai_drafted' | 'human_authored' | 'ai_drafted_human_edited';
}

export interface BoardPackPdfInput {
  packTitle: string;
  shortCode: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  ceoIssuedAtISO: string | null;
  kpiRows: readonly PackKPIRow[];
  sections: readonly PackSectionRow[];
  fileKind: 'preview' | 'distribution';
  recipient?: {
    name: string;
    email: string;
    token: string;
    distributedAtISO: string;
  };
}

function formatKPIValue(row: PackKPIRow): string {
  const n = row.computedValueNumeric ?? row.computedValueInteger;
  if (n === null || n === undefined) return '—';
  if (row.unit === 'usd_cents') {
    const abs = Math.abs(n);
    return `$${Math.floor(abs / 100).toLocaleString('en-US')}.${(abs % 100).toString().padStart(2, '0')}`;
  }
  if (row.unit === 'pct') return `${(n * 100).toFixed(1)}%`;
  if (row.unit === 'count') return Math.round(n).toLocaleString('en-US');
  return `${n.toLocaleString('en-US')} ${row.unit}`;
}

function formatDeltaPct(delta: number | null): string {
  if (delta === null || delta === undefined) return '';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${(delta * 100).toFixed(1)}%`;
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.replace(/\r/g, '').split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if (!current) { current = w; continue; }
    if ((current + ' ' + w).length > maxCharsPerLine) {
      lines.push(current);
      current = w;
    } else {
      current = `${current} ${w}`;
    }
  }
  if (current) lines.push(current);
  return lines;
}

interface PageCtx {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
  width: number;
  height: number;
}

function newPage(doc: PDFDocument, font: PDFFont, bold: PDFFont): PageCtx {
  const page = doc.addPage([612, 792]); // US Letter
  const { width, height } = page.getSize();
  return { doc, page, font, bold, y: height - 60, width, height };
}

function drawWatermarkFooter(ctx: PageCtx, input: BoardPackPdfInput): void {
  if (input.fileKind !== 'distribution' || !input.recipient) return;
  const footerText = buildWatermarkFooterText({
    recipientName: input.recipient.name,
    recipientEmail: input.recipient.email,
    distributedAtISO: input.recipient.distributedAtISO,
    token: input.recipient.token,
  });
  // Two-line footer for readability at 8pt.
  ctx.page.drawText(footerText, {
    x: 50, y: 30, size: 7, font: ctx.font, color: rgb(0.45, 0.45, 0.45),
  });
}

function ensureRoom(ctx: PageCtx, input: BoardPackPdfInput, needed: number): PageCtx {
  if (ctx.y - needed > 60) return ctx;
  drawWatermarkFooter(ctx, input);
  const next = newPage(ctx.doc, ctx.font, ctx.bold);
  return next;
}

export async function renderBoardPackPdf(input: BoardPackPdfInput): Promise<Uint8Array> {
  // Guardrail on every section's commentary before emission. Throws on hit —
  // the caller should surface this as a render error (never persist the
  // artifact). Aligns with §3.1 isolation requirements.
  for (const s of input.sections) {
    if (!s.commentaryMd) continue;
    const r = scanForForbiddenExecTokens(s.commentaryMd);
    if (!r.ok) {
      throw new Error(`RENDER_FORBIDDEN_CONTENT: section "${s.title}" contains forbidden tokens: ${r.hits.map((h) => h.token).join(',')}`);
    }
  }

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let ctx = newPage(doc, font, bold);

  // Cover page header.
  ctx.page.drawText(input.packTitle, {
    x: 50, y: ctx.y, size: 20, font: bold, color: rgb(0, 0, 0),
  });
  ctx.y -= 28;

  ctx.page.drawText(`Short code: ${input.shortCode}`, { x: 50, y: ctx.y, size: 10, font });
  ctx.y -= 14;
  ctx.page.drawText(
    `Period: ${input.periodType} — ${input.periodStart} to ${input.periodEnd}`,
    { x: 50, y: ctx.y, size: 10, font },
  );
  ctx.y -= 14;
  if (input.ceoIssuedAtISO) {
    ctx.page.drawText(`Issued: ${input.ceoIssuedAtISO}`, { x: 50, y: ctx.y, size: 10, font });
    ctx.y -= 14;
  }

  if (input.fileKind === 'distribution' && input.recipient) {
    ctx.page.drawText(`Prepared for: ${input.recipient.name} (${input.recipient.email})`, {
      x: 50, y: ctx.y, size: 10, font, color: rgb(0.35, 0.35, 0.35),
    });
    ctx.y -= 14;
  }
  ctx.y -= 10;

  // KPI table.
  ctx = ensureRoom(ctx, input, 60);
  ctx.page.drawText('Key Performance Indicators', { x: 50, y: ctx.y, size: 13, font: bold });
  ctx.y -= 20;

  ctx.page.drawText('KPI', { x: 50, y: ctx.y, size: 9, font: bold });
  ctx.page.drawText('Value', { x: 310, y: ctx.y, size: 9, font: bold });
  ctx.page.drawText('Prior', { x: 420, y: ctx.y, size: 9, font: bold });
  ctx.page.drawText('Δ', { x: 510, y: ctx.y, size: 9, font: bold });
  ctx.y -= 4;
  ctx.page.drawLine({
    start: { x: 50, y: ctx.y }, end: { x: 562, y: ctx.y },
    thickness: 0.5, color: rgb(0.6, 0.6, 0.6),
  });
  ctx.y -= 10;

  for (const row of input.kpiRows) {
    ctx = ensureRoom(ctx, input, 16);
    ctx.page.drawText(row.displayName.slice(0, 45), { x: 50, y: ctx.y, size: 9, font });
    ctx.page.drawText(formatKPIValue(row), { x: 310, y: ctx.y, size: 9, font });
    ctx.page.drawText(
      row.priorPeriodValue !== null ? formatKPIValue({ ...row, computedValueNumeric: row.priorPeriodValue, computedValueInteger: null }) : '—',
      { x: 420, y: ctx.y, size: 9, font },
    );
    ctx.page.drawText(formatDeltaPct(row.comparisonDeltaPct), { x: 510, y: ctx.y, size: 9, font });
    ctx.y -= 14;
  }
  ctx.y -= 8;

  // Sections.
  const orderedSections = [...input.sections].sort((a, b) => a.sectionOrder - b.sectionOrder);
  for (const s of orderedSections) {
    ctx = ensureRoom(ctx, input, 40);
    ctx.page.drawText(s.title, { x: 50, y: ctx.y, size: 13, font: bold });
    ctx.y -= 18;

    if (s.commentarySource === 'ai_drafted' && input.fileKind === 'distribution') {
      ctx.page.drawText('[AI-drafted; pending human review]', {
        x: 50, y: ctx.y, size: 8, font, color: rgb(0.7, 0.35, 0.0),
      });
      ctx.y -= 12;
    }

    if (s.commentaryMd) {
      const lines = wrapText(s.commentaryMd, 105);
      for (const line of lines) {
        ctx = ensureRoom(ctx, input, 14);
        ctx.page.drawText(line, { x: 50, y: ctx.y, size: 10, font });
        ctx.y -= 13;
      }
    }
    ctx.y -= 10;
  }

  // Footer on the final page.
  drawWatermarkFooter(ctx, input);

  return doc.save();
}
