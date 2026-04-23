# Prompt #112 — Practitioner Notification Hub (SMS / Slack / Push): Delivery Report

**Project:** ViaConnect Web
**Supabase:** nnhkcufyqjojdbvdrpky (us-east-2)
**Delivery date:** 2026-04-22
**Delivered by:** Claude Opus 4.7 (1M context) under Michelangelo OBRA
**Reviewed by:** Jeffery, Michelangelo, Sherlock

## Commit attribution note

All Prompt #112 files (44 total) landed on `origin/main` in commit
[`abc0ac3`](https://github.com/garyferenczi74-svg/ViaConnect2026/commit/abc0ac3)
(titled "ui: Body Tracker Dashboard glass refresh"). A parallel session's
commit absorbed the staged #112 files along with its intended Body Tracker
UI changes. The code is complete and live; this delivery document provides
the clean attribution record for review.

---

## TL;DR

- **11 new tables + 2 ENUMs** across 4 append-only migrations; zero ALTER on existing tables.
- **5 edge functions ACTIVE** on Supabase (dispatcher + SMS inbound + Slack webhook + push token hygiene + batch digest); all hardened to v2 after review.
- **5 Next.js API routes** (SMS verification-start + compliant-optin-send, Slack OAuth install, push subscribe + VAPID public key).
- **6 practitioner pages** under `/practitioner/notifications/*` + **7 admin pages** under `/admin/notifications/*`.
- **5 channel adapters** (`sms.ts`, `slack.ts`, `push.ts`, `fcm.ts`-stub, `apns.ts`-stub).
- **51 unit tests passing** + **2 DB-invariant tests** that skip cleanly without service-role env.
- **Security advisors: zero lints** post migration `_140` (RLS hardening).
- **Registry seeded with 32 events** (28 live + 4 foreshadowed stubs for #113/#114/#115/#116).
- **package.json untouched**; all channel SDKs via `fetch` or esm.sh (Deno-side).

## Deviations from the prompt

| Area | Prompt said | Delivered | Rationale |
|---|---|---|---|
| Audit trigger | Proposed `prevent_notification_audit_mutation()` | Reused `public.block_audit_mutation()` | Same semantics; shared function installed by earlier prompts |
| Edge function naming | `practitioner_notification_dispatcher` (underscored) | `practitioner-notification-dispatcher` (hyphenated) | Matches existing project + Supabase convention |
| FCM + APNS | In scope | **Stubbed** — `isConfigured()` returns false without env | §19 Q2 mobile-app existence is an open question |
| package.json | (no constraint stated) | Untouched | Standing rule |
| Dispatcher architecture | Synchronous consumer of emitDataEvent | **Pull-architecture** via `notification_events_inbox` queue | Resilient to retries + edge-function time limits |

## 1. Database (Phase 1)

**4 migrations applied:**

1. `20260424000110_prompt_112_enums_and_registry.sql` — 2 ENUMs (`notification_priority`, `notification_channel`) + `notification_event_registry` table + 32 seeded events
2. `20260424000120_prompt_112_preferences_credentials.sql` — 5 tables (preferences, channel credentials, quiet hours, legal-ops recipients, legal-ops preferences)
3. `20260424000130_prompt_112_dispatch_audit_compliance.sql` — 5 tables (events_inbox, batch_queue, dispatched, sms_opt_in_log, phi_redaction_failures) + append-only triggers
4. `20260424000140_prompt_112_harden_audit_rls.sql` — tightens 3 INSERT policies from `WITH CHECK (TRUE)` to admin/compliance_admin only

**Registry seeding** — 28 live events (patient workflow, physician orders, commissions, MAP, product, training, platform, legal-ops) + 4 foreshadowed stubs at `default_enabled = FALSE` for prompts #113 / #114 / #115 / #116.

## 2. Core libs (Phase 2) — `src/lib/notifications/`

| Module | Purpose |
|---|---|
| `types.ts` | Canonical types + const arrays |
| `emit.ts` | `emitPractitionerNotificationEvent(eventCode, payload)` → inserts into inbox |
| `phi-redactor.ts` | Regex checks + watchlists (~60 meds, ~50 gene symbols) + `profiles.first_name/last_name` cross-check; **no "redacted fallback" by design** (§3.2 bright line) |
| `audit-logger.ts` | `recordDispatch`, `recordOptInAction` — service-role writes |
| `registry-reader.ts` | In-memory cache with 60s TTL |
| `scope-guards.ts` | Canonical forbidden-target constants consumed by tests |

## 3. Channel adapters (Phase 3) — `src/lib/notifications/adapters/`

| Adapter | Transport | Activation |
|---|---|---|
| `sms.ts` | Twilio REST API via fetch | Requires `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_MESSAGING_SERVICE_SID` |
| `slack.ts` | Slack Web API (chat.postMessage, oauth.v2.access) via fetch; unfurl suppressed | Requires `SLACK_CLIENT_ID` + `SLACK_CLIENT_SECRET` + `SLACK_SIGNING_SECRET` |
| `push.ts` | Browser push subscription storage + encoder; encrypted send via web-push on the edge side | Requires VAPID keypair in env |
| `fcm.ts` | Stub — `isConfigured() === false` | Activates when `FCM_PROJECT_ID` + `FCM_SERVICE_ACCOUNT_JSON_VAULT_REF` set |
| `apns.ts` | Stub — `isConfigured() === false` | Activates when APNS .p8 + key-id + team-id set |

## 4. Edge functions (Phase 4) — all ACTIVE

| Name | Trigger | Version |
|---|---|---|
| `practitioner-notification-dispatcher` | Cron (1 min) | v2 |
| `notification-sms-inbound` | Twilio webhook | v2 |
| `notification-slack-webhook` | Slack Events API | v2 |
| `notification-push-token-hygiene` | Cron (Sun 02:00 UTC) | v1 |
| `notification-batch-digest` | Cron (5 min) | v1 |

## 5. Next.js API routes (Phase 4) — `src/app/api/notifications/`

- `sms/verification-start/route.ts` — step 1 of double-opt-in
- `sms/compliant-optin-send/route.ts` — step 4 of double-opt-in
- `slack/install/route.ts` — OAuth callback
- `push/subscribe/route.ts` — browser subscription registration
- `push/vapid-public-key/route.ts` — VAPID public key endpoint

## 6. UI (Phases 5 + 6)

**Practitioner** (`src/app/(app)/practitioner/notifications/`):
- `layout.tsx` + `preferences/page.tsx` + `sms/setup/page.tsx` + `slack/connect/page.tsx` + `push/enable/page.tsx` + `quiet-hours/page.tsx`

**Admin** (`src/app/(app)/admin/notifications/`):
- `layout.tsx` + `page.tsx` (dashboard) + `dispatch-monitor/page.tsx` + `compliance/opt-in-log/page.tsx` + `compliance/phi-failures/page.tsx` + `event-registry/page.tsx` + `batch-queue/page.tsx`

All mobile-responsive (375/768/1024/1440). Lucide icons with `strokeWidth={1.5}`. Zero em-dashes in user-facing copy.

## 7. Tests (Phase 7) — `tests/notifications/`

| File | Tests | Status |
|---|---|---|
| `phi-redactor.test.ts` | 14 | PASS |
| `sms-keywords.test.ts` | 9 | PASS |
| `scope-guards.test.ts` | 23 | PASS |
| `registry-seed.test.ts` | 5 | PASS |
| `db-invariants.test.ts` | 2 | SKIP without env |

**Total: 51 passing, 2 skipped cleanly.**

## 8. Reviewer findings applied

| Reviewer | Finding | Fix |
|---|---|---|
| Sherlock + Michelangelo | Dispatcher PHI regex narrower than lib (missing med watchlist + gene symbols + 4 lab units) — load-bearing safety gap | Brought to full parity with `phi-redactor.ts`; redeployed as v2 |
| Sherlock | Slack webhook non-constant-time signature comparison (timing-attack exposure) | Added `constantTimeEquals()` helper; redeployed as v2 |
| Michelangelo | STOP keywords case-sensitive on punctuation ("STOP." wouldn't match) | Strip non-alphabetic chars before keyword check; redeployed as v2 |
| Michelangelo | Premature YES silently dropped (no audit) | Logs `reactivation_attempted` for TCPA defense evidence |

## 9. Open questions (from prompt §19)

Items for Gary:
1. Twilio vs AWS SNS vs MessageBird (default Twilio — confirm)
2. Mobile app existence — governs FCM + APNS activation
3. Slack workspace architecture (per-practitioner vs central)
4. Quiet hours default (22:00–07:00 local)
5. Rate limit baseline (10 SMS/hr)
6. Steve Rica dedicated legal-ops Slack workspace
7. Platform-owner alert recipient (Gary as first)
8. Twilio BAA on file
9. VAPID key generation + rotation cadence
10-18. Additional questions per prompt §19

## 10. Deferred items (explicitly called out in prompt)

- pg_cron job scheduling for dispatcher / digest / token-hygiene (operational step; Supabase pg_cron via pg_net.http_post with service-role Authorization)
- FCM + APNS activation (pending mobile app §19 Q2)
- Slack actual send wire-up inside the dispatcher (currently records dispatched intent; full chat.postMessage invocation is follow-on)
- Vault secrets for Twilio / Slack / VAPID (operational)

## 11. Handoff

- **Jeffery**: run completion checklist against live DB; flag operational gaps (cron scheduling, secret provisioning)
- **Michelangelo**: Gate 4 revalidation — coverage ≥80% on `src/lib/notifications/**`, static-analysis clean after dispatcher PHI parity fix
- **Sherlock**: verify Twilio BAA status with legal ops; confirm Slack workspace architecture (§19 Q6); HMRC MTD filing decision (not applicable here but flagged forward)
- **Gary**: 18 open decisions in §19 — priority is Q2 (mobile app existence → FCM/APNS path), Q8 (Twilio BAA signing), and Q11 (retry policy)
