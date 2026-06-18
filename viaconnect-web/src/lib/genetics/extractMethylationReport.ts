// Prompt 204c (2026-06-18): extract a methylation pathway report (Doctor's Data,
// Yasko-style) that lists results by GENE/VARIANT name and a +/+ +/- -/- mutation
// call, rather than by rsID + genotype.
//
// Extraction (reading the printed table, including a photographed or rotated one)
// uses Gemini vision; the lab STATES the status, so the model reads the table, it
// does not interpret. Mapping gene/variant -> rsID + panel is deterministic via
// methylationPanelMap, and the member verifies every reading before save. The
// confirm step re-derives gene/panel from the rsID via the same map, so a saved
// row never trusts client-sent gene or clinical text.

import { safeLog } from '@/lib/utils/safe-log';
import { extractWithGeminiVision } from '@/lib/nutrition/gemini-client';
import type { InterpretedVariant } from './dnaAnalysisEngine';
import {
  lookupMethylationVariant,
  isMethylationStatus,
  METHYLATION_BY_RSID,
  type MethylationVariant,
  type MethylationStatus,
} from './methylationPanelMap';

export interface MethylationReportRow {
  variant: string;
  status: string;
}

const SYSTEM_INSTRUCTION =
  'You are a precise data extraction tool. You read DNA methylation pathway genetic ' +
  'reports (for example Doctor\'s Data or Yasko-style panels) that list a gene or variant ' +
  'name and a mutation call. You only transcribe what is printed. You never infer, ' +
  'diagnose, or add genes that are not on the page. You always return strict JSON.';

const PROMPT =
  'Extract every gene/variant row and its mutation status from this report. The status ' +
  'is exactly one of: +/+ (homozygous mutation, two copies), +/- (heterozygous, one ' +
  'copy), -/- (no mutation). Normalize any wording to those three: a "Homo" or double ' +
  'mutation is +/+, a "Hetero" or single mutation is +/-, "none"/"normal"/blank is -/-. ' +
  'Use the exact gene/variant label as printed (for example "MTHFR C677T", "COMT V158M", ' +
  '"VDR Fok1", "MAOA"). Return ONLY a JSON array, no prose, no code fence: ' +
  '[{"variant":"MTHFR C677T","status":"+/-"}]. Omit any row whose status you cannot read.';

function parseJsonArray(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = trimmed.indexOf('[');
  const end = trimmed.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** Read a methylation report PDF or image with Gemini vision. Fail-open to []. */
export async function extractMethylationFromPdf(
  buf: Buffer,
  mimeType: string,
): Promise<MethylationReportRow[]> {
  try {
    const text = await extractWithGeminiVision(buf, mimeType, SYSTEM_INSTRUCTION, PROMPT);
    const parsed = parseJsonArray(text);
    if (!Array.isArray(parsed)) return [];
    const rows: MethylationReportRow[] = [];
    for (const entry of parsed) {
      if (entry && typeof entry === 'object') {
        const e = entry as Record<string, unknown>;
        if (typeof e.variant === 'string' && typeof e.status === 'string') {
          rows.push({ variant: e.variant, status: e.status });
        }
      }
    }
    return rows;
  } catch (err) {
    safeLog.warn('genetics.methylation', 'vision extraction failed (continuing)', {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

function buildVariant(v: MethylationVariant, status: MethylationStatus): InterpretedVariant {
  return {
    rsid: v.rsid,
    gene: v.gene,
    panel_key: 'methylation',
    chromosome: '',
    position: '',
    // A report states the status, not the genotype, so the genotype fields are
    // left empty; the status is the lab's call.
    genotype: '',
    allele1: '',
    allele2: '',
    status,
    clinical_significance: v.clinical_significance,
  };
}

/**
 * Map extracted {variant label, status} rows to interpreted variants for the
 * verify preview. Keeps only labels in the methylation map and valid statuses;
 * dedupes by rsID. Unknown labels are dropped (reported as a coverage gap), not
 * guessed.
 */
export function mapMethylationRows(rows: MethylationReportRow[]): InterpretedVariant[] {
  const out: InterpretedVariant[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const variant = lookupMethylationVariant(row.variant);
    if (!variant || !isMethylationStatus(row.status)) continue;
    // A methylation report is read for its MUTATIONS. A -/- (no mutation) row is
    // the baseline and only adds noise, so only heterozygous (+/-) and
    // homozygous (+/+) calls are surfaced and saved.
    if (row.status === '-/-') continue;
    if (seen.has(variant.rsid)) continue;
    seen.add(variant.rsid);
    out.push(buildVariant(variant, row.status));
  }
  return out;
}

/**
 * Re-derive an interpreted variant from an rsID + status at confirm time. The
 * gene, panel, and clinical text come from the map (authoritative), never from
 * the client. Returns null for an unknown rsID or an invalid status.
 */
export function interpretMethylationByRsid(rsid: string, status: unknown): InterpretedVariant | null {
  const variant = METHYLATION_BY_RSID[rsid];
  if (!variant || !isMethylationStatus(status)) return null;
  return buildVariant(variant, status);
}
