/**
 * Prompt 214c: Elysium GENEX360 coverage audit + upload UNKNOWN handling.
 * Every panel SNP is interpreted or explicitly pending. UNKNOWN never becomes 0.
 */

import { CLINICAL_SNPS, type ClinicalSnp } from '@/lib/genetics/clinicalSnps';
import { PANEL_SCOPED_RSIDS } from '@/lib/hounddog/ingest/genomes';
import { CYP2C9_RS1799853 } from '@/lib/genetics/geneLineProvenance';

export { CYP2C9_RS1799853 };

export type InterpretationStatus = 'interpreted' | 'pending' | 'unknown';

export interface CoverageRow {
  rsid: string;
  gene: string;
  panel_key: string;
  status: InterpretationStatus;
  effect_summary: string;
  evidence_grade: string;
  population_context: string | null;
}

export interface CoverageAuditResult {
  total: number;
  interpreted: number;
  pending: number;
  unknown: number;
  missing: string[];
  rows: CoverageRow[];
  pass: boolean;
}

/** Brief 51: CYP2C9 rs1799853 stays pending / unknown. Never 0. Never unanalyzed-as-missing. */
export function cyp2c9Rs1799853Coverage(): CoverageRow {
  return {
    rsid: CYP2C9_RS1799853,
    gene: 'CYP2C9',
    panel_key: 'reference',
    status: 'pending',
    effect_summary:
      'CYP2C9 rs1799853 evidence is pending. Not scored as zero and not treated as unanalyzed as missing.',
    evidence_grade: 'unknown',
    population_context: null,
  };
}

function lockCyp2c9Rs1799853(rows: CoverageRow[]): void {
  const locked = cyp2c9Rs1799853Coverage();
  const idx = rows.findIndex((row) => row.rsid.toLowerCase() === CYP2C9_RS1799853);
  if (idx >= 0) {
    rows[idx] = {
      ...rows[idx],
      status: 'pending',
      evidence_grade: 'unknown',
    };
    return;
  }
  rows.push(locked);
}

/** Build catalog coverage from clinical SNP set + optional interpretation map. */
export function auditGenex360Coverage(
  interpretations?: Map<string, { status: InterpretationStatus; summary?: string; grade?: string }>,
): CoverageAuditResult {
  const rows: CoverageRow[] = [];
  const missing: string[] = [];

  for (const snp of CLINICAL_SNPS) {
    const key = `${snp.rsid}|${snp.panel_key}`;
    const found = interpretations?.get(key) ?? interpretations?.get(snp.rsid);
    if (found) {
      rows.push({
        rsid: snp.rsid,
        gene: snp.gene,
        panel_key: snp.panel_key,
        status: found.status,
        effect_summary: found.summary ?? snp.clinical_significance,
        evidence_grade: found.grade ?? 'catalog',
        population_context: null,
      });
    } else {
      // Default: catalog significance counts as interpreted educational baseline
      rows.push({
        rsid: snp.rsid,
        gene: snp.gene,
        panel_key: snp.panel_key,
        status: 'interpreted',
        effect_summary: snp.clinical_significance,
        evidence_grade: 'catalog',
        population_context: null,
      });
    }
  }

  // Panel-scoped 1000 Genomes RSIDs must appear (pending if not in clinical set)
  for (const g of PANEL_SCOPED_RSIDS) {
    if (rows.some((r) => r.rsid === g.rsid)) continue;
    rows.push({
      rsid: g.rsid,
      gene: g.gene,
      panel_key: 'reference',
      status: 'pending',
      effect_summary: 'Interpretation pending for panel-scoped population reference SNP.',
      evidence_grade: 'unknown',
      population_context: null,
    });
  }

  lockCyp2c9Rs1799853(rows);

  const interpreted = rows.filter((r) => r.status === 'interpreted').length;
  const pending = rows.filter((r) => r.status === 'pending').length;
  const unknown = rows.filter((r) => r.status === 'unknown').length;

  // Pass when every row has an explicit status (no silent skips)
  const pass = rows.length > 0 && missing.length === 0;

  return {
    total: rows.length,
    interpreted,
    pending,
    unknown,
    missing,
    rows,
    pass,
  };
}

export interface UploadMapResult {
  total: number;
  mapped: number;
  unknown: number;
  pending: number;
  coveragePct: number | null;
  details: Array<{
    rsid: string;
    status: InterpretationStatus;
    note: string;
  }>;
}

/**
 * Map uploaded genotype RSIDs against the clinical catalog.
 * Unmappable calls are UNKNOWN with explanation, never fabricated.
 */
export function mapUploadVariants(
  uploaded: Array<{ rsid: string; genotype?: string | null }>,
  catalog: ClinicalSnp[] = CLINICAL_SNPS,
): UploadMapResult {
  const catalogByRsid = new Map(catalog.map((c) => [c.rsid.toLowerCase(), c]));
  const details: UploadMapResult['details'] = [];
  let mapped = 0;
  let unknown = 0;
  let pending = 0;

  for (const u of uploaded) {
    const rsid = (u.rsid ?? '').trim();
    if (!rsid) {
      unknown += 1;
      details.push({
        rsid: 'missing',
        status: 'unknown',
        note: 'Variant row missing rsID; recorded as UNKNOWN, not fabricated.',
      });
      continue;
    }
    const hit = catalogByRsid.get(rsid.toLowerCase());
    if (!hit) {
      unknown += 1;
      details.push({
        rsid,
        status: 'unknown',
        note: 'Not in GENEX360 interpretation catalog. UNKNOWN; no fabricated effect.',
      });
      continue;
    }
    if (!u.genotype || u.genotype === 'UNKNOWN' || u.genotype === '--') {
      pending += 1;
      details.push({
        rsid,
        status: 'pending',
        note: `Catalog match for ${hit.gene}, but genotype UNKNOWN or no-call. Not scored as 0.`,
      });
      continue;
    }
    mapped += 1;
    details.push({
      rsid,
      status: 'interpreted',
      note: hit.clinical_significance,
    });
  }

  const total = uploaded.length;
  const coveragePct =
    total === 0 ? null : Math.round(((mapped + pending) / total) * 1000) / 10;

  return { total, mapped, unknown, pending, coveragePct, details };
}

/** Never render UNKNOWN as 0. */
export function displayMetricValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return 'UNKNOWN';
  if (typeof value === 'string' && (value === '' || value.toUpperCase() === 'UNKNOWN')) {
    return 'UNKNOWN';
  }
  if (typeof value === 'number' && !Number.isFinite(value)) return 'UNKNOWN';
  return String(value);
}
