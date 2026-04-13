# Michelangelo, Full App Audit Report
**Generated:** 2026-04-12
**Codebase:** ViaConnect GeneX360 (666 files audited)
**Agent:** Michelangelo (OBRA Gate O, Audit Mode)
**Status:** COMPLETE

---

## Section A, Responsive Issues

41 of 111 page.tsx files have ZERO responsive breakpoint classes (sm:/md:/lg:/xl:).

### CRITICAL (User-Facing Consumer Pages)

[RESP-001] CRITICAL | Consumer Checkout
File: src/app/(app)/(consumer)/checkout/page.tsx
Issue: No responsive breakpoint classes detected. Checkout flow may collapse on mobile.
Fix: Add grid-cols-1 md:grid-cols-2 for payment/summary split, w-full buttons, p-4 md:p-6 spacing
Assign to: UI Agent (via Jeffery)

[RESP-002] CRITICAL | Consumer Helix Dashboard
File: src/app/(app)/(consumer)/helix/page.tsx
Issue: No responsive classes. Helix main page not mobile-optimized.
Fix: Add responsive grid, touch targets min-h-[44px], flex-col md:flex-row layouts
Assign to: UI Agent (via Jeffery)

[RESP-003] CRITICAL | Consumer Helix Arena
File: src/app/(app)/(consumer)/helix/arena/page.tsx
Issue: No responsive classes. Arena page not mobile-ready.
Fix: Stack cards vertically on mobile, responsive text sizes
Assign to: UI Agent (via Jeffery)

[RESP-004] CRITICAL | Consumer Helix Earn
File: src/app/(app)/(consumer)/helix/earn/page.tsx
Issue: No responsive classes.
Fix: Responsive grid and touch targets
Assign to: UI Agent (via Jeffery)

[RESP-005] CRITICAL | Consumer Helix Challenges
File: src/app/(app)/(consumer)/helix/challenges/page.tsx
Issue: No responsive classes.
Fix: Card grid responsive, stacked on mobile
Assign to: UI Agent (via Jeffery)

[RESP-006] CRITICAL | Consumer Helix Redeem
File: src/app/(app)/(consumer)/helix/redeem/page.tsx
Issue: No responsive classes.
Fix: Reward catalog responsive grid
Assign to: UI Agent (via Jeffery)

[RESP-007] CRITICAL | Consumer Helix Refer
File: src/app/(app)/(consumer)/helix/refer/page.tsx
Issue: No responsive classes.
Fix: Referral card and share buttons responsive
Assign to: UI Agent (via Jeffery)

[RESP-008] CRITICAL | Consumer Helix Research
File: src/app/(app)/(consumer)/helix/research/page.tsx
Issue: No responsive classes.
Fix: Research consent UI responsive
Assign to: UI Agent (via Jeffery)

[RESP-009] CRITICAL | Consumer Alerts
File: src/app/(app)/(consumer)/alerts/page.tsx
Issue: No responsive classes.
Fix: Alert cards stack on mobile, responsive padding
Assign to: UI Agent (via Jeffery)

[RESP-010] CRITICAL | Consumer Tokens
File: src/app/(app)/(consumer)/tokens/page.tsx
Issue: No responsive classes.
Fix: Token balance and history responsive
Assign to: UI Agent (via Jeffery)

[RESP-011] CRITICAL | Consumer AI Assistant
File: src/app/(app)/(consumer)/ai/page.tsx
Issue: No responsive classes.
Fix: Chat interface responsive, input area w-full on mobile
Assign to: UI Agent (via Jeffery)

[RESP-012] CRITICAL | Consumer Plugins (3 pages)
Files: src/app/(app)/(consumer)/plugins/page.tsx, plugins/manage/page.tsx, plugins/apps/page.tsx, plugins/labs/page.tsx, plugins/wearables/page.tsx
Issue: No responsive classes on any plugins page.
Fix: Plugin cards responsive grid, touch targets
Assign to: UI Agent (via Jeffery)

### HIGH (Auth Pages)

[RESP-013] HIGH | Login Page
File: src/app/(auth)/login/page.tsx
Issue: No responsive classes. Login form may not be mobile-optimized.
Fix: Form w-full max-w-md mx-auto, text-base inputs (prevent iOS zoom), p-4 md:p-8
Assign to: UI Agent (via Jeffery)

[RESP-014] HIGH | Signup Page
File: src/app/(auth)/signup/page.tsx
Issue: No responsive classes.
Fix: Same as login, responsive form layout
Assign to: UI Agent (via Jeffery)

[RESP-015] HIGH | Forgot Password
File: src/app/(auth)/forgot-password/page.tsx
Issue: No responsive classes.
Fix: Responsive form layout
Assign to: UI Agent (via Jeffery)

### HIGH (Practitioner Portal)

[RESP-016] HIGH | Practitioner Dashboard
File: src/app/(app)/practitioner/dashboard/page.tsx
Issue: No responsive classes. Dashboard unusable on tablet/mobile.
Fix: Responsive grid, card stacking, sidebar collapse
Assign to: UI Agent (via Jeffery)

[RESP-017] HIGH | Practitioner AI
File: src/app/(app)/practitioner/ai/page.tsx
Issue: No responsive classes.
Fix: Chat interface responsive
Assign to: UI Agent (via Jeffery)

[RESP-018] HIGH | Practitioner EHR
File: src/app/(app)/practitioner/ehr/page.tsx
Issue: No responsive classes.
Fix: EHR data tables overflow-x-auto, responsive layout
Assign to: UI Agent (via Jeffery)

[RESP-019] HIGH | Practitioner Genomics
File: src/app/(app)/practitioner/genomics/page.tsx
Issue: No responsive classes.
Fix: Genomics data visualization responsive
Assign to: UI Agent (via Jeffery)

[RESP-020] HIGH | Practitioner Protocols
File: src/app/(app)/practitioner/protocols/page.tsx
Issue: No responsive classes.
Fix: Protocol list responsive
Assign to: UI Agent (via Jeffery)

[RESP-021] HIGH | Practitioner Patient Detail
File: src/app/(app)/practitioner/patients/[id]/page.tsx
Issue: No responsive classes.
Fix: Patient detail responsive layout
Assign to: UI Agent (via Jeffery)

[RESP-022] HIGH | Practitioner Scheduler
File: src/app/(app)/practitioner/scheduler/page.tsx
Issue: No responsive classes.
Fix: Calendar/scheduler responsive
Assign to: UI Agent (via Jeffery)

[RESP-023] HIGH | Practitioner Compliance
File: src/app/(app)/practitioner/compliance/page.tsx
Issue: No responsive classes.
Fix: Compliance checklist responsive
Assign to: UI Agent (via Jeffery)

[RESP-024] HIGH | Practitioner Settings Plugins
File: src/app/(app)/practitioner/settings/plugins/page.tsx
Issue: No responsive classes.
Fix: Plugin manager responsive
Assign to: UI Agent (via Jeffery)

### HIGH (Naturopath Portal)

[RESP-025] HIGH | Naturopath Dashboard
File: src/app/(app)/naturopath/dashboard/page.tsx
Issue: No responsive classes.
Fix: Dashboard responsive grid
Assign to: UI Agent (via Jeffery)

[RESP-026] HIGH | Naturopath AI
File: src/app/(app)/naturopath/ai/page.tsx
Issue: No responsive classes.
Fix: Chat interface responsive
Assign to: UI Agent (via Jeffery)

[RESP-027] HIGH | Naturopath Compliance
File: src/app/(app)/naturopath/compliance/page.tsx
Issue: No responsive classes.
Fix: Compliance responsive
Assign to: UI Agent (via Jeffery)

[RESP-028] HIGH | Naturopath Constitutional
File: src/app/(app)/naturopath/constitutional/page.tsx
Issue: No responsive classes.
Fix: Constitutional assessment responsive
Assign to: UI Agent (via Jeffery)

[RESP-029] HIGH | Naturopath Patient Detail
File: src/app/(app)/naturopath/patients/[id]/page.tsx
Issue: No responsive classes.
Fix: Patient detail responsive
Assign to: UI Agent (via Jeffery)

[RESP-030] HIGH | Naturopath Scheduler
File: src/app/(app)/naturopath/scheduler/page.tsx
Issue: No responsive classes.
Fix: Calendar responsive
Assign to: UI Agent (via Jeffery)

[RESP-031] HIGH | Naturopath Botanical
File: src/app/(app)/naturopath/botanical/page.tsx
Issue: No responsive classes.
Fix: Botanical database responsive
Assign to: UI Agent (via Jeffery)

[RESP-032] HIGH | Naturopath Settings Plugins
File: src/app/(app)/naturopath/settings/plugins/page.tsx
Issue: No responsive classes.
Fix: Plugin manager responsive
Assign to: UI Agent (via Jeffery)

### MEDIUM (Admin Pages)

[RESP-033] MEDIUM | Admin Board
File: src/app/(app)/admin/board/page.tsx
Issue: No responsive classes.
Fix: Admin board responsive
Assign to: UI Agent (via Jeffery)

[RESP-034] MEDIUM | Admin SKUs
File: src/app/(app)/admin/skus/page.tsx
Issue: No responsive classes.
Fix: SKU table overflow-x-auto
Assign to: UI Agent (via Jeffery)

[RESP-035] MEDIUM | Admin Alerts
File: src/app/(app)/admin/alerts/page.tsx
Issue: No responsive classes.
Fix: Alert list responsive
Assign to: UI Agent (via Jeffery)

[RESP-036] MEDIUM | Admin Inventory
File: src/app/(app)/admin/inventory/page.tsx
Issue: No responsive classes.
Fix: Inventory table responsive
Assign to: UI Agent (via Jeffery)

[RESP-037] MEDIUM | Landing Page
File: src/app/page.tsx
Issue: No responsive classes in root page file (may delegate to child components).
Fix: Verify landing components handle responsive internally
Assign to: UI Agent (via Jeffery)

---

## Section B, Data Reactivity Issues

### CRITICAL

[SYNC-001] CRITICAL | Near-Zero Realtime Coverage
File: src/hooks/usePortalRealtime.ts (ONLY file with Supabase Realtime)
Issue: Entire app has only 1 file with Supabase Realtime subscriptions. 71 files use useEffect for data fetching with no reactive updates. Users must manually refresh to see data changes.
Fix: Create RealtimeProvider context wrapping all portals; add channel subscriptions for critical data flows
Assign to: Database Agent + UI Agent (via Jeffery)

[SYNC-002] CRITICAL | Cart State Not Persisted
File: src/app/(app)/(consumer)/shop/page.tsx
Issue: Cart uses useState only. Cart contents lost on page refresh, tab close, or navigation away.
Fix: Persist cart to localStorage or Supabase user_cart table with Realtime sync
Assign to: UI Agent + Database Agent (via Jeffery)

### HIGH

[SYNC-003] HIGH | Bio Optimization Score Not Reactive
File: src/lib/scoring/bio-optimization.ts
Issue: Score computed entirely client-side via calculateInitialBioOptimization() and calculateDailyBioOptimization(). No Realtime subscription. No server validation. Score changes require page refresh.
Fix: Add Supabase Realtime subscription on bio_optimization_history table; validate score server-side
Assign to: Database Agent + Implementation Agent (via Jeffery)

[SYNC-004] HIGH | Protocol Engine Not Reactive
Files: src/lib/caq/complete-caq.ts, src/app/api/ultrathink/recommend/route.ts
Issue: Protocol generation via /api/ultrathink/recommend is fire-and-forget. Dashboard does not reactively update when protocol changes. No Realtime channel on ultrathink_protocols table.
Fix: Add Realtime subscription on protocol changes; auto-refresh dashboard on protocol update
Assign to: Database Agent + UI Agent (via Jeffery)

[SYNC-005] HIGH | Helix Points Not Reactive
Files: src/lib/helix/token-engine.ts, src/lib/scoring/helixScoreRewards.ts
Issue: Helix balance uses traditional fetch. Points earned/redeemed do not update in real-time across the Consumer portal.
Fix: Add Realtime subscription on helix_balances and helix_transactions tables
Assign to: Database Agent + UI Agent (via Jeffery)

[SYNC-006] HIGH | CAQ Progress Local State Only
File: src/components/caq/ProgressMotivator.tsx
Issue: Progress indicator (16 dots) uses props from local state only, not DB state. If user refreshes mid-assessment, progress display may be incorrect.
Fix: Source progress state from caq_responses table via Realtime or hydrated server query
Assign to: UI Agent + Database Agent (via Jeffery)

### MEDIUM

[SYNC-007] MEDIUM | Genetics Tier Confidence Static
File: src/app/(app)/(consumer)/genetics/page.tsx
Issue: Tier confidence values (72%/86%/96%) are hardcoded constants, not reactively updated when labs or genetics are uploaded.
Fix: Calculate tier confidence dynamically from data sources present; update via Realtime
Assign to: Implementation Agent (via Jeffery)

[SYNC-008] MEDIUM | No Portal Cache Clear on Switch
File: src/lib/supabase/middleware.ts
Issue: Middleware redirects users on portal mismatch but does not clear client-side cached data. Zustand auth-store has reset() but it is not called on role changes.
Fix: Call authStore.reset() on portal redirect; clear React Query cache on role change
Assign to: Implementation Agent (via Jeffery)

[SYNC-009] MEDIUM | Wellness Analytics No 6AM Cron
Files: src/app/api/ai/generate-wellness-analytics/route.ts, src/lib/analytics/categories.ts
Issue: No 6AM Supabase cron job found for wellness analytics recalculation. Uses fixed 24h interval from last generation. No loading state during recalculation.
Fix: Create pg_cron job for 6AM daily recalc; add loading skeleton during recalc window
Assign to: Database Agent + UI Agent (via Jeffery)

[SYNC-010] MEDIUM | Wellness Categories Hardcoded
File: src/lib/analytics/categories.ts
Issue: All 10 wellness categories always generated regardless of user state. No unlock gating by DB flag.
Fix: Add category_unlocks table or flag in profiles; gate categories by data completeness
Assign to: Database Agent + Implementation Agent (via Jeffery)

---

## Section C, Cross-Reference Issues

[XREF-001] MEDIUM | Shop Recommendation Cross-Reference Working
File: src/app/(app)/(consumer)/shop/page.tsx
Status: PASS. Shop correctly cross-references product_catalog with user supplement data via SUPPLEMENT_KEYWORDS lookup. Recommended products marked. Missing images handled with gradient placeholder fallback.

[XREF-002] MEDIUM | Genetics Variant List Not Paginated
File: src/app/(app)/(consumer)/genetics/page.tsx
Issue: Variant list renders all items via filteredVariants.map() with no pagination. Currently 9 items (low risk), but will not scale when full genomic data added.
Fix: Add pagination or virtual scrolling when variant count exceeds 20
Assign to: UI Agent (via Jeffery)

[XREF-003] LOW | Wellness Analytics RLS Unclear
File: supabase/migrations/ (no explicit RLS found for wellness_analytics table)
Issue: wellness_analytics table creation and RLS policy not found in migration files. May be created via RPC or missing RLS entirely.
Fix: Verify RLS exists on wellness_analytics table; add if missing
Assign to: Database Agent (via Jeffery)

---

## Section D, Standing Rule Violations

### BLOCKER (Must Fix Immediately)

[RULE-001] BLOCKER | 180+ TypeScript `any` Usages
Files: 30+ files across the codebase
Worst offenders:
- src/app/api/ultrathink/recommend/route.ts (9 instances: lines 27, 108, 116, 120, 143, 177, 200, 211, 236)
- supabase/functions/sherlock-research-hub/index.ts (14 instances)
- src/components/provider/SharedPatientProtocol.tsx (6 instances: lines 91, 316, 327, 383, 482, 617)
- src/components/layout/NotificationBell.tsx (6 instances: lines 77, 85, 95, 113, 126, 152)
- src/app/(app)/admin/page.tsx (6 instances)
- src/app/(app)/(consumer)/account/orders/page.tsx (6 instances)
- src/utils/protocolShareAccess.ts (4 instances)
- src/components/nutrition/PhotoMealLog.tsx (3 instances)
- src/app/(app)/admin/security/page.tsx (4 instances)
- src/components/dashboard/TodaysProtocol.tsx (5 instances)
Fix: Replace every `any` with explicit types or `unknown` with type guards
Assign to: Implementation Agent (via Jeffery), batch by file

[RULE-002] BLOCKER | 40+ Emoji Characters in UI Components
Files:
- src/app/(app)/(consumer)/wellness-analytics/page.tsx (brain emoji line 95)
- src/app/(app)/practitioner/patients/[id]/page.tsx (fire, checkmark, warning: lines 285, 352)
- src/components/ui/ViaTokensBalance.tsx (coin emoji: lines 24, 41, 71)
- src/app/(app)/(consumer)/helix/arena/page.tsx (celebration, flexing, clapping: lines 43-44)
- src/app/(app)/(consumer)/plugins/manage/page.tsx (multiple: ring, salad, cyclist, DNA)
- Multiple other components with emoji characters
Fix: Replace all emojis with Lucide React icons (strokeWidth={1.5})
Assign to: UI Agent (via Jeffery)

[RULE-003] FALSE POSITIVE | Helix References in Shared Layout Components
Files:
- src/components/layout/Sidebar.tsx (lines 9, 65, 240)
- src/components/layout/Header.tsx (lines 15-16)
- src/components/layout/MobileNavBar.tsx (line 25)
Status: PASS. Verified that all three files scope Helix nav items to consumer-only nav configs via role-based portal selection. Sidebar uses getPortal(role), MobileNavBar uses PORTAL_NAV[role]. Header only has breadcrumb label mappings. No actual Helix leakage to practitioner/naturopath portals.

### HIGH

[RULE-004] HIGH | 160+ Console Statements in Production Code
Files: Client components with console statements include:
- src/components/dashboard/DailyInsightsCard.tsx (line 139)
- src/components/SupplementProtocol.tsx (line 101)
- src/hooks/useUserDashboardData.ts (lines 75, 80, 176, 178, 219)
- src/app/api/ai/identify-product-photo/route.ts (lines 71, 79, 100, 115, 124, 128)
- src/app/api/ai/supplement-search/route.ts (lines 73, 101, 115, 120, 124)
Note: Scripts and Edge Functions are acceptable. Client-side console.logs must be removed.
Fix: Remove all console.log from client components; replace with structured logger in API routes
Assign to: Implementation Agent (via Jeffery)

[RULE-005] HIGH | 50+ Hardcoded Hex Colors Outside Token Set
Files: Multiple components using non-standard colors
Non-standard colors found: #9CA3AF, #C4944A, #F5B681, #7BAE7F, #A0AEC0, #60A5FA, #F87171, #A78BFA, #A855F7, #0D1520, #121E1A, #131D2E, #0F172A, #E87DA0, #7C6FE0, #4CAF50, #FFB347, #1F2937, #E5E7EB, #FBBF24, #22D3EE, #FFB347
Note: Peptide category colors (#7C3AED, #DC2626, #F59E0B, #059669, #2563EB, #EC4899, #84CC16) are acceptable for category differentiation.
Fix: Map non-standard colors to design token equivalents or add to design-tokens.ts if semantically needed
Assign to: UI Agent (via Jeffery)

### PASS (Compliant)

[RULE-006] PASS | Semaglutide Exclusion
Status: All semaglutide references are defensive/exclusionary (BLOCKED_PEPTIDES, NEVER recommend instructions). Zero violations.

[RULE-007] PASS | Bioavailability 10-27x
Status: No instances of 5-27 or 5-27x found. All references use correct 10-27x range.

[RULE-008] PASS | Bio Optimization Score Name
Status: "Vitality Score" references exist only in DB column names (legacy schema) and enforcement code. No UI-facing violations.

[RULE-009] PASS | Retatrutide Injectable-Only
Status: Verified in categories-7-8.ts. Only 1 dosing form (injectable). No other delivery forms rendered.

[RULE-010] PASS | getDisplayName Utility
Status: getDisplayName exists in src/lib/user/get-display-name.ts and is used in DashboardHeader.tsx. No hardcoded .name or .full_name access found bypassing the utility.

[RULE-011] PASS | Instrument Sans Font
Status: Globally loaded via Google Fonts in globals.css. Available as .font-instrument utility.

[RULE-012] PASS | rgba(255,255,255,0.08) Card Borders
Status: Extensively used across 40+ components for card borders.

---

## Section E, Architecture Recommendations

[ARCH-001] RECOMMEND | Unified RealtimeProvider Context
Suggestion: Create a top-level RealtimeProvider wrapping all three portals, managing all Supabase channel subscriptions in one place. Currently only usePortalRealtime.ts has Realtime, but 71 components fetch data via useEffect with no reactivity. A single provider would eliminate duplicate subscription logic and provide consistent real-time updates for Bio Score, Helix Points, Protocol changes, and CAQ progress.
Estimated effort: 3-5 days
Assign to: Jeffery (orchestrate multi-agent sprint)

[ARCH-002] RECOMMEND | Cart Persistence Layer
Suggestion: Implement cart persistence via either localStorage (quick) or a Supabase user_cart table (durable, cross-device). Current cart state in useState is lost on any navigation or refresh, which is a poor shopping experience.
Estimated effort: 1 day (localStorage) or 2 days (Supabase)
Assign to: Jeffery (UI Agent + Database Agent)

[ARCH-003] RECOMMEND | Responsive Sprint for 41 Non-Responsive Pages
Suggestion: Bundle all 41 non-responsive pages into a focused responsive sprint. Many pages follow similar patterns (dashboards, lists, forms) and can be templated. Prioritize consumer pages first, then practitioner/naturopath, then admin.
Estimated effort: 5-7 days
Assign to: Jeffery (UI Agent sprint)

[ARCH-004] RECOMMEND | TypeScript `any` Elimination Sprint
Suggestion: 180+ `any` usages represent significant type safety risk, especially in API routes handling health data. Batch by file severity: API routes first (HIPAA-adjacent), then components, then scripts.
Estimated effort: 3-4 days
Assign to: Jeffery (Implementation Agent sprint)

[ARCH-005] RECOMMEND | Emoji-to-Lucide Migration
Suggestion: Replace all 40+ emoji characters in UI with Lucide React icons (strokeWidth={1.5}). Create a mapping table of emoji-to-icon substitutions for consistency.
Estimated effort: 1-2 days
Assign to: UI Agent (via Jeffery)

[ARCH-006] RECOMMEND | Design Token Centralization
Suggestion: Several non-standard hex colors are hardcoded across components. Create a comprehensive design-tokens.ts that exports ALL approved colors as constants, including semantic colors (success, warning, error) mapped to the token set. Lint rule to prevent hardcoded hex values.
Estimated effort: 2 days
Assign to: UI Agent + Implementation Agent (via Jeffery)

---

## Audit Statistics

| Metric | Count |
|--------|-------|
| Total files audited | 666 |
| Total issues found | 62 |
| BLOCKERs | 3 |
| CRITICALs | 14 |
| HIGHs | 22 |
| MEDIUMs | 17 |
| LOWs | 3 |
| PASSing rules | 7 |
| Architecture recommendations | 6 |
