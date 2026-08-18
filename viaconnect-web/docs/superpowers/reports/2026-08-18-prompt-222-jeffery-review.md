# Prompt 222 Jeffery 221a review package (needs_human)

**Artifact type:** `completion_report` (class d / hard-block)  
**producedByAgent:** `hounddog` (must not be `jeffery` if recording an approval)  
**artifactRef:** `docs/superpowers/reports/2026-08-18-prompt-222-headsup-teardown.md`  
**Handler version:** `221a.1`  
**Programmatic verdict:** `needs_human` (hardBlock true) while live KB apply and ACC insert are pending.

This document is the ACC link copy for Gary. Do not POST to production from Prompt 222 Task 4. After production apply, ACC surfaces this via `/admin/jeffery` Review Desk on `jeffery_reviews` with the same `artifact_ref`.

## Why needs_human

`deriveJefferyVerdict("completion_report", checks, { producedByAgent: "hounddog" })` returns `needs_human` because checks include a hard fail named `live_kb_apply_pending`. KB seed exists on disk (`20260820121100_prompt_222_headsup_kb_seed.sql`) but is not live-applied. Firecrawl did not run (0 pages; HTTP fallback only).

## Checks (builder: `buildPrompt222JefferyInput`)

| name | result | detail |
| --- | --- | --- |
| citations_present | pass | Teardown cites 15+ https:// sources from public HTTP crawl (2026-08-18). |
| consumer_isolation | pass | INTERNAL STRATEGY only. Seed rows use consumer_safe=false and practitioner_depth=false; no consumer UI. |
| facts_only | pass | Report and seed stay within Prompt 222 verified public facts; UNKNOWN not fabricated; unverifiable claims marked claimed-not-verified. |
| crawl_fallback | warn | Firecrawl MCP returned 0 pages (rate limit). Public HTTP fallback used. Live Firecrawl spend still pending a key. |
| live_kb_apply_pending | fail | KB seed migration and Jeffery/ACC insert are file-only; not applied to production. Completion report stays needs_human until live apply. |

## ACC surfacing (after production apply)

1. Insert a `jeffery_reviews` row from `buildReviewRecord(buildPrompt222JefferyInput(), deriveJefferyVerdict(...))`.
2. Open `/admin/jeffery` Review Desk.
3. Filter or open by `artifact_ref` = `docs/superpowers/reports/2026-08-18-prompt-222-headsup-teardown.md`.
4. Gary decides approve / reject / keep needs_human after live KB apply and any Firecrawl re-crawl.

No live insert in this task.

## needs_human P0 / P1 / P2 package for Gary

From the teardown Prioritized recommendations (INTERNAL STRATEGY; do not publish competitor prices on consumer surfaces).

### P0

1. Named wearable OAuth breadth (Oura, Garmin, WHOOP, Withings, Dexcom, Fitbit) on the Prompt 201 / 201b connected-sources registry. Effort L. Extends Hound Dog / Arnold connected-sources.
2. Lab PDF extraction plus provider review queue (their Documents and AI Extraction). Effort L. Extends Upload Labs plus Hannah.
3. Practitioner cohort outcomes report (their cohort analysis / Prompt 99 deepen). Effort M. Practitioner portal.

### P1

4. One-click records via a records network (1upHealth-class). Effort L. Claimed 30k orgs not independently counted.
5. White-label client app packaging (branding already partial). Effort L. White-label module.
6. Alerts on biomarker drift between visits. Effort M. Hannah / Arnold.

### P2

7. Partner API / iframe embed for clinics. Effort L.
8. Custom protocol-trained agents (they sell Custom Agents). Effort M. Hannah.
9. Public pricing calculator for practitioner SaaS. Effort S. Do not publish competitor prices.

## Classification reminder

INTERNAL STRATEGY. Evidence grade E. Consumer surfaces get nothing from this material unless a future Gary-approved, Lex-reviewed derivation is commissioned. Lex is not required for this internal store.

## Remaining blockers before approve

1. Apply `20260820121000` (payload_type / collection) and `20260820121100` (seed) to production in order.
2. Insert `jeffery_reviews` row and confirm Review Desk link.
3. Optionally clear or update `live_kb_apply_pending` after apply; re-run programmatic checks.
4. Optional: live Firecrawl multi-run when a key is available (stay under FIRECRAWL_MAX_PAGES_PER_RUN=25).
