# 161d Compute_seq and Timezone Audit

## 1. Header

| Field | Value |
| --- | --- |
| Date | 2026-05-12 |
| Investigator | Michelangelo (under Jeffery orchestration, dispatched by #161d) |
| Time spent | ~45 minutes (well under the 4-hour cap per #161d §0.9) |
| Branch | main (workspace; report-only output, no production code touched) |
| DB snapshot | `scratch/161d/schema-introspection.out` (orchestrator pre-flight; production Supabase project nnhkcufyqjojdbvdrpky, read-only MCP) |
| Codebase commit | d990fd6 (feat scoring: Bio Optimization Score SSOT + Hannah Multi-Source Compute Backend) plus the four #161 follow-ups 7ba1eb0, 63ab12d, c726f10, and uncommitted concurrent agent work in workspace |
| Investigation gate | Diagnostic-only per §0.7 and §11; no fixes drafted, no migrations, no production file edits |

## 2. Executive summary

Three load-bearing findings:

1. `compute_seq` is a real column on `public.bio_optimization_history`, introduced by the Phase A migration `20260512020236_bos_compute_v2.sql` (Section 2 line 71) in commit d990fd6. It backs a UNIQUE constraint `(user_id, date, compute_seq)` and is auto-incremented inside the `compute_bio_optimization_score` RPC. **Hypothesis 1 confirmed.** The implementation matches Gary's stated Q1 preference (add compute_seq, drop legacy `(user_id, date)` UNIQUE, add `(user_id, date, compute_seq)` UNIQUE). The #161d prompt's framing of the user picking "Option 1 drop the UNIQUE" is stale orchestrator context and should be corrected.
2. The `CURRENT_DATE` calls inside the RPC (two occurrences, lines 321 and 327 of the Phase A migration) are session-timezone-dependent. Under any non-UTC PostgreSQL session, the same UTC wall-clock instant can resolve to different calendar dates, which means the MAX(compute_seq) lookup can miss same-day rows written in a different session, allowing duplicate `compute_seq` partitions to start at 1 again. The `bio_optimization_history.date` DEFAULT `CURRENT_DATE` inherits the same exposure. Telemetry retention sweeps, cooldown lookups, and queue ordering all operate on `timestamptz` and are timezone-correct.
3. The projection trigger `project_bio_optimization_score` writes `NEW.date` directly into `daily_scores.date`, propagating whatever calendar date the RPC computed via `CURRENT_DATE`. Whether the original #159 §6.5 spec called for `(NEW.computed_at AT TIME ZONE 'utc')::date` could not be verified locally because no `prompt-159*.md` or `prompt-161*.md` file exists in `docs/prompts/`. The implementation's behavior is documented; the spec divergence is `[SPECULATIVE]` pending Gary's confirmation of the original §6.5 wording.

The compute_seq mechanism is correct in concept and matches the locked Q1 decision. The timezone exposure is real and currently masked only by the fact that production Supabase runs in UTC by default; any operator change to a non-UTC session, a future regional Supabase deployment, or a `SET TIME ZONE` issued inside a session would surface the bug. Remediation is a small, focused migration that swaps two `CURRENT_DATE` calls and one column DEFAULT for `(now() AT TIME ZONE 'utc')::date`, plus pgTAP coverage. Estimated <100 LOC. Architectural sign-offs required only if Gary wants to backfill the existing 10 pre-SSOT rows whose `date` values were derived under unknown session timezone.

## 3. Track A: compute_seq

### Finding CS-1: Where compute_seq lives (Hypothesis 1 confirmed)

`compute_seq` is a column on `public.bio_optimization_history`. Single match across all schemas.

**Live DB evidence** (`scratch/161d/schema-introspection.out`, Q1 result):

> `{"table_schema": "public", "table_name": "bio_optimization_history", "column_name": "compute_seq", "data_type": "smallint", "is_nullable": "NO", "column_default": "1"}`

**Index backing it** (Q2 result):

> `CREATE UNIQUE INDEX bos_history_user_date_seq_key ON public.bio_optimization_history USING btree (user_id, date, compute_seq)`

**Constraint backing it** (Q3 result):

> `UNIQUE (user_id, date, compute_seq)` named `bos_history_user_date_seq_key`

**Migration evidence** (`supabase/migrations/20260512020236_bos_compute_v2.sql:71`):

> `ADD COLUMN IF NOT EXISTS compute_seq smallint NOT NULL DEFAULT 1;`

**Test-suite evidence** (`supabase/tests/bos_compute_v2/01_bos_history_shape.sql:35-40`):

> ```
> SELECT has_column('public', 'bio_optimization_history', 'compute_seq', ...);
> SELECT col_type_is('public', 'bio_optimization_history', 'compute_seq', 'smallint', ...);
> SELECT col_not_null('public', 'bio_optimization_history', 'compute_seq', ...);
> ```

Classification: **Hypothesis 1 confirmed.** The column is on `bio_optimization_history`, smallint, NOT NULL, DEFAULT 1, backed by a unique composite index, and exercised by pgTAP fixtures.

### Finding CS-2: Why compute_seq was introduced

`compute_seq` was introduced by the bundled #159 + #161 migration in commit d990fd6 on 2026-05-11. The git log (`scratch/161d/log-compute-seq.txt`) shows exactly one commit touched the column name across the entire repository history.

**Commit:** d990fd6 "feat(scoring): Bio Optimization Score SSOT + Hannah Multi-Source Compute Backend"

**Rationale, verbatim from the migration header** (`supabase/migrations/20260512020236_bos_compute_v2.sql:8-15`):

> ```
> Architectural decisions locked by Gary 2026-05-11:
>
>   Q1: Add compute_seq smallint NOT NULL DEFAULT 1.
>       DROP the existing UNIQUE (user_id, date) constraint.
>       ADD UNIQUE (user_id, date, compute_seq).
>       The RPC auto-increments compute_seq for same-day computes via
>       coalesce((select max(compute_seq) from bio_optimization_history
>       where user_id = p_user_id and date = current_date), 0) plus 1.
> ```

**Orchestrator-supplied chat context** (cited per §0 of #161d): when Jeffery asked Gary the four architectural decisions for #159, Gary's exact response was: `"Q1 add compute_seq Q2 drop projections Q4 keep breakdown"`. So Gary picked the **add-compute_seq** path, not the drop-UNIQUE path. The #161d prompt's framing of the user picking "Option 1 drop the UNIQUE; true append-only" is stale or misremembered context; the actual decision was the add-compute_seq option and the implementation reflects it correctly.

**Purpose:** to allow multiple same-day BOS recomputations per user without violating uniqueness, while preserving deterministic "latest" ordering via `(date DESC, compute_seq DESC)`. The compute path was widened to "append-only with per-day sequence" rather than "one row per user per day" so that bypass-cooldown sources (CAQ completion, lab upload, genetics upload) and worker retries could each persist a row.

### Finding CS-3: How compute_seq is used (every call site)

Forty-six matches across the codebase (`scratch/161d/grep-codebase.txt`). Classified:

| Path | Lines | Kind | Use |
| --- | --- | --- | --- |
| `supabase/migrations/20260512020236_bos_compute_v2.sql` | 10, 12, 13, 14, 71, 191, 200, 254, 316, 317, 325, 543 | Migration | DDL: declares the column, the unique index, the auto-increment SELECT, the comment |
| `supabase/tests/bos_compute_v2/01_bos_history_shape.sql` | 4, 35, 36, 37, 38, 39, 40, 55, 56 | pgTAP | Assert column exists, type, NOT NULL, in UNIQUE key set |
| `supabase/tests/bos_compute_v2/02_rpc_contract.sql` | 4, 122, 145, 149, 154 | pgTAP | Assert same-day second call increments compute_seq |
| `supabase/tests/bos_compute_v2/README.md` | 12, 13 | Doc | Catalog of test assertions |
| `src/lib/scoring/bio-optimization-score.ts` | 166-167, 171, 174, 547 | Production code | Reads via `(date DESC, compute_seq DESC)` order; returns 1 placeholder in `BOSResult` (RPC owns the real value) |
| `src/lib/scoring/cooldown.ts` | 30, 32, 37, 40 | Production code | Same `(date DESC, compute_seq DESC)` ordering for cooldown lookup |
| `src/lib/scoring/__tests__/bio-optimization-score.test.ts` | 38 | Test | Mock matches the new order chain |
| `src/lib/scoring/__tests__/cooldown.test.ts` | 13, 18 | Test | Mock returns `{ date, compute_seq, computed_at }` shape |
| `src/app/api/bos/current/route.ts` | 10, 11, 82 | Production code | Reads via `(date DESC, compute_seq DESC)` to serve `/api/bos/current` |
| `src/app/api/bos/__tests__/current.test.ts` | 4 | Test | Mock for the current endpoint |
| `docs/architecture/hannah-compute-engine.md` | 31 | Doc | Architecture write-up |
| `docs/runbooks/bos-worker-troubleshooting.md` | 59, 150 | Doc | Operator runbook for the worker drain and the rollback note |

**Write path:** Only one function writes the column: `public.compute_bio_optimization_score`. Live DB confirms this (introspection Q5: "pg_proc returned only the one function. No other function in public.* references compute_seq."). The trigger `project_bio_optimization_score` and the worker RPC `claim_bos_compute_batch` do not touch the column.

**Read path:** Three production-code call sites read the column, all using the same `(date DESC, compute_seq DESC)` two-key order to ride the unique index:

1. `src/lib/scoring/cooldown.ts:35-42` (most-recent computed_at for 30-minute cooldown)
2. `src/lib/scoring/bio-optimization-score.ts:169-176` (previous score for delta calculation in breakdown)
3. `src/app/api/bos/current/route.ts:77-84` (read-back for the consumer dashboard)

**Return value:** `src/lib/scoring/bio-optimization-score.ts:547` returns `computeSeq: 1` as a placeholder in the `BOSResult` object. Verbatim: `computeSeq: 1, // RPC auto-increments; we return 1 as a placeholder.` The RPC's actual returned UUID is what's authoritative; the read-back endpoint serves the true compute_seq from the freshly-inserted row.

**No leak to client:** compute_seq is selected by the API route but is not part of the `BOSCurrentResponse` payload that flows to the consumer dashboard. It is internal ordering metadata only.

## 4. Track B: Timezone audit

Total in-scope sites: **8** (after filtering out test fixtures, helpers, telemetry timestamp comparisons, and queue ordering that operates on timestamptz).

Classification:
- **AT-RISK**: 3 (TZ-1, TZ-2, TZ-3)
- **OK-INSENSITIVE**: 4 (TZ-4, TZ-5, TZ-6, TZ-7)
- **OK-UTC**: 1 (TZ-8)
- **CONFIRMED-BUG**: 0 (no live reproduction performed; AT-RISK is the highest classification this investigation produced)

### TZ-1 (AT-RISK): compute_bio_optimization_score MAX(compute_seq) lookup

**Location:** `supabase/migrations/20260512020236_bos_compute_v2.sql:317-321`

**Verbatim:**

> ```sql
>   SELECT COALESCE(MAX(compute_seq), 0) + 1
>     INTO v_next_seq
>     FROM public.bio_optimization_history
>    WHERE user_id = p_user_id
>      AND date = CURRENT_DATE;
> ```

**Why AT-RISK:** `CURRENT_DATE` is the session-tz-dependent calendar date. Under PG session timezone `America/New_York`, a call at `2026-05-12 03:30:00+00` UTC returns `2026-05-11` (local). Under session `UTC`, the same instant returns `2026-05-12`. If the same user has rows on both dates due to a session-timezone change, the MAX lookup misses the rows that landed on the "other" date and resets compute_seq to 1, which would collide with an existing `(user_id, date, compute_seq=1)` if the matching date row already exists.

**Analytical reproduction:** Assume the user has `(2026-05-12, seq=1)` written under a UTC session. A subsequent call under `America/New_York` at `2026-05-12 03:30:00+00` (which is `2026-05-11 23:30:00-04:00`) would `WHERE date = '2026-05-11'`, see zero rows, set `v_next_seq = 1`, then `VALUES (..., '2026-05-11', ..., 1, ...)`. If the user already has `(2026-05-11, seq=1)` from a prior compute, this raises a 23505 unique-violation. If they don't, it inserts a duplicate seq=1 partition that "shouldn't" exist for the calendar day the operator intended.

### TZ-2 (AT-RISK): compute_bio_optimization_score INSERT VALUES

**Location:** `supabase/migrations/20260512020236_bos_compute_v2.sql:323-329`

**Verbatim:**

> ```sql
>   INSERT INTO public.bio_optimization_history
>     (user_id, date, score, tier, confidence, breakdown,
>      compute_version, computed_at, compute_seq, source)
>   VALUES
>     (p_user_id, CURRENT_DATE, p_score, p_tier, p_confidence, p_breakdown,
>      p_compute_version, now(), v_next_seq, p_source);
> ```

**Why AT-RISK:** Same reason as TZ-1; the INSERT pins `date` to the session-tz `CURRENT_DATE`, so `date` and the corresponding compute_seq partition can split across calendar days for the same UTC instant. Note that the INSERT and the lookup use the same `CURRENT_DATE` within the same transaction, so they agree with each other; the risk is cross-transaction across sessions with different timezones.

### TZ-3 (AT-RISK): bio_optimization_history.date column DEFAULT

**Location:** Live DB introspection (`scratch/161d/schema-introspection.out` Q4):

> ```
> 3.  date            date                       NOT NULL DEFAULT CURRENT_DATE   <-- TZ-sensitive
> ```

**Why AT-RISK:** Any future or existing direct write that omits `date` (the RPC explicitly provides it, so the RPC path is not affected) would pick up `CURRENT_DATE` from the session timezone. The Phase A migration (Section 7) revokes INSERT, UPDATE, DELETE from `authenticated` and `anon`, so the only direct write path is `service_role` outside of the RPC. Today no service-role path writes to this table outside the RPC, but the DEFAULT remains as a latent foot-gun for any future code or migration that bypasses the RPC.

Additionally, the existing 10 pre-SSOT rows were written under whatever session timezone Supabase production used at the time. Per the Phase A migration Section 3 backfill comments, those rows are sentinel-tagged `pre_ssot_unknown`, so the historical date values are best-effort but not authoritative.

### TZ-4 (OK-INSENSITIVE): cooldown.ts MAX(computed_at) lookup

**Location:** `src/lib/scoring/cooldown.ts:35-42`

**Verbatim:**

> ```ts
>     const { data, error } = await supabase
>       .from('bio_optimization_history')
>       .select('date, compute_seq, computed_at')
>       .eq('user_id', userId)
>       .order('date', { ascending: false })
>       .order('compute_seq', { ascending: false })
>       .limit(1)
>       .maybeSingle();
> ```

The query orders by `date DESC` then `compute_seq DESC` and returns the row's `computed_at` (a timestamptz). The cooldown computation at lines 54 and 59 compares ms-since-epoch values:

> ```ts
>     const lastMs = new Date(lastIso).getTime();
>     ...
>     const diffMinutes = (Date.now() - lastMs) / 60000;
> ```

Both `Date(lastIso)` and `Date.now()` resolve to UTC milliseconds. The duration arithmetic is timezone-insensitive. **Classification: OK-INSENSITIVE.** The `date` column ordering is inherited from TZ-1/TZ-2; the cooldown logic itself doesn't introduce new exposure.

### TZ-5 (OK-INSENSITIVE): bos_compute_queue enqueued_at ordering

**Location:** `src/lib/scoring/queue.ts:100`

> `.order('enqueued_at', { ascending: true })`

`enqueued_at` is `timestamptz NOT NULL DEFAULT now()` (migration line 389). `now()` returns timestamptz, which Postgres orders timezone-insensitively. **Classification: OK-INSENSITIVE.**

### TZ-6 (OK-INSENSITIVE): bos_telemetry_retention_sweep 90-day window

**Location:** `supabase/migrations/20260512074126_bos_telemetry_hardening.sql:91`

> `WHERE occurred_at < now() - interval '90 days';`

`occurred_at` and `now()` are both timestamptz; `now() - interval '90 days'` is timestamptz arithmetic, timezone-insensitive. **Classification: OK-INSENSITIVE.**

### TZ-7 (OK-INSENSITIVE): bos_compute_queue 30-day cleanup

**Location:** `supabase/migrations/20260512074126_bos_telemetry_hardening.sql:96`

> `AND processed_at < now() - interval '30 days';`

Same as TZ-6. **Classification: OK-INSENSITIVE.**

### TZ-8 (OK-UTC, leakage into BOSResult date): bio-optimization-score.ts BOSResult date

**Location:** `src/lib/scoring/bio-optimization-score.ts:541`

> `date: new Date().toISOString().slice(0, 10),`

`new Date().toISOString()` is canonical UTC. `.slice(0, 10)` extracts `YYYY-MM-DD` from the UTC ISO string. This value is in the returned `BOSResult` object only; it does **not** flow back into the DB (the actual row's `date` is the RPC's `CURRENT_DATE`). **Classification: OK-UTC** for the value's own derivation; however, this creates a separate concern (see Investigator notes §8): the in-process return value and the actual DB row's `date` can disagree if the PG session is not UTC. That is a downstream display bug, not a write-correctness bug, so it does not promote to AT-RISK in this audit.

### Out of scope (filtered)

The Step B1 grep also surfaced 47 hits in `src/hooks/`, `src/lib/scoring/sources/*`, and unit-test fixtures that derive dates for engagement-source last_engaged_at calculations. Per §0.5 the audit is scoped to the BOS pipeline only; these are upstream source-detector paths whose date arithmetic happens in JS milliseconds against fixed 86_400_000 ms windows. They use `new Date().toISOString().slice(0, 10)` which is UTC-canonical and is not the same TZ-sensitive call as PG's `CURRENT_DATE`. They are flagged `OK-UTC` in spirit but excluded from the report per §0.5.

### #159 §6.5 spec-vs-implementation note (referenced under SC-2 below)

The `project_bio_optimization_score` trigger function reads `NEW.date` directly:

**`supabase/migrations/20260512020236_bos_compute_v2.sql:365-368`:**

> ```sql
>   INSERT INTO public.daily_scores (user_id, date, bio_optimization_score)
>   VALUES (NEW.user_id, NEW.date, NEW.score)
>   ON CONFLICT (user_id, date) DO UPDATE
>     SET bio_optimization_score = EXCLUDED.bio_optimization_score;
> ```

It does NOT use `(NEW.computed_at AT TIME ZONE 'utc')::date`. Whether the original #159 §6.5 spec called for the UTC-pinned derivation could not be verified locally (see Track C SC-2).

## 5. Track C: Spec conflicts

### SC-1: Track A classification vs Q1 decision

**Status: NO SPEC CONFLICT.** Implementation matches Gary's locked Q1 decision (add compute_seq, drop legacy `(user_id, date)` UNIQUE, add `(user_id, date, compute_seq)` UNIQUE). The migration header at lines 10-15 reflects the decision verbatim and the DDL at line 71 plus the index at line 200 implement it correctly.

**Informational note for #161d-fix drafting:** The #161d prompt §1's framing of the user choosing "Option 1: Drop the UNIQUE; true append-only against the alternative 'Option 3: Add compute_seq; UNIQUE (user_id, date, compute_seq)'" is stale orchestrator context. Per the orchestrator-supplied chat record in #161d §0.4, Gary's exact response was: `"Q1 add compute_seq Q2 drop projections Q4 keep breakdown"`. The implementation correctly chose the add-compute_seq path. #161d-fix should not propose dropping the UNIQUE.

### SC-2: Track B TZ-1/TZ-2 vs #159 §6.5 spec (UTC-pinned date derivation in projection trigger)

**Status: [SPECULATIVE] SPEC CONFLICT pending Gary's confirmation of the original spec.**

The orchestrator's #161d brief notes:

> "Spec §6.5 of #159 originally called for `(new.computed_at at time zone 'utc')::date` in the projection trigger. Verify whether this clause survived implementation."

I cannot verify this against a local copy of the #159 spec. No `prompt-159*.md` or `prompt-161*.md` file exists in `docs/prompts/`. Searching for `at time zone 'utc'` (case-insensitive) across the entire repo returns one hit, in an unrelated #114 migration (`supabase/migrations/20260424000230_prompt_114_counsel_mfa.sql:102`).

**What I can verify from the codebase:**

- The trigger function `project_bio_optimization_score` (migration lines 354-372) writes `NEW.date` into `daily_scores.date`.
- `NEW.date` inherits the RPC's `CURRENT_DATE` (TZ-1/TZ-2).
- The trigger does not perform any UTC-pinning.
- The migration's Section 9 header comment (`-- Section 9: project_bio_optimization_score trigger function`) and the four bullets under "Deviations from #159 spec §6 and #161 spec §6.1" (lines 33-50) document Q2/Q3/Q4 deviations, but no mention of UTC-pinning being added, removed, or considered. If the spec did require UTC-pinning, the migration's deviations list would be expected to call it out as a removal.

**Tentative conclusion:** If the orchestrator's claim is accurate, the implementation diverged from spec §6.5 silently. If the orchestrator's claim is itself stale (analogous to the SC-1 stale-context finding), then there is no conflict here. Both possibilities should be confirmed by Gary against the original #159 spec text before #161d-fix is drafted.

### SC-3: Track B vs decay-policy decision (#161 Section 0 decision 1)

**Status: NO SPEC CONFLICT.**

The decay policy operates on engagement_state's `last_engaged_at` (timestamptz) values via 7-day half-life and 14-day full-decay constants (`HALF_LIFE_DAYS = 7`, `FULL_DECAY_DAYS = 14`, from #161c follow-up commit c726f10). The constants are integer day counts, the comparisons happen in ms-since-epoch, and the source-detector code under `src/lib/scoring/sources/*` derives dates via `new Date().toISOString()` which is UTC-canonical. No date casting from timestamptz to local date occurs in the decay pipeline. No conflict.

## 6. Recommended remediation shape

**Estimated PR size:** Small (under 100 LOC).

**Proposed DDL/function changes:**

1. In `compute_bio_optimization_score`, change `CURRENT_DATE` to `(now() AT TIME ZONE 'utc')::date` at both occurrences (lines 321 and 327 of the Phase A migration). The function body is rewritten via `CREATE OR REPLACE FUNCTION`. Append-only: no edits to applied migration files; a new migration file (`20260512NNNNNN_bos_compute_v3_utc_pin.sql` or similar timestamp) is added.
2. Optionally change `bio_optimization_history.date` column DEFAULT from `CURRENT_DATE` to `((now() AT TIME ZONE 'utc')::date)`. This is the same fix applied to the column DEFAULT, a single `ALTER TABLE ... ALTER COLUMN date SET DEFAULT (...)` statement. The existing 10 pre-SSOT rows are not affected (their date values stay as-is, pre_ssot_unknown sentinel).
3. Optionally, if Gary wants symmetric coverage in `project_bio_optimization_score`, change the trigger's `VALUES (NEW.user_id, NEW.date, NEW.score)` to `VALUES (NEW.user_id, (NEW.computed_at AT TIME ZONE 'utc')::date, NEW.score)`. This pins `daily_scores.date` to UTC regardless of the source row's `date`. Whether this matches the original #159 §6.5 spec is the open question under SC-2.

**Proposed tests:**

1. pgTAP test in `supabase/tests/bos_compute_v3/` asserting compute_seq behavior under `SET timezone = 'America/New_York'`: write row 1 under UTC, switch session to Eastern, write row 2 at a wall-clock instant that crosses midnight UTC, assert `MAX(compute_seq)` returns 2 (not 1) for the UTC calendar day.
2. pgTAP test asserting that the column DEFAULT returns UTC date regardless of session timezone. Use `SET timezone = 'Asia/Tokyo'` and call `SELECT CURRENT_DATE, ((now() AT TIME ZONE 'utc')::date)` to demonstrate the diff.
3. Optionally a TypeScript unit test under `src/lib/scoring/__tests__/bio-optimization-score.test.ts` that asserts the returned `BOSResult.date` matches the actual DB row's `date` under a non-UTC session (requires a local Postgres or a stubbed RPC fixture).

**Architectural sign-offs needed from Gary:**

1. UTC-pin the RPC: yes / no. (Recommend yes; pure win, zero behavior change under UTC sessions.)
2. UTC-pin the column DEFAULT: yes / no. (Recommend yes; defense in depth against future writers.)
3. UTC-pin the projection trigger (the SC-2 question): yes / no. **Blocked on confirming original #159 §6.5 spec text.** If the spec did call for it, this is a fix. If the spec didn't, this is a scope expansion and Gary should explicitly decide.
4. Backfill the 10 pre-SSOT rows: no recommended (already sentinel-tagged pre_ssot_unknown; their dates are best-effort, not authoritative).

**Cross-prompt amendments:**

- If/when #163 ships and writes to date columns on BOS-related tables, it must inherit the UTC-pinning convention. Recommended to add a one-paragraph "TZ convention" note to `docs/architecture/hannah-compute-engine.md` so future prompts pick it up.
- The runbook `docs/runbooks/bos-worker-troubleshooting.md` should be updated to call out the UTC convention (one-line note in the "compute_seq" section).
- Marshall and Hannah agents' system prompts do not need amendment (no date arithmetic in their compute logic).

## 7. Open questions for the user

1. **SC-2 spec confirmation.** What did #159 §6.5 actually say about UTC-pinning the projection trigger's date derivation? The local repo has no copy of the spec. Without confirming the original wording, #161d-fix cannot decide whether the trigger's use of `NEW.date` is a silent divergence or correct as-implemented.
2. **Recommendation 3 scope (UTC-pin the projection trigger).** Even if §6.5 didn't call for it, should #161d-fix also UTC-pin the trigger for symmetry, or is the trigger out of scope for the fix?
3. **Recommendation 4 (backfill the 10 pre-SSOT rows).** Confirm leave as-is. Their date values are already sentinel-tagged pre_ssot_unknown via the breakdown column; rewriting `date` for these rows would be a separate retroactive correction and Gary has not asked for it.
4. **Session timezone audit on production Supabase.** Is the production project nnhkcufyqjojdbvdrpky's default session timezone UTC, or could a future operator setting flip it? If UTC is guaranteed forever, the AT-RISK findings are latent; if not, they are active. Recommend operator-side check via `SHOW timezone` against the prod project, separate from this prompt.

## 8. Investigator notes

- The orchestrator's pre-flight introspection (Track A Step A3) already nailed the compute_seq column location. Codebase Steps A1 and A2 corroborated it from the application side without surprise.
- The single git log search-by-content confirmed compute_seq was introduced in exactly one commit (d990fd6). No prior history, no parallel definition. Clean.
- TZ-8 highlights a subtle correctness gap that I'm classifying OK-UTC for the audit scope but worth noting: `bio-optimization-score.ts:541` returns `date: new Date().toISOString().slice(0, 10)` in the `BOSResult` object. This is the UTC calendar date at function-completion time. The actual DB row's `date` column is set by the RPC's `CURRENT_DATE`. Under non-UTC PG sessions, the two values can disagree: the returned `BOSResult.date` would be the UTC date and the DB row's `date` would be the local date. Any code that uses `BOSResult.date` to look up the row by date would miss it. If #161d-fix UTC-pins the RPC (Recommendation 1), this gap auto-closes because the RPC's `(now() AT TIME ZONE 'utc')::date` matches `new Date().toISOString().slice(0, 10)`.
- The pgTAP fixture `02_rpc_contract.sql:147` also uses `CURRENT_DATE` to read back the inserted row. Under the proposed Recommendation 1 fix, the fixture's read-back stays correct only if the test session timezone matches UTC; if pgTAP runs under a non-UTC session, the fix would break the test. Test should be updated to use `(now() AT TIME ZONE 'utc')::date` to match. Adding this as a follow-up to Recommendation 1.
- The orchestrator's #161d brief flagged "no spec conflict for compute_seq existence itself" under SC-1, which matches what I found. The framing in #161d §1 ("user picked Option 1: Drop the UNIQUE") is stale; the migration's own header (lines 10-15) and the orchestrator's chat-context citation in #161d §0.4 both say Gary chose add-compute_seq. Recommend the #161d-fix prompt drafter clarify this when authoring the next prompt to avoid propagating the stale framing.

## Marshall + permanent-rule audit

- Zero edits to `package.json` (verified by `git status -s`; no `package.json` modification in this branch).
- Zero edits to Supabase email templates (no files under `supabase/templates/` or `supabase.auth.*` touched).
- Zero edits to applied migration files (no file under `supabase/migrations/` touched; this report only reads them).
- Zero edits to any production file (no file under `src/`, `app/`, `lib/`, or `supabase/migrations/` touched; this report only reads them).
- Zero em-dashes (U+2014), en-dashes (U+2013), and emojis in the report.
- Files created by this prompt: this findings report plus the scratch grep outputs (`scratch/161d/grep-codebase.txt`, `scratch/161d/grep-migrations.txt`, `scratch/161d/log-compute-seq.txt`, `scratch/161d/grep-js-dates.txt`, `scratch/161d/grep-sql-dates.txt`). The two pre-existing scratch files (`schema-introspection.sql`, `schema-introspection.out`) authored by the orchestrator are untouched.
