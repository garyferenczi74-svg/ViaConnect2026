/**
 * Rythm Health CSV parser. Public export column schema is UNKNOWN.
 *
 * Assumptions (locked audit; do not treat as a published API contract):
 * 1. A tall table with a header naming the marker and the value
 *    (Biomarker/Test/Name + Result/Value) is the most likely export.
 * 2. A wide table with documented marker names as column headers and
 *    one data row is also accepted.
 * 3. Collection date, when present, lives in a Date / Collected /
 *    Collection Date cell (YYYY-MM-DD or a parseable date).
 * 4. Rythm Score and Biological Age are derived product scores, not
 *    lab analytes. They are skipped and never persisted.
 * 5. Rows without a numeric value are skipped, never guessed as 0.
 *
 * Reuses the generic lab CSV splitter, then maps names and drops scores.
 */

import { parseLabCsv } from './parseLabCsv';
import type { LabBiomarker } from './parseLabReportText';
import {
  canonicalRythmMarkerName,
  isRythmDerivedScoreName,
  matchRythmHealthMarker,
} from './rythmHealth';

export interface RythmHealthParseResult {
  biomarkers: LabBiomarker[];
  collectionDate: string | null;
  skippedDerived: string[];
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
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

function parseIsoDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const iso = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const us = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (us) {
    const month = us[1].padStart(2, '0');
    const day = us[2].padStart(2, '0');
    return `${us[3]}-${month}-${day}`;
  }
  const ms = Date.parse(trimmed);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString().slice(0, 10);
}

function looksLikeDocumentedMarker(name: string): boolean {
  return matchRythmHealthMarker(name) !== null;
}

function toBiomarker(
  name: string,
  value: number,
  unit: string,
  low: number | null,
  high: number | null,
  context: string,
): LabBiomarker {
  const flag =
    low !== null && high !== null
      ? value < low
        ? 'low'
        : value > high
          ? 'high'
          : 'normal'
      : null;
  return {
    name: canonicalRythmMarkerName(name),
    value,
    unit,
    referenceLow: low,
    referenceHigh: high,
    flag,
    context,
  };
}

function parseNumeric(raw: string): number {
  const valueStr = raw.replace(/[^\d.\-]/g, '');
  if (valueStr === '' || valueStr === '-' || valueStr === '.') return NaN;
  return Number(valueStr);
}

function collectDateFromLines(lines: string[]): string | null {
  for (const line of lines.slice(0, 8)) {
    const cells = splitCsvLine(line);
    for (let i = 0; i < cells.length; i++) {
      const label = cells[i].toLowerCase();
      if (!/(collection|collected|drawn|date)/.test(label)) continue;
      const next = cells[i + 1];
      if (next) {
        const parsed = parseIsoDate(next);
        if (parsed) return parsed;
      }
    }
  }
  return null;
}

function parseWideFormat(lines: string[]): RythmHealthParseResult | null {
  if (lines.length < 2) return null;
  let headerIdx = -1;
  let header: string[] = [];
  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    const cells = splitCsvLine(lines[i]);
    const markerCols = cells.filter((c) => looksLikeDocumentedMarker(c));
    if (markerCols.length >= 3) {
      headerIdx = i;
      header = cells;
      break;
    }
  }
  if (headerIdx === -1) return null;

  const dateCol = findCol(header, ['collection', 'collected', 'drawn', 'date']);
  const unitHintCols = header.map((h) => h.toLowerCase().includes('unit'));
  const biomarkers: LabBiomarker[] = [];
  const skippedDerived: string[] = [];
  let collectionDate: string | null = null;
  const seen = new Set<string>();

  for (let r = headerIdx + 1; r < lines.length; r++) {
    const cells = splitCsvLine(lines[r]);
    if (dateCol !== -1 && !collectionDate) {
      collectionDate = parseIsoDate(cells[dateCol] ?? '');
    }
    for (let c = 0; c < header.length; c++) {
      const rawName = header[c];
      if (!rawName || unitHintCols[c] || c === dateCol) continue;
      if (isRythmDerivedScoreName(rawName)) {
        skippedDerived.push(rawName);
        continue;
      }
      if (!looksLikeDocumentedMarker(rawName)) continue;
      const value = parseNumeric(cells[c] ?? '');
      if (!Number.isFinite(value)) continue;
      const key = canonicalRythmMarkerName(rawName).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const unitCol = header.findIndex(
        (h, idx) =>
          idx !== c &&
          h.toLowerCase().includes('unit') &&
          h.toLowerCase().includes(rawName.toLowerCase().slice(0, 4)),
      );
      const unit = unitCol !== -1 ? (cells[unitCol] ?? '').trim() : '';
      biomarkers.push(
        toBiomarker(rawName, value, unit, null, null, `${rawName},${cells[c] ?? ''}`),
      );
    }
    if (biomarkers.length > 0) break;
  }

  if (biomarkers.length === 0) return null;
  return { biomarkers, collectionDate, skippedDerived };
}

function filterTallRows(rows: LabBiomarker[]): {
  biomarkers: LabBiomarker[];
  skippedDerived: string[];
} {
  const biomarkers: LabBiomarker[] = [];
  const skippedDerived: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (isRythmDerivedScoreName(row.name)) {
      skippedDerived.push(row.name);
      continue;
    }
    if (!Number.isFinite(row.value)) continue;
    const mapped = toBiomarker(
      row.name,
      row.value,
      row.unit,
      row.referenceLow,
      row.referenceHigh,
      row.context,
    );
    const key = mapped.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    biomarkers.push(mapped);
  }
  return { biomarkers, skippedDerived };
}

export function parseRythmHealthCsv(text: string): RythmHealthParseResult {
  if (!text.trim()) {
    return { biomarkers: [], collectionDate: null, skippedDerived: [] };
  }
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const collectionDate = collectDateFromLines(lines);

  const tall = parseLabCsv(text);
  if (tall.length > 0) {
    const filtered = filterTallRows(tall);
    let date = collectionDate;
    if (!date) {
      const header = splitCsvLine(lines[0] ?? '');
      const dateCol = findCol(header, ['collection', 'collected', 'drawn', 'date']);
      if (dateCol !== -1 && lines[1]) {
        date = parseIsoDate(splitCsvLine(lines[1])[dateCol] ?? '');
      }
    }
    return {
      biomarkers: filtered.biomarkers,
      collectionDate: date,
      skippedDerived: filtered.skippedDerived,
    };
  }

  const wide = parseWideFormat(lines);
  if (wide) {
    return {
      ...wide,
      collectionDate: wide.collectionDate ?? collectionDate,
    };
  }

  return { biomarkers: [], collectionDate, skippedDerived: [] };
}

export function dropRythmDerivedScores<T extends { name: string }>(rows: T[]): T[] {
  return rows.filter((row) => !isRythmDerivedScoreName(row.name));
}
