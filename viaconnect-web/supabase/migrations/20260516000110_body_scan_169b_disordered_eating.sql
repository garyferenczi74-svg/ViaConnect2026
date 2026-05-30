-- =============================================================================
-- Prompt #169b (Task 16): Body Scan disordered-eating safeguard storage.
-- Migration: 20260516000110_body_scan_169b_disordered_eating.sql
--
-- Adds the per-user storage the disordered-eating safeguard (spec section 3)
-- needs, on the SAME profiles table the other body-tracker per-user preferences
-- live on (profiles.unit_system from Task 15's pattern, profiles.numbers_optional
-- from migration 20260516000090, profiles.free_body_scan_used from #169a). No
-- parallel settings system is introduced; the safeguard reuses profiles exactly
-- like the numbers-optional mode does.
--
-- WHAT IS STORED:
--   * body_scan_de_response: the user's answer to the one-screen four-option
--     disordered-eating history question (section 3.2.1). Append-style: it is
--     written once on first Body Scan open and only re-written if the user later
--     changes it; there is no history table (the current answer is sufficient to
--     drive the adaptive defaults). CHECK-constrained to the four fixed machine
--     values used by responseAdaptiveDefaults() in
--     src/lib/body-tracker/disordered-eating-safeguard.ts.
--   * body_scan_de_answered_at: when the question was answered (so the app knows
--     not to re-ask; the question shows once before the educational walkthrough).
--   * the response-adaptive DEFAULTS the answer seeds (section 3.2.2):
--       - body_scan_scan_frequency_suggestion_days (soft suggestion; the 24h
--         hard limiter is separate and unaffected),
--       - body_scan_resource_card_persistence ('persistent' | 'dismissible' |
--         'none'),
--       - body_scan_body_fat_hidden ('currently' hides body fat % by default).
--     The numbers-optional default is applied to the EXISTING
--     profiles.numbers_optional column (no new column for it).
--
-- PRIVACY (section 3, CRITICAL):
--   The disordered-eating response is SENSITIVE. It is NEVER exposed to
--   practitioners. There is NO practitioner RLS policy or view that selects
--   body_scan_de_response, and the practitioner payload type
--   (PractitionerScanPayload in src/lib/body-tracker/practitioner-scan.ts) does
--   not include it. Access stays the owner-only profiles RLS already in force.
--
--   ENCRYPTED-AT-REST EXPECTATION: this value is expected to be protected by
--   at-rest encryption (the Supabase Postgres instance is encrypted at rest at
--   the storage layer). Application-level column encryption (pgsodium /
--   pgcrypto) is the stronger option; it is intentionally NOT introduced in this
--   reconciled, append-only migration because the rest of profiles is not
--   column-encrypted and doing so for one column would diverge the read path. If
--   counsel requires application-level encryption for this field, that is a
--   follow-up that also moves the read/write to a SECURITY DEFINER accessor.
--   This expectation is recorded in the column comment below.
--
-- Sorts AFTER 20260516000100 and BELOW the live #170 range (20260516120010+).
--
-- Append-only: no DROP, no ALTER on existing columns, no editing of prior files.
-- Idempotent: ADD COLUMN IF NOT EXISTS (consistent with 20260516000070/000090).
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS body_scan_de_response TEXT
    CHECK (
      body_scan_de_response IS NULL
      OR body_scan_de_response IN ('currently', 'in_the_past', 'no', 'prefer_not_to_say')
    ),
  ADD COLUMN IF NOT EXISTS body_scan_de_answered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS body_scan_scan_frequency_suggestion_days INTEGER,
  ADD COLUMN IF NOT EXISTS body_scan_resource_card_persistence TEXT
    CHECK (
      body_scan_resource_card_persistence IS NULL
      OR body_scan_resource_card_persistence IN ('persistent', 'dismissible', 'none')
    ),
  ADD COLUMN IF NOT EXISTS body_scan_body_fat_hidden BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.body_scan_de_response IS
  'Prompt #169b section 3.2.1: the user''s response to the one-screen four-option '
  'disordered-eating history question (currently / in_the_past / no / '
  'prefer_not_to_say). SENSITIVE: never exposed to practitioners (owner-only RLS; '
  'absent from PractitionerScanPayload). Expected to be protected by at-rest '
  'encryption; application-level column encryption is a counsel-gated follow-up. '
  'Drives the response-adaptive defaults in disordered-eating-safeguard.ts.';

COMMENT ON COLUMN public.profiles.body_scan_de_answered_at IS
  'Prompt #169b section 3.2.1: when the disordered-eating history question was '
  'answered, so it is asked once (before the educational walkthrough) and not '
  're-asked. SENSITIVE-adjacent; owner-only.';

COMMENT ON COLUMN public.profiles.body_scan_scan_frequency_suggestion_days IS
  'Prompt #169b section 3.2.2: soft suggested days between scans seeded from the '
  'disordered-eating response (14 for currently, 7 otherwise). User-changeable. '
  'The 24h HARD frequency limiter (migration 20260516000080) is separate and '
  'always applies regardless of this suggestion.';

COMMENT ON COLUMN public.profiles.body_scan_resource_card_persistence IS
  'Prompt #169b section 3.2.2/3.2.5: how the non-intrusive support resource card '
  'behaves for this user by default (persistent for currently, dismissible for '
  'in_the_past / prefer_not_to_say, none for no). User-changeable.';

COMMENT ON COLUMN public.profiles.body_scan_body_fat_hidden IS
  'Prompt #169b section 3.2.2: hide body fat percentage by default (seeded true '
  'only for the currently response). User-changeable. Complements the '
  'numbers_optional fully-hidden set.';
