/**
 * src/lib/utils/__tests__/schema-drift.test.ts
 *
 * Task P0-1 (Prompt 210d, schema integrity remediation).
 *
 * Covers:
 * - classifySchemaDrift: Postgres and PostgREST code mapping (42P01, 42703,
 *   42883, 22P02 plus enum message, PGRST202, PGRST204, PGRST205), storage
 *   'Bucket not found', message-only classification, and non-drift inputs.
 * - isSchemaStrict: SCHEMA_STRICT_MODE flag, VERCEL_ENV development/preview,
 *   NODE_ENV test, and the production-is-never-strict-without-flag rule.
 * - reportSupabaseError: reason-tagged safeLog.error on drift, safeLog.warn
 *   otherwise, strict-mode rethrow of the ORIGINAL error, and the guarantee
 *   that the non-strict path never throws.
 *
 * Node-safe (no jsdom). No em dashes, no en dashes, no emojis.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  classifySchemaDrift,
  isSchemaStrict,
  reportSupabaseError,
} from '@/lib/utils/schema-drift'
import { safeLog } from '@/lib/utils/safe-log'

describe('classifySchemaDrift', () => {
  it('maps Postgres 42P01 (undefined table) to missing_table', () => {
    const result = classifySchemaDrift({
      code: '42P01',
      message: 'relation "public.agent_scan_results" does not exist',
    })
    expect(result).toEqual({ isDrift: true, reason: 'missing_table', pgCode: '42P01' })
  })

  it('maps Postgres 42703 (undefined column) to missing_column', () => {
    const result = classifySchemaDrift({
      code: '42703',
      message: 'column daily_scores.focus_score does not exist',
    })
    expect(result).toEqual({ isDrift: true, reason: 'missing_column', pgCode: '42703' })
  })

  it('maps Postgres 42883 (undefined function) to missing_function', () => {
    const result = classifySchemaDrift({
      code: '42883',
      message: 'function public.calculate_bio_score(uuid) does not exist',
    })
    expect(result).toEqual({ isDrift: true, reason: 'missing_function', pgCode: '42883' })
  })

  it('maps 22P02 with an enum message to missing_enum_value', () => {
    const result = classifySchemaDrift({
      code: '22P02',
      message: 'invalid input value for enum notification_type: "agent_scan"',
    })
    expect(result).toEqual({ isDrift: true, reason: 'missing_enum_value', pgCode: '22P02' })
  })

  it('does NOT flag 22P02 without the enum message (plain cast failure)', () => {
    const result = classifySchemaDrift({
      code: '22P02',
      message: 'invalid input syntax for type uuid: "not-a-uuid"',
    })
    expect(result).toEqual({ isDrift: false, reason: null, pgCode: '22P02' })
  })

  it('maps PGRST202 (function not in schema cache) to missing_function', () => {
    const result = classifySchemaDrift({
      code: 'PGRST202',
      message: 'Could not find the function public.get_streak(p_user_id) in the schema cache',
    })
    expect(result).toEqual({ isDrift: true, reason: 'missing_function', pgCode: 'PGRST202' })
  })

  it('maps PGRST204 (column not in schema cache) to missing_column', () => {
    const result = classifySchemaDrift({
      code: 'PGRST204',
      message: "Could not find the 'source_breakdown' column of 'daily_scores' in the schema cache",
    })
    expect(result).toEqual({ isDrift: true, reason: 'missing_column', pgCode: 'PGRST204' })
  })

  it('maps PGRST205 (table not in schema cache) to missing_table', () => {
    const result = classifySchemaDrift({
      code: 'PGRST205',
      message: "Could not find the table 'public.body_scan_queue' in the schema cache",
    })
    expect(result).toEqual({ isDrift: true, reason: 'missing_table', pgCode: 'PGRST205' })
  })

  it('maps a storage Bucket not found error object to missing_bucket', () => {
    const result = classifySchemaDrift({
      message: 'Bucket not found',
      statusCode: '404',
    })
    expect(result).toEqual({ isDrift: true, reason: 'missing_bucket', pgCode: null })
  })

  it('maps a storage Bucket not found Error instance to missing_bucket', () => {
    const result = classifySchemaDrift(new Error('Bucket not found'))
    expect(result).toEqual({ isDrift: true, reason: 'missing_bucket', pgCode: null })
  })

  it('classifies from message alone when no code is present (enum)', () => {
    const result = classifySchemaDrift({
      message: 'invalid input value for enum mood_kind: "zen"',
    })
    expect(result).toEqual({ isDrift: true, reason: 'missing_enum_value', pgCode: null })
  })

  it('classifies from message alone when no code is present (table)', () => {
    const result = classifySchemaDrift({
      message: 'relation "public.wearable_sync_log" does not exist',
    })
    expect(result).toEqual({ isDrift: true, reason: 'missing_table', pgCode: null })
  })

  it('classifies a column-of-relation message as missing_column, not missing_table', () => {
    const result = classifySchemaDrift({
      message: 'column "regimen_score" of relation "daily_scores" does not exist',
    })
    expect(result).toEqual({ isDrift: true, reason: 'missing_column', pgCode: null })
  })

  it('does NOT flag a plain timeout Error as drift', () => {
    const result = classifySchemaDrift(new Error('Operation timed out after 5000 ms'))
    expect(result).toEqual({ isDrift: false, reason: null, pgCode: null })
  })

  it('does NOT flag an unknown Postgres code (unique violation)', () => {
    const result = classifySchemaDrift({
      code: '23505',
      message: 'duplicate key value violates unique constraint "daily_scores_pkey"',
    })
    expect(result).toEqual({ isDrift: false, reason: null, pgCode: '23505' })
  })

  it('never throws on null, undefined, string, or malformed inputs', () => {
    expect(classifySchemaDrift(null)).toEqual({ isDrift: false, reason: null, pgCode: null })
    expect(classifySchemaDrift(undefined)).toEqual({ isDrift: false, reason: null, pgCode: null })
    expect(classifySchemaDrift('boom')).toEqual({ isDrift: false, reason: null, pgCode: null })
    expect(classifySchemaDrift(42)).toEqual({ isDrift: false, reason: null, pgCode: null })
    expect(classifySchemaDrift({ code: 42703 })).toEqual({
      isDrift: false,
      reason: null,
      pgCode: null,
    })
  })
})

describe('isSchemaStrict', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns true when SCHEMA_STRICT_MODE=on, even in production', () => {
    vi.stubEnv('SCHEMA_STRICT_MODE', 'on')
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NODE_ENV', 'production')
    expect(isSchemaStrict()).toBe(true)
  })

  it('returns false in production without the explicit flag', () => {
    vi.stubEnv('SCHEMA_STRICT_MODE', undefined)
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NODE_ENV', 'production')
    expect(isSchemaStrict()).toBe(false)
  })

  it('returns true on Vercel development', () => {
    vi.stubEnv('SCHEMA_STRICT_MODE', undefined)
    vi.stubEnv('VERCEL_ENV', 'development')
    vi.stubEnv('NODE_ENV', 'production')
    expect(isSchemaStrict()).toBe(true)
  })

  it('returns true on Vercel preview', () => {
    vi.stubEnv('SCHEMA_STRICT_MODE', undefined)
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('NODE_ENV', 'production')
    expect(isSchemaStrict()).toBe(true)
  })

  it('returns true under NODE_ENV=test', () => {
    vi.stubEnv('SCHEMA_STRICT_MODE', undefined)
    vi.stubEnv('VERCEL_ENV', undefined)
    vi.stubEnv('NODE_ENV', 'test')
    expect(isSchemaStrict()).toBe(true)
  })

  it('returns false locally when nothing opts in', () => {
    vi.stubEnv('SCHEMA_STRICT_MODE', undefined)
    vi.stubEnv('VERCEL_ENV', undefined)
    vi.stubEnv('NODE_ENV', 'development')
    expect(isSchemaStrict()).toBe(false)
  })
})

describe('reportSupabaseError', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    errorSpy = vi.spyOn(safeLog, 'error').mockImplementation(() => undefined)
    warnSpy = vi.spyOn(safeLog, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('throws the ORIGINAL error on drift when strict mode is on', () => {
    vi.stubEnv('SCHEMA_STRICT_MODE', 'on')
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NODE_ENV', 'production')

    const original = {
      code: '42P01',
      message: 'relation "public.agent_scan_results" does not exist',
    }

    let thrown: unknown = null
    try {
      reportSupabaseError('test.strict.drift', original, { table: 'agent_scan_results' })
    } catch (caught) {
      thrown = caught
    }

    expect(thrown).toBe(original)
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledWith(
      'test.strict.drift',
      expect.any(String),
      expect.objectContaining({
        schemaDrift: true,
        driftReason: 'missing_table',
        pgCode: '42P01',
        table: 'agent_scan_results',
      }),
    )
  })

  it('logs schemaDrift true and never throws on drift when strict mode is off', () => {
    vi.stubEnv('SCHEMA_STRICT_MODE', 'off')
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NODE_ENV', 'production')

    const original = {
      code: 'PGRST204',
      message: "Could not find the 'source_breakdown' column of 'daily_scores' in the schema cache",
    }

    expect(() =>
      reportSupabaseError('test.failopen.drift', original, { table: 'daily_scores' }),
    ).not.toThrow()

    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledWith(
      'test.failopen.drift',
      expect.any(String),
      expect.objectContaining({
        schemaDrift: true,
        driftReason: 'missing_column',
        pgCode: 'PGRST204',
        table: 'daily_scores',
      }),
    )
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('logs non-drift errors via safeLog.warn and does not throw even in strict mode', () => {
    vi.stubEnv('SCHEMA_STRICT_MODE', 'on')
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NODE_ENV', 'production')

    const timeout = new Error('Operation timed out after 5000 ms')

    expect(() => reportSupabaseError('test.failopen.timeout', timeout)).not.toThrow()

    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalledWith(
      'test.failopen.timeout',
      expect.any(String),
      expect.objectContaining({ error: timeout }),
    )
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('works without a context argument', () => {
    vi.stubEnv('SCHEMA_STRICT_MODE', 'off')
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NODE_ENV', 'production')

    expect(() =>
      reportSupabaseError('test.no-context', { code: '42883', message: 'function x() does not exist' }),
    ).not.toThrow()

    expect(errorSpy).toHaveBeenCalledWith(
      'test.no-context',
      expect.any(String),
      expect.objectContaining({
        schemaDrift: true,
        driftReason: 'missing_function',
        pgCode: '42883',
      }),
    )
  })
})
