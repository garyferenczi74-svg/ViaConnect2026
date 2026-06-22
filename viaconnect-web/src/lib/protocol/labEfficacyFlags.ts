/**
 * Prompt 208b Task 4.2: lab-based supplement efficacy flags.
 *
 * A SECOND, independent supplement-flag source alongside the GENETIC flag built in
 * synthesis.ts. If a user is supplementing a nutrient and the corresponding
 * biomarker is NOT responding (still out-of-range), this flags it for dose / form /
 * absorption / cofactor review.
 *
 * This source is ADDITIVE only. It ADDS flags to supplement_flags. It NEVER removes
 * a recommendation, never alters a recommendation, and never gates a safety
 * interlock. The flag is informational: it tells the user (and Hannah) that a
 * supplement they are already taking does not appear to be moving the biomarker, so
 * the dose / form / absorption / cofactor should be reviewed.
 *
 * The supplement -> biomarker pairs are the well-established deficiency pairs (a
 * deficiency biomarker is read in the 'low' direction: still below range despite
 * supplementing). The lab read reuses loadLabResults (the single confirmed-results
 * loader), matched to each link by the dictionary's CANONICAL biomarker key so a
 * row named "Vitamin D, 25-OH" matches the vitamin_d link. Range preference mirrors
 * the concordance engine: geneticOptimal ?? standard (a genetic-optimal floor is a
 * stricter, Hannah-vetted target, so an in-standard-range value can still be under
 * the genetic-optimal floor).
 *
 * Every public function is fail-open: it logs and returns [] rather than throwing.
 * No labs, no matching biomarker, or any read error -> []. No em/en-dashes, no
 * emojis. No new dependency.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { loadLabResults } from '@/lib/labs/loadLabResults';
import { biomarkerKeyFor } from '@/lib/labs/biomarkerDictionary';

const SCOPE = 'protocol.labEfficacyFlags';

// ---------------------------------------------------------------------------
// Supplement -> biomarker links
// ---------------------------------------------------------------------------

export interface SupplementBiomarkerLink {
  /** Lowercase substring matched case-insensitively against the supplement name. */
  nutrientKeyword: string;
  /** Canonical biomarker key (matches biomarkerKeyFor). */
  biomarker: string;
  /** Direction the biomarker is read. Deficiency biomarkers are 'low'. */
  riskDirection: 'low' | 'high';
}

/**
 * Well-established supplement -> biomarker pairs. Each is a deficiency pair read in
 * the 'low' direction: the flag fires when the biomarker is STILL below range while
 * the user supplements. Keyword match is a case-insensitive substring against the
 * supplement name, so "Ferrous bisglycinate 25 mg" matches 'ferrous' and
 * "Vitamin D3 5000 IU" matches 'vitamin d'.
 *
 * Order is most-specific-first defensively; the first matching keyword wins.
 */
export const SUPPLEMENT_BIOMARKER_LINKS: SupplementBiomarkerLink[] = [
  // Vitamin D (cholecalciferol is the common supplemental form).
  { nutrientKeyword: 'cholecalciferol', biomarker: 'vitamin_d', riskDirection: 'low' },
  { nutrientKeyword: 'vitamin d', biomarker: 'vitamin_d', riskDirection: 'low' },
  // Iron -> ferritin (the iron-stores marker that responds to repletion).
  { nutrientKeyword: 'ferrous', biomarker: 'ferritin', riskDirection: 'low' },
  { nutrientKeyword: 'iron', biomarker: 'ferritin', riskDirection: 'low' },
  // B12 -> vitamin_b12.
  { nutrientKeyword: 'cobalamin', biomarker: 'vitamin_b12', riskDirection: 'low' },
  { nutrientKeyword: 'b12', biomarker: 'vitamin_b12', riskDirection: 'low' },
  // Folate -> folate.
  { nutrientKeyword: 'methylfolate', biomarker: 'folate', riskDirection: 'low' },
  { nutrientKeyword: 'folate', biomarker: 'folate', riskDirection: 'low' },
  { nutrientKeyword: 'folic', biomarker: 'folate', riskDirection: 'low' },
  // Minerals.
  { nutrientKeyword: 'magnesium', biomarker: 'magnesium', riskDirection: 'low' },
  { nutrientKeyword: 'zinc', biomarker: 'zinc', riskDirection: 'low' },
];

// ---------------------------------------------------------------------------
// LabEfficacyFlag shape
// ---------------------------------------------------------------------------

export interface LabEfficacyFlag {
  /** The current supplement name (verbatim as the user listed it). */
  current: string;
  reason: string;
  flagSource: 'lab_efficacy';
  /** Canonical biomarker key the flag is keyed to. */
  linkedBiomarker: string;
}

// ---------------------------------------------------------------------------
// isUnderResponding (PURE)
// ---------------------------------------------------------------------------

/**
 * Decide whether a biomarker indicates the supplement is NOT working.
 *
 *   'low'  (deficiency) -> true when range present AND value < range.low
 *                          (still deficient despite supplementing).
 *   'high'              -> true when range present AND value > range.high.
 *   null range          -> false (cannot assess without a range).
 *
 * A value exactly AT the boundary is not out-of-range, so it returns false. Pure:
 * no DB, no side effects, never throws.
 */
export function isUnderResponding(
  value: number,
  range: { low: number; high: number } | null,
  riskDirection: 'low' | 'high',
): boolean {
  if (!range) return false;
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  return riskDirection === 'low' ? value < range.low : value > range.high;
}

// ---------------------------------------------------------------------------
// findLink - match a supplement name to a biomarker link
// ---------------------------------------------------------------------------

function findLink(supplementName: string): SupplementBiomarkerLink | undefined {
  if (typeof supplementName !== 'string' || supplementName.length === 0) return undefined;
  const hay = supplementName.toLowerCase();
  for (const link of SUPPLEMENT_BIOMARKER_LINKS) {
    if (hay.includes(link.nutrientKeyword)) return link;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// buildLabEfficacyFlags
// ---------------------------------------------------------------------------

/**
 * For each current supplement that matches a SUPPLEMENT_BIOMARKER_LINK, find the
 * user's latest confirmed lab for that biomarker (matched by canonical key) and, if
 * it is still out-of-range in the link's direction, emit a LabEfficacyFlag.
 *
 * Range preference: geneticOptimal ?? standard (mirrors the concordance engine).
 * loadLabResults already returns the LATEST value per marker, so no extra
 * latest-selection is needed.
 *
 * Dedup by (current + linkedBiomarker). Fail-open: returns [] on any error and never
 * throws. No labs -> [].
 */
export async function buildLabEfficacyFlags(
  userId: string,
  currentSupplementNames: string[],
): Promise<LabEfficacyFlag[]> {
  try {
    const supplements = Array.isArray(currentSupplementNames) ? currentSupplementNames : [];
    if (supplements.length === 0) return [];

    // Only read labs if at least one supplement could possibly link to a biomarker.
    const linkable = supplements
      .map((name) => ({ name, link: findLink(name) }))
      .filter((s): s is { name: string; link: SupplementBiomarkerLink } => s.link !== undefined);
    if (linkable.length === 0) return [];

    const admin = createAdminClient();
    const labRows = await loadLabResults(admin, userId);
    if (!labRows || labRows.length === 0) return [];

    // Index labs by canonical key. loadLabResults already returns one (latest) row
    // per marker, so the last write wins deterministically if any duplicate slips
    // through (it does not today).
    const labByKey = new Map<
      string,
      { value: number; range: { low: number; high: number } | null }
    >();
    for (const row of labRows) {
      const key = biomarkerKeyFor(row.name);
      const range = row.geneticOptimal ?? row.standard ?? null;
      labByKey.set(key, { value: row.value, range });
    }

    const flags: LabEfficacyFlag[] = [];
    const seen = new Set<string>();

    for (const { name, link } of linkable) {
      const lab = labByKey.get(link.biomarker);
      if (!lab) continue; // no lab for this biomarker -> cannot assess
      if (!isUnderResponding(lab.value, lab.range, link.riskDirection)) continue;

      const dedupKey = `${name} ${link.biomarker}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      flags.push({
        current: name,
        reason: `Supplementing ${name} but ${link.biomarker} remains below range; review dose, form, absorption, or cofactors.`,
        flagSource: 'lab_efficacy',
        linkedBiomarker: link.biomarker,
      });
    }

    return flags;
  } catch (err) {
    safeLog.error(SCOPE, 'buildLabEfficacyFlags threw; returning empty (fail-open)', {
      userId,
      err,
    });
    return [];
  }
}
