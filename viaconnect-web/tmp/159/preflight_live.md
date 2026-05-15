# Prompt #159 Pre-Flight (live Supabase, project nnhkcufyqjojdbvdrpky)
Run: 2026-05-11

## bio_optimization_history (10 rows)
Columns:
- id uuid PK (default gen_random_uuid)
- user_id uuid NULLABLE (FK auth.users ON DELETE CASCADE)
- date date NOT NULL (default CURRENT_DATE)
- score numeric(5,2) NOT NULL
- source text NULLABLE (default 'daily', CHECK in 'caq_initial', 'daily', 'recalculation')
- breakdown jsonb NULLABLE
- created_at timestamptz NULLABLE (default now())

Constraints:
- PRIMARY KEY (id)
- UNIQUE (user_id, date) [via bio_optimization_history_user_id_date_key]
- CHECK source IN ('caq_initial', 'daily', 'recalculation')
- FK user_id -> auth.users(id) ON DELETE CASCADE

Indexes:
- bio_optimization_history_pkey (id)
- bio_optimization_history_user_id_date_key (user_id, date) UNIQUE
- idx_bio_history (user_id, date DESC) -- already covers the "latest per user" lookup the spec wants

RLS: enabled, NOT forced. Existing policy "Users view own bio history" applies to ALL commands. The policy expression is heavily nested (autoheal artifact). One policy total. No INSERT/UPDATE/DELETE policy split.

Sample rows (last 5):
- All sourced 'caq_initial', scores 47-70, distinct users, distinct dates.

## profiles (BOS-relevant subset)
- id uuid PK FK auth.users
- bio_optimization_score numeric(5,2) default 0
- role text (patient/practitioner/admin/compliance_officer/legal_ops/cfo/ceo/medical_director)
- unit_system text (imperial/metric)
- 10 rows have non-null bio_optimization_score

RLS: enabled.

## health_scores (0 rows, table appears dead)
Columns:
- id uuid PK (default uuid_generate_v4 -- uses uuid-ossp, not pgcrypto)
- user_id uuid NOT NULL (FK profiles(id), NOT auth.users)
- score integer NOT NULL (CHECK 0-100)
- calculation_version text default '1.0'
- created_at timestamptz default now()

NO score_type column. NO recorded_at column. Spec §6.5 "on conflict (user_id, score_type, recorded_at)" is impossible against this shape. Table has zero rows and zero CREATE TABLE in local migrations (drift per project_local_vs_live_migrations_drift memory).

RLS: enabled. One small composite index idx_health_scores_user (user_id).

## daily_scores (0 rows, table appears dead)
Columns:
- id uuid PK
- user_id uuid NULLABLE (FK auth.users CASCADE)
- date date NOT NULL (default CURRENT_DATE)
- recovery_score, sleep_score, steps_score, strain_score, exercise_score, regimen_score: integer NULLABLE (each CHECK 0-100)
- steps_count integer, sleep_hours numeric(4,2), exercise_minutes integer
- recovery_hrv numeric(5,2), strain_value numeric(5,2)
- data_source text default 'manual' (CHECK IN 'manual', 'wearable', 'mixed' -- NOTE: 'mixed' not 'combined')
- wearable_type text
- daily_composite numeric(5,2)
- bio_optimization_score numeric(5,2) [!! column already exists on this table]
- created_at, updated_at timestamptz default now()

Constraints:
- PK (id), UNIQUE (user_id, date), 6 component CHECK constraints (0-100), data_source CHECK

Indexes: idx_daily_scores_user_date (user_id, date DESC) -- already covers spec's lookup

Spec §6.5 "overall_score" column does NOT exist. The live equivalent is bio_optimization_score (already there) or daily_composite. Spec's "score_date" key is just "date" on live.

RLS: enabled.

## Extensions
- pgcrypto v1.3 in extensions schema (gen_random_uuid available)
- plpgsql v1.0 pg_catalog
- pg_cron v1.6.4 pg_catalog
- pgtap NOT installed -- spec §6.1 requires it; needs apply_migration with elevated privilege

## Existing SECURITY DEFINER RPC pattern (sampled 5 representative)
- prescription_issue, helix_create_redemption, jeffery_emit_message, handle_new_user, exec_issue_pack
- All use `auth.uid()` directly + role check via `SELECT role INTO v_role FROM profiles WHERE id = v_caller_id`
- ZERO use of `current_user::regrole` -- spec §6.4's pattern is foreign to this codebase
- Pattern: SECURITY DEFINER, declare locals, validate auth.uid() not null, role-check via profiles, do work, RAISE EXCEPTION on policy violation, return

## CRITICAL ARCHITECTURAL CONFLICTS (spec vs live)

### Conflict 1: UNIQUE (user_id, date) vs spec's "append-only"
Spec §2.1: "bio_optimization_history is the single canonical store of BOS. Every BOS value the system has ever produced for any user is an immutable, append-only row in this table."
Live: UNIQUE (user_id, date) constraint forbids more than one row per user per day. The 10 existing rows respect this (one per user per CAQ initial).
Gary must choose: drop the unique to truly append-only, keep it and ON CONFLICT UPDATE (same-day recomputes overwrite), or extend to (user_id, date, compute_seq) for sequenced appends.

### Conflict 2: health_scores projection is impossible as written
Spec §6.5 trigger does `INSERT INTO health_scores ... ON CONFLICT (user_id, score_type, recorded_at)`. Neither score_type nor recorded_at exists. Table is empty and absent from local migrations -- probable abandonment.

### Conflict 3: daily_scores column names diverge
Spec §6.5 references `score_date` and `overall_score`. Live has `date` and `bio_optimization_score` (column already there!). data_source allowed values are `manual|wearable|mixed`, not the `combined` Michelangelo guessed.

### Conflict 4: `breakdown` jsonb already exists where spec wants `inputs`
The spec's `inputs jsonb` overlaps semantically with the live `breakdown jsonb`. Repurpose, rename, or add side-by-side?

### Minor: idx_bio_history already covers (user_id, date DESC)
Spec §6.3 idx_bos_history_user_computed_at would be a near-duplicate. Skip or rename existing.

### Minor: user_id is NULLABLE in bio_optimization_history
Spec §2.2 says NOT NULL. Going forward should be NOT NULL; 10 existing rows are all non-null so backfill is safe.

## Migrations applied list (BOS-relevant)
- 20260324170136 fix_recommendations_and_vitality
- 20260325051535 fix_recommendations_and_vitality (re-applied; legacy "Vitality" naming)
No migration directly named bio_optimization_history exists -- the table predates the formal-prompt sequence. Drift confirmed.
