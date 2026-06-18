// Prompt 204c (2026-06-18): pure parser that pulls rsID + genotype pairs out of
// the TEXT extracted from a genetic report PDF. Deterministic and rule based:
// it finds each rs#### token and the nearest two-base genotype call in a short
// window after it, normalizing common report formats (CT, C/T, C;T, C T).
//
// Output feeds the deterministic 204b engine, which only interprets the rsIDs in
// its clinical annotation set, so unrelated rsIDs in the report are harmless
// noise. This parser NEVER guesses a genotype: if no clean two-base call sits
// near an rsID, that rsID is skipped.

import type { ParsedSnpRow } from './dnaAnalysisEngine';

export interface DnaReportRow extends ParsedSnpRow {
  /**
   * The text snippet the rsID and genotype were read from. Surfaced on the
   * verify screen so a member can catch a misread (for example a genotype
   * grabbed from a neighbouring column) before saving.
   */
  context: string;
}

// An rsID token: rs followed by digits. Captured with its index so we can scan a
// short window after it for the genotype.
const RSID_RE = /rs\d{2,}/gi;

// A two-base genotype call. Allows an optional separator (/, ;, |, comma, or
// whitespace) between the two bases, for example "CT", "C/T", "C;T", "C T".
const GENOTYPE_RE = /\b([ACGT])\s*[\/;|,]?\s*([ACGT])\b/i;

// How many characters after the rsID to search for its genotype. Genetic report
// rows keep the call close to the rsID; a tight window avoids grabbing a base
// from an unrelated neighbouring column.
const WINDOW = 40;

export function parseDnaReportText(text: string): DnaReportRow[] {
  if (!text) return [];
  const rows: DnaReportRow[] = [];
  const seen = new Set<string>();

  RSID_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = RSID_RE.exec(text)) !== null) {
    const rsid = match[0].toLowerCase();
    if (seen.has(rsid)) continue;

    const start = match.index + rsid.length;
    const window = text.slice(start, start + WINDOW);
    const geno = GENOTYPE_RE.exec(window);
    if (!geno) continue;

    const genotype = (geno[1] + geno[2]).toUpperCase();
    // The verbatim snippet from the rsID through the end of the matched
    // genotype, whitespace collapsed, so the member sees exactly what was read.
    const snippetEnd = start + geno.index + geno[0].length;
    const context = text.slice(match.index, snippetEnd).replace(/\s+/g, ' ').trim();
    seen.add(rsid);
    rows.push({ rsid, chromosome: '', position: '', genotype, context });
  }

  return rows;
}
