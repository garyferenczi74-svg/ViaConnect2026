# P0-8: ViaTokens vs Helix Decision Package (Prompt 210d)

Date: 2026-07-07. Branch: feat/210d-schema-integrity. Investigation only; no code change in this task.
Sources: repo code as of this worktree, docs/integrity/snapshot/live-types.ts (2026-07-06 live snapshot), supabase/migrations/20260326_gamification_engine.sql, docs/integrity/p1-decision-sheet.md (cluster 7).

## Evidence summary

### 1. Every caller chain into the ViaTokens engine is dead

- awardTokens (src/lib/gamification/token-engine.ts:265) has exactly one importer: src/lib/api/notification-service.ts:6, called inside triggerGamification (notification-service.ts:198).
- notification-service.ts itself has ZERO importers. Repo-wide search over src/, supabase/functions/, and scripts/ finds no import of notification-service, triggerGamification, sendPushNotification, or refreshWidgetCache. The chain dead-ends one hop above the engine and never reaches a page, route, or component.
- redeemTokens (token-engine.ts:415) has ZERO importers anywhere. Dead on arrival; its reward_store_items lookup (token-engine.ts:422) and reward_redemptions insert (token-engine.ts:499) can never execute.
- achievement-engine.ts has no static importers; it is loaded only via dynamic import from token-engine.ts:387 and :395, inside the same dead chain.
- rpc increment_token_balance is called at token-engine.ts:351 (with a manual upsert fallback at :356) and achievement-engine.ts:603 (no fallback). It does not exist live and NO repo migration defines it (repo-wide grep: zero CREATE FUNCTION hits).
- Near-miss checked: src/lib/api/stripe-service.ts:220 sets gamificationTrigger: true on invoice.payment_succeeded but calls nothing, and stripe-service.ts also has no importers.

Conclusion: NO reachable user flow triggers a ViaTokens write today. viatokens_ledger, viatokens_balance, and increment_token_balance are referenced only from unreachable modules.

### 2. Helix already credits the overlapping user actions, live and nav-reachable

Because no ViaTokens trigger point is live, duplication is assessed at the action level against EARN_RULES (token-engine.ts:43):

- supplement_checkin / full_day_compliance: LIVE on Helix. src/hooks/useTodaysAdherence.ts:128 inserts helix_transactions source protocol_adherence per check-in and :140 source protocol_adherence_full_day for the 100 percent day. Mounted via TodaysProtocol.tsx:71 on the consumer dashboard (src/app/(app)/(consumer)/dashboard/page.tsx:279). Activating ViaTokens would double-credit the flagship adherence action.
- food_log: LIVE on Helix. src/lib/nutrition/helix-bridge.ts:158 (NutriVision) and :334 (barcode) insert helix_transactions from the meal routes; hydration quick-log calls creditEarning at src/app/api/nutrition/hydration/quick-log/route.ts:407 and :430.
- supplement_purchased / supplement_reorder / subscription_active: LIVE on Helix. src/lib/shop/checkout-helpers.ts:438 routes purchase earns through creditEarning (src/lib/helix/earning-engine.ts:71, which writes helix_transactions and rpc helix_increment_balance); refunds reverse via src/lib/shop/helix-reversal.ts.
- referral_signup / referral_activated: LIVE on Helix. src/lib/helix/referrals.ts:136 routes through creditEarning.
- redemption: LIVE on Helix. Sidebar.tsx:91 and MobileNavBar.tsx:26 link /helix; the helix layout Redeem tab (src/app/(app)/(consumer)/helix/layout.tsx:21) opens /helix/redeem, which POSTs /api/helix/redeem (route.ts:49) into redeemCatalogItem (src/lib/helix/redemption-engine.ts:93, rpc helix_redeem_catalog_item).
- Gap (EARN_RULES actions with no Helix credit found in src): daily_login, ai_conversation, lab_upload, panel_completion, all_panels_complete, genetic_data_import, weekly_briefing_listened, wearable_connected, app_connected, achievement_shared, challenge_completed. These are candidates for new helix_earning_event_types rows later, not a reason to activate a second economy.

### 3. What 20260326_gamification_engine.sql would create

- 15 tables: viatokens_ledger, viatokens_balance, achievements, user_achievements, compliance_streaks, health_levels, user_health_levels, challenges, user_challenges, reward_store_items, reward_redemptions, referrals, peer_benchmarks, genetic_cohorts, user_cohort_memberships. Plus 7 indexes, RLS enabled with about 30 policies, and 5 seed blocks (7 health levels, 25 achievements, 15 reward store items, 5 genetic cohorts, 3 challenges hard-dated to March 2026, already expired).
- Defines viatokens_balance: YES (line 31). Defines increment_token_balance: NO. There is no CREATE FUNCTION in the file, so the rpc both engines call stays missing even after apply (achievement-engine.ts:603 has no fallback; achievement token balances would never update).
- Not purely additive in effect: reward_redemptions ALREADY EXISTS live with a different shape (live-types.ts:24440: reward_id, claimed_at, fulfillment_date, FK to rewards). The migration CREATE TABLE IF NOT EXISTS (line 171) silently no-ops, so the item_id/created_at/reward_code/expires_at shape the code expects is never delivered, and the two unguarded CREATE POLICY statements on reward_redemptions (lines 383-389) either abort the migration on name collision or attach policies to the differently shaped live table. Seed rows also carry emoji icon glyphs, against repo convention.
- Decisive: even fully applied, the engine code still fails because code and migration were written against different schema generations: (a) viatokens_ledger requires balance_after and transaction_type NOT NULL (lines 17-18) and names the column multiplier (line 22), but token-engine.ts:336 inserts neither required column and writes multiplier_applied; (b) compliance_streaks defines current_multiplier (line 86) while getStreakMultiplier selects multiplier and THROWS on error (token-engine.ts:252, :256), so every awardTokens call hard-fails before any insert; (c) user_health_levels defines current_level/current_xp (lines 109-110) while awardXP reads and upserts level, level_name, total_xp (achievement-engine.ts:632, :649); (d) the achievements seed ids (compliance_first_checkin, line 440) do not match the code catalog ids (first_checkin, achievement-engine.ts:51), so the user_achievements FK rejects every unlock. Option A therefore requires a code rewrite anyway.

### 4. reward_redemptions and redemption UI reachability

- Live columns: id, user_id, reward_id, tokens_spent, status, claimed_at, fulfillment_date (live-types.ts:24440-24484). Code writes item_id and created_at (token-engine.ts:503, :506); task P0-5 fixes the key pair item_id to reward_id and created_at to claimed_at.
- The ONLY writer of reward_redemptions in src is redeemTokens (token-engine.ts:500), which is unreachable. No ViaTokens redemption UI exists anywhere in src. The only nav-reachable redemption UI today is the Helix one (/helix/redeem, section 2), and it never touches reward_redemptions. So the P0-5 key fix future-proofs a currently unreachable write path; no user can hit it from nav today.

## OPTION A: Apply the gamification tranche (activate the parallel ViaTokens economy)

Apply 20260326_gamification_engine.sql. Creates 14 new tables plus seeds beside the live helix_* economy. Does NOT create increment_token_balance (no definition exists in the repo), collides with the live reward_redemptions, and per section 3 the engine code still fails on four column and catalog mismatches, so activation additionally requires rewriting token-engine.ts, achievement-engine.ts, and wiring notification-service.ts into real routes. Net effect: a second, conflicting rewards catalog, double-credit risk on adherence and purchases, and expired seed challenges, for a lane no surface calls.

## OPTION B: Retire the ViaTokens call sites in favor of Helix

Remove or archive src/lib/gamification/token-engine.ts, src/lib/gamification/achievement-engine.ts, and src/lib/api/notification-service.ts (the entire dead chain), keeping Helix as the single economy. Any wanted EARN_RULES actions from the section 2 gap list get ported later as helix_earning_event_types rows plus creditEarning call sites under the existing withTimeout/safeLog conventions. Zero user-visible change because the chain is already unreachable. CODE REMOVAL: prohibited without Gary's explicit approval under the no-removal rule; this option only proceeds on his signature below. P0-5's reward_redemptions key fix stands either way (the live table serves the rewards system, not ViaTokens).

## OPTION C: Leave failing but drift-tagged (no data-model change)

Keep the modules as-is. The P0-1 classifier (src/lib/utils/schema-drift.ts) reason-tags any Supabase miss, so if anything ever invokes the chain, the failure is visible in logs rather than silent. Zero risk and zero effort, but the repo permanently carries a misleading parallel economy that future prompts may wire up by accident (notification-service.triggerGamification looks importable and correct).

## Recommendation: OPTION B, with OPTION C as the standing interim until approval

Helix already carries every flagship earning action live (adherence, meals, purchases, referrals, redemption), while the ViaTokens lane is unreachable AND unactivatable, since its own migration lacks the rpc and contradicts the engine code in four places. Removing the three dead modules eliminates the only path by which a future prompt could accidentally resurrect a double-credit parallel economy, at zero user-visible cost; until Gary signs, Option C already holds by default via the P0-1 drift tags.

This matches the P1 decision sheet, cluster 7 (RETIRE CODE).

## Sign-off

Gary decision (circle one): OPTION A / OPTION B / OPTION C    Signature: ____________    Date: ________
If OPTION B: this signature is the explicit no-removal-rule approval to delete token-engine.ts, achievement-engine.ts, and notification-service.ts.
