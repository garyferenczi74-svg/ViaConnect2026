// Prompt #105 Phase 2b.2 — board pack PPTX renderer.
//
// Title slide + one slide per MD&A section + one KPI table slide. Used as
// a presentation deck for in-room board reads; recipients still receive
// the PDF (watermarked) as the primary artifact. PPTX has the same
// "not watermarked at cell level" caveat as XLSX — traceability lives
// in distribution + download_event rows.

import PptxGenJS from 'pptxgenjs';
import type { PackKPIRow, PackSectionRow } from './boardPackPdfRenderer';
import { scanForForbiddenExecTokens } from '../guardrails';

export interface BoardPackPptxInput {
  packTitle: string;
  shortCode: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  kpiRows: readonly PackKPIRow[];
  sections: readonly PackSectionRow[];
}

export async function renderBoardPackPptx(input: BoardPackPptxInput): Promise<Uint8Array> {
  for (const s of input.sections) {
    if (!s.commentaryMd) continue;
    const r = scanForForbiddenExecTokens(s.commentaryMd);
    if (!r.ok) {
      throw new Error(`RENDER_FORBIDDEN_CONTENT: section "${s.title}" contains forbidden tokens: ${r.hits.map((h) => h.token).join(',')}`);
    }
  }

  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE';
  pres.title = input.packTitle;

  const title = pres.addSlide();
  title.addText(input.packTitle, {
    x: 0.5, y: 1.5, w: 12, h: 1.5, fontSize: 40, bold: true, color: '111111',
  });
  title.addText(`${input.periodType} ${input.periodStart} → ${input.periodEnd}`, {
    x: 0.5, y: 3.2, w: 12, h: 0.6, fontSize: 18, color: '555555',
  });
  title.addText(`Short code: ${input.shortCode}`, {
    x: 0.5, y: 4.0, w: 12, h: 0.4, fontSize: 12, color: '888888',
  });

  const kpi = pres.addSlide();
  kpi.addText('Key Performance Indicators', {
    x: 0.5, y: 0.4, w: 12, h: 0.6, fontSize: 24, bold: true,
  });
  const kpiTableRows: PptxGenJS.TableRow[] = [
    [
      { text: 'KPI', options: { bold: true, fill: { color: 'EEEEEE' } } },
      { text: 'Value', options: { bold: true, fill: { color: 'EEEEEE' } } },
      { text: 'Unit', options: { bold: true, fill: { color: 'EEEEEE' } } },
      { text: 'Δ vs prior', options: { bold: true, fill: { color: 'EEEEEE' } } },
    ],
  ];
  for (const row of input.kpiRows) {
    const n = row.computedValueNumeric ?? row.computedValueInteger;
    const valueCell = n !== null ? n.toLocaleString('en-US') : '—';
    const deltaCell = row.comparisonDeltaPct !== null
      ? `${row.comparisonDeltaPct > 0 ? '+' : ''}${(row.comparisonDeltaPct * 100).toFixed(1)}%`
      : '';
    kpiTableRows.push([
      { text: row.displayName, options: {} },
      { text: valueCell, options: {} },
      { text: row.unit, options: {} },
      { text: deltaCell, options: {} },
    ]);
  }
  kpi.addTable(kpiTableRows, {
    x: 0.5, y: 1.2, w: 12, fontSize: 11,
    border: { type: 'solid', color: 'CCCCCC', pt: 0.5 },
  });

  const ordered = [...input.sections].sort((a, b) => a.sectionOrder - b.sectionOrder);
  for (const s of ordered) {
    const slide = pres.addSlide();
    slide.addText(s.title, {
      x: 0.5, y: 0.4, w: 12, h: 0.6, fontSize: 24, bold: true,
    });
    slide.addText(s.commentaryMd ?? '(no commentary)', {
      x: 0.5, y: 1.2, w: 12, h: 5.5, fontSize: 14, valign: 'top',
    });
    if (s.commentarySource === 'ai_drafted') {
      slide.addText('AI-drafted; pending human review', {
        x: 0.5, y: 6.8, w: 12, h: 0.4, fontSize: 10, color: 'B85500', italic: true,
      });
    }
  }

  // pptxgenjs .write() returns a Promise<string | ArrayBuffer | Buffer>
  // depending on the outputType. 'nodebuffer' gives us a Node Buffer in
  // Node runtimes. Coerce to Uint8Array.
  const out = await pres.write({ outputType: 'nodebuffer' });
  if (out instanceof Uint8Array) return out;
  if (out instanceof ArrayBuffer) return new Uint8Array(out);
  // Buffer (Node) — inherits from Uint8Array, safe to cast.
  return out as unknown as Uint8Array;
}
