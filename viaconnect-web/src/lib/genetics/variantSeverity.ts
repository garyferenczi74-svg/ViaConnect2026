// Prompt 204g (2026-06-19): the validated per-genotype severity SOURCE. This is
// the single place a variant earns its High / Moderate / Low score, keyed by rsID
// and then by the member's specific genotype. For the general (non-methylation)
// path, severity is a clinical mapping from the variant AND the genotype, not a
// function of zygosity: a heterozygous result on a high impact variant can be
// High, while a heterozygous result on a minor variant can be Low.
//
// PANEL-SCOPED (go-live 2026-06-20, after Gary's clinical and compliance sign-off).
// The map is keyed by PANEL SLUG first, then rsID, then normalized genotype, so a
// shared rsID (TCN2 rs1801198, SOD2 rs4880, DAO, VDR all appear in more than one
// panel) NEVER leaks one panel's validated tier onto another panel's report. Each
// panel reads ONLY its own entry. The methylation panel (genex-m) is absent here
// on purpose: it is scored by zygosity through methylationSeverityFor, not by
// genotype, so severityFor returns null for it and the report falls back to the
// copy-count display. A panel with no approved per-genotype source is simply
// absent from this map, so every such variant still renders the honest unscored
// fallback, never a fabricated tier. Tiers are NOT invented here; the values come
// from the panel severity drafts, each authored by Hannah and signed off by Gary.

import type { SeverityTier } from './severity';
import { NUTRIGEN_DX_SEVERITY_DRAFT } from './drafts/nutrigenDxSeverityDraft';
import { HORMONE_IQ_SEVERITY_DRAFT } from './drafts/hormoneIqSeverityDraft';

// panelSlug -> rsID (lowercase) -> normalized genotype -> validated tier. The two
// SNP panels that passed the gate are wired here; the descriptive markers in each
// (FUT2, AMY1, GST deletions, HLA, MCM6, NAT2, CYP19A1) are absent from their
// panel map by design and render unscored. EpigenHQ, PeptideIQ, and CannabisIQ are
// not here: EpigenHQ has no genotype scoring and Peptide / Cannabis are
// educational (untiered).
export const VARIANT_SEVERITY: Record<string, Record<string, Record<string, SeverityTier>>> = {
  'nutrigen-dx': NUTRIGEN_DX_SEVERITY_DRAFT,
  'hormone-iq': HORMONE_IQ_SEVERITY_DRAFT,
};

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

// Prompt 204 follow-up (go-live blocker 1): an ORDER-INDEPENDENT canonical form
// of a two-base genotype, for matching a member's stored call to a report row when
// allele order may differ ("CT" and "TC" are the same heterozygous call). It
// normalizes (uppercase, strip separators) then sorts the bases, so both sides
// canonicalize to the same token. A non-two-base value (a zygosity, a phenotype, a
// copy-number call) just normalizes and sorts harmlessly; callers gate on length.
export function canonicalGenotype(genotype: string): string {
  return normalizeGenotype(genotype).split('').sort().join('');
}

// Resolve the validated severity tier for a member's result on a SPECIFIC panel,
// or null when the (panel, rsID, genotype) has no validated assignment. Null is
// the honest unscored state; callers must NOT substitute a guessed tier. The panel
// slug scopes the lookup so a shared rsID never crosses panels.
export function severityFor(
  panelSlug: string | null,
  rsid: string | null,
  genotype: string | null,
): SeverityTier | null {
  if (!panelSlug || !rsid || !genotype) return null;
  const byRsid = VARIANT_SEVERITY[panelSlug.trim().toLowerCase()];
  if (!byRsid) return null;
  const byGenotype = byRsid[rsid.trim().toLowerCase()];
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
