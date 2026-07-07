/**
 * lib/utils/schema-drift.ts
 *
 * Schema-drift error classifier, reason-tagged fail-open reporter, and strict
 * mode. Created as part of Prompt 210d (Task P0-1, schema integrity).
 *
 * Problem: the platform's fail-open pattern silently swallows Supabase errors
 * caused by schema drift (missing tables, columns, functions, enum values, or
 * storage buckets). Writes appear to succeed while data is silently dropped.
 * This module keeps fail-open in place but makes those failures VISIBLE:
 *
 * - classifySchemaDrift(error): pure classification, no I/O. Maps Postgres
 *   and PostgREST error codes, plus known message shapes, to a drift reason.
 *   Supabase errors arrive as objects with `code` and `message` string
 *   fields; classification works from either.
 * - reportSupabaseError(scope, error, context): logs drift via safeLog.error
 *   with { schemaDrift: true, driftReason, pgCode } merged into context, logs
 *   non-drift errors via safeLog.warn, and rethrows the ORIGINAL error only
 *   when drift is detected and strict mode is on. It never throws otherwise.
 * - isSchemaStrict(): true when SCHEMA_STRICT_MODE=on, or when VERCEL_ENV is
 *   'development' or 'preview', or when NODE_ENV is 'test'. Production
 *   (VERCEL_ENV 'production') is never strict without the explicit flag.
 *
 * PII rule: log context carries object names (table, column, function,
 * bucket) and error codes ONLY, never user data. Context is passed through
 * as-is, so callers must not place user data in it.
 *
 * Deno mirror: supabase/functions/_shared/schema-drift.ts (keep in sync).
 *
 * Usage:
 *   const { error } = await supabase.from('daily_scores').insert(row)
 *   if (error) {
 *     reportSupabaseError('api.daily-scores.insert', error, {
 *       table: 'daily_scores',
 *     })
 *   }
 */

import { safeLog } from './safe-log'

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
 * Strict mode gates the deliberate rethrow in reportSupabaseError so schema
 * drift fails loudly where it is safe to do so:
 * - SCHEMA_STRICT_MODE=on forces strict anywhere, including production.
 * - Production (VERCEL_ENV 'production') without that flag is always false.
 * - Vercel development and preview deployments are strict.
 * - NODE_ENV=test is strict so tests surface drift immediately.
 */
export function isSchemaStrict(): boolean {
  if (process.env.SCHEMA_STRICT_MODE === 'on') return true
  if (process.env.VERCEL_ENV === 'production') return false
  if (process.env.VERCEL_ENV === 'development' || process.env.VERCEL_ENV === 'preview') return true
  if (process.env.NODE_ENV === 'test') return true
  return false
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
