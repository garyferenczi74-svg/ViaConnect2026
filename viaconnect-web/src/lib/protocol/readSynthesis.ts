/**
 * src/lib/protocol/readSynthesis.ts
 *
 * Server-side read helper for user_protocol_synthesis.
 * Reads the most recent row for a given userId via the admin client.
 * Fail-open: on any error, logs via safeLog and returns null so the
 * calling page still renders its empty states.
 *
 * Prompt 208, Phase 8, Task 22 (2026-06-21).
 * Task 26b: added getOrComputeUserProtocolSynthesis (lazy compute-on-read,
 * stale-bounded, fail-open). synthesizeForUser reads PUBLISHED rules only,
 * so until the human clinical gate publishes rules this still yields empty
 * results (safe), but the pipeline is now CONNECTED.
 * No em/en-dashes. No emojis.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { synthesizeForUser } from '@/lib/protocol/synthesis';

// ---------------------------------------------------------------------------
// Public types (mirror the synthesis.ts types for consumer surfaces)
// ---------------------------------------------------------------------------

export interface RecommendedItem {
  form: string;
  rationale: string;
  evidenceTier: number;
  ruleRsid: string;
}

export interface SupplementFlag {
  current: string;
  reason: string;
  alternativeForm: string | null;
  ruleRsid: string;
  evidenceTier: number;
}

export interface UserProtocolSynthesisRow {
  recommended_vitamins_minerals: RecommendedItem[];
  supplement_flags: SupplementFlag[];
  nutrition_guidance: { avoid: string[]; prefer: string[] };
  disclaimers_version: string | null;
  /** ISO timestamp from DB; used internally by getOrComputeUserProtocolSynthesis. */
  generated_at?: string | null;
}

// ---------------------------------------------------------------------------
// Staleness bound for lazy compute-on-read (6 hours).
// ---------------------------------------------------------------------------

export const SYNTHESIS_STALE_MS = 6 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Defensive parser helpers
// ---------------------------------------------------------------------------

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function toNutritionGuidance(value: unknown): { avoid: string[]; prefer: string[] } {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const v = value as Record<string, unknown>;
    return {
      avoid: toArray<string>(v.avoid),
      prefer: toArray<string>(v.prefer),
    };
  }
  return { avoid: [], prefer: [] };
}

// ---------------------------------------------------------------------------
// getLatestUserProtocolSynthesis
// ---------------------------------------------------------------------------

/**
 * Read the most recent user_protocol_synthesis row for userId.
 * Returns null if no row exists or on any error.
 * jsonb columns default to [] / {} if absent (defensive parse).
 */
export async function getLatestUserProtocolSynthesis(
  userId: string,
): Promise<UserProtocolSynthesisRow | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('user_protocol_synthesis')
      .select(
        'recommended_vitamins_minerals, supplement_flags, nutrition_guidance, disclaimers_version, generated_at',
      )
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(1);

    if (error) {
      safeLog.warn('readSynthesis', 'DB error reading user_protocol_synthesis; returning null', {
        userId,
        error,
      });
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const row = data[0] as Record<string, unknown>;

    return {
      recommended_vitamins_minerals: toArray<RecommendedItem>(row.recommended_vitamins_minerals),
      supplement_flags: toArray<SupplementFlag>(row.supplement_flags),
      nutrition_guidance: toNutritionGuidance(row.nutrition_guidance),
      disclaimers_version:
        typeof row.disclaimers_version === 'string' ? row.disclaimers_version : null,
      generated_at: typeof row.generated_at === 'string' ? row.generated_at : null,
    };
  } catch (err) {
    safeLog.error('readSynthesis', 'Exception reading user_protocol_synthesis; returning null', {
      userId,
      err,
    });
    return null;
  }
}

// ---------------------------------------------------------------------------
// getOrComputeUserProtocolSynthesis
//
// Lazy compute-on-read. Returns the latest row if it is fresher than
// SYNTHESIS_STALE_MS; otherwise calls synthesizeForUser to recompute
// and then returns the freshly-read row.
//
// FAIL-OPEN: if synthesizeForUser throws, logs the error and returns
// whatever getLatestUserProtocolSynthesis gave (possibly null). A panel
// render must never break.
//
// synthesizeForUser reads PUBLISHED rules only, so until the human
// clinical gate publishes rules this still yields empty results (safe),
// but the pipeline is now CONNECTED.
// ---------------------------------------------------------------------------

export async function getOrComputeUserProtocolSynthesis(
  userId: string,
): Promise<UserProtocolSynthesisRow | null> {
  const latest = await getLatestUserProtocolSynthesis(userId);

  if (latest && latest.generated_at) {
    const ageMs = Date.now() - new Date(latest.generated_at).getTime();
    if (ageMs < SYNTHESIS_STALE_MS) {
      // Row is fresh -- return it without recomputing.
      return latest;
    }
  }

  // Row is absent or stale -- trigger a (re)compute.
  try {
    await synthesizeForUser(userId);
  } catch (err) {
    safeLog.warn(
      'readSynthesis',
      'synthesizeForUser threw during lazy recompute; returning existing row',
      { userId, err },
    );
    // Fail-open: return what we had (may be null if no row existed).
    return latest;
  }

  // Return the freshly-written row.
  return getLatestUserProtocolSynthesis(userId);
}
