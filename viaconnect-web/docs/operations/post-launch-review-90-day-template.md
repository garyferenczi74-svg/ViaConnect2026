# Post Launch Review: 90 Day (Template)

Entity: Farmceutica Wellness Ltd. Platform: ViaConnect. Consumer brand: Via Cura.
Tagline: Built For Your Biology.

This is a FILL-IN TEMPLATE (Prompt #171 Section 11). Copy it, date it, and fill it
in at the 90 day mark. Reconciled to the real codebase: event names use the
body_scan_ prefix (formavision_ does NOT exist), tier slugs are free, gold,
platinum, platinum_family (no "Platinum Plus"), and missing surfaces are marked
inline.

Owner: Gary. Contributing agents: Arnold (Body Scan), Sherlock (analytics).
Status of the review: NOT YET HELD (template).

The 90 day review is the STRATEGIC review. The 30 and 60 day reviews are
operational trend checks; this one produces decisions about direction: what to
double down on, what to cut, the monetization model read with a full quarter of
data, and the Phase 2 gate status (Section 11.4 below). Bring both prior review
docs so all three columns of every metric line up.

Pre-fill checklist:
- Sources: /admin/analytics, /admin/exec-reporting, /admin/board (board pack),
  /admin/compliance. PostHog and Sentry remain unwired (package.json / Gary
  blocker); funnels from analytics_events, errors from safe-log.
- Bring the 30 and 60 day review docs.

## 11.1 Agenda

1. Quarter recap: the full 90 day arc against the launch plan.
2. Metrics review against the Section 11.2 targets (table below), 30 / 60 / 90 day
   actuals side by side.
3. Retention and LTV with a full quarter: 30 and 60 day retention curves, payback
   period signal, cohort quality (see /admin/analytics ltv, cohorts, snapshots).
4. Monetization model read: tier mix stability, Platinum trial economics (self
   initiated and practitioner granted), gold to platinum / platinum_family upgrade
   path. NOTE: the trial reminder email funnel and auto revert cron are NOT built
   yet (gated per 169f); trial economics are read from Stripe and trial state.
5. Body Scan funnel: cumulative experiment results and the standing optimization
   backlog (see funnel-optimization-log.md).
6. Compliance and safety quarter review.
7. Engineering and reliability quarter review.
8. Customer voice quarter synthesis: NPS trajectory, the durable themes, the
   churn drivers.
9. Strategic outputs (Section 11.3) and the Phase 2 gate status (Section 11.4).
10. Decisions, owners, and the next quarter plan.

Note on the Safety and Clinical reviewer: audience is referred to by ROLE only
(clinical lead). Naming the specific individual requires Gary's explicit written
confirmation per the attribution rule.

## 11.2 Metrics targets

EVERY target value is an estimate. Confirm each with Gary. Fill 30 / 60 / 90 day
actuals side by side.

| Metric | Source | Target | 30 day | 60 day | 90 day |
| --- | --- | --- | --- | --- | --- |
| New signups (cumulative) | /admin/analytics overview | (estimate, confirm with Gary) | | | |
| Onboarding completion rate | onboarding_started to onboarding_completed | (estimate, confirm with Gary) | | | |
| First scan rate | capture_started | (estimate, confirm with Gary) | | | |
| Capture to results conversion | capture_started to results_viewed | (estimate, confirm with Gary) | | | |
| Repeat scan rate | scan_count via results_viewed | (estimate, confirm with Gary) | | | |
| Quality check failure rate | quality_check_failed over capture_started | (estimate, confirm with Gary) | | | |
| Processing success rate | processing_completed over processing_started | (estimate, confirm with Gary) | | | |
| Median processing latency (seconds) | processing_completed latency_seconds | (estimate, confirm with Gary) | | | |
| Paywall view to upgrade rate | premium_paywall_shown to premium_upgrade_completed | (estimate, confirm with Gary) | | | |
| Platinum trial conversion | trial state + Stripe (169f) | (estimate, confirm with Gary) | | | |
| Tier mix (free / gold / platinum / platinum_family) | /admin/analytics | (estimate, confirm with Gary) | | | |
| 7 day retention | /admin/analytics cohorts | (estimate, confirm with Gary) | | | |
| 30 day retention | /admin/analytics cohorts | (estimate, confirm with Gary) | | | |
| 60 day retention | /admin/analytics cohorts | (estimate, confirm with Gary) | | | |
| LTV | /admin/analytics ltv | (estimate, confirm with Gary) | | | |
| CAC | /admin/analytics cac | (estimate, confirm with Gary) | | | |
| Payback period | /admin/analytics (payback period) | (estimate, confirm with Gary) | | | |
| Crash and error rate | safe-log (Vercel) + classify-ai | (estimate, confirm with Gary) | | | |
| Uptime | uptime tool not adopted yet (Gary decision) | (estimate, confirm with Gary) | | | |
| NPS | manual; in app NPS surface not built yet | (estimate, confirm with Gary) | | | |
| Biometric consent acceptance rate | biometric_consent_accepted over biometric_consent_viewed | (estimate, confirm with Gary) | | | |
| Deletion requests | /admin/compliance | (estimate, confirm with Gary) | | | |

## 11.3 Strategic outputs (fill in)

These are the decisions the 90 day review exists to produce. Each needs an owner
and a date.

### 11.3.1 Double down

(Fill in: the one or two things working well enough to invest more in.)

### 11.3.2 Cut or pause

(Fill in: what is not earning its keep.)

### 11.3.3 Monetization model decision

(Fill in: the read on the tier and trial model with a full quarter of data. Use
real tier slugs free, gold, platinum, platinum_family. Note any dependency on the
gated trial email funnel that is not yet built.)

### 11.3.4 Next quarter plan

(Fill in: the priorities for days 90 to 180.)

## 11.4 Phase 2 gate status pointer

171 ties the 90 day strategic review to the Phase 2 gate readiness. The
authoritative gate record is:

  docs/formavision/phase-2-dependency-gates.md

RECONCILIATION NOTE: the telemetry architecture doc (docs/operations/telemetry-architecture.md)
and 171 refer to a docs/formavision/phase-2/ directory. That DIRECTORY does not
exist today. The real, single source of truth for the gates is the
phase-2-dependency-gates.md file above. If a phase-2/ directory is created later,
update this pointer.

As of that doc, all three gates are UNMET and none of the deferred Phase 2
capabilities exist in the codebase. Confirm current status against the file at
review time; do not assume movement. Record the read here:

| Gate | Subject | Status at this review |
| --- | --- | --- |
| A | Parametric body model (SMPL-X license decision OR MediaPipe GHUM mesh fallback) | (read from phase-2-dependency-gates.md; UNMET as last recorded) |
| B | Tier B clinical validation cohort (the long pole) | (read from phase-2-dependency-gates.md; UNMET as last recorded) |
| C | Native depth Capacitor plugins live in production on iOS and Android | (read from phase-2-dependency-gates.md; UNMET as last recorded) |

Phase 2 begins only when ALL THREE gates close AND Gary issues the explicit go.
The go is a separate, human, Gary owned decision; gate closure alone does not start
Phase 2. No accuracy or DEXA equivalence claim may ship until Gate B is filed and
signed off.

## 11.5 Decisions and action items

| Decision or action | Owner | Due | Status |
| --- | --- | --- | --- |
| | | | |
