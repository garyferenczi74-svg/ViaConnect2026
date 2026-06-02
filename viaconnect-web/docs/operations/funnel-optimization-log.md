# Funnel Optimization Log

Entity: Farmceutica Wellness Ltd. Platform: ViaConnect. Consumer brand: Via Cura.
Tagline: Built For Your Biology.

This is the RUNNING LOG for funnel optimization experiments (Prompt #171 Section
5.3), plus the reference map of the five master funnels (Section 5.1) reconciled to
the REAL codebase. Append a new row to the experiment table for every experiment;
the funnel definitions below are the shared vocabulary those experiments reference.

Reconciliation rules applied throughout:
- Event names use the formavision_ prefix (the FormaVision brand for the body-scan
  surface). The real catalog name from src/lib/body-tracker/scan-analytics.ts is
  used for every event named below.
- Tier slugs are free, gold, platinum, platinum_family. There is no "Platinum
  Plus".
- The primary scan path is CLIENT side (runScanAnalysis) and calls no edge
  function; it emits formavision_processing_started and formavision_processing_completed with
  latency_seconds itself.
- Stripe checkout EXISTS (it backs formavision_premium_upgrade_completed and the Platinum
  trials shipped in 169f).
- The Day 2/5/6 trial reminder emails and the trial auto revert cron are NOT built
  (gated per 169f). Steps that depend on them are marked
  [gated: trial reminder emails + auto-revert cron not yet built]. The real trial
  mechanics that DO exist are the two Platinum trials: self initiated and
  practitioner granted.
- Product analytics today land in the Supabase analytics_events table (PostHog is
  unwired, a package.json / Gary blocker). The funnels are computable from those
  events now; a PostHog funnel view is a later swap behind the same guard.

## How to use this log

1. Pick a funnel step from the master funnels below (A through E).
2. Form a hypothesis about why users drop at that step.
3. Define the metric and the target delta, the sample size, and the run duration.
4. Run it (a real A/B needs a flag; /admin/flags exists for feature flags).
5. Record the result and the decision (ship, revert, iterate) in the table.

Keep entries short. One row per experiment. Do not delete closed rows; they are
the institutional memory of what was tried.

## Experiment log (append rows)

| Date | Funnel + step | Hypothesis | Metric + target delta | Sample size | Duration | Result | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| (yyyy-mm-dd) | (e.g. A.4 capture to results) | (fill in) | (e.g. +5 pct formavision_capture_started to formavision_results_viewed) | (fill in) | (e.g. 2 weeks) | (fill in) | (ship / revert / iterate) |

## Master funnels (Section 5.1), reconciled

Each funnel lists its steps top to bottom with the REAL event (or surface) that
marks the step. "[gated: ...]" marks a step whose mechanism is not built yet.

### Funnel A: Acquisition to first scan

The new user path from landing to a completed first scan.

1. Signup / account created. (Account creation; not a formavision_ event. Use the
   /admin/analytics overview signups.)
2. Dashboard scan card seen: formavision_dashboard_card_viewed.
3. Onboarding started: formavision_onboarding_started.
4. Onboarding completed: formavision_onboarding_completed.
5. Biometric consent viewed: formavision_biometric_consent_viewed.
6. Biometric consent accepted: formavision_biometric_consent_accepted. (Declines:
   formavision_biometric_consent_declined; a hard exit point, consent is required to scan.)
7. Capture started: formavision_capture_started.
8. Capture steps completed: formavision_capture_step_completed (one per pose; the discrete
   four pose flow, Phase 1).
9. Processing completed: formavision_processing_completed (latency_seconds carried).
10. Results viewed: formavision_results_viewed.

Known friction events on this funnel: formavision_quality_check_failed (a coarse error_code
such as lighting or framing), formavision_capture_retake, formavision_capture_abandoned, formavision_processing_failed
(coarse error_code).

### Funnel B: Free to paid (paywall to purchase)

The monetization path from hitting the paywall to a completed upgrade. Stripe
checkout EXISTS and backs the final step.

1. Premium paywall shown: formavision_premium_paywall_shown (trigger_point marks where).
2. Premium upgrade clicked: formavision_premium_upgrade_clicked (the CTA; sku marks the plan).
3. Stripe checkout. (Real: Stripe checkout exists. There is no dedicated
   formavision_ event between the click and completion; checkout is the Stripe
   session.)
4. Premium upgrade completed: formavision_premium_upgrade_completed (sku carried). Resulting
   tier is gold, platinum, or platinum_family.

### Funnel C: Self initiated Platinum trial to paid

The trial path for a user who starts a Platinum trial themselves (169f self
initiated trial). This funnel has gated steps.

1. Paywall or trial offer shown: formavision_premium_paywall_shown (trigger_point for the
   trial offer).
2. Trial started (self initiated). (Real mechanic from 169f: the user self
   initiates a Platinum trial. The trial start is recorded in trial state; there
   is no dedicated formavision_ trial-start event in the catalog, so measure from
   the trial state in the database.)
3. Day 2 reminder. [gated: trial reminder emails + auto-revert cron not yet built]
4. Day 5 reminder. [gated: trial reminder emails + auto-revert cron not yet built]
5. Day 6 reminder + conversion CTA. [gated: trial reminder emails + auto-revert
   cron not yet built]
6. Trial converts to paid: formavision_premium_upgrade_completed (sku carried), OR the trial
   lapses. The auto revert to free at trial end is
   [gated: trial reminder emails + auto-revert cron not yet built]; today trial
   end handling is read from trial state and Stripe, not driven by the cron.

### Funnel D: Practitioner granted Platinum trial to paid

The trial path for a user whose practitioner grants them a Platinum trial (169f
practitioner granted trial). Same gated reminder and revert steps as Funnel C.

1. Practitioner grants the trial. (Real mechanic from 169f: practitioner granted
   Platinum trial; recorded in trial state. The user is notified through the
   existing app surface; the grant itself is not a formavision_ catalog event.)
2. User activates / first uses the granted trial. (Measure via the user's first
   scan or first premium surface use after grant: formavision_results_viewed or
   formavision_premium_paywall_shown context.)
3. Day 2 reminder. [gated: trial reminder emails + auto-revert cron not yet built]
4. Day 5 reminder. [gated: trial reminder emails + auto-revert cron not yet built]
5. Day 6 reminder + conversion CTA. [gated: trial reminder emails + auto-revert
   cron not yet built]
6. Trial converts to paid: formavision_premium_upgrade_completed, OR lapses. Auto revert is
   [gated: trial reminder emails + auto-revert cron not yet built].

### Funnel E: Upgrade across tiers (gold to platinum / platinum_family)

The expansion path for an existing paid user moving up a tier. Stripe checkout
exists.

1. Higher tier paywall or upsell shown: formavision_premium_paywall_shown (trigger_point marks
   the upsell context; the user is already paid).
2. Upgrade clicked: formavision_premium_upgrade_clicked (sku marks the higher plan, for
   example a platinum_family plan).
3. Stripe checkout. (Real: Stripe checkout exists; same as Funnel B, no
   intermediate formavision_ event.)
4. Upgrade completed: formavision_premium_upgrade_completed (sku carried). New tier is
   platinum or platinum_family.

## Notes on instrumentation gaps (so an experiment is not designed on a phantom)

- There is no dedicated trial-start or trial-end formavision_ event in the catalog.
  Trial funnels (C and D) are measured from trial STATE in the database plus
  Stripe, until trial events or the gated email funnel are built.
- The Day 2/5/6 reminders and the auto revert cron do not exist (gated per 169f).
  Do not design an email-open or reminder-click experiment until they ship.
- Edge-function latency panels do not apply to the primary scan path: it is client
  side and emits its own latency_seconds on formavision_processing_completed. Only
  body-scan-analyze and body-scan-export are server side.
- A real A/B needs a flag to split traffic; /admin/flags (feature flags) exists.
