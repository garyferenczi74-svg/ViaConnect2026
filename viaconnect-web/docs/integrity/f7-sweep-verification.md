# F7a Re-verification Sweep: Prompt 210f Section 5 Obligations

Date: 2026-07-08
Sweeper: F7a (read-only on code; read-only SQL via Supabase MCP, project nnhkcufyqjojdbvdrpky)
Scope: (1) Helix consumer-only end-to-end data-layer proof (210f P0-5 obligation plus standing rule); (2) daily_scores canonical-path check (210f Section 5 P0-4 obligation).
Method note: git was out of bounds for this sweep; the 210d/210f change surface was established from prompt-marker comments and direct file inspection, and the database state from live pg_policies, pg_class, pg_tables, and information_schema queries.

Overall: Section 1 PASS. Section 2 PASS. No user data appears in this report.

---

## Section 1: Helix consumer-only, end-to-end data-layer proof

### 1a. RLS policy walk (live pg_policies)

Query: select tablename, policyname, roles, cmd, qual, with_check from pg_policies where schemaname='public' and (tablename like 'helix%' or tablename like 'reward%' or tablename like 'viatokens%').

Result: 23 policies across 17 tables. Zero tables match viatokens% (pg_tables confirms none exist; ViaTokens is implemented as the helix_ table family). RLS is enabled (relrowsecurity = true) on all 17 tables per pg_class.

Reading note: the stored quals carry a degenerate nested "( SELECT ... AS uid)" wrapper around auth.uid() and auth.role() (roughly 15,000 characters per policy), an artifact of the initplan-wrap optimization having been re-applied repeatedly. Flattening the wrapper (it is semantically a single scalar subselect) yields the expressions below. Semantics are unchanged by the wrapper.

Owner-scoped policies (row owner only):

| Table | Policy | cmd | Flattened qual |
|---|---|---|---|
| helix_achievement_unlocks | Consumer only helix_achievement_unlocks | ALL | auth.uid() = user_id |
| helix_balances | Consumer only helix_balances | ALL | auth.uid() = user_id |
| helix_challenge_participants | Consumer only helix_challenge_participants | ALL | auth.uid() = user_id |
| helix_leaderboard | Consumer only helix_leaderboard | ALL | auth.uid() = user_id |
| helix_redemptions | Consumer only helix_redemptions | ALL | auth.uid() = user_id |
| helix_streaks | Consumer only helix_streaks | ALL | auth.uid() = user_id |
| helix_transactions | Consumer only helix_transactions | ALL | auth.uid() = user_id |
| helix_referral_codes | referral_codes_self_read | SELECT | user_id = auth.uid() |
| helix_referrals | Consumer only helix_referrals | ALL | auth.uid() = referrer_id |
| reward_redemptions | Users can view own reward_redemptions | SELECT | auth.uid() = user_id |
| reward_redemptions | Users can insert own reward_redemptions | INSERT | with_check: auth.uid() = user_id |
| reward_redemptions | Users can update own reward_redemptions | UPDATE | auth.uid() = user_id |

Consumer-family scope (family chain, explicitly not a practitioner chain):

| Table | Policy | cmd | Flattened qual |
|---|---|---|---|
| helix_family_pool_config | helix_pool_family_read | SELECT | primary_user_id IN (select primary_user_id from family_members where member_user_id = auth.uid() and is_active = true) |
| helix_family_pool_config | helix_pool_primary_manage | ALL | primary_user_id = auth.uid() |

Catalog and reference tables (product definitions; verified via information_schema that none of these tables has a user_id, patient_id, profile_id, or owner_id column, so they contain no per-user reward data):

| Table | Policy | cmd | Flattened qual |
|---|---|---|---|
| helix_achievements | helix_achievements_select_authenticated | SELECT | true |
| helix_achievements | helix_achievements_service_role_all | ALL | true (service_role) |
| helix_challenges | helix_challenges_select_authenticated | SELECT | true |
| helix_challenges | helix_challenges_service_role_all | ALL | true (service_role) |
| helix_tiers | helix_tiers_select_anon | SELECT | true |
| helix_tiers | helix_tiers_service_role_all | ALL | true (service_role) |
| helix_earning_event_types | earning_events_read_all | SELECT | is_active = true |
| helix_redemption_catalog | redemption_catalog_read_all | SELECT | is_active = true |
| rewards | Authenticated users can view rewards | SELECT | auth.role() = 'authenticated' |

Consent-chain check: an ilike scan of every qual and with_check across all 23 policies for the substrings "practitioner" and "consent" returned false on every row. No policy on any helix%, reward%, or viatokens% table references practitioner_patients, practitioners, patient_practitioner_relationships, or any consent flag. There is no practitioner query path at the RLS layer.

Verdict 1a: PASS. Every user-scoped policy is row-owner scoped (or consumer-family scoped for the family pool); the remaining policies cover catalog tables with no user rows; zero practitioner or consent references anywhere.

### 1b. Practitioner surface grep (helix_/reward_/viatokens; broadened to bare "helix")

- src/app/(app)/practitioner: zero helix_ or viatokens references. reward_ matches only reward_amount_cents at src/app/(app)/practitioner/referrals/credits/credits-dashboard-client.tsx:50 and :152. That is a column of practitioner_referral_milestones (the practitioner referral program's own milestone reward amount), served by src/app/api/practitioner/referrals/credits/route.ts which reads practitioners (line 40), practitioner_referral_credit_balances (49), practitioner_referral_credit_ledger (52), practitioner_referral_milestone_events (57) with a practitioner_referral_milestones join (61). None of these are helix%, reward%, or viatokens% tables. Bare "Helix" appears only in isolation copy: src/app/(app)/practitioner/analytics/cohorts/page.tsx:36 ("individual Helix signals excluded") and src/app/(app)/practitioner/patients/invite/page.tsx:204 ("Helix Rewards balances and transactions are never shared with practitioners").
- src/components/practitioner: zero helix_/reward_/viatokens matches. Bare "Helix" appears only in isolation copy and comments: StandardPatientView.tsx:143, NaturopathicPatientView.tsx:242, analytics/MedicalDisclaimer.tsx:6 (comment noting the Helix-isolation test greps for the disclaimer), analytics/DependencyPendingBanner.tsx:26.
- src/lib/practitioner: zero matches.
- src/lib/practitioner-analytics: matches only in guardrails.ts, which is the enforcement mechanism itself: FORBIDDEN_HELIX_TOKENS (lines 14-27, including 'helix_', 'helix_rewards', 'helix_token') plus the scanning helpers at lines 68, 87, 109. This file exists to ban helix identifiers from practitioner analytics (asserted by tests/practitioner-analytics-guardrails.test.ts).
- src/lib/practitioner-referral: zero "helix" matches. reward_ matches are all the referral program's own milestone reward parameters: vesting-orchestrator.ts:56, 80, 146; fraud-resolution-orchestrator.ts:66, 73; governed-params.ts:11, 36, 48-51, 73-76; schema-types.ts:87 (MILESTONE_REWARD_DEFAULTS_CENTS). All reference practitioner_referral_milestones columns and constants, not consumer reward tables.
- Supplementary: src/app/api/practitioner has zero helix_/viatokens references; its only reward_ matches are the same practitioner_referral_milestones column in referrals/credits/route.ts:61, 80, 85, 90.

Zero live imports, .from() calls, or type usages of helix_*, rewards, reward_redemptions, or viatokens data anywhere in the practitioner surfaces.

Verdict 1b: PASS. The only textual hits are (i) the practitioner referral program's own milestone reward column, which lives in the practitioner domain, and (ii) guardrail constants and UI copy that state or enforce the isolation.

### 1c. Consent flag firewall (F1 comment and the engagement-score policy)

- The consent flag comment is live in supabase/migrations/20260707150000_prompt_210f_practitioner_core_additive.sql:1184-1185: practitioner_patients.consent_share_engagement_score is documented as "Aggregate engagement score (0-100) only. Helix internals (balance, transactions, achievements) are NEVER shared regardless of this flag." (Same wording lineage as 20260418000110_practitioner_patients_extension.sql:42.)
- The policy added by the F1 remediation, engagement_scores_practitioner_read_via_pp_210f (migration lines 1538-1549, confirmed live in pg_policies), is created ON public.engagement_score_snapshots FOR SELECT TO authenticated with qual: EXISTS (select 1 from practitioner_patients pp where pp.patient_id = engagement_score_snapshots.user_id and pp.practitioner_id = auth.uid() and pp.status = 'active' and pp.consent_share_engagement_score = true). It reads engagement_score_snapshots only; it references no helix table and grants nothing on any helix table.
- The pre-existing merged policy engagement_score_snapshots_select_merged (live) likewise gates only engagement_score_snapshots (patient_practitioner_relationships join practitioners consent arm, OR user_id = auth.uid() self arm). No helix reference.
- Cross-check from 1a: no helix policy contains a consent reference, so the consent flag cannot unlock any helix table from either direction.
- The practitioner consumer of the flag, src/app/api/practitioner/patients/[patientId]/engagement-score/route.ts, reads practitioners (line 48), practitioner_patients (67), and engagement_score_snapshots (85) only, and denies when consent_share_engagement_score is false (line 79).

Verdict 1c: PASS. The engagement-score path exposes engagement_score_snapshots aggregates only; helix internals are unreachable regardless of the consent flag.

Section 1 verdict: PASS on all three items.

---

## Section 2: daily_scores canonical-path check

### 2a. Writer and reader chains

Writer (single path): src/app/actions/dailyScores.ts.
- updateGaugeScores reads the existing daily_scores row (lines 74-83), merges gauge updates, derives overall_score as the mean of present pillar values (lines 94-104), builds the payload via buildDailyScoresUpsertPayload (lines 44-58; async but performs no I/O; keys and values documented as identical to the previous inline construction, lines 18-26), and upserts to daily_scores with onConflict 'user_id,score_date' (lines 108-115). Upsert errors are now surfaced through reportSupabaseError (P0-1 classifier) at lines 122-124 and 128.
- recalculateNutritionOnly (142), recalculateCheckInOnly (195), and recalculateDailyScores (239) all compute via calculateDailyScores from src/lib/scoring/dailyScoreEngineV2 (imports, lines 7-11) and funnel every write through updateGaugeScores. No other module writes daily_scores.

Readers (canonical paths per the 210e map):
- Current score: /api/bos/current (src/app/api/bos/current/route.ts:77-84) selects the latest bio_optimization_history row ordered by date desc, compute_seq desc, RLS-scoped to the authenticated caller.
- History/trend: useBioOptimizationTrend (src/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/hooks/useBioOptimizationTrend.ts) reads health_scores (lines 41-46) and daily_scores via the centralized DAILY_SCORES_COLUMNS constant (lines 14-15 and 47-52), with select errors surfaced via reportSupabaseError (lines 61-63).
- Today's pillar display: src/hooks/journey/useDailyScores.ts recomputes today's pillars from daily_checkins, meal_logs, and profiles through the same calculateDailyScores engine (header lines 6-10 declare the single-source-of-truth contract; Prompt 208j, predates 210d). It writes nothing.
- Journey graph: src/components/journey/coaching/useJourneyGraphSeries.ts reads daily_checkins (line 633), meal_logs (643), and bio_optimization_history (652), importing calculateDailyScores/mapCheckInToScoringInput from dailyScoreEngineV2 (lines 70-76). It writes nothing.

Named chain: gauge mutation -> src/app/actions/dailyScores.ts updateGaugeScores -> daily_scores upsert (user_id, score_date); current score <- /api/bos/current <- bio_optimization_history; trend history <- useBioOptimizationTrend <- daily_scores (plus health_scores). Verdict 2a: PASS.

### 2b. Same table, no new score source

- The P0-4 upsert targets daily_scores keyed on (user_id, score_date), exactly the table and key the canonical history reader selects (useBioOptimizationTrend filters eq user_id, gte/order score_date). DAILY_SCORES_COLUMNS (overall_score, sleep_score, nutrition_score, activity_score, mood_stress_score, energy_score, score_date) matches the upsert payload pillar keys. Both sides are pinned to the live schema by src/app/actions/__tests__/daily-scores-shape.test.ts, which the P0-4 comments in both files cite.
- 210d wave survey: 23 files in src carry Prompt 210d markers (genex upload and genemetrics payload shapes, gamification reward-redemption payload shape, genetic import payloads, compliance kelsey rows, stripe webhook shapes, timezone, profile save payload, useTodaysAdherence, daily-scores shape test, useBioOptimizationTrend, dailyScores.ts, audit-log shape test, schema-drift classifier and tests). None defines a score computation; they are payload extractions, shape tests, and the P0-1 drift classifier. buildDailyScoresUpsertPayload is a no-compute, no-I/O extraction.
- 210f wave survey: 9 files in src carry 210f markers (waitlist unsubscribe route/token plus migration shape tests). None computes scores.
- Score computation remains solely in src/lib/scoring (dailyScoreEngineV2 for the pillar gauges; bio-optimization-score and the /api/bos/worker path for BOS; the legacy dailyScoreEngine.ts and unified/ engines predate the wave and were not touched by it). No parallel score source was introduced.

Verdict 2b: PASS.

### 2c. SQL sanity count

select count(*) from daily_scores where score_date is not null returned 1. Observational only; consistent with post-apply writes existing (score_date is half of the upsert conflict key, so every written row carries it).

Verdict 2c: PASS (observational).

Section 2 verdict: PASS on all three items.

---

## Observational notes (no action taken; outside sweep scope)

1. Nested initplan artifact: the live quals of the helix/reward policies and the merged engagement policy are wrapped in roughly 15,000-character nested "( SELECT ... AS uid)" chains around auth.uid()/auth.role(), the fingerprint of the initplan-wrap optimization having been re-applied many times. Semantics are unaffected; flagged as a candidate for a future policy-text normalization pass.
2. practitioner_referral_* tables absent: information_schema.tables lists no practitioner_referral% objects in the live public schema, yet src/app/api/practitioner/referrals/credits/route.ts and src/lib/practitioner-referral/* query practitioner_referral_credit_balances, practitioner_referral_credit_ledger, practitioner_referral_milestone_events, and practitioner_referral_milestones. Those runtime reads would fail until the owning migration lands. Unrelated to Helix isolation (practitioner-domain tables); flagged for the referral workstream.
