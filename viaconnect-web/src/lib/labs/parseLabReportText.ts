// Prompt 204c lab surface (2026-06-18): pure parser that pulls biomarker rows
// out of the TEXT extracted from a lab report PDF. Line based and deterministic:
// each line is matched for "<name> <value> <unit> [reference low to high]".
//
// Lab report layouts vary widely, so this is heuristic by design and tuned to
// avoid false positives (a unit must look like a real unit, or a reference
// range must be present). Whatever it reads is shown to the member to VERIFY
// before anything is saved, so a missed or misread row is recoverable.

export interface LabBiomarker {
  name: string;
  value: number;
  unit: string;
  referenceLow: number | null;
  referenceHigh: number | null;
  /** Derived from the reference range when present: low, normal, or high. */
  flag: 'low' | 'normal' | 'high' | null;
  /** The verbatim source line, shown on the verify screen. */
  context: string;
}

// Common lab unit tokens, so a bare unit like "mg" or "%" is accepted while a
// stray word like "of" or "page" is rejected when no reference range is present.
const KNOWN_UNITS = new Set([
  'mg', 'g', 'kg', 'ng', 'pg', 'mcg', 'ug', 'meq', 'mmol', 'mol', 'nmol', 'pmol', 'umol',
  'iu', 'miu', 'u', 'mu', 'dl', 'ml', 'l', 'fl', 'cells', 'k', 'm', 'ratio', 'index', '%',
]);

// name : value unit  (optional)  low to high   with optional bracketing. The
// reference range separator allows a hyphen-minus or the word "to".
const LINE_RE =
  /^\s*([A-Za-z][A-Za-z0-9 ,.()\-\/%]{1,48}?)[\s:]+(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*([A-Za-z%µ\/][A-Za-z0-9%µ\/^.]*)\s*[([]?\s*(?:(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?))?\s*[)\]]?\s*$/;

function unitLooksReal(unit: string): boolean {
  const u = unit.toLowerCase();
  return u.includes('/') || u.includes('%') || KNOWN_UNITS.has(u);
}

function flagFor(value: number, low: number | null, high: number | null): LabBiomarker['flag'] {
  if (low === null || high === null) return null;
  if (value < low) return 'low';
  if (value > high) return 'high';
  return 'normal';
}

export function parseLabReportText(text: string): LabBiomarker[] {
  if (!text) return [];
  const out: LabBiomarker[] = [];
  const seen = new Set<string>();

  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    if (line.length < 4) continue;

    const m = LINE_RE.exec(line);
    if (!m) continue;

    const name = m[1].replace(/[\s:,.]+$/, '').trim();
    // Strip thousands separators so "250,000" parses as 250000, not a misread.
    const value = Number(m[2].replace(/,/g, ''));
    const unit = m[3].trim();
    const low = m[4] !== undefined ? Number(m[4]) : null;
    const high = m[5] !== undefined ? Number(m[5]) : null;

    if (name.length < 2 || !Number.isFinite(value)) continue;
    const hasRange = low !== null && high !== null;
    if (!unitLooksReal(unit) && !hasRange) continue;

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
      context: line,
    });
  }

  return out;
}
