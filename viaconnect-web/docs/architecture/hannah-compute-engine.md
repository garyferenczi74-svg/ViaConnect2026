# Hannah Compute Engine

## Overview

The Hannah compute engine is the canonical pipeline that produces every Bio Optimization Score (BOS) on ViaConnect. The score is a two axis model. The diagnostic foundation axis anchors the user against their CAQ, labs, and genetics; the engagement axis surfaces the daily levers the user can move to raise their score. Both axes converge into a single 0 to 100 number tagged with a tier (1, 2, or 3), a confidence value (0.720, 0.860, or 0.960), and a structured breakdown jsonb that downstream surfaces consume. Hannah is the only writer: every other code path either enqueues a compute event or reads a cached projection.

## Data flow

The pipeline runs in five sequential stages. Every stage is recoverable; a failure at any point leaves the queue row in place so the next worker cycle can retry.

Stage 1, event enqueue. An engagement event source (CAQ submit, daily log, nutrition log, wearable sync, manual recalc, admin recalc, or recommendation pipeline) calls `enqueueBOSCompute` from `src/lib/scoring/queue.ts`. The helper writes one row to `public.bos_compute_queue` with `source`, `user_id`, `payload`, and an optional `bypass_cooldown` flag. The queue's row level security policy restricts authenticated callers to inserting rows for their own user.

Stage 2, queue drain. The `/api/bos/worker` cron route runs every 5 minutes (entry in `vercel.json`). It calls `fetchUnprocessedEventsGroupedByUser` from the queue helper, groups events by user, and processes one user at a time. The worker is idempotent: a partial failure leaves `processed_at` null so the next cycle resumes the work.

Stage 3, source gather. For each user, the worker calls `computeBOS` from `src/lib/scoring/bio-optimization-score.ts`. This function runs nine parallel source gatherers (CAQ, Labs, Genetics, Nutrition, Supplements, Body Tracker, Wearable, Plug Ins, Helix Challenges) under `src/lib/scoring/sources/`. Each gatherer returns a typed slice with freshness markers so Hannah can weigh missing or stale signals appropriately.

Stage 4, Hannah inference. The compute pipeline builds a Hannah input bundle, calls the Anthropic Claude API via forced tool use against `HANNAH_TOOL_SCHEMA` from `src/lib/scoring/hannah-output-schema.ts`, validates the output, and retries exactly once on validation failure. The system prompt and the six brand locks live in `src/lib/scoring/hannah-prompt.ts`.

Stage 5, SSOT persist. The compute pipeline calls the `public.compute_bio_optimization_score` RPC with the score, tier, confidence, breakdown, and compute version. The RPC is `SECURITY DEFINER` with auth.uid() and ownership guards; it is the only sanctioned writer for `bio_optimization_history`. On INSERT, the `project_bio_optimization_score` trigger fans the score out to `public.profiles.bio_optimization_score` and `public.daily_scores.bio_optimization_score`.

The consumer dashboard reads via `GET /api/bos/current`, which selects the latest row by `(date DESC, compute_seq DESC)` and reshapes the breakdown into the `BOSCurrentResponse` payload (3 accuracy pills, 6 engagement pills, plus the Hannah explanation).

## Hannah voice contract

The Hannah agent operates under six brand locks captured in `src/lib/scoring/hannah-prompt.ts`. These cover identity (consumer copilot, not a clinician), addressing (uses the user's display name), tone (warm, brief, never alarmist), reasoning style (explains every score change in plain terms), output structure (forced tool use against `HANNAH_TOOL_SCHEMA`), and safety (no medical advice, no diagnostic claims, no SKU references). The tool schema enforces a strict output shape; any drift triggers exactly one retry, then a validation error that the worker logs and leaves on the queue for retry next cycle.

## Adding a new BOS computation

If a new engagement source needs to trigger a compute, the integration steps are:

1. Pick a `BOSTriggerSource` value. If the existing seven sources do not match, add the new value to `src/lib/scoring/types.ts` AND to the `bos_queue_source_valid_chk` constraint in the migration. The constraint must be re-validated after the ALTER.
2. Call `enqueueBOSCompute({ userId, source, payload, bypass_cooldown, supabase })` from the new code path. The helper handles the insert and surface errors.
3. Confirm the new source flows through the worker by running the Phase D worker tests in `src/lib/scoring/__tests__/bos-worker.test.ts`.

Direct calls to `computeBOS` are reserved for the worker and the CAQ submit fire and forget path inside `src/app/api/ai/calculate-bio-optimization/route.ts`. New code paths should enqueue, not invoke directly.

## Adding a new projection target

If a new cache table needs the BOS, extend the `project_bio_optimization_score` trigger function. Never write to a projection target from application code; that path is unsanctioned and will fail the SSOT audit. The trigger projects only to `profiles.bio_optimization_score` and `daily_scores.bio_optimization_score` today. The `health_scores` projection target was intentionally dropped per Q2 (Gary, 2026-05-11).

## compute_version convention

The `compute_version` column on `bio_optimization_history` follows semver tagged with the Hannah model major series: `hannah.bos.v<major>.<minor>.<patch>`. The 2026-05-11 release is `hannah.bos.v2.0.0`. Bumps are required when:

- The Hannah system prompt changes the brand voice rules (major bump)
- The tool schema gains or removes a top level key (major bump)
- A new source gatherer is added or the weighting changes materially (minor bump)
- Bug fixes inside the gathering layer or the explanation text (patch bump)

The bump is recorded in `src/lib/scoring/bio-optimization-score.ts` near the top of the module.

## Sentinel value for pre SSOT rows

Rows that existed in `bio_optimization_history` before the SSOT migration ran are tagged with the breakdown sentinel `_sentinel: 'pre_ssot_unknown'`. Consumers may read these rows safely; the `BOSCurrentResponse` pre compute path treats a sentinel row the same as a missing row when computing the accuracy and engagement pill states. The sentinel exists primarily to let the audit pgTAP test confirm migration completeness.

## Rollback plan

See `docs/runbooks/bos-worker-troubleshooting.md` section 6 for the rollback migration template. The non destructive rollback drops the new RPC, the projection trigger, and the queue + telemetry tables, then reverts the `bio_optimization_history` policy split. The migration's column additions and CHECK constraints are intentionally not rolled back; they are forward compatible and removing them would invalidate existing rows.
