/**
 * supabase/functions/_shared/schema-drift.ts
 *
 * Deno-compatible mirror of src/lib/utils/schema-drift.ts.
 * Schema-drift error classifier, reason-tagged fail-open reporter, and strict
 * mode for Supabase Edge Functions.
 *
 * Created as part of Prompt 210d (Task P0-1, schema integrity).
 *
 * Usage examples:
 *
 *   import { reportSupabaseError } from '../_shared/schema-drift.ts'
 *
 *   const { error } = await supabase.from('daily_scores').insert(row)
 *   if (error) {
 *     reportSupabaseError('edge-function.example.insert', error, {
 *       table: 'daily_scores',
 *     })
 *   }
 *
 * Design notes:
 * - classifySchemaDrift is pure classification, no I/O, never throws.
 *   Supabase errors arrive as objects with `code` and `message` string
 *   fields; classification works from either.
 * - reportSupabaseError logs drift via safeLog.error with
 *   { schemaDrift: true, driftReason, pgCode } merged into context, logs
 *   non-drift errors via safeLog.warn, and rethrows the ORIGINAL error only
 *   when drift is detected and strict mode is on. It never throws otherwise.
 * - Strict mode here reads Deno.env.get('SCHEMA_STRICT_MODE') === 'on'.
 *   Edge Functions have no VERCEL_ENV; production stays fail-open unless the
 *   flag is set explicitly on the function.
 * - PII rule: log context carries object names (table, column, function,
 *   bucket) and error codes ONLY, never user data. Context is passed through
 *   as-is, so callers must not place user data in it.
 */

import { safeLog } from './safe-log.ts'

export type SchemaDriftReason =
  | 'missing_table'
  | 'missing_column'
  | 'missing_function'
  | 'missing_enum_value'
  | 'missing_bucket'

export interface SchemaDriftClassification {
  isDrift: boolean
  reason: SchemaDriftReason | null
  pgCode: string | null
}

/**
 * Postgres and PostgREST error codes with an unambiguous drift meaning.
 *
 * 42P01    undefined_table (Postgres)
 * 42703    undefined_column (Postgres)
 * 42883    undefined_function (Postgres)
 * PGRST202 function not found in schema cache (PostgREST)
 * PGRST204 column not found in schema cache (PostgREST)
 * PGRST205 table not found in schema cache (PostgREST)
 *
 * 22P02 (invalid_text_representation) is deliberately NOT here: it only
 * indicates drift when the message says 'invalid input value for enum',
 * which the message patterns below capture.
 */
const CODE_REASONS: Record<string, SchemaDriftReason> = {
  '42P01': 'missing_table',
  '42703': 'missing_column',
  '42883': 'missing_function',
  PGRST202: 'missing_function',
  PGRST204: 'missing_column',
  PGRST205: 'missing_table',
}

function readStringField(error: unknown, field: string): string | null {
  if (error === null || typeof error !== 'object') return null
  const value = (error as Record<string, unknown>)[field]
  return typeof value === 'string' ? value : null
}

function readMessage(error: unknown): string | null {
  if (typeof error === 'string') return error
  return readStringField(error, 'message')
}

/**
 * Message-shape fallback for errors that arrive without a usable code
 * (storage errors, some client wrappers). Patterns are matched against the
 * lowercased message. Order matters: the column patterns must run before the
 * table pattern because Postgres emits
 * 'column "x" of relation "y" does not exist' for missing columns.
 */
function classifyFromMessage(lowerMessage: string): SchemaDriftReason | null {
  if (!lowerMessage) return null
  if (lowerMessage.includes('invalid input value for enum')) return 'missing_enum_value'
  if (lowerMessage.includes('bucket not found')) return 'missing_bucket'
  if (
    lowerMessage.includes('could not find the function') ||
    /\bfunction .+ does not exist/.test(lowerMessage)
  ) {
    return 'missing_function'
  }
  if (
    /could not find the '.+' column/.test(lowerMessage) ||
    /\bcolumn .+ does not exist/.test(lowerMessage)
  ) {
    return 'missing_column'
  }
  if (
    lowerMessage.includes('could not find the table') ||
    /\brelation "[^"]+" does not exist/.test(lowerMessage)
  ) {
    return 'missing_table'
  }
  return null
}

/**
 * Pure classification of an unknown error value. No I/O, never throws.
 * pgCode is reported whenever the error carries a string code, even when the
 * error is not drift (useful for triage of fail-open warnings).
 */
export function classifySchemaDrift(error: unknown): SchemaDriftClassification {
  const pgCode = readStringField(error, 'code')

  if (pgCode !== null) {
    const mapped = CODE_REASONS[pgCode]
    if (mapped) {
      return { isDrift: true, reason: mapped, pgCode }
    }
  }

  const message = readMessage(error)
  const reason = classifyFromMessage(message ? message.toLowerCase() : '')
  if (reason) {
    return { isDrift: true, reason, pgCode }
  }

  return { isDrift: false, reason: null, pgCode }
}

/**
 * Strict mode gates the deliberate rethrow in reportSupabaseError.
 * Edge Functions opt in per function via the SCHEMA_STRICT_MODE secret;
 * anything other than 'on' keeps the fail-open behavior.
 */
export function isSchemaStrict(): boolean {
  return Deno.env.get('SCHEMA_STRICT_MODE') === 'on'
}

/**
 * Reason-tagged reporter for the fail-open pattern.
 *
 * Drift: logs safeLog.error with { schemaDrift: true, driftReason, pgCode }
 * merged into the caller context, then rethrows the ORIGINAL error if strict
 * mode is on. Non-drift: logs safeLog.warn and returns.
 *
 * This function never throws EXCEPT the deliberate strict-mode rethrow.
 * Context is logged as-is: callers pass object names and codes only, never
 * user data (see PII rule in the file header).
 */
export function reportSupabaseError(
  scope: string,
  error: unknown,
  context?: Record<string, unknown>,
): void {
  let strictRethrow = false

  try {
    const { isDrift, reason, pgCode } = classifySchemaDrift(error)

    if (isDrift) {
      safeLog.error(scope, 'schema drift detected', {
        ...context,
        error,
        schemaDrift: true,
        driftReason: reason,
        pgCode,
      })
      strictRethrow = isSchemaStrict()
    } else {
      safeLog.warn(scope, 'supabase error (fail-open)', {
        ...context,
        error,
        pgCode,
      })
    }
  } catch {
    // Reporting must never break the caller. The only deliberate throw is
    // the strict-mode rethrow below.
  }

  if (strictRethrow) {
    throw error
  }
}
