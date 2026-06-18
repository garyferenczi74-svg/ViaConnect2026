// Prompt 204b (2026-06-17): the DNA analysis engine. Deterministic rules only,
// NO language model in the interpretation path. Every output variant is
// traceable to a specific rsID, genotype, and the riskAllele rule in
// clinicalSnps.ts, so the "Your Variants" surface is fully auditable.
//
// Status notation: -/- homozygous wild type (zero risk alleles), +/- heterozygous
// (one), +/+ homozygous variant (two). The hyphen-minus characters are genotype
// content, not punctuation dashes.

import { CLINICAL_SNP_BY_RSID } from './clinicalSnps';
import type { PanelKey } from './panelLabels';

export type VariantStatus = '+/+' | '+/-' | '-/-';

/** A parsed genotype row from an uploaded raw DNA file. */
export interface ParsedSnpRow {
  rsid: string;
  chromosome: string;
  position: string;
  /** Two-letter call, for example "CT". No-calls ("--", "00") are skipped. */
  genotype: string;
}

export interface InterpretedVariant {
  rsid: string;
  gene: string;
  panel_key: PanelKey;
  chromosome: string;
  position: string;
  genotype: string;
  allele1: string;
  allele2: string;
  status: VariantStatus;
  clinical_significance: string;
}

const VALID_ALLELE = /^[ACGT]$/;

/**
 * Determine status from a genotype and its effect allele by counting copies of
 * the risk allele. Returns null when the genotype is not a clean two-base call
 * (no-call, indel, or malformed), so the caller can skip it rather than guess.
 */
export function computeStatus(genotype: string, riskAllele: string): VariantStatus | null {
  const cleaned = (genotype ?? '').trim().toUpperCase();
  if (cleaned.length !== 2) return null;
  const a = cleaned[0];
  const b = cleaned[1];
  if (!VALID_ALLELE.test(a) || !VALID_ALLELE.test(b)) return null;
  const risk = riskAllele.trim().toUpperCase();
  const count = (a === risk ? 1 : 0) + (b === risk ? 1 : 0);
  if (count === 2) return '+/+';
  if (count === 1) return '+/-';
  return '-/-';
}

/**
 * Interpret parsed SNP rows against the clinical annotation set. Rows whose
 * rsID is not annotated, or whose genotype is not a clean call, are dropped from
 * the result (never guessed). Order is preserved for deterministic output.
 */
export function analyzeVariants(rows: ParsedSnpRow[]): InterpretedVariant[] {
  const out: InterpretedVariant[] = [];
  for (const row of rows) {
    const annotation = CLINICAL_SNP_BY_RSID[row.rsid];
    if (!annotation) continue;
    const status = computeStatus(row.genotype, annotation.riskAllele);
    if (status === null) continue;
    const cleaned = row.genotype.trim().toUpperCase();
    out.push({
      rsid: row.rsid,
      gene: annotation.gene,
      panel_key: annotation.panel_key,
      chromosome: row.chromosome,
      position: row.position,
      genotype: cleaned,
      allele1: cleaned[0],
      allele2: cleaned[1],
      status,
      clinical_significance: annotation.clinical_significance,
    });
  }
  return out;
}

/** Group interpreted variants by panel_key, preserving input order within each. */
export function groupVariantsByPanel(
  variants: InterpretedVariant[],
): Partial<Record<PanelKey, InterpretedVariant[]>> {
  const grouped: Partial<Record<PanelKey, InterpretedVariant[]>> = {};
  for (const v of variants) {
    (grouped[v.panel_key] ??= []).push(v);
  }
  return grouped;
}
