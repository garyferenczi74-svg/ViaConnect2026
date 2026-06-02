# Safety and Clinical Dashboard Spec (Prompt 171 Section 3.5, reconciled)

Entity: Farmceutica Wellness Ltd. Platform: ViaConnect. Consumer brand: Via Cura. Tagline: Built For Your Biology.

Status: RECONCILED SPEC, drafted 2026-06-01. This transcribes the Prompt 171 Section 3.5 panel list and reconciles every panel to the real 169b safeguards per docs/operations/telemetry-architecture.md.

- Audience: ROLE only, the clinical lead. 171 names a specific individual for this dashboard. Per the standing attribution rule, the named individual requires Gary's written attribution sign-off before being listed or granted access; until then this dashboard's audience is the clinical-lead role, not a person. Do not transcribe the name.
- Refresh cadence: daily for safeguard and frequency-limiter panels; weekly for the adoption rollups.
- Tool: Metabase (BI over Supabase) for presentation, not deployed yet. Until it is, these read from the Supabase tables and the formavision_ events below. There is no separate live "safety" admin surface today; the closest is /admin/compliance for the consent and governance overlap.

## Real foundation this dashboard reads

The 169b safeguards (spec section 3) are real and pure-tested:
- Disordered-eating response: src/lib/body-tracker/disordered-eating-safeguard.ts. Four machine values (currently, in_the_past, no, prefer_not_to_say). Response-adaptive defaults tune numbers-optional, scan-frequency suggestion, the resource card, and whether body fat is hidden by default. The RESPONSE is profile-only and NEVER leaves the profile; it is absent from analytics and from every practitioner payload (enforced by the analytics guard and assertResponseNotInPractitionerPayload).
- Numbers-optional: src/lib/body-tracker/numbers-optional.ts plus profiles.numbers_optional. Hides precise numbers; body fat percentage and visceral fat index are hidden entirely when on.
- 24h frequency limiter and the slow-down advisory: src/lib/body-tracker/age-frequency-gate.ts (at most one completed scan per 24h; a 3-attempts-in-7-days advisory). Authoritatively enforced by the body_photo_sessions finalize trigger.
- Support / resource card: trackResourceCardViewed (formavision_ catalog), resource_type is a coarse category only.

## Section 3.5 panels (reconciled)

| 171 panel | Reconciled mapping | Source / events | Status |
| --- | --- | --- | --- |
| Safeguard reach: question answered | formavision_disordered_eating_question_answered (records ONLY that it was answered; never the response) | analytics_events (formavision_) | RECONCILED (answered-only; response never surfaced) |
| Support resource card shown | formavision_resource_card_viewed by resource_type (coarse) | analytics_events | RECONCILED |
| Response distribution | breakdown of the four disordered-eating responses | n/a | DO NOT BUILD: the response is profile-only by design and is blocked from analytics and from any aggregate. Represent the safeguard by reach (answered) and resource-card shows, never by response mix. This is a deliberate non-panel |
| Numbers-optional adoption | numbers-optional ON rate via formavision_settings_changed (enabled) for the numbers-optional toggle | analytics_events | RECONCILED |
| Frequency limiter hits | completed-scan-per-24h blocks | body-scan-analyze safe-log frequency limited lines + the finalize trigger | RECONCILED |
| Slow-down advisory shows | 3-plus attempts in 7 days advisory surfaced | shouldShowSlowDownBanner signal (client) | RECONCILED (informational; never blocks) |
| Adaptive-default application | how often each disordered-eating response triggered its defaults | n/a | PARTIAL: the response that drove the default is profile-only, so report only the OUTCOME signals (numbers-optional ON rate, resource-card persistence shows), not which response caused them |
| Pregnancy mode | pregnancy-aware safeguard behavior | n/a | HOOKED, NO DATA SIGNAL YET: pregnancy mode is hooked in the codebase but emits no signal yet, so there is no event or table to populate this panel. Leave it as a placeholder tile noting the hook exists and no data flows yet |
| Age gate (safety view) | proven-minor blocks and practitioner overrides, from a safety lens | finalize trigger; body_photo_sessions clinical_override_reason | RECONCILED (shares source with the compliance dashboard) |
| Inclusivity waitlist | formavision_inclusivity_waitlist_joined by requested_capability (who the current model does not serve well) | analytics_events | RECONCILED |
| Clinical escalation log | any scan flagged for clinical review | n/a | PARTIAL / NEEDS DEFINITION: there is no dedicated clinical-escalation table today; the nearest real signal is the resource-card trigger and the safeguard defaults. If a formal escalation log is wanted, it is new work to define with the clinical lead, not an existing source |

## Notes and ambiguities

- Audience is the clinical-lead ROLE. Naming the specific individual and granting access is a Gary attribution decision; this spec does not name them.
- The disordered-eating RESPONSE is never a metric anywhere. The biometric-exclusion guard (scan-analytics.ts) and assertResponseNotInPractitionerPayload enforce this. Report the safeguard by reach and outcome signals only.
- Pregnancy mode: hooked, no data signal yet. Do not invent a source; leave the placeholder.
- The clinical-escalation panel has no existing data source. Flagged as needing definition rather than wired to an invented table.
- No depth, CNN, or Tier 2 safety panel appears; those Phase 2 capabilities do not exist (DEFERRED, see the engineering spec and docs/formavision/phase-2-dependency-gates.md).
