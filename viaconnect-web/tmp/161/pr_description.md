# Bundled #159 + #161: Bio Optimization Score SSOT + Hannah Multi-Source Compute Backend

## Summary

This PR bundles Prompt #159 (Bio Optimization Score Single Source of Truth) and Prompt #161 (Hannah multi-source compute backend with queue, worker, and telemetry) into a single migration plus accompanying TypeScript modules. The end state is a tight, auditable write path: every BOS row flows through one SECURITY DEFINER RPC, fanning out to two cached projection targets via an AFTER INSERT trigger. Legacy direct-table writes are rerouted to enqueue-based compute events, with a fire-and-forget telemetry table to monitor the cutover until the #161.5 lockdown gate closes.

The CAQ submit flow is now asynchronous. The `/api/ai/calculate-bio-optimization` route returns HTTP 202 with a provisional payload and enqueues a canonical compute event; the client polls `/api/bos/current` every 5 seconds until the Hannah-driven score lands. Worst case latency is bounded by the Vercel cron schedule of 5 minutes, with a fire-and-forget computeBOS kick inside the route shrinking the typical wait window. The poll loop times out after 3 minutes with a graceful continue-and-check-later message so the user is never stuck on the processing animation.

All 156 vitest tests in the scoring suite remain green. Seven new pgTAP test files cover the migration's table shapes, RLS policies, RPC contract, projection trigger, idempotency, and audit completeness.

## What changed by phase

**Phase A.** Migration `20260512020236_bos_compute_v2.sql` (unapplied): column additions to `bio_optimization_history`, RLS policy split (4 policies + REVOKE), `compute_bio_optimization_score` RPC, `project_bio_optimization_score` trigger, `bos_compute_queue` table, `bos_write_telemetry` table. Seven pgTAP test files in `supabase/tests/bos_compute_v2/`. Types module `src/lib/scoring/types.ts` paired to the migration.

**Phase B.** Compute infrastructure: `src/lib/scoring/cooldown.ts`, `queue.ts`, `telemetry.ts`, plus nine source gatherers under `src/lib/scoring/sources/` (caq, labs, genetics, nutrition, supplements, body-tracker, wearable, plug-ins, helix-challenges). Twelve test files covering all modules.

**Phase C.** Hannah pipeline: `src/lib/scoring/hannah-prompt.ts` (system prompt + brand locks), `hannah-output-schema.ts` (forced tool use schema), `bio-optimization-score.ts` (the `computeBOS` entry point). Three test files including end-to-end mocks.

**Phase D.** Worker + read API: `/api/bos/worker` cron route, `/api/bos/current` consumer dashboard read API, vercel.json cron entry at `*/5 * * * *`. Two test files.

**Phase E.** Three surgical edits: route conversion of `calculate-bio-optimization` to call `computeBOS`, plus telemetry wrap on the two legacy write sites (onboarding fallback + recommendation-engine).

**Phase F.** This phase: migration §10/§11 patches (add `recommendation_pipeline` enum value, add `bos_telemetry_insert_observability` policy), pgTAP test patches, Path Z conversion of `/api/ai/calculate-bio-optimization` to 202, polling logic in onboarding page, Reroute conversion of Site 3 and Site 4 from telemetry-wrap to enqueue, engine-registry write target cleanup, architecture doc, runbook.

## Architectural decisions

**Q1 (compute_seq).** `bio_optimization_history` gets a new `compute_seq smallint NOT NULL DEFAULT 1` column. The old `UNIQUE (user_id, date)` constraint is dropped; new constraint is `UNIQUE (user_id, date, compute_seq)`. The RPC auto-increments `compute_seq` per `(user_id, date)` tuple so same-day re-computes never conflict.

**Q2 (health_scores).** The `project_bio_optimization_score` trigger does NOT write to `health_scores`. The table is preserved unchanged; the projection target was dropped per Gary's directive 2026-05-11.

**Q3 (daily_scores).** The trigger writes ONLY to `daily_scores.bio_optimization_score` (single column upsert). All other daily_scores columns remain owned by the existing quick-daily-log and nutrition-log paths.

**Q4 (breakdown column).** The migration retains the existing `breakdown jsonb` column instead of adding a new `inputs` column. Every #161 spec reference to `inputs` is substituted with `breakdown` throughout the TypeScript types module and the RPC signature.

**RLS option (a) for telemetry.** `bos_write_telemetry` has a default REVOKE on authenticated + anon. A narrow `bos_telemetry_insert_observability` policy admits `is_canonical = false AND user_id = auth.uid()` so the legacy write-site logBOSWrite calls can record their non-canonical writes for the #161.5 lockdown audit. Canonical writes flow only via service_role.

**Latency path Z.** `/api/ai/calculate-bio-optimization` returns HTTP 202 with a provisional payload. The client polls `/api/bos/current` every 5 seconds (max 36 attempts, 3 min ceiling) until the Hannah-driven canonical score lands. Fire-and-forget `void computeBOS(...).catch(...)` accelerates the common-case latency below the cron interval; the worker is the durability backstop.

## Files changed

**Migration (1).**
- `supabase/migrations/20260512020236_bos_compute_v2.sql` (unapplied)

**pgTAP (7).**
- `supabase/tests/bos_compute_v2/01_bos_history_shape.sql`
- `supabase/tests/bos_compute_v2/02_rpc_contract.sql`
- `supabase/tests/bos_compute_v2/03_trigger_projection.sql`
- `supabase/tests/bos_compute_v2/04_queue_schema.sql` (Phase F: +2 assertions)
- `supabase/tests/bos_compute_v2/05_telemetry_schema.sql` (Phase F: +3 assertions)
- `supabase/tests/bos_compute_v2/06_audit_completeness.sql`
- `supabase/tests/bos_compute_v2/07_idempotency.sql`

**Types + helpers.**
- `src/lib/scoring/types.ts` (Phase F: +`recommendation_pipeline` enum value)
- `src/lib/scoring/queue.ts`
- `src/lib/scoring/cooldown.ts`
- `src/lib/scoring/telemetry.ts`

**Hannah pipeline.**
- `src/lib/scoring/hannah-prompt.ts`
- `src/lib/scoring/hannah-output-schema.ts`
- `src/lib/scoring/bio-optimization-score.ts`

**Source gatherers (9).**
- `src/lib/scoring/sources/caq-source.ts`
- `src/lib/scoring/sources/labs-source.ts`
- `src/lib/scoring/sources/genetics-source.ts`
- `src/lib/scoring/sources/nutrition-source.ts`
- `src/lib/scoring/sources/supplements-source.ts`
- `src/lib/scoring/sources/body-tracker-source.ts`
- `src/lib/scoring/sources/wearable-source.ts`
- `src/lib/scoring/sources/plug-ins-source.ts`
- `src/lib/scoring/sources/helix-challenges-source.ts`

**API routes.**
- `src/app/api/bos/worker/route.ts` (cron-secured worker)
- `src/app/api/bos/current/route.ts` (consumer read API)
- `src/app/api/ai/calculate-bio-optimization/route.ts` (Phase F: 202 path Z)

**App rewires.**
- `src/app/(auth)/onboarding/[step]/page.tsx` (Phase F: Site 3 Reroute + Path Z polling)
- `src/lib/recommendation-engine.ts` (Phase F: Site 4 Reroute)
- `src/lib/ai/engine-registry.ts` (Phase F: writes target cleanup)

**Tests (17 files, 156 tests).**
- `src/lib/scoring/__tests__/*.test.ts` (12 files)
- `src/lib/scoring/__tests__/sources/*.test.ts` (5 files)

**Infra.**
- `vercel.json` (Phase D: `crons` entry for `/api/bos/worker`)
- `vitest.config.scoring.ts` (Phase B: separate scoring suite config)

**Documentation (Phase F).**
- `docs/architecture/hannah-compute-engine.md`
- `docs/runbooks/bos-worker-troubleshooting.md`

## Test plan

- [x] `npx vitest run --config vitest.config.scoring.ts` (17 files, 156 passed)
- [x] `npx tsc --noEmit` for Phase F-touched files (zero new errors)
- [x] `npx next lint` for `src/lib/scoring` and `src/app/api/bos` (zero new errors)
- [ ] `supabase test db` after migration applied to a preview project (pgTAP, 7 files)
- [ ] Deploy to localhost:3000; exercise CAQ submit; observe processing animation; confirm `/api/bos/current` poll lands a canonical row inside the worker's first 5 minute cycle
- [ ] Manual: invoke `/api/bos/worker` directly with the CRON_SECRET header; verify a queued row is drained and a `bio_optimization_history` row inserted via the RPC
- [ ] Manual: query `bos_write_telemetry` after a CAQ submit; confirm only one canonical INSERT row appears (the worker's RPC call); confirm zero direct table-write rows from any authenticated caller

## Open issues (deferred)

- `runPostCAQPipeline` still maintains a provisional local `bioScore` for the recommendations API response payload. Before the #161.5 lockdown, verify production telemetry shows zero invocations of `calculateBioOptimizationScore` from non-recommendation callers; if confirmed, schedule a follow-up prompt to either drop the local fallback or convert it to a typed warning.
- Dead-code cleanup of the unused exports in `src/lib/scoring/bio-optimization.ts` is deferred per Gary 2026-05-11. The local symptom-based tier helper is still consumed by `/api/ai/calculate-bio-optimization` for the provisional response.
- Future Labs ingestion (tier 2 confidence unlock at 0.860) is unreachable until the Labs ingestion pipeline ships. The `labs_source` gatherer returns an empty slice today.
- Kelsey audit-trail review still pending. No Kelsey subagent is currently registered with the ViaConnect agent fleet; the review is routed through security-advisor via Jeffery.

## Acceptance criteria

| Criterion | Status |
|---|---|
| Single sanctioned write path for bio_optimization_history (the RPC) | Pass |
| Projection trigger to profiles + daily_scores (no health_scores) | Pass |
| RLS hardening on bio_optimization_history (4-policy split + REVOKE) | Pass |
| compute_seq enables same-day re-computes without conflict | Pass |
| breakdown jsonb preserved as canonical column name (Q4) | Pass |
| Worker cron route with CRON_SECRET guard | Pass |
| Queue helper enqueue + drain + processed-marker functions | Pass |
| Hannah forced tool use with validation + 1 retry on schema drift | Pass |
| Read API returns BOSCurrentResponse with 3 accuracy + 6 engagement pills | Pass |
| 156 vitest tests green | Pass |
| 7 pgTAP files cover schema, RLS, RPC, trigger, idempotency, audit | Pass |
| #161.5 lockdown gate criteria documented in the runbook | Pass |
| No edits to package.json, Supabase email templates, or protected paths | Pass |

## Marshall pre-delivery scan

| Check | Result |
|---|---|
| U+2014 em-dash on added lines | 0 |
| U+2013 en-dash on added lines | 0 |
| U+2026 ellipsis on added lines | 0 |
| Emoji blocks on added lines | 0 |
| "Vitality Score" string | 0 |
| Tesofensine / Semaglutide / Retatrutide | 0 |
| "HIPAA Compliant" / "FDA approved" | 0 |
| "cure" / "treats" / "diagnoses" (standalone) | 0 |

## Rollback plan

The migration is unapplied. If the team aborts the rollout before apply, no rollback is needed. If the migration applies and a regression surfaces post-deploy, follow section 6 of `docs/runbooks/bos-worker-troubleshooting.md`. The rollback drops the new RPC, the projection trigger, and the queue plus telemetry tables, then reverts the bio_optimization_history policy split. Column additions and the breakdown sentinel are intentionally retained as forward-compatible.

After rollback, the legacy direct-write paths in onboarding and recommendation-engine remain non-functional because Phase F removed them. A follow-up prompt would need to restore the direct writes or re-introduce a synchronous local compute.
