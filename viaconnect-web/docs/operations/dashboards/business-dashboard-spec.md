# Business Dashboard Spec (Prompt 171 Section 3.3, reconciled)

Entity: Farmceutica Wellness Ltd. Platform: ViaConnect. Consumer brand: Via Cura. Tagline: Built For Your Biology.

Status: RECONCILED SPEC, drafted 2026-06-01. This transcribes the Prompt 171 Section 3.3 panel list and reconciles every panel to the real revenue and analytics engines and the real tier slugs per docs/operations/telemetry-architecture.md.

- Audience: the platform owner (Gary) and finance.
- Refresh cadence: daily for revenue and conversion panels; weekly for LTV, CAC, and payback; monthly for the board rollup.
- Tool: Metabase (BI over Supabase) for presentation, not deployed yet. Until it is, these read from the existing analytics engines in src/lib/analytics/ (ltv-engine, cac-engine, payback-period, acquisition-attribution, retention-engine, cohort-engine, variable-costs) surfaced at /admin/analytics (ltv, cac, snapshots) and /admin/exec-reporting and /admin/board, which already exist and are RLS gated.
- Existing admin surfaces: /admin/analytics (ltv, cac, snapshots, board-pack, marketing-spend), /admin/exec-reporting, and /admin/board are the live homes for these panels today.

## Real foundation this dashboard reads

- Tiers: free, gold, platinum, platinum_family (display "Platinum+ Family"). No "Platinum Plus".
- Body Scan monetization events: premium_paywall_shown, premium_upgrade_clicked, premium_upgrade_completed (body_scan_ catalog), plus the platinum_trials model.
- Revenue / unit-economics math already exists: LTV, CAC, payback period, acquisition attribution, cohort and retention engines, variable costs. The business dashboard is a presentation layer over these.

## Section 3.3 panels (reconciled)

| 171 panel | Reconciled mapping | Source | Status |
| --- | --- | --- | --- |
| Revenue (total, recurring) | subscription and order revenue | unit-economics snapshots; /admin/analytics/snapshots | RECONCILED |
| Revenue by tier | revenue split across free / gold / platinum / platinum_family | subscription tables; /admin/analytics | RECONCILED (real slugs) |
| Revenue by region / geo | revenue broken down by region | n/a here | DEFERRED to the 174 series: revenue-by-region reporting is owned by the 174 international reporting work, not this dashboard. Do not source it here |
| Body Scan upgrade conversion | premium_paywall_shown to premium_upgrade_completed; revenue attributable to scan upgrades | analytics_events + subscription tables | RECONCILED |
| Platinum trial economics | trial starts (self_initiated, practitioner_granted) and trial-to-paid conversion value | platinum_trials (deriveTrialState) + subscriptions | RECONCILED, but see gated note |
| Trial reminder / auto-revert effect | revenue impact of reminder emails and the auto-revert cron | n/a | [gated: not built] reminders and the auto-revert cron are not built; the conversion-lift step that depends on them is gated until they ship |
| LTV | customer lifetime value, by cohort and tier | src/lib/analytics/ltv-engine; /admin/analytics/ltv | RECONCILED |
| CAC | customer acquisition cost, by channel | src/lib/analytics/cac-engine; /admin/analytics/cac | RECONCILED |
| Payback period | months to recover CAC | src/lib/analytics/payback-period | RECONCILED |
| LTV-to-CAC ratio | derived from the two engines above | ltv-engine + cac-engine | RECONCILED |
| Acquisition attribution | signups and revenue by acquisition source | src/lib/analytics/acquisition-attribution | RECONCILED |
| Cohort revenue retention | revenue retained by signup cohort | cohort-engine + retention-engine | RECONCILED |
| Variable cost / margin | per-scan and per-order variable costs (including Vision egress cost as a scan cost input) | src/lib/analytics/variable-costs; body-scan-analyze egress logs | RECONCILED |
| Board rollup | the monthly executive summary | /admin/analytics/board-pack; /admin/board; /admin/exec-reporting | RECONCILED |

## Notes and ambiguities

- Revenue by region: explicitly DEFERRED to the 174 series per the prompt. The international revenue, FX, settlement, and tax surfaces live under /admin/international and are owned by that workstream; do not duplicate or source region revenue in this dashboard.
- Trial reminders and auto-revert: the platinum_trials model and deriveTrialState are real, so trial starts and active-trial economics are reportable. The reminder emails and auto-revert cron are NOT built, so any conversion-lift panel that depends on a reminder send or an auto-revert event is [gated: not built] until those mechanisms ship.
- All target values (revenue, conversion, LTV-to-CAC) are Gary-owned and live in the post-launch review templates as estimates to confirm.
- No depth, CNN, or Tier 2 monetization appears here; those Phase 2 capabilities do not exist and are documented as DEFERRED in the engineering spec.
