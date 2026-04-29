<!-- Archived 2026-04-29. Reconstructed from session transcript (Prompt #140a issued 2026-04-28). Authoritative built artifacts: viaconnect-web/src/middleware.ts (Layer 1 hardened); Layer 2 server components and SSR pages under viaconnect-web/src/app/**/page.tsx and layout.tsx with timeout protection, fail-open behavior, and structured logging applied per the body below. The body is the verbatim prompt text; the linked artifacts are the execution evidence. -->

# Prompt #140a, Resilience Hardening Layer 1 and Layer 2

Prompt #140a: Resilience Hardening Layer 1 and Layer 2 (Edge Middleware + Server Components and SSR Pages)
Version: 1.0
Date: April 28, 2026
Author: Gary Ferenczi (CEO, FarmCeutica Wellness LLC)
Status: Ready for Claude Code execution
Priority: High (production resilience hardening)
Predecessor: Prompt #140 (Resilience Audit + Foundation Layer) must be executed first
Successor: Prompt #140b (API Routes + Server Actions + Supabase Edge Functions)

1. Why This Prompt Exists
Prompt #140 created the foundation utilities (lib/utils/with-timeout.ts, lib/utils/safe-log.ts) and produced the audit report at docs/resilience-audit-2026-04-28.md. This prompt applies those utilities to harden the two outermost execution layers of the Next.js application:

Layer 1: Edge Middleware (middleware.ts). Runs on every request at Vercel's edge. Currently calls Supabase auth with no timeout protection. The April 28, 2026 outage produced a MIDDLEWARE_INVOCATION_TIMEOUT (Vercel request ID pdx1::tnh9p-1777416537325-84d2afc87800) at this exact layer. This is the single highest-leverage hardening target because every request flows through it.
Layer 2: Server Components and SSR Pages (app/**/page.tsx, app/**/layout.tsx, related server-rendered files). These do server-side data fetching against Supabase and any external services. When data fetches hang, the page hangs, and the user sees FUNCTION_INVOCATION_TIMEOUT (the same outage produced this error code at request ID pdx1::8v94t-1777415709361-ce26959b8636 approximately 14 minutes before the middleware timeout, indicating a sustained Supabase upstream issue affecting both layers).

This prompt does not touch API routes, Server Actions, or Supabase Edge Functions. Those are reserved for #140b.
2. Standing Rules Acknowledgment
This prompt operates under the following permanent rules. Claude Code must follow these without exception:

No em-dashes or en-dashes anywhere in deliverables. This includes code comments, prompt prose, markdown documents, JSON outputs, JSX text content, and any text Claude Code generates. Use periods, commas, colons, parentheses, or sentence restructuring instead. Hyphens in compound words (such as "12-minute" or "user-facing") are permitted. Run a grep check for U+2014 and U+2013 across all created and modified files before declaring completion.
No package.json modifications. No npm install, no npm update, no npm audit, no adds, no removes, no upgrades. The hardening uses only existing project packages plus the foundation utilities created by #140. If a new dependency seems necessary, stop and ask Gary first.
No Supabase email template modifications. Do not touch config.toml email section, templates/*.html, auth.email settings, SMTP configuration, or any migration that alters auth.config. These are working perfectly.
Append-only Supabase migrations. Existing applied migrations must never be edited or deleted. This prompt does not create migrations, but if any future resilience work requires database changes, those changes must be additive only.
Desktop and Mobile in synchronism. This rule applies fully to the new error.tsx and loading.tsx boundary files. Every UI element introduced must use responsive Tailwind classes (e.g., text-sm sm:text-base, p-4 sm:p-8, w-12 h-12 sm:w-16 sm:h-16) so mobile and desktop look correct simultaneously. No desktop-first then patching mobile later.
Lucide icons only (no emojis) for any UI changes. The error.tsx and loading.tsx boundaries use Lucide icons (AlertCircle, RefreshCw, Loader2). No Unicode emoji characters anywhere in JSX.
ViaConnect brand system. Use the canonical brand colors only: Deep Navy #1A2744, Teal #2DA5A0, Orange #B75E18. The font stack is Instrument Sans (already configured globally). Glassmorphism effects where appropriate. Do not introduce any other colors or fonts.
Three-layer scope discipline. This prompt covers Layer 1 (middleware) and Layer 2 (server components and SSR pages) only. Do not touch any file under app/api/, do not touch any file with a 'use server' directive, do not touch any file under supabase/functions/. Those are reserved for #140b.
Gary signs off on everything. No suggestions to loop in or check with anyone else. Gary is the sole decision-maker and executor on all ViaConnect decisions until launch.

3. Scope
In Scope

Modify middleware.ts to add timeout protection on Supabase auth calls, fail-open behavior, structured logging, and tightened matcher configuration
Modify every server component (app/**/page.tsx, app/**/layout.tsx, etc.) that performs server-side Supabase calls or external service calls, applying timeout protection with appropriate fail-open or fail-loud behavior per page type
Add error.tsx and loading.tsx boundary files at strategic route segments where missing
Apply the route-segment classification table (Section 6) to determine fail-open vs. fail-loud behavior for each page
Verify that all changes preserve existing functionality, type checking, and visual design

Out of Scope (Reserved for #140b)

Any file under app/api/ (Route Handlers)
Any file with 'use server' directive at top (Server Actions)
Any file under supabase/functions/ (Edge Functions)
External API call site hardening (Claude API, HeyGen, currency providers, notification providers, regulatory APIs, etc.)

Explicitly Forbidden in This Prompt

Editing package.json
Editing Supabase email templates or auth configuration
Editing existing applied migrations
Adding new external dependencies
Restructuring components or refactoring beyond what timeout hardening requires
Changing brand colors, typography, or design language
Removing existing functionality (only additive defensive code)
Switching pages between static and dynamic rendering modes (preserve current rendering behavior)
Adding any UI element using emoji characters

4. Phase Structure
This prompt executes in five phases. Claude Code must complete each phase before proceeding to the next, and must report the diff after each phase so Gary can spot-check progress.
Phase 1: Prerequisite Verification
Before any modifications, Claude Code verifies that #140 was executed successfully:

Confirm lib/utils/with-timeout.ts exists and exports TimeoutError, withTimeout, withAbortTimeout, and isTimeoutError
Confirm lib/utils/safe-log.ts exists and exports the safeLog object with debug, info, warn, and error methods
Check whether docs/resilience-audit-2026-04-28.md exists; if yes, parse it and use the audit findings to prioritize hardening order; if no, perform inline discovery during Phase 2 (slower but functional)

If the foundation utilities do not exist, Claude Code stops and reports: "Prompt #140 has not been executed. Run Prompt #140 first to create the foundation utilities, then re-run #140a." Do not proceed.
Phase 2: Layer 1 Middleware Hardening
Claude Code locates the project's middleware file (middleware.ts at repo root, src/middleware.ts, or wherever Next.js middleware is configured) and applies the following changes:
Change 2.1: Import the foundation utilities.
Add at the top of the file:
typescriptimport { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'
Adjust the import path if the project uses a different alias convention (@/, ~/, relative imports). The audit report from #140 should reveal the convention; otherwise, inspect existing imports in middleware.ts and match.
Change 2.2: Wrap the entire middleware body in a try/catch.
The outer try/catch is the safety net that prevents any unhandled error from producing a MIDDLEWARE_INVOCATION_TIMEOUT or 500. If anything inside fails catastrophically, log the error and call NextResponse.next() so the request continues to the page layer. Better to occasionally let an unauthenticated request through to a page that will redirect than to take down every request.
Change 2.3: Wrap every Supabase auth call with withTimeout.
Every await supabase.auth.getUser(), await supabase.auth.getSession(), or equivalent must be wrapped:
typescriptlet user = null
try {
  const { data, error } = await withTimeout(
    supabase.auth.getUser(),
    3000,
    'middleware.auth.getUser'
  )
  if (error) {
    safeLog.warn('middleware', 'auth getUser returned error', {
      path: request.nextUrl.pathname,
      error,
    })
  } else {
    user = data.user
  }
} catch (error) {
  if (isTimeoutError(error)) {
    safeLog.warn('middleware', 'auth check timed out, treating as unauthenticated', {
      path: request.nextUrl.pathname,
      error,
    })
  } else {
    safeLog.error('middleware', 'auth check failed unexpectedly', {
      path: request.nextUrl.pathname,
      error,
    })
  }
  user = null
}
The 3000 ms timeout is the default from #140. If the audit identified a need for a different value, use that value and document the deviation in a code comment.
Change 2.4: Preserve existing role-based routing logic.
The current middleware almost certainly contains role-based routing for the three portals (consumer, practitioner, naturopath). That logic must be preserved exactly. The hardening does not change any business logic. It only adds defensive wrappers around the calls that perform the auth check.
If the role check itself queries Supabase (e.g., reading from a user_roles table or a profile JOIN), apply the same withTimeout pattern with a 3000 ms timeout and the operation name middleware.role.check.
Change 2.5: Tighten the matcher to exclude static assets.
The current matcher likely runs middleware on every request including static assets. This wastes execution time and increases the attack surface for MIDDLEWARE_INVOCATION_TIMEOUT. Replace the existing matcher (if present) with this:
typescriptexport const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files served by Next.js)
     * - _next/image (image optimization endpoints)
     * - favicon.ico
     * - Common static asset extensions
     * - The auth callback route which has its own session handling
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf|eot|css|js|map)$).*)',
  ],
}
If the existing matcher includes other intentional exclusions (specific routes that should bypass middleware, the public landing page if it should be unauthenticated-fast, the auth callback route, etc.), preserve those exclusions and add the static asset exclusions on top. Do not remove existing exclusions without understanding why they were added.
Change 2.6: Add a structured log entry on every middleware invocation that mutates the request flow.
After the auth check resolves (whether it succeeds, times out, or errors), if the middleware decides to redirect, rewrite, or block the request, log that decision via safeLog.info:
typescriptif (!user && isProtectedRoute(request)) {
  safeLog.info('middleware', 'redirecting unauthenticated request to sign-in', {
    path: request.nextUrl.pathname,
  })
  return NextResponse.redirect(new URL('/sign-in', request.url))
}
This gives observability into routing decisions without flooding the logs (do not log on every successful pass-through).
Change 2.7: Verification.
After modifications, Claude Code:

Runs npx tsc --noEmit (or the project's type-check script if defined) and confirms zero new type errors
Confirms the file does not contain U+2014 or U+2013 characters
Confirms the existing exports are unchanged in shape (function signature of middleware, presence and shape of config export)
Reports a unified diff of the file showing the before and after state

Phase 3: Layer 2 Inventory and Classification
Before modifying any server components, Claude Code produces a working inventory of every page that needs hardening. If docs/resilience-audit-2026-04-28.md exists, this inventory is derived from the audit. If it does not exist, Claude Code performs the inventory inline.
For each page, classify it into one of four categories using the Route-Segment Classification Table in Section 6:

A: Critical fail-loud. Page must surface errors clearly. Auth failures redirect to a clear error UI. Data fetch failures throw to error boundary. Examples: sign-in, sign-up, payment, billing, admin, compliance, legal, audit pages, agent management dashboards (Marshall, Jeffery, Hounddog, Sherlock administrative views).
B: Critical fail-soft. Page must remain available even with degraded data. Auth failures redirect normally, but data fetch failures render the page with empty or cached state and a non-blocking notification. Examples: consumer dashboard, wellness analytics, practitioner channel dashboard.
C: Optional enrichment fail-soft. Page renders fully even if data is unavailable. Auth failures redirect normally. Data fetch failures log and render without the optional data. Examples: recommendation widgets, genetic insights, peptide protocol enrichment data, daily score widgets.
D: Public/unauthenticated. Page does not require auth at all. No auth check needed. External data fetches (if any) follow fail-soft pattern. Examples: landing page, marketing pages, public product catalog, sign-in form itself (the form, not the submit handler).

Claude Code reports this inventory to Gary as a structured markdown table in the diff before applying any changes. If any page is genuinely ambiguous, flag it for Gary's decision rather than guessing.
Phase 4: Layer 2 Server Component Hardening
For each page in the inventory, apply the appropriate hardening pattern based on its category.
Pattern A (Critical fail-loud) hardening:
typescript// app/admin/marshall/page.tsx (example - actual paths discovered during inventory)
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'
import { redirect } from 'next/navigation'

export default async function MarshallAdminPage() {
  const supabase = createServerClient(/* existing args */)

  // Auth: critical, must succeed
  const { data: { user } } = await withTimeout(
    supabase.auth.getUser(),
    5000,
    'admin.marshall.auth.getUser'
  )
  if (!user) redirect('/sign-in')

  // Role check: critical, must succeed
  const { data: roleData, error: roleError } = await withTimeout(
    supabase.from('user_roles').select('role').eq('user_id', user.id).single(),
    5000,
    'admin.marshall.role.check'
  )
  if (roleError || roleData?.role !== 'admin') redirect('/unauthorized')

  // Page data: must succeed for page to be useful, throw to error boundary on failure
  let agentState
  try {
    const { data, error } = await withTimeout(
      supabase.from('marshall_agent_state').select('*').single(),
      8000,
      'admin.marshall.agent-state.fetch'
    )
    if (error) throw error
    agentState = data
  } catch (error) {
    safeLog.error('admin.marshall', 'agent state fetch failed', { userId: user.id, error })
    throw error // surface to error.tsx boundary
  }

  return <MarshallDashboard agentState={agentState} />
}
Pattern B (Critical fail-soft) hardening:
typescript// app/dashboard/page.tsx (example)
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = createServerClient(/* existing args */)

  // Auth: must succeed
  const { data: { user } } = await withTimeout(
    supabase.auth.getUser(),
    5000,
    'dashboard.auth.getUser'
  )
  if (!user) redirect('/sign-in')

  // Primary data: fail soft to empty state
  let protocol = null
  try {
    const { data } = await withTimeout(
      supabase.from('user_protocols').select('*').eq('user_id', user.id).single(),
      8000,
      'dashboard.protocol.fetch'
    )
    protocol = data
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.warn('dashboard', 'protocol fetch timed out, rendering empty state', {
        userId: user.id,
        error,
      })
    } else {
      safeLog.error('dashboard', 'protocol fetch failed', { userId: user.id, error })
    }
    // protocol stays null; component renders empty state with retry affordance
  }

  return <Dashboard user={user} protocol={protocol} />
}
The component (Dashboard in this example) must already handle the protocol === null case gracefully. If it does not, Claude Code adds an empty-state branch to the component that displays a friendly "Your protocol is loading. Please refresh in a moment." message with a manual refresh button, using ViaConnect brand colors and Lucide icons. This must be done with responsive classes (mobile and desktop in synchronism). Do not modify other component logic.
Pattern C (Optional enrichment fail-soft) hardening:
typescript// app/wellness/analytics/page.tsx (example)
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'
import { redirect } from 'next/navigation'

export default async function WellnessAnalyticsPage() {
  const supabase = createServerClient(/* existing args */)

  const { data: { user } } = await withTimeout(
    supabase.auth.getUser(),
    5000,
    'wellness-analytics.auth.getUser'
  )
  if (!user) redirect('/sign-in')

  // Each enrichment fetch independently fail-soft
  const fetchOrNull = async <T,>(
    promise: Promise<{ data: T | null; error: unknown }>,
    operation: string
  ): Promise<T | null> => {
    try {
      const result = await withTimeout(promise, 8000, operation)
      return result.data
    } catch (error) {
      safeLog.warn('wellness-analytics', `${operation} failed, rendering without it`, {
        userId: user.id,
        error,
      })
      return null
    }
  }

  const [
    nutrientProfile,
    symptomLandscape,
    riskRadar,
    bioOptimizationTrends,
  ] = await Promise.all([
    fetchOrNull(
      supabase.from('nutrient_profile').select('*').eq('user_id', user.id).single(),
      'wellness-analytics.nutrient-profile.fetch'
    ),
    fetchOrNull(
      supabase.from('symptom_landscape').select('*').eq('user_id', user.id).single(),
      'wellness-analytics.symptom-landscape.fetch'
    ),
    fetchOrNull(
      supabase.from('risk_radar').select('*').eq('user_id', user.id).single(),
      'wellness-analytics.risk-radar.fetch'
    ),
    fetchOrNull(
      supabase.from('bio_optimization_trends').select('*').eq('user_id', user.id).single(),
      'wellness-analytics.bio-optimization-trends.fetch'
    ),
  ])

  return (
    <WellnessAnalytics
      nutrientProfile={nutrientProfile}
      symptomLandscape={symptomLandscape}
      riskRadar={riskRadar}
      bioOptimizationTrends={bioOptimizationTrends}
    />
  )
}
The component must handle null values for each individual data section (display the "data temporarily unavailable" state for that specific card while showing the rest normally).
Pattern D (Public/unauthenticated) hardening:
For pages that do not require auth (landing page, marketing pages, public catalog), no middleware-bypass auth call is added. If the page does any data fetching (e.g., the landing page might fetch hero copy from a CMS or product data), wrap those fetches with withTimeout using the same fail-soft pattern as Category C, with the operation name namespaced under the page (landing.hero.fetch, etc.).
Special handling for the CAQ flow (Phases 1 to 7).
The 7-phase CAQ pages have specific characteristics that warrant attention:

They are sequential and stateful. Each phase saves its data before transitioning to the next.
A failed save mid-flow can lose user input.
The flow is critical for protocol generation and Bio Optimization scoring.

For CAQ phase pages, apply Pattern A behavior on the save action (which is a Server Action and therefore reserved for #140b), but Pattern B behavior on the page load itself. The page must always render, even if recent CAQ state cannot be loaded (treat missing recent state as "fresh start" rather than throwing).
Special handling for the agent administrative pages (Marshall, Jeffery, Hounddog, Sherlock).
These are compliance and operational tools. They must surface failures clearly so Gary knows when an agent is unhealthy. Apply Pattern A behavior strictly. Do not silently degrade.
Phase 5: Add or Enhance Error and Loading Boundaries
Next.js App Router uses error.tsx and loading.tsx files at route segments to provide error boundaries and loading states. Where these are missing at strategic locations, add them.
5.1: Strategic locations requiring error.tsx:

The root app/error.tsx (catches errors anywhere not caught by deeper boundaries)
Each top-level portal segment if portals are split by route (app/(consumer)/error.tsx, app/(practitioner)/error.tsx, app/(naturopath)/error.tsx, or whatever the actual route group structure is)
The agent admin segment (catches errors in Marshall, Jeffery, Hounddog, Sherlock dashboards)
The CAQ flow segment (catches errors during the questionnaire)
Any specific high-risk page identified in the audit

5.2: error.tsx template (use exactly this, adjusted only for path-specific copy):
typescript'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error('[error-boundary]', {
      name: error.name,
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-[#1A2744]">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#B75E18]/10 mb-4 sm:mb-6">
          <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-[#B75E18]" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#1A2744] mb-2 sm:mb-3">
          Something went wrong
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
          We encountered an unexpected issue. Please try again, and if the problem persists, refresh the page.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 sm:py-3 bg-[#2DA5A0] hover:bg-[#258A85] text-white text-sm sm:text-base font-medium rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
          Try again
        </button>
      </div>
    </div>
  )
}
This file must include 'use client' at the top because error.tsx files require client-side React for the reset callback. The useEffect calls console.error rather than safeLog.error because safeLog is currently designed for server-side use; client-side error reporting can be added in a future prompt if needed.
5.3: loading.tsx template (use exactly this):
typescriptimport { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-[#1A2744]">
      <div className="flex flex-col items-center gap-3 sm:gap-4">
        <Loader2 className="w-8 h-8 sm:w-12 sm:h-12 text-[#2DA5A0] animate-spin" />
        <p className="text-sm sm:text-base text-white/70">
          Loading...
        </p>
      </div>
    </div>
  )
}
loading.tsx files do not need 'use client' because they are pure presentational components.
5.4: Strategic locations requiring loading.tsx:

The root app/loading.tsx (catches all routes without a more specific loading state)
Heavy data-fetching pages: dashboard, wellness analytics, peptide protocol, supplement protocol, premium genetics, practitioner channels dashboard
The CAQ flow root segment

5.5: Do not overwrite existing boundaries.
If an error.tsx or loading.tsx already exists at a target location, do not overwrite it. Inspect the existing file. If it follows the brand system and uses Lucide icons with responsive classes, leave it alone. If it does not, add a comment at the top noting the audit found it but did not modify it (decision deferred to Gary): the audit report should flag this for review.
Phase 6: Verification
Before declaring this prompt complete, Claude Code verifies:

Type checking: npx tsc --noEmit (or the project's equivalent) reports zero new type errors. Run this twice: once before any modifications, once after, and compare.
Build check: npm run build (or equivalent) completes successfully if Gary has CI configured to run builds. If running build is impractical in the execution environment, skip but note in the verification report.
No em-dashes or en-dashes: grep -rn for U+2014 and U+2013 across all created and modified files. Count must be zero.
No emoji characters: grep for common emoji ranges across all JSX files. Count must be zero in any file modified or created during this prompt.
No package.json modifications: diff against the pre-execution state. Must show zero changes.
No Supabase email template, auth config, or migration changes: diff check across supabase/config.toml, supabase/templates/, supabase/migrations/. Must show zero changes.
No API route, Server Action, or Edge Function modifications: diff check on app/api/, any file with 'use server', and supabase/functions/. Must show zero changes.
Brand color compliance: grep for hex color codes in all modified files. The only hex codes appearing should be #1A2744, #2DA5A0, #B75E18, or transparent variants like #1A2744/10. If any other hex appears in a modified file, justify in the verification report.
Lucide-only icons: grep for import statements pulling icons from any non-Lucide library in modified files. Count must be zero (other than icons that already existed before this prompt).
Responsive class coverage: every JSX element with a class containing a sizing utility (text-, p-, m-, w-, h-, gap-, etc.) in created or modified files must have at least one sm: or md: variant if it represents visible content. This is a heuristic check, not a strict rule, but should flag obvious mobile-desktop mismatches.

If any verification step fails, Claude Code stops, reports the failure clearly with the specific files and line numbers involved, and does not declare completion. Gary decides how to proceed.
5. Code Templates
The complete templates for error.tsx, loading.tsx, and the four hardening patterns (A, B, C, D) are provided in Phase 4 and Phase 5 above. Claude Code uses those exact templates as starting points and adjusts only for page-specific copy and data-fetching specifics.
6. Route-Segment Classification Table
Use this table during Phase 3 to classify each page into a category. The "Likely path" column is illustrative; actual paths in the codebase may differ and should be discovered during inventory.
Likely pathCategoryBehavior on auth failureBehavior on data fetch failure/sign-in, /sign-up, /auth/callbackARender auth error UIThrow to error boundary/admin/*, /admin/marshall, /admin/jeffery, /admin/hounddog, /admin/sherlockARedirect to /unauthorizedThrow to error boundary/practitioner/billing, /naturopath/billing, any payment flowARedirect to /sign-inThrow to error boundary/compliance/*, audit/legal pages, SOC2 evidence viewsARedirect to /unauthorizedThrow to error boundary/dashboard, /dashboard/* (consumer dashboard root)BRedirect to /sign-inRender with empty state/wellness/analytics, /wellness/*BRedirect to /sign-inRender with degraded state per section/practitioner/channels, /practitioner/dashboardBRedirect to /sign-inRender with empty state/naturopath/dashboardBRedirect to /sign-inRender with empty state/peptide-protocol, /supplement-protocolBRedirect to /sign-inRender with empty state/genetics, /genetics/premiumCRedirect to /sign-inRender without genetic enrichmentRecommendation widgets within pages (handled at component level, not page level)CN/AComponent renders "unavailable" state/caq and CAQ flow phases 1 to 7B (special)Redirect to /sign-inTreat missing state as fresh start, do not throw/ (landing page), /about, /pricing, /terms, /privacyDN/A (no auth required)Render with fallback content if any external data unavailable/marketing/*DN/ARender with fallback content
If a page does not appear in this table and the audit identifies it, classify it by analogy to the closest match. If genuinely ambiguous, escalate to Gary's "Open Questions" section in the verification report.
7. Deliverable Checklist
Claude Code confirms each item below at the end of execution:

 middleware.ts modified with timeout protection on all Supabase auth and role check calls
 middleware.ts matcher tightened to exclude static assets
 middleware.ts wrapped in outer try/catch with fail-open behavior
 middleware.ts instrumented with safeLog calls on routing decisions
 Every server component identified in Phase 3 inventory has been classified A, B, C, or D
 Every server component classified A, B, or C has timeout protection on its data fetches
 Every server component classified D has timeout protection on any external fetches
 Pattern-appropriate fail-loud or fail-soft behavior applied to each page
 error.tsx files added at strategic locations missing them
 loading.tsx files added at strategic locations missing them
 All new error.tsx and loading.tsx files use Lucide icons only
 All new error.tsx and loading.tsx files use only ViaConnect brand colors
 All new error.tsx and loading.tsx files use responsive Tailwind classes (mobile and desktop in synchronism)
 No em-dashes or en-dashes in any modified or created file
 No emoji characters in any modified or created JSX file
 package.json not modified
 No file under app/api/, no Server Action file, no file under supabase/functions/ modified
 No Supabase email template, auth config, or migration modified
 Type checking passes with zero new errors
 No existing exports were removed or had their signatures changed
 Existing role-based routing logic preserved exactly

8. Out-of-Scope Reminder
This prompt does not address:

API Route Handlers (reserved for #140b)
Server Actions (reserved for #140b)
Supabase Edge Functions, including all four agent functions Marshall, Jeffery, Hounddog, Sherlock (reserved for #140b)
Direct external API calls to Claude API, HeyGen, currency providers, notification providers, regulatory APIs, GitHub APIs, or any other vendor (reserved for #140b)
Database schema changes
New features
Refactoring beyond what hardening requires
Performance optimization beyond timeout protection

If during execution Claude Code identifies code that is genuinely broken or dangerous, do not fix it in this prompt. Add a "Critical Findings" section to the verification report flagging the issue for Gary's immediate attention. Gary decides whether to address it in a separate hot-fix prompt or wait for #140b.
9. Sign-Off Criteria
This prompt is complete when:

Middleware is hardened with timeout protection, fail-open behavior, and structured logging
Every server component identified in the inventory has been classified and hardened per its category
Strategic error.tsx and loading.tsx boundaries are in place
All deliverable checklist items pass verification
The site loads and behaves identically to the pre-hardening state under normal conditions
The site degrades gracefully (no 504s, no white screens, no broken pages) when Supabase is artificially slowed during local testing
Gary reviews the diff and approves the changes for production deploy

If any deliverable check fails, this prompt is incomplete and must not be merged or deployed. Claude Code reports the failure clearly and waits for Gary's instruction.
10. Local Verification Procedure (Optional but Recommended)
Before deploying to Vercel production, Gary may want to verify the hardening locally. The procedure:

Run npm run dev (or equivalent)
Open the site in the browser
Navigate through several pages, confirm normal behavior
Open browser DevTools, Network tab, throttle to "Slow 3G"
Confirm pages still load (slowly), no 504-like behavior, loading states appear
Stop dev server
Temporarily change NEXT_PUBLIC_SUPABASE_URL in .env.local to a non-routable address (e.g., https://10.255.255.1)
Restart dev server
Navigate through pages
Confirm:

Middleware times out within ~3 seconds and lets requests through
Pages with Pattern B/C render with empty/degraded state
Pages with Pattern A surface error.tsx boundaries cleanly
No infinite hangs, no crashes


Restore .env.local to correct value
Restart dev server, confirm normal operation returns

Document any unexpected behavior observed during this test in the verification report.