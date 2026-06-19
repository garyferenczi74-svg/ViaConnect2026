// Prompt 204g (2026-06-19): the validated per-genotype severity SOURCE. This is
// the single place a variant earns its High / Moderate / Low score, keyed by rsID
// and then by the member's specific genotype. Severity is a clinical mapping from
// the variant AND the genotype, NOT a function of zygosity: a heterozygous result
// on a high impact variant can be High, while a heterozygous result on a minor
// variant can be Low.
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

// rsID (lowercase) -> normalized genotype -> validated tier. EMPTY until the
// clinical content pass populates it.
export const VARIANT_SEVERITY: Record<string, Record<string, SeverityTier>> = {};

// Normalize a genotype string for lookup: uppercase, strip spaces and separators
// so "C/T", "c t", and "CT" all match the same key. Order is preserved as stored
// in the source; the content pass decides the canonical orientation per variant.
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
