# Product Dashboard Spec (Prompt 171 Section 3.2, reconciled)

Entity: Farmceutica Wellness Ltd. Platform: ViaConnect. Consumer brand: Via Cura. Tagline: Built For Your Biology.

Status: RECONCILED SPEC, drafted 2026-06-01. This transcribes the Prompt 171 Section 3.2 panel list and reconciles every panel to the real formavision_ event catalog and the real tier slugs per docs/operations/telemetry-architecture.md.

- Audience: product owner and growth.
- Refresh cadence: daily for funnel, activation, and feature-adoption panels; weekly for the cohort and engagement rollups.
- Tool: Metabase (BI over Supabase), not deployed yet. Until it is, these read from the Supabase analytics_events table plus the existing analytics engines in src/lib/analytics/ (retention-engine, cohort-engine, archetype-engine, and so on) surfaced at /admin/analytics (overview, cohorts) which already exist and are RLS gated.
- Existing admin surfaces: /admin/analytics (overview, cohorts, archetypes) is the live home for most of these panels today; Metabase would add presentation polish, not new data.

## Real foundation this dashboard reads

- Events: src/lib/body-tracker/scan-analytics.ts (formavision_ catalog). Every funnel and adoption panel maps to these names. The prefix is formavision_.
- Tiers: free, gold, platinum, platinum_family (display "Platinum+ Family"). There is no "Platinum Plus". Trials are platinum_trials with trial_source self_initiated or practitioner_granted (deriveTrialState in src/lib/body-tracker/trial-state.ts).
- Helix: consumer-only. The Helix engagement event fires from a DB trigger on body_photo_sessions.scan_status going to complete (surfaced here as formavision_helix_event_emitted with a coarse event_type). The product dashboard may show the aggregate consumer engagement score; practitioner-facing surfaces never see Helix.
- The Bio Optimization Score is the canonical score name (never "Vitality Score").

## Section 3.2 panels (reconciled)

| 171 panel | Reconciled mapping | Source / events | Status |
| --- | --- | --- | --- |
| Onboarding funnel | formavision_onboarding_started to formavision_onboarding_completed | analytics_events | RECONCILED |
| Activation: first scan rate | signup to first formavision_capture_started | analytics_events | RECONCILED |
| Capture-to-results conversion | formavision_capture_started to formavision_processing_completed to formavision_results_viewed | analytics_events | RECONCILED |
| Capture friction | formavision_capture_abandoned and formavision_capture_retake over formavision_capture_started; formavision_calibration_completed rate | analytics_events | RECONCILED |
| Results engagement | formavision_results_viewed, formavision_results_tab_viewed (by tab_name), formavision_compare_used, formavision_pdf_export | analytics_events | RECONCILED |
| Consent funnel | formavision_biometric_consent_viewed to formavision_biometric_consent_accepted vs formavision_biometric_consent_declined; model_improvement_opt_in rate | analytics_events | RECONCILED |
| Paywall funnel | formavision_premium_paywall_shown to formavision_premium_upgrade_clicked to formavision_premium_upgrade_completed (by trigger_point and sku) | analytics_events | RECONCILED |
| Tier mix | distribution across free / gold / platinum / platinum_family | /admin/analytics; subscription tables | RECONCILED (real slugs) |
| Platinum trial adoption | trial starts by source: self_initiated and practitioner_granted; trial-to-conversion | platinum_trials (deriveTrialState) | RECONCILED, but see gated note |
| Trial reminder funnel / auto-revert | trial reminder emails and the auto-revert cron | n/a | [gated: not built] The trial reminder emails and the auto-revert cron are not built; any funnel step that depends on them is gated until they ship |
| Feature adoption: Compare | formavision_compare_used over formavision_results_viewed | analytics_events | RECONCILED |
| Feature adoption: PDF export | formavision_pdf_export over formavision_results_viewed | analytics_events | RECONCILED |
| Feature adoption: practitioner share | formavision_practitioner_share_enabled | analytics_events | RECONCILED |
| Retention / cohorts | scan cohort retention and repeat-scan behavior | src/lib/analytics/retention-engine + cohort-engine; /admin/analytics/cohorts | RECONCILED (engines already compute this) |
| Engagement (Helix) | aggregate consumer engagement score; formavision_helix_event_emitted volume by event_type | DB trigger + analytics_events | RECONCILED (consumer-only; never on practitioner surfaces) |
| Settings adoption | formavision_settings_changed by setting_name (coarse), including numbers-optional toggles via enabled | analytics_events | RECONCILED |
| Inclusivity waitlist demand | formavision_inclusivity_waitlist_joined by requested_capability | analytics_events | RECONCILED |
| Dashboard card reach | formavision_dashboard_card_viewed by trigger_point | analytics_events | RECONCILED |

## Notes and ambiguities

- Trial reminders and auto-revert: 171 assumes a reminder-and-revert lifecycle. The platinum_trials data model and deriveTrialState are real, so trial STARTS and active-trial state are reportable today; the reminder emails and the auto-revert cron are NOT built, so any panel step that counts reminder sends or auto-revert events is marked [gated: not built] above. Report what platinum_trials supports and leave the gated steps empty until those mechanisms ship.
- All metric targets for these panels are Gary-owned and live in the post-launch review templates (docs/operations/post-launch-review-30-day-template.md and siblings), flagged there as estimates to confirm.
- No depth, CNN, or Tier 2 product panel appears here; those are Phase 2 and are documented as DEFERRED in the engineering spec. If a 171 product panel implies a depth or Tier 2 capability, it is out of scope until Phase 2 (gates in docs/formavision/phase-2-dependency-gates.md).
