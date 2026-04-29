<!-- Archived 2026-04-29. Reconstructed from session transcript (Prompt #140 issued 2026-04-28). Authoritative built artifacts: viaconnect-web/docs/resilience-audit-2026-04-28.md (audit report); viaconnect-web/src/lib/utils/with-timeout.ts and viaconnect-web/src/lib/utils/safe-log.ts (foundation utilities). The body below is the verbatim prompt text; the linked artifacts are the execution evidence. -->

# Prompt #140, Production Resilience Audit and Foundation Layer

Prompt #140: Production Resilience Audit + Foundation Layer
Version: 1.0
Date: April 28, 2026
Author: Gary Ferenczi (CEO, FarmCeutica Wellness LLC)
Status: Ready for Claude Code execution
Priority: High (production resilience hardening)
Successor prompts: #140a (middleware + server components), #140b (API routes + Server Actions + Edge Functions)

1. Why This Prompt Exists
On April 28, 2026, viaconnectapp.com experienced a production outage with two distinct error fingerprints:

FUNCTION_INVOCATION_TIMEOUT (Vercel request ID pdx1::8v94t-1777415709361-ce26959b8636) on a serverless function
MIDDLEWARE_INVOCATION_TIMEOUT (Vercel request ID pdx1::tnh9p-1777416537325-84d2afc87800) on edge middleware, ~14 minutes later

Root cause analysis identified two contributing factors:

Supabase compute resource constraint. Project nnhkcufyqjojdbvdrpky was running on the SMALL compute tier (2 GB memory, 2-core ARM CPU). This was insufficient for the production workload, which includes the four-agent ecosystem (Marshall, Jeffery, Hounddog, Sherlock), MAP enforcement (9 edge functions), social monitoring (6 sources), practitioner verification (16 nightly edge functions), Bio Optimization daily recalc, recommendation scoring, photo OCR pipeline, multi-currency operations, regulatory compliance integrations, and three-portal user traffic. The compute tier was upgraded to LARGE (8 GB memory, 4-core ARM CPU) on April 28, 2026 at approximately 10:24 PM. The site recovered.
Missing timeout protection across the application runtime. Even with adequate compute, any future Supabase upstream slowness, Claude API latency spike, third-party regulatory API delay, or network blip will produce the same outage pattern unless the application code has timeout protection, fail-open behavior, and structured error logging at every layer that calls external services.

This prompt addresses item 2. It does not modify Supabase configuration, Vercel configuration, or DNS. It is a code-only resilience hardening effort across all three execution layers.
2. Standing Rules Acknowledgment
This prompt operates under the following permanent rules. Claude Code must follow these without exception:

No em-dashes or en-dashes anywhere in deliverables. This includes code comments, prompt prose, markdown documents, JSON outputs, and any text Claude Code generates. Use periods, commas, colons, parentheses, or sentence restructuring instead. Hyphens in compound words (such as "12-minute" or "user-facing") are permitted. Audit every generated file with grep before committing.
No package.json modifications. No npm install, no npm update, no npm audit, no adds, no removes, no upgrades. The utilities created in this prompt use only built-in Node.js, Web APIs, and existing packages already present in the project. If a new dependency seems necessary, stop and ask Gary first.
No Supabase email template modifications. Do not touch config.toml email section, templates/*.html, auth.email settings, SMTP configuration, or any migration that alters auth.config. These are working perfectly and are not in scope.
Append-only Supabase migrations. Existing applied migrations must never be edited or deleted. This prompt does not create migrations, but if any future resilience work requires database changes, those changes must be additive only.
Desktop and Mobile in synchronism. This prompt does not introduce UI changes, so this rule is not directly applicable here. It applies in #140a if any error or loading boundaries are added that have visible UI.
Lucide icons only (no emojis) for any UI changes. Not directly applicable in this prompt.
Three-layer scope enforcement. Resilience hardening must cover all three execution layers across the prompt sequence. This prompt (#140) provides the foundation. Prompt #140a covers Layers 1 and 2 (edge middleware + server components and SSR pages). Prompt #140b covers Layer 3 (API Route Handlers, Server Actions, and Supabase Edge Functions, including all external API integrations).
Gary signs off on everything. No suggestions to loop in or check with anyone else. Gary is the sole decision-maker and executor on all ViaConnect decisions until launch.

3. Scope
In Scope

Audit the codebase to produce a structured inventory of every code site that calls Supabase, Claude API, HeyGen, or any other external service
Categorize each site by execution layer, current timeout protection state, current error handling state, and user-facing impact if it fails
Create foundation utility files: lib/utils/with-timeout.ts and lib/utils/safe-log.ts
Generate the audit report at docs/resilience-audit-2026-04-28.md for use by #140a and #140b
Verify that the foundation utilities compile cleanly and pass type checking

Out of Scope (Reserved for #140a and #140b)

Applying timeout wrappers to existing application code in middleware, server components, API routes, Server Actions, or Edge Functions
Modifying any external API call sites
Adding or modifying error boundaries (error.tsx) or loading boundaries (loading.tsx)
Changes to Vercel project configuration
Changes to Supabase project configuration
Database schema changes or migrations
UI changes of any kind

Explicitly Forbidden in This Prompt

Editing package.json
Editing Supabase email templates or auth configuration
Editing existing applied migrations
Touching middleware.ts (reserved for #140a)
Touching any page.tsx or layout.tsx (reserved for #140a)
Touching any route.ts (reserved for #140b)
Touching any Server Action file (reserved for #140b)
Touching any supabase/functions/** file (reserved for #140b)

4. Phase Structure
This prompt executes in four phases. Claude Code must complete each phase before proceeding to the next.
Phase 1: Codebase Inventory (Audit Phase)
Claude Code reads the codebase and identifies every code site relevant to resilience hardening. No changes are made to existing files in this phase. The output is a structured data collection used in Phase 3 to generate the audit report.
For each of the five categories below, Claude Code must enumerate every matching file, identify external service calls within each file, and assess current resilience state.
Category 1: Edge Middleware

Search location: middleware.ts at repo root, src/middleware.ts, or wherever Next.js middleware lives in this project
For the matching file, capture: full path, total line count, current matcher config (the config.matcher export), all external calls (Supabase auth, Supabase data, fetch to any URL, any other SDK call), presence of try/catch blocks, presence of any timeout protection, presence of any structured logging

Category 2: Server Components and SSR Pages

Search location: app/**/page.tsx, app/**/layout.tsx, app/**/template.tsx, app/**/loading.tsx, app/**/error.tsx, app/**/not-found.tsx
A file qualifies if it contains an async function export at the default level, or contains await calls to Supabase, fetch, or any other external service in its server-side execution path
For each qualifying file, capture: full path, route segment, list of external service calls, presence of try/catch around those calls, presence of timeout protection, presence of error boundary file at the same or parent route segment

Category 3: API Route Handlers

Search location: app/api/**/route.ts
For each file, capture: full path, exported HTTP methods (GET, POST, PUT, PATCH, DELETE, OPTIONS), list of external service calls within each handler, runtime declaration if present (export const runtime = 'edge' or 'nodejs'), maxDuration declaration if present, presence of try/catch, presence of timeout protection

Category 4: Server Actions

Search locations: any file with 'use server' directive at the top, any app/**/actions.ts, any lib/actions/**/*.ts, any function imported into a form action prop or used inside a useActionState hook
For each file or function, capture: full path, function name, what mutations or external calls it performs, presence of try/catch, presence of timeout protection, current error return shape

Category 5: Supabase Edge Functions

Search location: supabase/functions/**/index.ts, supabase/functions/**/index.tsx, or any equivalent function entry point
For each function, capture: function name (slug), full path, runtime (Deno), external API calls made (Claude API, Claude Vision, HeyGen, currency conversion, notification provider, regulatory APIs, GitHub API, customs API, USPTO API, court system APIs, anything else), presence of try/catch, presence of timeout protection, whether the function is invoked by a cron schedule, on-demand from the app, or by webhook

For each external service call site discovered across all five categories, classify it into one of these vendor groups:

Supabase Auth (supabase.auth.*)
Supabase Data (supabase.from(...), .rpc(...), .storage.*)
Supabase Realtime (supabase.channel(...), subscribe(...))
Anthropic Claude API (text generation, chat completions)
Anthropic Claude Vision API (image-based requests)
HeyGen (avatar video generation)
Email provider (whatever vendor is used for transactional email)
SMS provider (whatever vendor is used for SMS notifications)
Currency conversion provider
Regulatory data sources (FDA, Health Canada, USPTO, CBP, court systems)
GitHub API (for SHA pinning, repo governance, Sherlock evaluations)
Cloud provider APIs (for SOC2 evidence collection)
Other (specify vendor name)

If Claude Code cannot determine the specific vendor from code inspection, it should mark the entry "Unknown vendor" and include the file path so Gary can identify it manually.
Risk classification for each call site:

High risk: Failure causes user-visible outage of a critical flow (sign-in, CAQ submission, protocol generation, payment, practitioner-facing operations during business hours)
Medium risk: Failure degrades user experience but does not block core flows (recommendations, analytics, optional enrichment, non-blocking notifications)
Low risk: Failure is silent or only affects internal operations (background reporting, evidence collection, telemetry)

Phase 2: Foundation Utilities
Claude Code creates two new utility files. These utilities provide the building blocks that #140a and #140b will use to harden existing code.
File 1: lib/utils/with-timeout.ts
Purpose: Generic Promise.race timeout wrapper plus an AbortController-based variant for fetch-style external API calls.
Required exports:

class TimeoutError extends Error (with operation: string and timeoutMs: number properties)
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation?: string): Promise<T>
async function withAbortTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, timeoutMs: number, operation?: string): Promise<T>
function isTimeoutError(error: unknown): error is TimeoutError

Required behavior:

withTimeout races a promise against a timer; if the timer wins, throws TimeoutError. The original promise is allowed to settle in the background but its result is discarded. The timer is cleared on either outcome to prevent leaks.
withAbortTimeout invokes a function passing an AbortSignal; the function is expected to use that signal in its underlying request (e.g., fetch(url, { signal })). If the timer fires, the controller aborts, which actually cancels the in-flight network request. This is critical for external HTTP calls where leaving the request running wastes resources.
Both functions accept a string operation parameter that names the call site for diagnostic purposes (e.g., 'middleware.auth.getUser', 'edge-function.marshall.rebuttal-drafter.claude-api').
isTimeoutError is a type guard for clean error handling at consumer call sites.

The file must include a JSDoc header explaining usage with at least three examples covering: a simple Supabase auth call, a fetch to an external API with AbortController, and error handling using the isTimeoutError type guard.
File 2: lib/utils/safe-log.ts
Purpose: Structured JSON logging that is searchable in Vercel runtime logs.
Required exports:

type LogLevel = 'debug' | 'info' | 'warn' | 'error'
interface LogContext { [key: string]: unknown }
const safeLog = { debug, info, warn, error } (each method takes scope: string, message: string, context?: LogContext)

Required behavior:

Each log call emits a single JSON object via console.log (for debug/info), console.warn (for warn), or console.error (for error). The JSON includes timestamp (ISO 8601), level, scope, message, and context (if provided).
Error instances inside the context are serialized to { name, message, stack } rather than the default {} that JSON.stringify produces for Error objects.
If JSON serialization fails (circular references, non-serializable values), fall back to a plain string log of the form [level] [scope] message so we never lose the log entry.
The function never throws under any circumstance. Logging must be infallible.

The file must include a JSDoc header explaining usage with at least three examples covering: an info log with simple context, an error log with a caught Error instance, and a warn log with timing information.
File location convention:

Both files go in lib/utils/. If this directory does not yet exist, Claude Code creates it. If a lib/utils/ directory already exists (likely, given the codebase has been actively developed through #139h), Claude Code adds the two new files alongside existing utilities without modifying anything else.
Before creating each file, Claude Code must check whether a file with the same name already exists. If a with-timeout.ts or safe-log.ts already exists in the project (anywhere, not just in lib/utils/), Claude Code stops and reports the conflict to Gary rather than overwriting.

Type safety:

All utilities must be strictly typed (no any types unless absolutely necessary, in which case justified inline with a comment).
The utilities must compile cleanly under the project's existing TypeScript configuration.
The utilities must work in both Node.js runtime and Edge runtime (no Node-only APIs like fs or crypto.randomBytes).

Phase 3: Audit Report Generation
Claude Code creates a single markdown file at docs/resilience-audit-2026-04-28.md that consolidates the Phase 1 inventory into a human-readable report. This report becomes the input to #140a and #140b.
Report structure (required sections):

Executive Summary

Total files audited per category
Total external call sites discovered
Distribution of call sites by vendor group
Distribution by risk level (high/medium/low counts)
Distribution by current timeout state (none/partial/complete)
Estimated effort for #140a (Layer 1 + Layer 2)
Estimated effort for #140b (Layer 3)


Layer 1: Edge Middleware

File path, line count, matcher config
Each external call site with vendor, risk level, current state
Notes on architectural patterns observed (e.g., uses @supabase/ssr createServerClient, custom session handling, role-based routing logic)


Layer 2: Server Components and SSR Pages

Table of all qualifying files with route, external calls, risk level, current state
Identification of pages with high external service dependency
Identification of route segments missing error.tsx or loading.tsx boundaries


Layer 3a: API Route Handlers

Table of all route handlers with HTTP methods, external calls, risk level, current state
Notes on which routes are user-facing vs admin-only vs internal


Layer 3b: Server Actions

Table of all server actions with what they mutate and what external services they call
Identification of actions that need fail-loud behavior (legal, compliance, financial) vs fail-open (recommendations, analytics)


Layer 3c: Supabase Edge Functions

Table of all edge functions with vendor calls, invocation pattern (cron/on-demand/webhook), risk level
Special section for the agent ecosystem functions (Marshall, Jeffery, Hounddog, Sherlock) given their complexity


External API Vendor Inventory

Complete list of every external API vendor identified across the codebase
Number of call sites per vendor
Whether each vendor's SDK supports AbortController natively, requires custom timeout wrapping, or is invoked through a thin client we control


Recommendations for #140a Scope

Specific files to modify in #140a
Specific external calls to wrap with withTimeout in #140a
Specific error and loading boundaries to add or enhance


Recommendations for #140b Scope

Specific files to modify in #140b
Specific external API calls to wrap with withAbortTimeout in #140b
Special handling notes for fail-loud-vs-fail-open decisions per vendor


Open Questions for Gary

Any vendor that could not be identified by automated inspection
Any timeout value that should be different from the defaults below
Any code site where the right behavior is genuinely ambiguous



Default timeout values (to be referenced by #140a and #140b):
LayerDefault TimeoutRationaleEdge middleware3000 msVercel edge limit is much higher; this fails fast and lets the page render throughServer components / SSR pages8000 msAllows legitimate database queries to complete while preventing hung pagesAPI Route Handlers (general)15000 msAllows heavier operations like recommendation scoring or batch operationsAPI Route Handlers (cron / batch)60000 msReserved for the Bio Optimization daily recalc and similar long-running scheduled jobsServer Actions15000 msSame as general API routesSupabase Edge Functions (general)25000 msConservative within Supabase Edge Function limitsExternal API call (Claude API text)10000 msMost Claude completions return well under this; longer than this indicates a real problemExternal API call (Claude Vision)20000 msVision calls are heavier; allow more headroomExternal API call (other vendors)10000 msDefault; override per vendor in #140b based on observed P99
These defaults are starting values. The audit report should flag any specific operation where these defaults are clearly inappropriate.
Phase 4: Verification
Before declaring this prompt complete, Claude Code verifies:

The two utility files exist at the specified paths
Both files compile under the project's TypeScript configuration with zero errors
Both files contain JSDoc documentation with usage examples
Both files use only Node.js standard library, Web APIs, and existing project packages (no new npm dependencies were introduced)
The audit report file exists at the specified path
The audit report contains all required sections with non-empty content
No existing application code was modified (run a final diff check; only new files should appear)
No em-dashes or en-dashes appear in any new file (run a grep check for U+2014 and U+2013 across all created files; report finds zero)
package.json has not been modified (diff check)
No Supabase email template, auth config, or migration was modified (diff check)

If any verification step fails, Claude Code stops, reports the failure clearly, and does not commit the changes. Gary decides how to proceed.
5. Code Templates
5.1 with-timeout.ts (full reference template)
typescript/**
 * lib/utils/with-timeout.ts
 *
 * Timeout utilities for resilience hardening across all execution layers.
 * Created as part of Prompt #140 (Production Resilience Audit + Foundation Layer).
 *
 * Two variants are provided:
 *
 *   1. withTimeout: races any Promise against a timer. Use this for SDK calls
 *      that do not expose AbortSignal (e.g., Supabase client methods).
 *
 *   2. withAbortTimeout: invokes a function with an AbortSignal that gets
 *      aborted on timeout. Use this for fetch and other AbortSignal-aware APIs.
 *      This actually cancels the underlying network request, which is important
 *      to prevent resource leaks at scale.
 *
 * Usage examples:
 *
 *   // Supabase auth check in middleware
 *   const { data, error } = await withTimeout(
 *     supabase.auth.getUser(),
 *     3000,
 *     'middleware.auth.getUser'
 *   )
 *
 *   // External API call with AbortController
 *   const response = await withAbortTimeout(
 *     (signal) => fetch('https://api.anthropic.com/v1/messages', {
 *       method: 'POST',
 *       headers: { ... },
 *       body: JSON.stringify(payload),
 *       signal,
 *     }),
 *     10000,
 *     'edge-function.marshall.rebuttal-drafter.claude-api'
 *   )
 *
 *   // Type-safe error handling
 *   try {
 *     await withTimeout(somePromise, 5000, 'my-operation')
 *   } catch (error) {
 *     if (isTimeoutError(error)) {
 *       safeLog.warn('my-scope', 'operation timed out', { error })
 *       return fallbackValue
 *     }
 *     throw error
 *   }
 */

export class TimeoutError extends Error {
  readonly operation: string
  readonly timeoutMs: number

  constructor(operation: string, timeoutMs: number) {
    super(`Operation "${operation}" timed out after ${timeoutMs}ms`)
    this.name = 'TimeoutError'
    this.operation = operation
    this.timeoutMs = timeoutMs
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string = 'unknown'
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new TimeoutError(operation, timeoutMs))
    }, timeoutMs)
  })

  try {
    const result = await Promise.race([promise, timeoutPromise])
    return result
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle)
    }
  }
}

export async function withAbortTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  operation: string = 'unknown'
): Promise<T> {
  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => {
    controller.abort(new TimeoutError(operation, timeoutMs))
  }, timeoutMs)

  try {
    return await fn(controller.signal)
  } finally {
    clearTimeout(timeoutHandle)
  }
}

export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError
}
5.2 safe-log.ts (full reference template)
typescript/**
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
 * - Every log call must be infallible. If serialization fails, we fall back to
 *   a plain string. Logging code must never throw.
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
5.3 Audit Report Skeleton (template for Phase 3 output)
The audit report at docs/resilience-audit-2026-04-28.md should follow this structure exactly. Claude Code fills in real content based on the Phase 1 inventory.
markdown# ViaConnect Production Resilience Audit
**Date:** April 28, 2026
**Generated by:** Prompt #140 (Resilience Audit + Foundation Layer)
**Audit scope:** Full codebase as of HEAD on main branch
**Inputs:** Claude Code static analysis of all middleware, server components, API routes, server actions, and Supabase edge functions

## Executive Summary

[Aggregate counts and high-level findings]

## Layer 1: Edge Middleware

[Findings for middleware.ts]

## Layer 2: Server Components and SSR Pages

[Table of all qualifying pages]

## Layer 3a: API Route Handlers

[Table of all route handlers]

## Layer 3b: Server Actions

[Table of all server actions]

## Layer 3c: Supabase Edge Functions

[Table of all edge functions, with special agent ecosystem subsection]

## External API Vendor Inventory

[Complete vendor list with call site counts]

## Recommendations for Prompt #140a Scope

[Layer 1 and Layer 2 hardening targets]

## Recommendations for Prompt #140b Scope

[Layer 3 hardening targets including external API protection]

## Open Questions for Gary

[Anything that requires human decision before #140a or #140b can proceed]
6. Deliverable Checklist
Claude Code confirms each item below at the end of execution:

 lib/utils/with-timeout.ts created with TimeoutError, withTimeout, withAbortTimeout, isTimeoutError exports
 lib/utils/safe-log.ts created with safeLog object exporting debug, info, warn, error methods
 Both utility files compile cleanly under the project's TypeScript configuration
 Both utility files contain JSDoc documentation with at least three usage examples each
 docs/resilience-audit-2026-04-28.md created with all 10 required sections
 Audit report covers all 5 categories (middleware, server components, API routes, server actions, edge functions)
 Audit report inventories every external API vendor identified
 Audit report includes recommendations for #140a and #140b scope
 No existing application code was modified (verified by diff)
 No em-dashes (U+2014) or en-dashes (U+2013) appear in any created file (verified by grep)
 package.json was not modified
 No Supabase email template or auth config was modified
 No existing migration was edited or deleted
 No new npm dependencies were introduced

7. Out-of-Scope Reminder
This prompt does not fix anything. It produces utilities and an audit report. The actual hardening of existing code happens in #140a (middleware and server components) and #140b (API routes, server actions, edge functions, external APIs).
If during the audit Claude Code identifies code that is so clearly broken or dangerous that it should be fixed immediately, Claude Code does not fix it in this prompt. Instead, Claude Code adds a "Critical Findings" section at the top of the audit report flagging the issue for Gary's immediate attention. Gary decides whether to address it in a separate hot-fix prompt or wait for #140a or #140b.
8. Sign-Off Criteria
This prompt is complete when:

Foundation utilities exist and compile cleanly
Audit report exists, is comprehensive, and is structured as specified
All deliverable checklist items pass verification
No existing application code was modified
Gary reviews the audit report and approves moving to #140a

If any deliverable check fails, this prompt is incomplete and must not be merged or deployed. Claude Code reports the failure clearly and waits for Gary's instruction.