# Post Launch Review: 60 Day (Template)

Entity: Farmceutica Wellness Ltd. Platform: ViaConnect. Consumer brand: Via Cura.
Tagline: Built For Your Biology.

This is a FILL-IN TEMPLATE (Prompt #171 Section 10). Copy it, date it, and fill it
in at the 60 day mark. Reconciled to the real codebase: event names use the
body_scan_ prefix (formavision_ does NOT exist), tier slugs are free, gold,
platinum, platinum_family (no "Platinum Plus"), and missing surfaces are marked
inline.

Owner: Gary. Contributing agents: Arnold (Body Scan), Sherlock (analytics).
Status of the review: NOT YET HELD (template).

The 60 day review is a TREND review: it compares against the 30 day numbers, so
fill in the 30 day actuals alongside the 60 day actuals to see direction. By 60
days there is enough cohort depth for an early read on 30 day retention and the
first repeat scan behavior.

Pre-fill checklist:
- Same sources as the 30 day review: /admin/analytics, /admin/exec-reporting,
  /admin/compliance. PostHog and Sentry remain unwired (package.json / Gary
  blocker); funnels come from analytics_events and errors from safe-log.
- Bring the 30 day review doc so every metric has its prior value.

## 10.1 Agenda

1. Trend recap versus 30 day: which metrics improved, held, or regressed.
2. Metrics review against the Section 10.2 targets (table below), with the 30 day
   actual beside the 60 day actual.
3. Retention deepening: 30 day retention now has data; repeat scan rate emerges.
4. Body Scan funnel optimization results: any experiments run since the 30 day
   review and their outcomes (see funnel-optimization-log.md).
5. Tier mix evolution and Platinum trial conversion: how many self initiated and
   practitioner granted trials converted to paid platinum or platinum_family, and
   how many lapsed. NOTE: the auto revert cron and the Day 2/5/6 trial reminder
   emails are NOT built yet (gated per 169f), so trial to paid conversion is read
   from Stripe and the trial state in the database, not from an email funnel.
6. Compliance and safety trend.
7. Engineering and reliability trend.
8. Customer voice trend: NPS direction, recurring themes, churned user feedback.
9. Decisions, owners, and action items for the 90 day window.

Note on the Safety and Clinical reviewer: audience is referred to by ROLE only
(clinical lead). Naming the specific individual requires Gary's explicit written
confirmation per the attribution rule.

## 10.2 Metrics targets

EVERY target value is an estimate. Confirm each with Gary before the review. Fill
the 30 day actual (from the prior review) and the 60 day actual side by side.

| Metric | Source | Target | 30 day actual | 60 day actual |
| --- | --- | --- | --- | --- |
| New signups (cumulative) | /admin/analytics overview | (estimate, confirm with Gary) | | |
| New signups (this 30 day window) | /admin/analytics overview | (estimate, confirm with Gary) | | |
| Onboarding completion rate | onboarding_started to onboarding_completed | (estimate, confirm with Gary) | | |
| First scan rate | capture_started | (estimate, confirm with Gary) | | |
| Capture to results conversion | capture_started to results_viewed | (estimate, confirm with Gary) | | |
| Repeat scan rate (2 or more scans) | scan_count via results_viewed | (estimate, confirm with Gary) | | |
| Quality check failure rate | quality_check_failed over capture_started | (estimate, confirm with Gary) | | |
| Processing success rate | processing_completed over processing_started | (estimate, confirm with Gary) | | |
| Median processing latency (seconds) | processing_completed latency_seconds | (estimate, confirm with Gary) | | |
| Paywall view to upgrade rate | premium_paywall_shown to premium_upgrade_completed | (estimate, confirm with Gary) | | |
| Platinum trial conversion (trial to paid) | trial state + Stripe (169f) | (estimate, confirm with Gary) | | |
| Tier mix (free / gold / platinum / platinum_family) | /admin/analytics | (estimate, confirm with Gary) | | |
| 7 day retention | /admin/analytics cohorts | (estimate, confirm with Gary) | | |
| 30 day retention | /admin/analytics cohorts | (estimate, confirm with Gary) | | |
| Early LTV signal | /admin/analytics ltv | (estimate, confirm with Gary) | | |
| Crash and error rate | safe-log (Vercel) + classify-ai | (estimate, confirm with Gary) | | |
| Uptime | uptime tool not adopted yet (Gary decision) | (estimate, confirm with Gary) | | |
| NPS | manual; in app NPS surface not built yet | (estimate, confirm with Gary) | | |
| Biometric consent acceptance rate | biometric_consent_accepted over biometric_consent_viewed | (estimate, confirm with Gary) | | |
| Deletion requests | /admin/compliance | (estimate, confirm with Gary) | | |

## 10.3 Review sections (fill in)

### 10.3.1 Trend versus 30 day

(Fill in: per metric, improved / held / regressed and the likely cause.)

### 10.3.2 What went well

(Fill in.)

### 10.3.3 What did not go well

(Fill in.)

### 10.3.4 Funnel optimization results

(Fill in: experiments closed since the 30 day review and decisions; reference
funnel-optimization-log.md entries by date.)

### 10.3.5 Retention and repeat scan findings

(Fill in: 30 day retention read and the first repeat scan behavior.)

### 10.3.6 Monetization and trial findings

(Fill in: trial conversion using real 169f mechanics; note the email funnel is
gated and not yet built. Use real tier slugs.)

### 10.3.7 Compliance and safety findings

(Fill in. Safety reviewed with the clinical lead, role only.)

### 10.3.8 Engineering and reliability findings

(Fill in.)

### 10.3.9 Customer voice summary

(Fill in: roll up the customer-voice weeklies for this window.)

### 10.3.10 Decisions and action items

| Decision or action | Owner | Due before | Status |
| --- | --- | --- | --- |
| | | 90 day review | |
