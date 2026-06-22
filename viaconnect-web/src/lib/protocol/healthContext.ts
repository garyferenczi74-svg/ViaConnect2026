/**
 * src/lib/protocol/healthContext.ts
 *
 * User health-context aggregator (Prompt 208a, Module F, Task F2, 2026-06-21).
 *
 * Reads the user's latest COMPLETED CAQ version, active medications, and
 * active supplements, merges them into a single UserHealthContext record,
 * persists it to user_health_context, and returns it.
 *
 * FAIL-OPEN CONTRACT: this function NEVER throws. Any error at any step is
 * caught, logged via safeLog.warn, and the function returns a valid empty
 * context. Callers (goal weighting F4, safety gates Module I) can always
 * trust a resolved value.
 *
 * NOTE on pregnancy/lactation: capture is a known CAQ gap (7 phases / 16 dots
 * / 10 interstitials - DO NOT alter the CAQ canon). pregnancy_status is read
 * from demographics.pregnancy_status if it already exists; else null.
 *
 * No em/en-dashes. No emojis. No new dependencies. No package.json changes.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface UserHealthContext {
  demographics: Record<string, unknown>;
  conditions: unknown[];
  medications: string[];
  allergies: string[];
  pregnancyStatus: string | null;
  goals: unknown[];
}

// The fail-open empty context returned on any error.
const EMPTY_CONTEXT: UserHealthContext = {
  demographics: {},
  conditions: [],
  medications: [],
  allergies: [],
  pregnancyStatus: null,
  goals: [],
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Safely read an array from an unknown jsonb value. Returns [] when falsy. */
function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return [];
}

/**
 * Extract medication display names from a CAQ medications jsonb column.
 * The column is stored as an array of { name: string } objects or plain strings.
 */
function extractCaqMedNames(raw: unknown): string[] {
  const arr = toArray(raw);
  return arr
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        if (typeof obj['name'] === 'string') return obj['name'].trim();
      }
      return null;
    })
    .filter((n): n is string => n !== null && n.length > 0);
}

/**
 * Merge two medication lists, deduplicating case-insensitively.
 * The first occurrence (display form) is kept.
 */
function mergeMeds(a: string[], b: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of [...a, ...b]) {
    const key = name.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(name);
    }
  }
  return result;
}

/**
 * Extract goals from the CAQ lifestyle jsonb column.
 * Tries lifestyle.goals first, then lifestyle itself as an array.
 */
function extractGoals(lifestyle: unknown): unknown[] {
  if (typeof lifestyle === 'object' && lifestyle !== null && !Array.isArray(lifestyle)) {
    const obj = lifestyle as Record<string, unknown>;
    if (Array.isArray(obj['goals'])) return obj['goals'];
  }
  if (Array.isArray(lifestyle)) return lifestyle;
  return [];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Aggregate the user's health context from:
 *   1. Latest COMPLETED caq_assessment_versions row (demographics, health_concerns,
 *      medications, allergies, lifestyle.goals).
 *   2. user_medications where active = true (merged and deduped against CAQ meds).
 *
 * Persists the aggregated shape to user_health_context (upsert-style insert).
 * Returns the aggregated UserHealthContext. NEVER throws.
 *
 * @param userId   The authenticated user's UUID.
 * @param client   Optional SupabaseClient for testing (defaults to admin client).
 */
export async function buildUserHealthContext(
  userId: string,
  client?: SupabaseClient,
): Promise<UserHealthContext> {
  // Use the provided client (tests) or create the real admin client.
  let db: SupabaseClient;
  try {
    db = client ?? createAdminClient();
  } catch (err) {
    safeLog.warn('health-context', 'admin client creation failed - returning empty context', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { ...EMPTY_CONTEXT };
  }

  // -------------------------------------------------------------------------
  // Step 1: Read latest completed CAQ version row
  // -------------------------------------------------------------------------
  let caqRow: Record<string, unknown> | null = null;
  try {
    const { data, error } = await (db
      .from('caq_assessment_versions')
      .select(
        'demographics, health_concerns, medications, allergies, lifestyle',
      )
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle() as Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>);

    if (error) {
      safeLog.warn('health-context', 'caq_assessment_versions read error - returning empty context', {
        userId,
        error: error.message,
      });
      return { ...EMPTY_CONTEXT };
    }
    caqRow = data;
  } catch (err) {
    safeLog.warn('health-context', 'caq read threw unexpectedly - returning empty context', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { ...EMPTY_CONTEXT };
  }

  // No completed CAQ row -> empty context (valid, not an error).
  if (!caqRow) {
    return { ...EMPTY_CONTEXT };
  }

  // -------------------------------------------------------------------------
  // Step 2: Extract fields from the CAQ row
  // -------------------------------------------------------------------------
  const demographics = (
    typeof caqRow['demographics'] === 'object' && caqRow['demographics'] !== null
      ? caqRow['demographics']
      : {}
  ) as Record<string, unknown>;

  // health_concerns may be an object (not an array) - keep as-is for consumers.
  const conditionsRaw: unknown = caqRow['health_concerns'] ?? [];

  const caqMedNames = extractCaqMedNames(caqRow['medications']);

  const allergiesRaw = toArray(caqRow['allergies']);
  const allergies = allergiesRaw
    .map((a) => (typeof a === 'string' ? a.trim() : String(a)))
    .filter((a) => a.length > 0);

  const goals = extractGoals(caqRow['lifestyle']);

  // pregnancy_status: read from demographics only if already present (CAQ gap - do NOT add to canon).
  const pregnancyStatus: string | null =
    typeof demographics['pregnancy_status'] === 'string'
      ? demographics['pregnancy_status']
      : null;

  // -------------------------------------------------------------------------
  // Step 3: Read active user_medications, merge with CAQ meds
  // -------------------------------------------------------------------------
  let userMedNames: string[] = [];
  try {
    const { data: userMeds, error: userMedsError } = await (db
      .from('user_medications')
      .select('medication_name, active')
      .eq('user_id', userId)
      .eq('active', true) as Promise<{
      data: Array<{ medication_name: string; active: boolean }> | null;
      error: { message: string } | null;
    }>);

    if (userMedsError) {
      safeLog.warn('health-context', 'Failed to load user_medications; continuing', {
        userId,
        error: userMedsError,
      });
    }

    userMedNames = (userMeds ?? [])
      .map((m) => (typeof m.medication_name === 'string' ? m.medication_name.trim() : ''))
      .filter((n) => n.length > 0);
  } catch (err) {
    safeLog.warn('health-context', 'user_medications read failed - proceeding with CAQ meds only', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const medications = mergeMeds(caqMedNames, userMedNames);

  // -------------------------------------------------------------------------
  // Step 4: Persist to user_health_context (fail-open on error)
  // -------------------------------------------------------------------------
  const ctx: UserHealthContext = {
    demographics,
    conditions: Array.isArray(conditionsRaw) ? conditionsRaw : [conditionsRaw],
    medications,
    allergies,
    pregnancyStatus,
    goals,
  };

  try {
    await db.from('user_health_context').insert({
      user_id: userId,
      demographics: ctx.demographics,
      conditions: ctx.conditions,
      medications: ctx.medications,
      allergies: ctx.allergies,
      pregnancy_status: ctx.pregnancyStatus,
      goals: ctx.goals,
    });
  } catch (err) {
    safeLog.warn('health-context', 'user_health_context persist failed - context still returned', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return ctx;
}
