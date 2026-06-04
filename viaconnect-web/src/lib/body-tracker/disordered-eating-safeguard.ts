// =============================================================================
// 169b disordered-eating safeguard signal (Phase 3 rebuild stub on main).
//
// The full 169b body-scan safeguard module lives on the parked feat/prompt-173
// branch and depends on profiles.body_scan_de_response, a column that does
// NOT yet exist on main. This stub provides the narrow surface that
// Phase 3's CAQ Weight Goals subsection needs:
//   * isDisorderedEatingResponse: type guard for the four allowed values.
//   * readActiveHistoryFromProfiles: safe Supabase read that returns
//     `active: false` when the column is missing, the row is absent, or any
//     error occurs. The CAQ surface treats safety mode as inactive in those
//     cases (the body-scan flow remains the authoritative safeguard surface
//     when 169b lands; this stub just lets the CAQ tone-match if a value is
//     ever present).
//
// "Active history" means the user reported currently or in_the_past per the
// 169b spec; the other two values (never, prefer_not_to_say) are non-active.
//
// When 169b lands properly on main, replace this stub with the real
// decideResourceCard + Resource Card UI integration. The exported signatures
// here are intentionally stable so callers (WeightGoalsSection) do not need
// to change at that swap.
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';

export type DisorderedEatingResponse =
  | 'currently'
  | 'in_the_past'
  | 'never'
  | 'prefer_not_to_say';

const ALLOWED: ReadonlySet<DisorderedEatingResponse> = new Set([
  'currently',
  'in_the_past',
  'never',
  'prefer_not_to_say',
]);

/**
 * Type guard for the four allowed disordered-eating response values. Returns
 * true only when the value is one of the canonical strings; everything else
 * (null, undefined, empty string, free-form text) is rejected.
 */
export function isDisorderedEatingResponse(
  value: unknown,
): value is DisorderedEatingResponse {
  return typeof value === 'string' && ALLOWED.has(value as DisorderedEatingResponse);
}

/**
 * Active history = `currently` OR `in_the_past`. Mirrors the 169b
 * pastDisorderedEatingHistory reason inside decideResourceCard so this stub
 * stays definitionally aligned with the eventual full module.
 */
export function isActiveHistory(value: DisorderedEatingResponse | null): boolean {
  return value === 'currently' || value === 'in_the_past';
}

/**
 * Safe profiles read used by tone-sensitive UI surfaces. Returns true when
 * the signed-in user has an active disordered-eating history per
 * profiles.body_scan_de_response; otherwise returns false. Any error
 * (missing column on main pre-169b, missing row, network failure) is
 * swallowed and returns false so the caller defaults to non-safety tone.
 */
export async function readActiveHistoryFromProfiles(
  supabase: SupabaseClient,
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('body_scan_de_response')
      .eq('id', user.id)
      .maybeSingle();
    if (error || !data) return false;
    const raw = (data as { body_scan_de_response?: string | null }).body_scan_de_response ?? null;
    if (!isDisorderedEatingResponse(raw)) return false;
    return isActiveHistory(raw);
  } catch {
    return false;
  }
}
