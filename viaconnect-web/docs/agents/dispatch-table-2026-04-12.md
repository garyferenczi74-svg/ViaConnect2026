# Michelangelo > Jeffery Dispatch Table
**Generated:** 2026-04-12
**Total Issues:** 62
**Audit Source:** michelangelo-audit-2026-04-12.md

---

## Priority 1: BLOCKERs (Immediate, No Planning Needed)

| ID | Category | Component | File(s) | Agent | Est. |
|----|----------|-----------|---------|-------|------|
| RULE-001 | Standing Rule | 180+ TypeScript `any` | 30+ files (worst: ultrathink/recommend, sherlock, SharedPatientProtocol, NotificationBell) | Implementation | 3-4d |
| RULE-002 | Standing Rule | 40+ Emojis in UI | wellness-analytics, practitioner/patients, ViaTokensBalance, helix/arena, plugins/manage | UI | 1-2d |
| RULE-003 | Standing Rule | ~~Helix in Shared Layouts~~ | Sidebar.tsx, Header.tsx, MobileNavBar.tsx | -- | FALSE POSITIVE |

## Priority 2: CRITICALs (Sprint 1)

| ID | Category | Component | File(s) | Agent | Est. |
|----|----------|-----------|---------|-------|------|
| SYNC-001 | Reactivity | Near-Zero Realtime | usePortalRealtime.ts (only Realtime file) | DB + UI | 3-5d |
| SYNC-002 | Reactivity | Cart Not Persisted | shop/page.tsx | UI + DB | 1-2d |
| RESP-001 | Responsive | Checkout | checkout/page.tsx | UI | 2h |
| RESP-002 | Responsive | Helix Dashboard | helix/page.tsx | UI | 2h |
| RESP-003 | Responsive | Helix Arena | helix/arena/page.tsx | UI | 1h |
| RESP-004 | Responsive | Helix Earn | helix/earn/page.tsx | UI | 1h |
| RESP-005 | Responsive | Helix Challenges | helix/challenges/page.tsx | UI | 1h |
| RESP-006 | Responsive | Helix Redeem | helix/redeem/page.tsx | UI | 1h |
| RESP-007 | Responsive | Helix Refer | helix/refer/page.tsx | UI | 1h |
| RESP-008 | Responsive | Helix Research | helix/research/page.tsx | UI | 1h |
| RESP-009 | Responsive | Consumer Alerts | alerts/page.tsx | UI | 1h |
| RESP-010 | Responsive | Consumer Tokens | tokens/page.tsx | UI | 1h |
| RESP-011 | Responsive | Consumer AI | ai/page.tsx | UI | 1h |
| RESP-012 | Responsive | Consumer Plugins (5pg) | plugins/*.tsx | UI | 3h |

## Priority 3: HIGHs, Reactivity (Sprint 1)

| ID | Category | Component | File(s) | Agent | Est. |
|----|----------|-----------|---------|-------|------|
| SYNC-003 | Reactivity | Bio Score Not Reactive | lib/scoring/bio-optimization.ts | DB + Impl | 3h |
| SYNC-004 | Reactivity | Protocol Not Reactive | lib/caq/complete-caq.ts, api/ultrathink/recommend | DB + UI | 3h |
| SYNC-005 | Reactivity | Helix Points Not Reactive | lib/helix/token-engine.ts | DB + UI | 2h |
| SYNC-006 | Reactivity | CAQ Progress Local Only | components/caq/ProgressMotivator.tsx | UI + DB | 2h |
| RULE-004 | Standing Rule | 160+ Console Statements | 30+ client components | Implementation | 2h |
| RULE-005 | Standing Rule | 50+ Off-Token Colors | Multiple components | UI | 1d |

## Priority 4: HIGHs, Responsive (Sprint 2)

| ID | Category | Component | File(s) | Agent | Est. |
|----|----------|-----------|---------|-------|------|
| RESP-013 | Responsive | Login | login/page.tsx | UI | 1h |
| RESP-014 | Responsive | Signup | signup/page.tsx | UI | 1h |
| RESP-015 | Responsive | Forgot Password | forgot-password/page.tsx | UI | 30m |
| RESP-016 | Responsive | Practitioner Dashboard | practitioner/dashboard/page.tsx | UI | 3h |
| RESP-017 | Responsive | Practitioner AI | practitioner/ai/page.tsx | UI | 1h |
| RESP-018 | Responsive | Practitioner EHR | practitioner/ehr/page.tsx | UI | 2h |
| RESP-019 | Responsive | Practitioner Genomics | practitioner/genomics/page.tsx | UI | 2h |
| RESP-020 | Responsive | Practitioner Protocols | practitioner/protocols/page.tsx | UI | 1h |
| RESP-021 | Responsive | Practitioner Patient Detail | practitioner/patients/[id]/page.tsx | UI | 2h |
| RESP-022 | Responsive | Practitioner Scheduler | practitioner/scheduler/page.tsx | UI | 2h |
| RESP-023 | Responsive | Practitioner Compliance | practitioner/compliance/page.tsx | UI | 1h |
| RESP-024 | Responsive | Practitioner Settings Plugins | practitioner/settings/plugins/page.tsx | UI | 1h |
| RESP-025 | Responsive | Naturopath Dashboard | naturopath/dashboard/page.tsx | UI | 3h |
| RESP-026 | Responsive | Naturopath AI | naturopath/ai/page.tsx | UI | 1h |
| RESP-027 | Responsive | Naturopath Compliance | naturopath/compliance/page.tsx | UI | 1h |
| RESP-028 | Responsive | Naturopath Constitutional | naturopath/constitutional/page.tsx | UI | 2h |
| RESP-029 | Responsive | Naturopath Patient Detail | naturopath/patients/[id]/page.tsx | UI | 2h |
| RESP-030 | Responsive | Naturopath Scheduler | naturopath/scheduler/page.tsx | UI | 2h |
| RESP-031 | Responsive | Naturopath Botanical | naturopath/botanical/page.tsx | UI | 2h |
| RESP-032 | Responsive | Naturopath Settings Plugins | naturopath/settings/plugins/page.tsx | UI | 1h |

## Priority 5: MEDIUMs + LOWs (Sprint 3+)

| ID | Category | Component | File(s) | Agent | Est. |
|----|----------|-----------|---------|-------|------|
| SYNC-007 | Reactivity | Genetics Tier Static | genetics/page.tsx | Implementation | 2h |
| SYNC-008 | Reactivity | No Cache Clear Portal Switch | lib/supabase/middleware.ts | Implementation | 1h |
| SYNC-009 | Reactivity | Wellness No 6AM Cron | api/ai/generate-wellness-analytics | DB + UI | 3h |
| SYNC-010 | Reactivity | Wellness Categories Hardcoded | lib/analytics/categories.ts | DB + Impl | 2h |
| XREF-002 | Cross-Ref | Genetics No Pagination | genetics/page.tsx | UI | 1h |
| XREF-003 | Cross-Ref | Wellness Analytics RLS | supabase/migrations/ | DB | 1h |
| RESP-033 | Responsive | Admin Board | admin/board/page.tsx | UI | 1h |
| RESP-034 | Responsive | Admin SKUs | admin/skus/page.tsx | UI | 1h |
| RESP-035 | Responsive | Admin Alerts | admin/alerts/page.tsx | UI | 1h |
| RESP-036 | Responsive | Admin Inventory | admin/inventory/page.tsx | UI | 1h |
| RESP-037 | Responsive | Landing Page | page.tsx | UI | 30m |

## Priority 6: Architecture Recommendations (Jeffery Decision)

| ID | Category | Suggestion | Agent | Est. |
|----|----------|-----------|-------|------|
| ARCH-001 | Architecture | Unified RealtimeProvider Context | Multi-agent | 3-5d |
| ARCH-002 | Architecture | Cart Persistence Layer | UI + DB | 1-2d |
| ARCH-003 | Architecture | Responsive Sprint (41 pages) | UI | 5-7d |
| ARCH-004 | Architecture | TypeScript `any` Elimination | Implementation | 3-4d |
| ARCH-005 | Architecture | Emoji-to-Lucide Migration | UI | 1-2d |
| ARCH-006 | Architecture | Design Token Centralization | UI + Impl | 2d |

---

## Execution Order Summary

1. **Immediate (today):** RULE-003 (Helix in shared layouts, 2h fix)
2. **Sprint 1 (this week):** All BLOCKERs + CRITICALs + HIGH reactivity = ~10-15 days work
3. **Sprint 2 (next week):** HIGH responsive (practitioner + naturopath portals) = ~5-7 days
4. **Sprint 3+:** MEDIUMs, LOWs, Architecture recommendations = ~10-15 days
5. **Total estimated effort:** 25-40 days across all agents

---

**Jeffery: Execute BLOCKERs first. Every task flows through full OBRA pipeline (Gates O>B>R>A). Report completion to Gary only when all gates clear.**
