// Prompt 204g (2026-06-19): the validated per-genotype severity SOURCE. This is
// the single place a variant earns its High / Moderate / Low score, keyed by rsID
// and then by the member's specific genotype. For the general (non-methylation)
// path, severity is a clinical mapping from the variant AND the genotype, not a
// function of zygosity: a heterozygous result on a high impact variant can be
// High, while a heterozygous result on a minor variant can be Low.
//
// IT SHIPS EMPTY ON PURPOSE. The diagnostic for 204g found that no per-genotype
// severity source ever existed in this codebase (only retired demo impacts in
// geneticsVariantSamples.ts, hand assigned per rsID and never per genotype). Per
// the Decision Gate, severity tiers must NOT be invented, because that would
// silently change clinical scoring. So the engine reads tiers ONLY from this map;
// an unmapped (rsID, genotype) returns null and the variant renders the neutral
// unscored fallback, never a fabricated tier. This mirrors the 204d / 204f
// pattern: the structure is wired now, the validated content is a human gated
// pass (Hannah plus clinical and compliance review) that populates this map.
//
// To populate (the content pass, not this prompt): add an rsID key whose value
// maps each clinically reviewed genotype (normalized, see normalizeGenotype) to
// its validated tier. Example shape only, intentionally commented out so nothing
// ships unvalidated:
//   // 'rs1801133': { 'CT': 'high', 'TT': 'high', 'CC': 'low' },
//
// Standing rules honored: no invented tiers, no em or en dashes, TypeScript
// strict (no any).

import type { SeverityTier } from './severity';

// rsID (lowercase) -> normalized genotype -> validated tier. EMPTY for the
// genotype-keyed path: the DNA-raw upload pipeline that stores an actual genotype
// (CT, GG, ...) has no validated per-genotype source yet, so it stays empty and
// every such variant renders the honest unscored fallback until a content pass
// populates it. Methylation-panel variants take the separate zygosity path below
// (methylationSeverityFor), because their stored result is a +/+ +/- -/- zygosity
// call, not a genotype.
export const VARIANT_SEVERITY: Record<string, Record<string, SeverityTier>> = {};

// Normalize a genotype string for lookup: uppercase, strip spaces and separators
// so "C/T", "c t", and "CT" all match the same key. Order is preserved as stored
// in the source; the content pass decides the canonical orientation per variant.
//
// NOTE: this MUST NOT be used for methylation zygosity keys. It strips "/" and
// "-", which would collapse "+/+", "+/-" and "-/-" into the same token and
// destroy the per-zygosity distinction. Zygosity lookups use the raw status
// string (see methylationSeverityFor).
export function normalizeGenotype(genotype: string): string {
  return genotype.replace(/[\s/|,;-]+/g, '').toUpperCase();
}

// Resolve the validated severity tier for a member's result, or null when the
// (rsID, genotype) has no validated assignment yet. Null is the honest unscored
// state; callers must NOT substitute a guessed tier.
export function severityFor(rsid: string | null, genotype: string | null): SeverityTier | null {
  if (!rsid || !genotype) return null;
  const byGenotype = VARIANT_SEVERITY[rsid.trim().toLowerCase()];
  if (!byGenotype) return null;
  return byGenotype[normalizeGenotype(genotype)] ?? null;
}

// ---------------------------------------------------------------------------
// Methylation panel: zygosity-direct severity (Gary 2026-06-19).
// ---------------------------------------------------------------------------
//
// Methylation-pathway reports (Doctor's Data / Yasko style) STATE the zygosity
// directly: +/+ = homozygous mutation (two copies), +/- = heterozygous (one),
// -/- = none. Our stored row keeps genotype empty and puts that call in `status`.
//
// SCORING DECISION (Gary's directive, supersedes the earlier per-variant tiers):
// for the methylation panel, severity is scored DIRECTLY from the zygosity, the
// standard Doctor's Data / functional-medicine convention:
//   +/+ (homozygous mutation)  -> High
//   +/- (heterozygous mutation) -> Moderate
// There is no Low tier and no unscored state for a displayed methylation variant:
// only +/+ and +/- rows are ever stored (the -/- baseline is dropped at save, see
// extractMethylationReport.mapMethylationRows). This is a deliberate, panel-wide
// product decision for the methylation display; the general per-genotype model in
// VARIANT_SEVERITY above still governs the other (non-methylation) panels.
//
// Standing rules honored: no em or en dashes, TypeScript strict.

// Resolve the methylation-panel severity tier from a member's ZYGOSITY STATUS (the
// +/+ +/- call the lab stated, stored in the row's `status`). Homozygous is High,
// heterozygous is Moderate; anything else (the -/- baseline or a non-zygosity
// value) returns null. This deliberately does NOT run normalizeGenotype, which
// would collapse the zygosity tokens.
export function methylationSeverityFor(
  rsid: string | null,
  status: string | null,
): SeverityTier | null {
  if (!rsid || !status) return null;
  const trimmed = status.trim();
  if (trimmed === '+/+') return 'high';
  if (trimmed === '+/-') return 'moderate';
  return null;
}
