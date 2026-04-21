// Prompt #105 Phase 2b.2 — board pack XLSX renderer.
//
// Ships two worksheets:
//   - "KPIs" — one row per KPI snapshot with unit, prior, delta, provenance.
//   - "Commentary" — one block per section with title + commentary text.
//
// XLSX artifacts are NOT watermarked at the cell level (Excel searchability
// defeats visual watermarks). Identity tracking lives in the distribution
// row + download event audit log instead. Callers must treat XLSX copies
// as traceable via the board_pack_distributions table, not the file bytes.

import ExcelJS from 'exceljs';
import type { PackKPIRow, PackSectionRow } from './boardPackPdfRenderer';
import { scanForForbiddenExecTokens } from '../guardrails';

export interface BoardPackXlsxInput {
  packTitle: string;
  shortCode: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  kpiRows: readonly PackKPIRow[];
  sections: readonly PackSectionRow[];
}

export async function renderBoardPackXlsx(input: BoardPackXlsxInput): Promise<Uint8Array> {
  // Same guardrail defense as PDF — never let forbidden tokens escape into
  // a board-consumed file.
  for (const s of input.sections) {
    if (!s.commentaryMd) continue;
    const r = scanForForbiddenExecTokens(s.commentaryMd);
    if (!r.ok) {
      throw new Error(`RENDER_FORBIDDEN_CONTENT: section "${s.title}" contains forbidden tokens: ${r.hits.map((h) => h.token).join(',')}`);
    }
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'ViaCura Executive Reporting';
  wb.title = input.packTitle;

  const kpiSheet = wb.addWorksheet('KPIs');
  kpiSheet.addRow([input.packTitle]);
  kpiSheet.addRow([`${input.periodType} ${input.periodStart} → ${input.periodEnd}`]);
  kpiSheet.addRow([]);
  kpiSheet.addRow(['KPI', 'Value (numeric)', 'Value (integer)', 'Unit', 'Prior period', 'Δ (%)']);
  kpiSheet.getRow(4).font = { bold: true };

  for (const row of input.kpiRows) {
    kpiSheet.addRow([
      row.displayName,
      row.computedValueNumeric,
      row.computedValueInteger,
      row.unit,
      row.priorPeriodValue,
      row.comparisonDeltaPct !== null ? row.comparisonDeltaPct * 100 : null,
    ]);
  }
  kpiSheet.getColumn(1).width = 40;
  kpiSheet.getColumn(2).width = 18;
  kpiSheet.getColumn(3).width = 18;
  kpiSheet.getColumn(4).width = 14;
  kpiSheet.getColumn(5).width = 18;
  kpiSheet.getColumn(6).width = 12;

  const commentarySheet = wb.addWorksheet('Commentary');
  commentarySheet.addRow([input.packTitle]);
  commentarySheet.addRow([]);
  const ordered = [...input.sections].sort((a, b) => a.sectionOrder - b.sectionOrder);
  for (const s of ordered) {
    const titleRow = commentarySheet.addRow([s.title]);
    titleRow.font = { bold: true, size: 14 };
    commentarySheet.addRow([`[${s.commentarySource}]`]);
    commentarySheet.addRow([s.commentaryMd ?? '(no commentary)']);
    commentarySheet.addRow([]);
  }
  commentarySheet.getColumn(1).width = 100;

  const buffer = await wb.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}
