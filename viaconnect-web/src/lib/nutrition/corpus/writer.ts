// Prompt #170 Phase 1h: corpus writer. Composes a user_meal_corpus row from
// save-time inputs and inserts via service-role. Privacy posture per Prompt 170
// section 2.5 + 170a section 4.4: user_hash + salt_version only, never email,
// phone, IP, geo, condition strings, protocol ids, or supplement ids. Caller
// is responsible for ensuring contributedPhotoPath is set only when the user
// has opted in via user_nutrivision_settings.corpus_opt_in.
//
// Hard rules honored: no em or en dashes anywhere, no emojis, no any.

import type { SupabaseClient } from '@supabase/supabase-js';
import { computeUserHash } from '../privacy/user-hash';
import { withTimeout } from '../resilience/timeout';
import { safeLog } from '@/lib/utils/safe-log';
import type { CuisineTag, ReconciledRecognition } from '../vision/types';
import type { CookingOilSelection } from '../cooking-oil/suggester';

export type CorpusSource = 'nutrivision' | 'quick_log' | 'manual';

export interface CorpusFinalStateItem {
  foodName: string;
  portionGrams: number;
  cuisineTag?: CuisineTag;
  cookingMethod?: string;
  cookingOil?: CookingOilSelection;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  userModified: boolean;
}

export interface CorpusFinalState {
  mealId: string;
  source: CorpusSource;
  items: ReadonlyArray<CorpusFinalStateItem>;
  totals: { calories_kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  mealConfidence?: number;
}

export interface CorpusEditDiff {
  itemsAdded: number;
  itemsRemoved: number;
  itemsModified: number;
  oilSelections: number;
  portionChanges: number;
}

export interface CorpusWriteOpts {
  supabaseAdmin: SupabaseClient;
  userId: string;
  recognitionPayload?: ReconciledRecognition;
  finalState: CorpusFinalState;
  editDiff?: CorpusEditDiff;
  contributedPhotoPath?: string | null;
  requestId: string;
}

export interface CorpusWriteResult {
  corpusRowId: string;
  userHash: string;
  saltVersion: number;
  cuisineTag?: CuisineTag;
}

const CORPUS_WRITE_TIMEOUT_MS = 3000;

/**
 * Pure helper: derives the dominant cuisine tag from a final-state item set.
 * Returns the most common cuisineTag among items that have one. On a tie,
 * returns the first occurrence by iteration order. Returns 'unknown' if no
 * items have a cuisine tag.
 */
export function deriveDominantCuisine(
  items: ReadonlyArray<{ cuisineTag?: CuisineTag }>,
): CuisineTag {
  if (items.length === 0) return 'unknown';

  const counts = new Map<CuisineTag, number>();
  const firstSeenOrder: CuisineTag[] = [];

  for (const item of items) {
    const tag = item.cuisineTag;
    if (!tag || tag === 'unknown') continue;
    if (!counts.has(tag)) firstSeenOrder.push(tag);
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }

  if (counts.size === 0) return 'unknown';

  let winner: CuisineTag = firstSeenOrder[0];
  let winnerCount = counts.get(winner) ?? 0;
  for (const tag of firstSeenOrder) {
    const c = counts.get(tag) ?? 0;
    if (c > winnerCount) {
      winner = tag;
      winnerCount = c;
    }
  }
  return winner;
}

/**
 * Pure helper: extracts every defined cookingOil selection from the items.
 * Returns a flat array of CookingOilSelection objects in iteration order.
 */
export function collectOilSelections(
  items: ReadonlyArray<CorpusFinalStateItem>,
): ReadonlyArray<CookingOilSelection> {
  const out: CookingOilSelection[] = [];
  for (const item of items) {
    if (item.cookingOil) out.push(item.cookingOil);
  }
  return out;
}

interface InsertPayload {
  user_hash: string;
  salt_version: number;
  meal_id: string;
  source: CorpusSource;
  cuisine_tag: CuisineTag | null;
  recognition_payload_json: ReconciledRecognition | null;
  final_state_json: CorpusFinalState;
  edit_diff_json: CorpusEditDiff | null;
  cooking_oil_json: ReadonlyArray<CookingOilSelection>;
  meal_confidence: number | null;
  user_modified: boolean;
  contributed_photo_path: string | null;
}

export async function writeCorpusRow(opts: CorpusWriteOpts): Promise<CorpusWriteResult> {
  const {
    supabaseAdmin,
    userId,
    recognitionPayload,
    finalState,
    editDiff,
    contributedPhotoPath,
    requestId,
  } = opts;

  const { userHash, saltVersion } = await computeUserHash({ userId, supabaseAdmin });

  const cuisineTag = deriveDominantCuisine(finalState.items);
  const cuisineTagForDb: CuisineTag | null = cuisineTag === 'unknown' ? null : cuisineTag;

  const payload: InsertPayload = {
    user_hash: userHash,
    salt_version: saltVersion,
    meal_id: finalState.mealId,
    source: finalState.source,
    cuisine_tag: cuisineTagForDb,
    recognition_payload_json: recognitionPayload ?? null,
    final_state_json: finalState,
    edit_diff_json: editDiff ?? null,
    cooking_oil_json: collectOilSelections(finalState.items),
    meal_confidence: finalState.mealConfidence ?? null,
    user_modified: finalState.items.some((i) => i.userModified),
    contributed_photo_path: contributedPhotoPath ?? null,
  };

  try {
    const builder = supabaseAdmin
      .from('user_meal_corpus')
      .insert(payload)
      .select('id')
      .single();
    const result = await withTimeout(
      Promise.resolve(builder) as Promise<{ data: { id: string } | null; error: { message: string } | null }>,
      { timeoutMs: CORPUS_WRITE_TIMEOUT_MS, op: 'corpus.write', requestId },
    );

    if (result.error) {
      safeLog.error('nutrition.corpus.write_failed', 'insert returned error', {
        request_id: requestId,
        meal_id: finalState.mealId,
        source: finalState.source,
        error: result.error.message,
      });
      throw new Error(`writeCorpusRow: insert failed: ${result.error.message}`);
    }

    const row = result.data;
    if (!row || typeof row.id !== 'string') {
      safeLog.error('nutrition.corpus.write_failed', 'insert returned no id', {
        request_id: requestId,
        meal_id: finalState.mealId,
      });
      throw new Error('writeCorpusRow: insert returned no id');
    }

    return {
      corpusRowId: row.id,
      userHash,
      saltVersion,
      cuisineTag: cuisineTagForDb ?? undefined,
    };
  } catch (err) {
    if (!(err instanceof Error && err.message.startsWith('writeCorpusRow:'))) {
      safeLog.error('nutrition.corpus.write_failed', 'unexpected error', {
        request_id: requestId,
        meal_id: finalState.mealId,
        error: err,
      });
    }
    throw err;
  }
}
