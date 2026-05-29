# Prompt 170 Blueprint Deliverable 5: Corpus Governance Memo

Date: 2026-05-28
Author: Arnold (data ecosystem) plus Jeffery (orchestrator)
Status: Blueprint, awaiting Gary signoff per OBRA gate

## Purpose
Governance for user_meal_corpus, the proprietary user meal dataset built from every NutriVision save, every Quick Log save, and every user edit. Sets who can read it, what queries are sanctioned, how the salt rotates, and what happens on user revocation.

## What the corpus is
- One row per meal save plus one row per user edit batch.
- Columns: user_hash (salted SHA-256), salt_version (default 1), meal_id, source enum (nutrivision, quick_log, manual), cuisine_tag, recognition_payload_json (provider raw output), final_state_json (after user edits), edit_diff_json (delta), cooking_oil_json (selection), meal_confidence, user_modified, contributed_photo_path (NULL unless photo opt-in), created_at.
- Never stored: email, phone, IP, geolocation, name, household, auth.uid.

## Pseudonymity, not anonymity
The hash is reversible to whoever has Postgres service-role access plus the salt. Treat the corpus as pseudonymous. Hardens against accidental application-tier extraction; does not protect against a service-role-holding attacker. Protection model is procedural, not cryptographic.

## Access control
- RLS enabled, no client policies. Reads and writes through service-role only.
- Service role minimization list:
  - Authorized roles: server-side API routes (src/app/api/nutrition/meals/route.ts and the new src/app/api/nutrition/photo/analyze/route.ts), the hourly cleanup Edge Function, the Arnold /admin/corpus surface, and the future Gordon-trained model retrieval job.
  - Audit trail: every grant of a new service-role-using identity is logged in jeffery_directives with category corpus_access.
- pgaudit on user_meal_corpus SELECT. Daily review by Gary or an Arnold-supervised job that surfaces unusual access patterns.

## Sanctioned queries
- Aggregate cuisine and cooking method statistics for Hannah and Gordon prompt-tuning.
- Aggregate cooking oil selection distribution to retune smart-default suggester.
- Aggregate pHash cache hit rate and provider mix for /admin/corpus dashboard tiles.
- Single-user revocation cleanup queries scoped by opt_in_revoked_at lookup against user_nutrivision_settings.

## Forbidden queries
- Any join that re-binds user_meal_corpus.user_hash to a user identity via the user_id mapping. The only legitimate use of the salt-reversal capability is per-user revocation cleanup, which is automated via the cleanup function and not run interactively.
- Any query that exports rows to a destination outside the Supabase project without a written Gary directive.
- Any SELECT that includes contributed_photo_path values into an analytics surface (the path is for the cleanup job and per-user revocation only).

## Salt rotation policy
- Rotate app.corpus_salt annually on January 1 of each calendar year.
- Bump salt_version (default 1) at rotation. New rows tag with the new version; old rows remain queryable under their historical salt for legitimate model-training queries.
- Salt is set via Postgres setting current_setting('app.corpus_salt'), never exposed to clients, never committed to repo. Stored in Supabase Vault with read access scoped to the service role used by the writer paths.

## Opt-in revocation, hard-delete grace
- Default state: corpus_opt_in false. Photos never copied; user_meal_corpus rows still written without contributed_photo_path.
- User-elected corpus_opt_in true: contributed_photo_path populated on new rows; stripped photo (no EXIF, no GPS) copied to the corpus bucket.
- User-elected revocation: opt_in_revoked_at stamped. 7 calendar days later, the cleanup Edge Function NULL's contributed_photo_path for that user_hash's rows and deletes the storage objects.
- The user_meal_corpus row itself (recognition_payload_json, final_state_json, edit_diff_json) is retained as anonymized training data per Terms of Service language.

## Auditing posture for /admin/corpus
- The dashboard at /admin/corpus is the only sanctioned read interface outside the cleanup function and Hannah / Gordon prompt-tuning jobs.
- Tiles surfaced:
  - Corpus row write count by day, by source.
  - Cuisine tag distribution histogram.
  - Cooking oil selection distribution, suggested-vs-overridden ratio.
  - Photo contribution rate.
  - Cache hit rate exact SHA-256 vs pHash near-match.
  - Provider mix LogMeal vs Gemini vs Claude.
- Auth gate: existing admin role check, currently scoped to gary@farmceuticawellness.com only. Expansion of viewer list requires a written Gary directive.

## Open questions for Gate review
- OQ1. Does the annual rotation date land on January 1 or on a date Gary picks?
- OQ2. Should the daily pgaudit review be human-only or should an automated Sherlock-style summary surface anomalies (note: Sherlock is out of scope on 170 per agent ownership, so this would be a Hannah-owned job or a new function).
- OQ3. Do we surface the corpus rate to practitioners under aggregate-only with k-anonymity threshold k=5 (recommended), or keep it Gary-only?
- OQ4. Should the 7-day grace window be configurable per user or fixed?

These are governance choices, not ship gates. We default to the recommended posture above unless Gary directs otherwise during Blueprint signoff.
