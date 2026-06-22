/**
 * src/lib/kb/corpusIntegrity.ts
 *
 * Deterministic corpus integrity engine (Prompt 208a, Module G, Task G2).
 *
 * Exports:
 *   stalenessScore       -- evidence-decay score (lower tier -> faster decay)
 *   reVerifyDue          -- true when daysSince exceeds the tier threshold
 *   ConflictAtom         -- interface for detectConflicts input
 *   detectConflicts      -- opposing-direction conflict detection
 *   autoRetireOnRetraction -- writes retraction_log + flips atom to 'retired' (fail-open)
 *   RetractionCheck      -- return type for checkRetraction
 *   checkRetraction      -- flag-off retraction-source interface
 *   GroundingCheck       -- return type for verifyGrounding
 *   verifyGrounding      -- flag-off LLM grounding-verification interface
 *
 * Design rules:
 *   - Pure functions (stalenessScore, reVerifyDue, detectConflicts) take nowMs
 *     injected; no Date.now() inside their bodies.
 *   - autoRetireOnRetraction is fail-open: logs via safeLog + returns false on
 *     any error; never throws.
 *   - checkRetraction and verifyGrounding are flag-off: inert (return safe
 *     defaults) unless the caller injects an opts.* function.
 *   - Do NOT change getPublishedAtoms or the bus trigger.
 *   - No em/en-dashes. No emojis. No new dependencies. No package.json change.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';

// ---------------------------------------------------------------------------
// Tier thresholds (days) -- tier 1 is highest-evidence (slowest decay).
// ---------------------------------------------------------------------------
const TIER_THRESHOLD_DAYS: Record<number, number> = {
  1: 365,
  2: 180,
  3: 90,
};

/** Fallback when a tier is not recognised (treat as tier 3 worst-case). */
function thresholdForTier(tier: number): number {
  return TIER_THRESHOLD_DAYS[tier] ?? TIER_THRESHOLD_DAYS[3];
}

// ---------------------------------------------------------------------------
// stalenessScore
//
// Returns daysSince / tierHalfLife.
//   tier 1  halfLife = 365
//   tier 2  halfLife = 180
//   tier 3  halfLife =  90
//
// null lastVerifiedAt -> treated as very stale; we use 10 * halfLife so the
// score is guaranteed to exceed any real-world reading.
// Pure; nowMs is the only time source.
// ---------------------------------------------------------------------------
export function stalenessScore(
  lastVerifiedAt: string | null,
  tier: number,
  nowMs: number,
): number {
  const halfLife = thresholdForTier(tier);

  if (lastVerifiedAt === null) {
    // Never verified -> maximum staleness: 10 half-lives worth.
    return 10;
  }

  const lastMs = new Date(lastVerifiedAt).getTime();
  const daysSince = (nowMs - lastMs) / (24 * 60 * 60 * 1000);
  return daysSince / halfLife;
}

// ---------------------------------------------------------------------------
// reVerifyDue
//
// Returns true when daysSince > tier threshold.
// null lastVerifiedAt -> always due.
// Pure; nowMs is the only time source.
// ---------------------------------------------------------------------------
export function reVerifyDue(
  lastVerifiedAt: string | null,
  tier: number,
  nowMs: number,
): boolean {
  if (lastVerifiedAt === null) {
    return true;
  }

  const threshold = thresholdForTier(tier);
  const lastMs = new Date(lastVerifiedAt).getTime();
  const daysSince = (nowMs - lastMs) / (24 * 60 * 60 * 1000);
  return daysSince > threshold;
}

// ---------------------------------------------------------------------------
// ConflictAtom interface
// ---------------------------------------------------------------------------
export interface ConflictAtom {
  id: string;
  snp_refs?: string[];
  nutrient_refs?: string[];
  effect_direction?: string | null;
}

// ---------------------------------------------------------------------------
// Opposing-direction classification.
//
// Positive pole: 'increase', 'positive', 'protective'
// Negative pole: 'decrease', 'negative', 'risk'
// Empty/null/unknown -> not classified -> no conflict.
// ---------------------------------------------------------------------------
type DirectionPole = 'positive' | 'negative' | 'none';

const POSITIVE_TERMS = new Set(['increase', 'positive', 'protective']);
const NEGATIVE_TERMS = new Set(['decrease', 'negative', 'risk']);

function directionPole(dir: string | null | undefined): DirectionPole {
  if (!dir) return 'none';
  const lower = dir.toLowerCase().trim();
  if (POSITIVE_TERMS.has(lower)) return 'positive';
  if (NEGATIVE_TERMS.has(lower)) return 'negative';
  return 'none';
}

function areOpposing(a: string | null | undefined, b: string | null | undefined): boolean {
  const poleA = directionPole(a);
  const poleB = directionPole(b);
  if (poleA === 'none' || poleB === 'none') return false;
  return poleA !== poleB;
}

function hasSharedRef(atomA: ConflictAtom, atomB: ConflictAtom): boolean {
  const snpA = atomA.snp_refs ?? [];
  const snpB = atomB.snp_refs ?? [];
  for (const ref of snpA) {
    if (snpB.includes(ref)) return true;
  }

  const nutA = atomA.nutrient_refs ?? [];
  const nutB = atomB.nutrient_refs ?? [];
  for (const ref of nutA) {
    if (nutB.includes(ref)) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// detectConflicts
//
// For each unordered pair (i, j) where i < j:
//   - If they share at least one snp_ref or nutrient_ref AND have opposing
//     non-empty effect_direction -> emit { atom_id_a, atom_id_b, conflict_type }.
//
// Deterministic; each pair emitted at most once.
// ---------------------------------------------------------------------------
export function detectConflicts(
  atoms: ConflictAtom[],
): { atom_id_a: string; atom_id_b: string; conflict_type: string }[] {
  const results: { atom_id_a: string; atom_id_b: string; conflict_type: string }[] = [];

  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      const a = atoms[i];
      const b = atoms[j];

      if (hasSharedRef(a, b) && areOpposing(a.effect_direction, b.effect_direction)) {
        results.push({
          atom_id_a: a.id,
          atom_id_b: b.id,
          conflict_type: 'effect_direction',
        });
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// autoRetireOnRetraction
//
// 1. Inserts a row into retraction_log:
//      { atom_id, source_ref, retracted_at, detected_at, action_taken }
// 2. Updates knowledge_atoms set review_status = 'retired' where id = atomId.
// 3. Returns true on success.
// 4. Fail-open: on any DB error -> safeLog.error + return false (never throw).
//
// The existing bus trigger (migration 20260620100300) emits atom_retired when
// an atom transitions INTO 'retired', and getPublishedAtoms filters on
// review_status = 'published', so a retired atom is automatically excluded.
// Do NOT change those two components.
// ---------------------------------------------------------------------------
export async function autoRetireOnRetraction(
  atomId: string,
  sourceRef: string,
): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const retractedAt = new Date().toISOString();

    // Step 1: insert retraction_log row.
    const { error: insertError } = await supabase.from('retraction_log').insert([
      {
        atom_id: atomId,
        source_ref: sourceRef,
        retracted_at: retractedAt,
        detected_at: retractedAt,
        action_taken: 'auto_retired',
      },
    ]);

    if (insertError) {
      safeLog.error('kb.integrity', 'autoRetireOnRetraction: retraction_log insert failed', {
        atomId,
        sourceRef,
        error: insertError,
      });
      return false;
    }

    // Step 2: update the atom to 'retired'.
    const { error: updateError } = await supabase
      .from('knowledge_atoms')
      .update({ review_status: 'retired' })
      .eq('id', atomId);

    if (updateError) {
      safeLog.error('kb.integrity', 'autoRetireOnRetraction: knowledge_atoms update failed', {
        atomId,
        sourceRef,
        error: updateError,
      });
      return false;
    }

    return true;
  } catch (err) {
    safeLog.error('kb.integrity', 'autoRetireOnRetraction: unexpected error', {
      atomId,
      sourceRef,
      error: err,
    });
    return false;
  }
}

// ---------------------------------------------------------------------------
// RetractionCheck interface
// ---------------------------------------------------------------------------
export interface RetractionCheck {
  retracted: boolean;
  sourceRef?: string;
}

// ---------------------------------------------------------------------------
// checkRetraction (flag-off)
//
// If opts.retractionSource is provided, call it and return the result.
// Otherwise return { retracted: false } (no source wired = inert).
// Never throws.
// ---------------------------------------------------------------------------
export async function checkRetraction(
  doi: string | null,
  opts?: { retractionSource?: (doi: string) => Promise<RetractionCheck> },
): Promise<RetractionCheck> {
  if (!opts?.retractionSource || doi === null) {
    return { retracted: false };
  }

  try {
    return await opts.retractionSource(doi);
  } catch (err) {
    safeLog.error('kb.integrity', 'checkRetraction: retractionSource threw', {
      doi,
      error: err,
    });
    return { retracted: false };
  }
}

// ---------------------------------------------------------------------------
// GroundingCheck interface
// ---------------------------------------------------------------------------
export interface GroundingCheck {
  verified: 'verified' | 'unsupported' | 'unverified';
}

// ---------------------------------------------------------------------------
// verifyGrounding (flag-off)
//
// If opts.verifier is provided, call it and return the result.
// Otherwise return { verified: 'unverified' } (no LLM pass wired = inert).
// Never throws.
// ---------------------------------------------------------------------------
export async function verifyGrounding(
  claim: string,
  citation: string | null,
  opts?: { verifier?: (claim: string, citation: string | null) => Promise<GroundingCheck> },
): Promise<GroundingCheck> {
  if (!opts?.verifier) {
    return { verified: 'unverified' };
  }

  try {
    return await opts.verifier(claim, citation);
  } catch (err) {
    safeLog.error('kb.integrity', 'verifyGrounding: verifier threw', {
      claim,
      citation,
      error: err,
    });
    return { verified: 'unverified' };
  }
}
