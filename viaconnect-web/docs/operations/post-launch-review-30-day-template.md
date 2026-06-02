# Post Launch Review: 30 Day (Template)

Entity: Farmceutica Wellness Ltd. Platform: ViaConnect. Consumer brand: Via Cura.
Tagline: Built For Your Biology.

This is a FILL-IN TEMPLATE (Prompt #171 Section 9). Copy it, date it, and fill it
in at the 30 day mark after launch. It is reconciled to the real codebase: event
names use the formavision_ prefix (the FormaVision brand for the body-scan
surface), tier slugs are free, gold, platinum, and platinum_family (there is no "Platinum Plus"),
and where a referenced surface or tool does not exist yet it is marked inline.

Owner: Gary (executive review). Contributing agents: Arnold (Body Scan), Sherlock
(analytics aggregation). Status of the review: NOT YET HELD (template).

Pre-fill checklist (read before the meeting):
- Pull metrics from the existing admin surfaces: /admin/analytics (overview,
  cohorts, ltv, cac, snapshots), /admin/exec-reporting, /admin/compliance.
  These are real and RLS gated.
- Note that PostHog and Sentry are NOT wired (package.json and Gary approval
  blocker), so product-analytics funnels and error rates come from the Supabase
  analytics_events table and src/lib/utils/safe-log.ts (Vercel logs), not from a
  SaaS dashboard. App store review aggregation tools (AppFollow, Appbot) are also
  not adopted yet, so customer-voice inputs are gathered manually.

## 9.1 Agenda

1. Launch recap: go live date, rollout scope, any incidents in the first 30 days.
2. Metrics review against the Section 9.2 targets (table below). Confirm each
   target value with Gary; the values printed here are estimates only.
3. Acquisition and activation: signups, onboarding completion, first scan rate.
4. Body Scan funnel health: capture to results conversion, quality check failure
   mix, processing success rate (real formavision_ events, see funnel-optimization-log.md).
5. Tier mix and monetization: free vs gold vs platinum vs platinum_family, paywall
   views to upgrades, Platinum trial starts (self initiated and practitioner granted).
6. Compliance posture: consent acceptance, deletion requests, retention, age gate,
   geo, inclusivity waitlist volume.
7. Engineering health: error rate, latency (client formavision_processing_completed
   latency_seconds; the primary scan path is client side and calls no edge
   function), uptime, top error codes.
8. Safety and clinical: safeguard triggers, frequency limiter hits, numbers
   optional adoption. Reviewed with the clinical lead (role only; see note below).
9. Customer voice: NPS, app store highlights, top support categories, top feedback
   themes (see customer-voice-template.md).
10. Decisions, owners, and action items for the 60 day window.

Note on the Safety and Clinical reviewer: 171 names a specific individual for the
Safety Dashboard. Per the standing attribution rule, this template refers to that
audience by ROLE only (clinical lead). Naming the specific individual and granting
them dashboard access requires Gary's explicit written confirmation before it
appears anywhere.

## 9.2 Metrics targets

EVERY target value below is an estimate. Confirm each with Gary before the review
and replace the annotation with the agreed number. Both the Target column and the
Actual column are filled in at the meeting.

| Metric | Source | Target | Actual (30 day) |
| --- | --- | --- | --- |
| New signups (cumulative) | /admin/analytics overview | (estimate, confirm with Gary) | |
| Onboarding completion rate | formavision_onboarding_started to formavision_onboarding_completed | (estimate, confirm with Gary) | |
| First scan rate (signup to first formavision_capture_started) | formavision_capture_started | (estimate, confirm with Gary) | |
| Capture to results conversion | formavision_capture_started to formavision_results_viewed | (estimate, confirm with Gary) | |
| Quality check failure rate | formavision_quality_check_failed over formavision_capture_started | (estimate, confirm with Gary) | |
| Processing success rate | formavision_processing_completed over formavision_processing_started | (estimate, confirm with Gary) | |
| Median processing latency (seconds) | formavision_processing_completed latency_seconds | (estimate, confirm with Gary) | |
| Paywall view to upgrade rate | formavision_premium_paywall_shown to formavision_premium_upgrade_completed | (estimate, confirm with Gary) | |
| Platinum trial starts (self initiated) | trial mechanics from 169f | (estimate, confirm with Gary) | |
| Platinum trial starts (practitioner granted) | trial mechanics from 169f | (estimate, confirm with Gary) | |
| Tier mix (free / gold / platinum / platinum_family) | /admin/analytics | (estimate, confirm with Gary) | |
| 7 day retention | /admin/analytics cohorts (retention engine) | (estimate, confirm with Gary) | |
| Crash and error rate | safe-log (Vercel) + classify-ai taxonomy | (estimate, confirm with Gary) | |
| Uptime | uptime tool not adopted yet (Gary decision, Section 15) | (estimate, confirm with Gary) | |
| NPS | manual at 30 day; in app NPS surface not built yet | (estimate, confirm with Gary) | |
| Biometric consent acceptance rate | formavision_biometric_consent_accepted over formavision_biometric_consent_viewed | (estimate, confirm with Gary) | |
| Deletion requests | /admin/compliance | (estimate, confirm with Gary) | |
| Inclusivity waitlist joins | formavision_inclusivity_waitlist_joined | (estimate, confirm with Gary) | |

## 9.3 Review sections (fill in)

### 9.3.1 What went well

(Fill in: the wins from the first 30 days.)

### 9.3.2 What did not go well

(Fill in: misses against the targets above, incidents, regressions.)

### 9.3.3 Funnel and activation findings

(Fill in: where users drop off in the Body Scan funnel; reference the master
funnels A through E in funnel-optimization-log.md.)

### 9.3.4 Monetization and tier findings

(Fill in: tier movement, trial conversion, paywall performance. Use the real tier
slugs free, gold, platinum, platinum_family.)

### 9.3.5 Compliance and safety findings

(Fill in: consent, deletion, retention, age gate, geo, safeguard and frequency
limiter behavior. Safety items reviewed with the clinical lead, role only.)

### 9.3.6 Engineering and reliability findings

(Fill in: error codes, latency, uptime. Note any item blocked on Sentry or an
uptime tool that is not adopted yet.)

### 9.3.7 Customer voice summary

(Fill in: roll up the four most recent customer-voice-template.md weeklies.)

### 9.3.8 Decisions and action items

| Decision or action | Owner | Due before | Status |
| --- | --- | --- | --- |
| | | 60 day review | |
