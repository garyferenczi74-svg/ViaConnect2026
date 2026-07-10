# Task 211a W4-1 report: scan cadence + fingerprint + streak (data + pure logic core)

Branch: feat/211a-growth. Part 1 of 2 (data + pure logic; Part 2 = UI + cron nudges, separate task).
Baseline read: docs/formavision/211a-baseline.md (Items 5 and 6 are the authoritative primitives).

## Delivered

Migration (append-only, NOT applied; controller applies after review):
- supabase/migrations/20260710120000_prompt_211a_scan_cadence.sql
  - Creates public.scan_streak (user_id UNIQUE, current_streak, longest_streak,
    last_scan_date, streak_started_at, updated_at). Mirrors compliance_streaks.
  - Consumer-only own-row RLS: SELECT/INSERT/UPDATE all gated on
    (select auth.uid()) = user_id. NO practitioner policy of any kind.
  - Idempotent per the 210f F1/F3 convention: CREATE TABLE IF NOT EXISTS,
    ENABLE RLS, every policy inside a pg_policies DO-block guard, initplan-wrapped
    auth calls, updated_at trigger guarded on pg_trigger with SET search_path.

Pure logic modules (node-safe, no IO, injected clocks/dates, zero any, zero dashes):
- src/lib/formavision/cadence/streak.ts
  - computeStreakUpdate(prev, scanDate, cadenceWindowDays): extends inside the
    window (weekly 7 or biweekly 14, plus CADENCE_GRACE_DAYS), resets to 1 beyond,
    same-day idempotent, out-of-order (stale date) ignored, longest retained.
- src/lib/formavision/cadence/fingerprint.ts
  - scoreConditionFingerprint(scan, history): {consistencyScore 0-1 | null,
    isOutlier, reason}. Flags a sharply-different scan before trend display with
    Hannah-toned honest reason. Thin history returns null score + UNKNOWN reason
    (never a fabricated 0, never a fabricated outlier verdict).
  - buildConsistencyTip(history): the user's OWN best conditions from THEIR
    history ("your clearest scans are mornings by the window"); null on thin
    history. Reuses the body_photo_sessions.lighting_condition CHECK domain.
- src/lib/formavision/cadence/recommend.ts
  - recommendCadence(scanHistory, nowMs): {rhythm, nextDueDate,
    defaultReminderTimeOfDay, isSuggestion:true, reason}. Reminder time defaults
    to the user's dominant historical scan time. Gentle opt-in, never a nag.
    Injected clock; returns null on thin history.

Tests (red-first confirmed for streak; all green):
- src/lib/formavision/cadence/__tests__/streak.test.ts       (9)
- src/lib/formavision/cadence/__tests__/fingerprint.test.ts  (10)
- src/lib/formavision/cadence/__tests__/recommend.test.ts    (8)
Total 27 passing via `npx --no-install vitest run src/lib/formavision/cadence/`.
Asserts: extend/reset/same-day-idempotent; outlier detection; consistency tip from
real history; honest UNKNOWN/null (not 0) on thin history; dash-free Hannah copy.

## Fingerprint table decision: REUSED body_photo_sessions (no new table)

Every field the fingerprint needs already exists with its own RLS:
- body_photo_sessions.scan_quality_score, quality_issues, lighting_condition,
  session_date/created_at (20260416000090 / 20260416000100)
- body_scan_measurements.overall_confidence (20260416000100)
The pure logic reads a plain-data ScanConditionFingerprint the caller assembles
from those columns. A new scan_condition_fingerprint table would duplicate columns
that already exist, so per the prompt's "prefer reading existing" instruction it
was NOT created. Documented in the migration header.

## scan_streak RLS: consumer-only, confirmed

Own-row SELECT/INSERT/UPDATE on (select auth.uid()) = user_id only. No practitioner
policy, no service/admin policy. Matches the Helix invisibility contract (baseline
Item 5): streak credit is written server-side in the award lane, never from the
avatar surface, and scan_streak is never surfaced on a practitioner route.

## Concerns / notes for the controller

- Shared checkout: the working tree also holds a parallel session's W3 files
  (src/lib/formavision/report/, src/app/api/formavision/, tests/formavision/).
  This commit stages ONLY the 7 explicit W4-1 paths; those W3 paths are left
  untouched and uncommitted.
- Migration is intentionally NOT applied (controller applies after review).
- package.json untouched; no new dependency; existing migrations untouched.
