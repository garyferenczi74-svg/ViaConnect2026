/**
 * lib/utils/safe-log.ts
 *
 * Structured JSON logging for Vercel runtime logs.
 * Created as part of Prompt #140 (Production Resilience Audit + Foundation Layer).
 *
 * Output is JSON per line, searchable via Vercel's runtime logs UI and queryable
 * by scope, level, message, or context fields.
 *
 * Usage examples:
 *
 *   // Info log with context
 *   safeLog.info('cron.bio-recalc', 'starting daily recalculation', {
 *     scheduledAt: new Date().toISOString(),
 *     userCount: 1247,
 *   })
 *
 *   // Error log with caught error
 *   try {
 *     await someOperation()
 *   } catch (error) {
 *     safeLog.error('api.recommendations', 'recommendation engine failed', {
 *       error,
 *       userId,
 *       requestId,
 *     })
 *   }
 *
 *   // Warning with timing information
 *   const start = Date.now()
 *   const result = await slowQuery()
 *   const durationMs = Date.now() - start
 *   if (durationMs > 5000) {
 *     safeLog.warn('api.protocol-load', 'slow query detected', { durationMs, userId })
 *   }
 *
 * Design notes:
 * - Every log call must be infallible. If serialization fails, we fall back
 *   to a plain string. Logging code must never throw.
 * - Error instances are serialized to { name, message, stack } because the
 *   default JSON.stringify of an Error returns "{}".
 * - Vercel preserves console.log/warn/error output. We use console.error for
 *   warn and error levels so they surface in Vercel's error filters.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  scope: string
  message: string
  context?: LogContext
}

function serializeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    }
  }
  return value
}

function sanitizeContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined
  const sanitized: LogContext = {}
  for (const [key, value] of Object.entries(context)) {
    sanitized[key] = serializeValue(value)
  }
  return sanitized
}

function emit(level: LogLevel, scope: string, message: string, context?: LogContext): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    scope,
    message,
    context: sanitizeContext(context),
  }

  const fn = level === 'error' || level === 'warn' ? console.error : console.log

  try {
    fn(JSON.stringify(entry))
  } catch {
    fn(`[${level}] [${scope}] ${message}`)
  }
}

export const safeLog = {
  debug: (scope: string, message: string, context?: LogContext) =>
    emit('debug', scope, message, context),
  info: (scope: string, message: string, context?: LogContext) =>
    emit('info', scope, message, context),
  warn: (scope: string, message: string, context?: LogContext) =>
    emit('warn', scope, message, context),
  error: (scope: string, message: string, context?: LogContext) =>
    emit('error', scope, message, context),
}
