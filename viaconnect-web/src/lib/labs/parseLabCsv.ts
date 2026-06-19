// Prompt 204c lab engine (2026-06-18): pure CSV parser for a lab export. Detects
// a header row and maps columns by keyword (name, value, unit, reference range
// or low/high), then reads each data row into a biomarker. Reuses the LabBiomarker
// shape from the PDF parser so a CSV upload feeds the same verify-before-save
// flow. Rows it cannot read (no name or non-numeric value) are skipped, never
// guessed.

import type { LabBiomarker } from './parseLabReportText';

// Split one CSV line into cells, honoring double-quoted fields that contain commas.
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      cells.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

function findCol(header: string[], keywords: string[]): number {
  for (let i = 0; i < header.length; i++) {
    const h = header[i].toLowerCase();
    if (keywords.some((k) => h.includes(k))) return i;
  }
  return -1;
}

function flagFor(value: number, low: number | null, high: number | null): LabBiomarker['flag'] {
  if (low === null || high === null) return null;
  if (value < low) return 'low';
  if (value > high) return 'high';
  return 'normal';
}

// Parse a "30-100" or "30 to 100" range cell into low/high.
function parseRangeCell(cell: string): { low: number | null; high: number | null } {
  const m = cell.match(/(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)/i);
  if (!m) return { low: null, high: null };
  return { low: Number(m[1]), high: Number(m[2]) };
}

export function parseLabCsv(text: string): LabBiomarker[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Find the header row: a row naming the marker and the value columns.
  let headerIdx = -1;
  let header: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const nameCol = findCol(cells, ['name', 'biomarker', 'test', 'marker', 'analyte', 'component']);
    const valueCol = findCol(cells, ['value', 'result']);
    if (nameCol !== -1 && valueCol !== -1) {
      headerIdx = i;
      header = cells;
      break;
    }
  }
  if (headerIdx === -1) return [];

  const nameCol = findCol(header, ['name', 'biomarker', 'test', 'marker', 'analyte', 'component']);
  const valueCol = findCol(header, ['value', 'result']);
  const unitCol = findCol(header, ['unit']);
  const rangeCol = findCol(header, ['range', 'reference', 'ref']);
  const lowCol = findCol(header, ['low', 'min']);
  const highCol = findCol(header, ['high', 'max']);

  const out: LabBiomarker[] = [];
  const seen = new Set<string>();

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const name = (cells[nameCol] ?? '').replace(/^"+|"+$/g, '').trim();
    const valueStr = (cells[valueCol] ?? '').replace(/[^\d.\-]/g, '');
    const value = valueStr === '' ? NaN : Number(valueStr);
    if (name.length < 2 || !Number.isFinite(value)) continue;

    const unit = unitCol !== -1 ? (cells[unitCol] ?? '').trim() : '';
    let low: number | null = null;
    let high: number | null = null;
    if (lowCol !== -1 && highCol !== -1) {
      const l = Number(cells[lowCol]); const h = Number(cells[highCol]);
      low = Number.isFinite(l) ? l : null;
      high = Number.isFinite(h) ? h : null;
    } else if (rangeCol !== -1) {
      const r = parseRangeCell(cells[rangeCol] ?? '');
      low = r.low; high = r.high;
    }

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      name,
      value,
      unit,
      referenceLow: low,
      referenceHigh: high,
      flag: flagFor(value, low, high),
      context: splitCsvLine(lines[i]).join(', '),
    });
  }

  return out;
}
