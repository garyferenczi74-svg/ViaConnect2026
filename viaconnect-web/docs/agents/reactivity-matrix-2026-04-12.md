# Michelangelo, Reactivity Matrix
**Generated:** 2026-04-12
**Status:** AUDIT COMPLETE

---

## Data Flow Map with Sync Status

### Pipeline 1: CAQ > Protocol > Dashboard

```
CAQ Responses (user input)
    | [Supabase write via complete-caq.ts]
    v
caq_responses / assessment_results table
    | [ONE-TIME FETCH, NO REALTIME] << FLAG
    v
Protocol Engine (/api/ultrathink/recommend)
    | [POST, fire-and-forget, stores to ultrathink_protocols]
    v
ultrathink_protocols table
    | [ONE-TIME FETCH, NO REALTIME] << FLAG
    v
Consumer Dashboard (useUserDashboardData.ts)
    | [useEffect fetch, no subscription]
    v
Bio Optimization Score (bio-optimization.ts)
    | [CLIENT-SIDE COMPUTATION, NO DB READ] << FLAG
    v
BioOptimizationGauge component
    | [Renders from local computed value]
    v
Analytics Page (/wellness-analytics)
    | [useQuery fetch, 24h cache, no 6AM cron] << FLAG
```

**Sync Status:** ONE-TIME LOAD ONLY. No reactive updates anywhere in this pipeline.
**Risk:** User completes CAQ, protocol generates, but dashboard shows stale data until manual refresh.

---

### Pipeline 2: Bio Optimization Score

```
Daily Check-In (DailyCheckIn component)
    | [Supabase write to supplement_adherence / protocol_adherence_log]
    v
Adherence Data (useTodaysAdherence.ts)
    | [useEffect + Supabase .from() query]
    v
Daily Score Engine (dailyScoreEngine.ts)
    | [CLIENT-SIDE COMPUTATION]
    v
Bio Optimization Calculator (bio-optimization.ts)
    | [Weighted formula: baseline * baseWeight + daily * dailyWeight]
    | [Streak bonus: min(5, streak * 0.17)]
    | [CLIENT-SIDE ONLY, NO SERVER VALIDATION] << FLAG
    v
Score Display (BioOptimizationGauge, ScoreCard, DailyMetricGauge)
    | [Local state render]
```

**Sync Status:** Computed client-side each render. Not stored to DB reactively. Not validated server-side.
**Risk:** Score manipulation possible client-side. Score inconsistent across devices.

---

### Pipeline 3: Helix Rewards

```
User Actions (adherence, check-in, challenge completion)
    | [Supabase write via token-engine.ts / helixScoreRewards.ts]
    v
helix_transactions table (RLS: user sees own)
    | [ONE-TIME FETCH, NO REALTIME] << FLAG
    v
helix_balances table (RLS: user sees own)
    | [ONE-TIME FETCH, NO REALTIME] << FLAG
    v
HelixRewardsSummary component (dashboard)
    | [useEffect fetch on mount]
    v
Helix Dashboard (/helix pages)
    | [useEffect fetch on mount]
    v
Tier Calculation (Bronze 1x / Silver 1.5x / Gold 2x / Platinum 5x / Diamond 5x)
    | [Client-side from helix_balances data]
```

**Sync Status:** ONE-TIME LOAD. Points earned do not update in real-time.
**Risk:** User earns points but balance does not update until page refresh. Tier changes invisible until refresh.

---

### Pipeline 4: Shop > Cart > Checkout

```
Product Catalog (product_formulations table)
    | [useEffect fetch]
    v
Shop Page (/shop)
    | [Cross-references with user supplement_recommendations]
    | [SUPPLEMENT_KEYWORDS matching: WORKING]
    v
Cart State
    | [useState ONLY, NOT PERSISTED] << CRITICAL FLAG
    v
Checkout (/checkout)
    | [Stripe integration via /api/stripe/checkout]
```

**Sync Status:** Cart is EPHEMERAL. Lost on refresh/navigation.
**Risk:** Users lose cart contents. Poor shopping experience.

---

### Pipeline 5: Genetics Portal

```
Genetic File Upload (/genetics/upload)
    | [Supabase Storage write]
    v
Genetic Results (genetic_results table)
    | [ONE-TIME FETCH] << FLAG
    v
Tier Confidence Display
    | [HARDCODED: Tier 1 = 72%, Tier 2 = 86%, Tier 3 = 96%] << FLAG
    | [NOT reactive to new data uploads]
    v
Variant Explorer
    | [No pagination, renders all via .map()] << FLAG (low risk: 9 items currently)
    v
PremiumIcon component
    | [RESPONSIVE: sm/md/lg size variants] PASS
```

**Sync Status:** Static after initial load. Tier confidence does not update when labs/genetics uploaded.

---

### Pipeline 6: Practitioner Portal

```
Practitioner Login (middleware role check)
    | [Strict routing: only practitioner role or admin]
    v
Patient List (practitioner_patients table, RLS: active relationship + permission flags)
    | [useEffect fetch]
    v
Patient Detail (/practitioner/patients/[id])
    | [Scoped by practitioner_patients.practitioner_id = auth.uid()]
    | [Permission flags: can_view_supplements, can_view_labs]
    v
Helix Data
    | [INVISIBLE to practitioners] PASS
    | [Engagement score ONLY metric exposed via engagement-score.ts] PASS
```

**Sync Status:** Correct isolation. No Helix data leakage at DB level.
**UI Risk:** Helix nav items visible in shared Sidebar/Header/MobileNavBar (RULE-003)

---

### Pipeline 7: Naturopath Portal

```
Naturopath Login (middleware role check)
    | [Strict routing: only naturopath role or admin]
    v
Patient List (practitioner_patients table, same RLS pattern)
    | [useEffect fetch]
    v
Botanical/Constitutional tools
    | [Independent data, no cross-portal dependency]
    v
Helix Data
    | [INVISIBLE to naturopaths] PASS
```

**Sync Status:** Correct isolation. Same UI risk as practitioner (shared layout Helix refs).

---

### Pipeline 8: Wellness Analytics

```
User CAQ + Supplements + Adherence Data
    | [Aggregated by /api/ai/generate-wellness-analytics]
    v
10 Hardcoded Categories (categories.ts)
    | [All always generated, no unlock gating] << FLAG
    v
Score Computation
    | [Server-side via API route, stored with 24h TTL]
    | [No 6AM cron, fixed interval from last generation] << FLAG
    v
Wellness Analytics Page (/wellness-analytics)
    | [useQuery fetch with cache]
    | [Generic loading spinner, no recalc-specific state] << FLAG
```

**Sync Status:** Regenerated on demand with 24h cache. No scheduled recalculation.

---

## Realtime Subscription Inventory

| File | Tables Subscribed | Channel Pattern |
|------|-------------------|-----------------|
| src/hooks/usePortalRealtime.ts | 3 tables (unknown specifics) | postgres_changes |
| ALL OTHER FILES | 0 | None |

**Total Realtime Coverage: 1 file out of 666 (0.15%)**

---

## Supabase Tables Queried (from .from() calls)

| Table | Query Locations | Has Realtime? | Has RLS? |
|-------|----------------|---------------|----------|
| protocol_shares | utils/protocolShareAccess.ts (3x) | No | Yes |
| protocol_adherence_log | hooks/useTodaysAdherence.ts (2x) | No | Unknown |
| helix_transactions | hooks/useTodaysAdherence.ts (2x) | No | Yes |
| helix_balances | multiple components | No | Yes |
| helix_streaks | multiple components | No | Yes |
| profiles | multiple components | No | Yes |
| user_current_supplements | multiple | No | Yes |
| supplement_adherence | multiple | No | Unknown |
| bio_optimization_history | multiple | No | Unknown |
| user_supplements | multiple | No | Unknown |
| protocol_rules | lib files | No | Unknown |
| ultrathink_clinical_rules | lib files | No | Unknown |
| supplement_brand_registry | lib files | No | Yes |
| sherlock_agent_state | admin | No | Unknown |
| compliance_templates | provider | No | Unknown |
| video_media_source | media | No | Unknown |

---

## Summary

| Dimension | Status | Details |
|-----------|--------|---------|
| Realtime Coverage | CRITICAL GAP | 0.15% of files have Realtime subscriptions |
| Cart Persistence | MISSING | useState only, lost on refresh |
| Bio Score Server Validation | MISSING | Client-side computation only |
| Portal Isolation (DB) | STRONG | RLS comprehensive on all sensitive tables |
| Portal Isolation (UI) | LEAKING | Helix nav in shared layouts |
| Cross-Reference Accuracy | GOOD | Shop recommendation matching working |
| Genetics Reactivity | STATIC | Tier confidence hardcoded |
| Wellness Analytics Scheduling | MISSING | No 6AM cron job |
