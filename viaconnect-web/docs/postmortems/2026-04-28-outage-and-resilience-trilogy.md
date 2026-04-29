<!-- Archived 2026-04-29. Written fresh from session transcript covering the 2026-04-28 viaconnectapp.com outage and the resilience trilogy (Prompts #140, #140a, #140b) issued in response. Companion archives: viaconnect-web/docs/prompts/prompt-140-*.md, prompt-140a-*.md, prompt-140b-*.md. -->

# Outage and Resilience Trilogy, 2026-04-28

## 1. Summary

On 2026-04-28, viaconnectapp.com experienced a production outage with two distinct error fingerprints recorded in Vercel runtime logs:

1. `FUNCTION_INVOCATION_TIMEOUT`, request id `pdx1::8v94t-1777415709361-ce26959b8636`, on a Next.js serverless function.
2. `MIDDLEWARE_INVOCATION_TIMEOUT`, request id `pdx1::tnh9p-1777416537325-84d2afc87800`, on edge middleware, approximately 14 minutes after the first.

Both errors traced back to upstream Supabase slowness on the project `nnhkcufyqjojdbvdrpky` (us-east-2). The site was unreachable for users until the Supabase compute tier was upgraded at approximately 22:24 local time on 2026-04-28, after which the site recovered.

## 2. Timeline

| Time (2026-04-28) | Event |
|---|---|
| Pre-incident | Project running on Supabase SMALL compute tier (2 GB memory, 2-core ARM CPU). |
| First fingerprint | `FUNCTION_INVOCATION_TIMEOUT` on serverless function (Vercel request id `pdx1::8v94t-...`). |
| ~14 minutes later | `MIDDLEWARE_INVOCATION_TIMEOUT` on edge middleware (Vercel request id `pdx1::tnh9p-...`), confirming a sustained upstream issue affecting both layers. |
| ~22:24 | Supabase compute tier upgraded from SMALL to LARGE (8 GB memory, 4-core ARM CPU). Site recovered. |
| Same day | Resilience trilogy (#140, #140a, #140b) issued for application-layer hardening. |

## 3. Root Cause

Two contributing factors, both required for the outage to surface as user-visible 504s.

### 3.1 Supabase compute resource constraint

The SMALL compute tier was insufficient for the production workload, which includes:

- The four-agent ecosystem (Marshall, Jeffery, Hounddog, Sherlock).
- MAP enforcement (9 edge functions).
- Social monitoring (6 sources).
- Practitioner verification (16 nightly edge functions).
- Bio Optimization daily recalc.
- Recommendation scoring.
- Photo OCR pipeline.
- Multi-currency operations.
- Regulatory compliance integrations (FDA, Health Canada, USPTO, CBP, court systems).
- Three-portal user traffic (consumer, practitioner, admin).

Database and edge function load on the SMALL tier was reaching capacity. The compute upgrade to LARGE addressed this directly.

### 3.2 Missing timeout protection across the application runtime

Even with adequate compute, the Next.js application code had no timeout protection on outbound calls. Any future Supabase upstream slowness, Claude API latency spike, third-party regulatory API delay, or network blip would reproduce the same outage pattern. Specifically:

- Edge middleware (`middleware.ts`) called Supabase auth without a timeout. A slow auth response held the request open until Vercel's middleware budget expired, producing the `MIDDLEWARE_INVOCATION_TIMEOUT`.
- Server components and SSR pages did server-side data fetching against Supabase and external services with no timeouts. A slow query hung the page render, producing the `FUNCTION_INVOCATION_TIMEOUT`.
- API Route Handlers, Server Actions, and Supabase Edge Functions had the same exposure across the entire backend surface.

## 4. Remediation

### 4.1 Immediate (2026-04-28, same day)

Supabase compute tier upgraded SMALL to LARGE. Site recovered within minutes of the upgrade.

### 4.2 Resilience trilogy (2026-04-28 to 2026-04-29)

Three sequential prompts hardened all three application execution layers with timeout protection, structured logging, and circuit breakers. Each prompt has its own archive file (`docs/prompts/prompt-140*.md`). Summary:

- **#140, Resilience Audit and Foundation Layer.** Produced the audit report at `docs/resilience-audit-2026-04-28.md` and created foundation utilities at `src/lib/utils/with-timeout.ts` and `src/lib/utils/safe-log.ts`.
- **#140a, Resilience Hardening Layer 1 and Layer 2.** Hardened edge middleware (`src/middleware.ts`) and all server components / SSR pages (`src/app/**/page.tsx`, `layout.tsx`, `error.tsx`, `loading.tsx`).
- **#140b, Resilience Hardening Layer 3.** Hardened API Route Handlers, Server Actions, and Supabase Edge Functions. Added the circuit breaker utility at `src/lib/utils/circuit-breaker.ts`, created Deno mirrors under `supabase/functions/_shared/`, and applied vendor-specific timeout values plus circuit breakers to every external API call site (Anthropic Claude API, Claude Vision, HeyGen, email, SMS, currency, FDA, Health Canada, USPTO, CBP, court systems, GitHub, Stripe, NPI Registry).

### 4.3 Standing rule added to CLAUDE.md (2026-04-29)

A new "Resilience patterns" section in `viaconnect-web/CLAUDE.md` requires all new external API calls and server-side data fetches to use `withTimeout` / `withAbortTimeout` from `src/lib/utils/with-timeout.ts`, `safeLog` from `src/lib/utils/safe-log.ts`, and `getCircuitBreaker` from `src/lib/utils/circuit-breaker.ts`. Edge Functions import the Deno mirrors from `supabase/functions/_shared/`.

## 5. Lessons Learned

1. **Compute capacity and application-layer protection are independent failure modes.** The compute upgrade alone would have masked the missing timeout protection. Application-layer hardening alone would have surfaced graceful degradation rather than 504s, but would not have removed the underlying capacity pressure. Both fixes were required.
2. **Edge middleware is the highest-leverage hardening target.** Every request flows through it. A single unprotected Supabase call there can take the entire site down.
3. **Three-layer scope discipline produced cleaner diffs.** Splitting the trilogy into Foundation (#140), Layers 1+2 (#140a), and Layer 3 (#140b) kept each prompt's blast radius reviewable and allowed prerequisite verification at each step.
4. **Per-vendor circuit breakers, not per-call-site.** Singletons by vendor name (`claude-api`, `heygen`, `currency-api`, etc.) ensure all call sites coordinate failure state. A cascade of independent retries across call sites would have re-created the original failure pattern.
5. **Cron jobs need batch error handling, not fail-fast.** A single user's recalc failing must not abort the rest of a nightly job. The `cron-bio-optimization-recalc` pattern in #140b §6 is the canonical model for Category G work.
6. **Sensitive data discipline applies to logs.** `safeLog` was designed to never log auth tokens, passwords, full card numbers, full SSN, or PHI. Every modified call site was spot-checked during #140b verification.

## 6. Operational Follow-Up

The first 1 to 2 weeks of production traffic post-trilogy should be observed for:

- Frequency of `TimeoutError` and `CircuitBreakerError` events per vendor.
- Distribution of timeout durations (any vendor consistently approaching its limit suggests the limit should be raised).
- False positives where the circuit opens but the vendor is fine (suggests threshold should be raised).
- False negatives where users see degradation but no breaker opens (suggests threshold should be lowered).

Tuning the timeout values and circuit breaker thresholds is operational refinement and is not part of the trilogy. It will be addressed in a separate prompt once a meaningful production sample is available.

## 7. Out of Scope (Deferred to Future Prompts)

- Persistent circuit-breaker state across function invocations (currently each Vercel function instance has its own breaker state).
- Client-side error reporting service integration (Sentry or equivalent).
- Background job queueing infrastructure beyond the existing Supabase cron jobs.
- Stale-while-revalidate caching layer beyond simple in-function caches.

## 8. Sign-Off

- Outage resolved: 2026-04-28, ~22:24 local, on Supabase compute upgrade.
- Trilogy complete: 2026-04-29, with archives committed under `docs/prompts/prompt-140*.md` and this postmortem under `docs/postmortems/`.
- CLAUDE.md updated with the standing Resilience patterns rule on 2026-04-29.

Owner: Gary Ferenczi (CEO, FarmCeutica Wellness LLC).
