/**
 * lib/actions/types.ts
 *
 * Standard ActionResult shape for new Server Actions.
 * Created as part of Prompt #140b (Layer 3 Hardening).
 *
 * Existing Server Actions may use legacy return shapes (e.g., the
 * `{ ok, error, violations }` shape in analytics/actions/hannah.ts, or the
 * raw return values in app/actions/dailyScores.ts). Those legacy shapes
 * are preserved by the hardening pass to avoid breaking client consumers.
 * New Server Actions should use this ActionResult type.
 *
 * Usage examples:
 *
 *   // Critical fail-loud action
 *   export async function saveCheckpoint(input: Input): Promise<ActionResult<{ id: string }>> {
 *     try {
 *       const result = await withTimeout(supabase.from('table').insert(input), 15000, 'scope.save')
 *       if (result.error) {
 *         safeLog.error('scope.save', 'db error', { error: result.error })
 *         return { success: false, error: 'Unable to save. Please try again.', code: 'server' }
 *       }
 *       return { success: true, data: { id: result.data.id } }
 *     } catch (error) {
 *       if (isTimeoutError(error)) {
 *         safeLog.error('scope.save', 'db timeout', { error })
 *         return { success: false, error: 'Save took too long. Please try again.', code: 'timeout' }
 *       }
 *       safeLog.error('scope.save', 'unexpected', { error })
 *       return { success: false, error: 'Unexpected error.', code: 'server' }
 *     }
 *   }
 */

export type ActionResultErrorCode =
  | 'unauthenticated'
  | 'unauthorized'
  | 'validation'
  | 'timeout'
  | 'server'
  | 'rate-limited'
  | 'circuit-open'

export type ActionResult<T = void> =
  | { success: true; data: T; stale?: boolean }
  | { success: false; error: string; code: ActionResultErrorCode }
