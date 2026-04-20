# Prompt #99 — Advanced Practitioner Analytics

**Project:** ViaConnect Web (C:\Users\garyf\ViaConnect2026\viaconnect-web)
**Stack:** Next.js 14+ / TypeScript / Tailwind CSS / Supabase (project nnhkcufyqjojdbvdrpky, us-east-2) / Vercel
**Sub-agent:** Michelangelo (TDD/Dev, OBRA framework from #63) under Jeffery orchestration
**Original deliverable destination:** Google Drive folder 12IA_S6yi0ispKZmvhtaFFbId6mw6PgS8
**This file:** canonical record of the prompt preserved in-repo. Upload to Google Drive manually from this markdown.

---

## 1. Mission

Build a comprehensive Advanced Practitioner Analytics suite that gives every practitioner in the ViaConnect platform the same caliber of business intelligence that admins receive in the Admin Command Center (#60c) — but scoped exclusively to their own practice. This is the natural extension of the Practitioner Portal (#91) and the Practitioner Referral Program (#98).

Practitioners will get five analytics surfaces (Practice Health, Client Cohorts, Protocol Effectiveness, Revenue Intelligence, Engagement Insights), each backed by practitioner-scoped materialized views refreshed daily at 6 AM by the existing cron system from #17a. AI-driven narrative insights are provided by the Sherlock sub-agent (#61b) via a nightly digest and on-page insight cards.

**Critical guardrail (non-negotiable):** Practitioners see only aggregate engagement data — the 0 to 100 engagement score established in #17b Addendum — NEVER individual-level Helix Rewards data (tokens, challenges, achievements, leaderboards, tier multipliers). Every SQL query, every RLS policy, every component MUST respect the Consumer-portal-only rule for Helix data.

---

## 2. Prior Prompts This Depends On

Do not re-implement any of these. Read and respect them:

- **#17a** — AI-Powered Wellness Analytics (cron at 6 AM; 10 analytics categories)
- **#17b** — Unified AI Data Ecosystem (buildUnifiedContext, emitDataEvent, Supabase Realtime cascades)
- **#17b Addendum** — Helix Rewards is CONSUMER PORTAL ONLY; practitioners see only aggregate engagement_score (0 to 100)
- **#19b** — Tiered protocol confidence (Tier 1 CAQ-only 72%, Tier 2 CAQ+labs 86%, Tier 3 CAQ+labs+genetics 96%)
- **#60b** — Three AI Advisors (Consumer / Practitioner / Naturopath); Practitioner Advisor lives in this portal
- **#60c** — Admin Command Center (pattern this prompt mirrors but scopes per-practitioner)
- **#60d** — Three non-negotiable guardrails (FarmCeutica-only recommendations, peptide sharing protocol, mandatory medical disclaimer)
- **#61b** — Sherlock Research Hub sub-agent (used here for narrative insights)
- **#63** — Michelangelo OBRA framework (all work in this prompt passes through its 4 gates)
- **#91** — Practitioner Portal foundation (navigation, layout, /practitioner/* routes)
- **#96** — Level 3 White-Label (practitioners can resell; revenue flows here)
- **#97** — Level 4 Custom Formulations (practitioners can design formulations; analytics must include this revenue stream)
- **#98** — Practitioner Referral Program (commission data; revenue dashboard reads from this)

---

## 3. Non-Negotiable Guardrails

### 3.1 Helix Rewards Isolation (most critical)

- Practitioner analytics NEVER touch any `helix_*` prefixed table, column, view, materialized view, RPC, or edge function.
- No token balances, no challenges, no achievements, no leaderboards, no tier multipliers.
- The only engagement signal surfaced is the aggregate `engagement_score` (integer 0 to 100) from the practitioner rollup view.
- Every materialized view includes an explicit SQL comment: `-- EXCLUDES: all helix_* tables per #17b Addendum`.

### 3.2 FarmCeutica-Only Product Recommendations (#60d)

- All "recommended next protocol" suggestions draw exclusively from the FarmCeutica product catalog.

### 3.3 Peptide Sharing Protocol (#60d)

- Aggregate views only at the practice level. Retatrutide is injectable-only and never stacked. No Semaglutide appears anywhere in analytics (not in catalog).

### 3.4 Mandatory Medical Disclaimer (#60d)

- Every analytics page renders a `<MedicalDisclaimer />` component at the bottom of the viewport, persistent across scroll.
- Canonical text: "Analytics insights are decision-support tools, not medical advice. Clinical decisions remain the responsibility of the licensed practitioner."

### 3.5 Consistent Brand Language

- Score name is "Bio Optimization" — never "Vitality Score" or "Genetic Optimization."
- Bioavailability always stated as 10 to 27x.
- Client names via `getDisplayName(clientId)` utility — never hardcoded, never raw email.

### 3.6 Standing Rules

- Desktop AND Mobile in synchronism (#18a).
- Lucide React icons only, `strokeWidth={1.5}`, no emojis.
- DO NOT TOUCH: Supabase email templates, package.json, existing applied Supabase migrations (append-only).

---

## 4. Pages

Five pages under `/practitioner/analytics/*`:

1. **Practice Health Dashboard** — `/practitioner/analytics` — KPI hero, Bio Opt distribution, trend timeline, quick actions.
2. **Client Cohort Analysis** — `/cohorts` — tabs for tier / demographic / concern / genetic / tenure cohorts.
3. **Protocol Performance Intelligence** — `/protocols` — top protocols, heatmap, interaction intelligence, FarmCeutica-only recommendations, peptide safety panel.
4. **Revenue & Business Intelligence** — `/revenue` — MRR hero, 12-month timeline, top products, tier mix, 12-month projection fan, tax summary CSV.
5. **Client Engagement Insights** — `/engagement` — distribution, drivers, dormancy risk, onboarding funnel, retention heatmap.

Each page renders a Sherlock narrative insight card and the medical disclaimer footer.

---

## 5. Database Schema

Five materialized views under `public`, each with `-- EXCLUDES: all helix_* tables per #17b Addendum` header, all refreshed nightly at 6 AM EST by extending the existing `refresh_analytics_materialized_views()` function from #17a.

- `practitioner_practice_health_mv`
- `practitioner_cohort_outcomes_mv`
- `practitioner_protocol_effectiveness_mv`
- `practitioner_revenue_rollup_mv`
- `practitioner_engagement_summary_mv`

All five have RLS enabled with a two-policy pattern:

1. Practitioner reads own rows + admin reads all.
2. Explicit deny for consumer + naturopath roles.

See §5 of the original prompt for full DDL.

---

## 6. Sherlock Integration

- `generatePractitionerInsight(practitionerId, page)` calls `buildUnifiedContext(practitionerId)`, passes to Claude API (claude-opus-4-7), returns `{ headline, body, suggestedAction, confidence }`.
- Cached 24h in `sherlock_insights_cache` keyed by `(practitioner_id, page, generated_at::date)`.
- Weekly digest edge function `practitioner_weekly_digest` runs Monday 7 AM EST.
- Post-processing strips forbidden language (no Helix, no "Vitality Score", medical disclaimer footer).

---

## 7. File Tree

See §7 of the original prompt.

---

## 8. Michelangelo OBRA Gates

- **Gate 1**: Failing tests first (render, MV shape, Helix isolation, FarmCeutica-only, peptide safety, RLS, mobile responsive).
- **Gate 2**: RED state verified.
- **Gate 3**: Implementation + GREEN state.
- **Gate 4**: Refactor + 80% coverage + Lighthouse 85+.

---

## 9. Acceptance Criteria

Fourteen acceptance criteria in the original prompt, covering page existence, MV existence, responsive rendering, guardrail tests, Sherlock integration, coverage, Lighthouse, medical disclaimer persistence, and zero edits to prohibited surfaces.

---

## 10. Dependency Status at Time of This Document (2026-04-19)

| Table / function | Status |
|---|---|
| `practitioners`, `protocols`, `user_protocols`, `assessment_results`, `engagement_score_snapshots`, `custom_formulations` | live |
| `clients`, `bio_optimization_scores` | NOT LIVE (blocked on #17a / #19b data-model migrations) |
| `referral_commissions` | NOT LIVE (blocked on #98 — never built) |
| `whitelabel_orders` | NOT LIVE (blocked on #96 — never applied) |
| `interaction_events`, `caq_submissions`, `lab_uploads`, `genetic_uploads`, `symptom_logs`, `wearables` | NOT LIVE |
| `user_roles` | NOT LIVE (this project uses `profiles.role` instead) |
| `practitioner_transactions` | NOT LIVE |
| `sherlock_insights_cache` | NOT LIVE (created under this prompt) |
| `refresh_analytics_materialized_views()` function | NOT LIVE |

Implementation status for Path A (infrastructure-only) in this commit:

- Sherlock insights cache table created + RLS
- Helix isolation guardrail library (pure, CI-assertable)
- Practitioner analytics page scaffolds (5 routes)
- MedicalDisclaimer + SherlockInsightCard stub + KPICard components
- Pure tests for guardrails + formatters
- MV scaffolding deferred until dependency prompts apply

---

## 11. Red Flags — Abort Conditions

See §11 of the original prompt. The same hard-stop rules apply: any `helix_*` reference, any non-FarmCeutica recommendation, any Semaglutide, any Retatrutide stacking, any email template edit, any package.json diff, any emoji — abort and escalate.

---

## 12. Notes on Prompt #100 Foreshadowing

Prompt #100 will be MAP Pricing Enforcement Automation — MAP monitoring scoped to Standard Wholesale (L1/L2) only. White-label (L3) and Custom Formulations (L4) are practitioner-priced and therefore exempt. Revenue Intelligence page built here will gain a "Pricing Status" column in #100 without a schema migration.
