# Compliance Dashboard Spec (Prompt 171 Section 3.4, reconciled)

Entity: Farmceutica Wellness Ltd. Platform: ViaConnect. Consumer brand: Via Cura. Tagline: Built For Your Biology.

Status: RECONCILED SPEC, drafted 2026-06-01. This transcribes the Prompt 171 Section 3.4 panel list and reconciles every panel to the real consent, age-gate, and scan-governance mechanisms per docs/operations/telemetry-architecture.md.

- Audience: compliance owner and the platform owner (Gary).
- Refresh cadence: daily for consent, deletion, and age-gate panels; weekly for retention and geo rollups.
- Tool: Metabase (BI over Supabase) for presentation, not deployed yet. Until it is, these read from the Supabase tables below plus the body_scan_ consent events, surfaced at /admin/compliance and /admin/compliance/audit, which already exist and are RLS gated.
- Existing admin surfaces: /admin/compliance (and /admin/compliance/audit, /admin/compliance/alerts) is the live home for these panels today.

## Real foundation this dashboard reads

- Consent: the biometric_consents table is the system of record (current consent_version per the consent flow; CURRENT_CONSENT_VERSION in src/lib/body-tracker/biometric-consent.ts). Consent funnel events: biometric_consent_viewed, biometric_consent_accepted, biometric_consent_declined (body_scan_ catalog), plus the separate model_improvement_opt_in flag.
- Age gate: enforced in the body_photo_sessions finalize trigger (migration 20260516000080), which re-derives age from profiles.date_of_birth and blocks a proven minor unless a verified practitioner supplied a clinical_override_reason. The client/edge layer mirrors this in src/lib/body-tracker/age-frequency-gate.ts and the body-scan-analyze entitlement path (BODY_SCAN_MIN_AGE = 18).
- Practitioner-managed scans: stamped on body_photo_sessions as premium_status_at_scan = practitioner_managed, with practitioner_id and (for a minor) clinical_override_reason. The managed bypass is granted ONLY after server-side verification (verifyPractitionerManaged).
- Inclusivity waitlist: inclusivity_waitlist_joined event (by requested_capability) records demand for expanded scanning the current model does not serve.
- Consent enforcement at finalize (migration 20260516000100) is DEFINED but NOT WIRED: it would add a non-bypassable consent gate at the DB layer; it is inert until a human applies it at launch (applying it before consent rows exist would block all scans).

## Section 3.4 panels (reconciled)

| 171 panel | Reconciled mapping | Source | Status |
| --- | --- | --- | --- |
| Consent acceptance rate | biometric_consent_accepted over biometric_consent_viewed; declines via biometric_consent_declined | analytics_events (body_scan_) | RECONCILED |
| Active consent coverage | count of users with a CURRENT biometric_consents row (consent_version in force) | biometric_consents | RECONCILED |
| Consent version drift | users on an older consent_version vs CURRENT_CONSENT_VERSION | biometric_consents vs biometric-consent.ts | RECONCILED |
| Model-improvement opt-in rate | model_improvement_opt_in true vs false at consent | analytics_events | RECONCILED |
| Consent-gate enforcement status | whether the DB consent gate (migration 20260516000100) is wired | n/a (config) | RECONCILED as a STATUS tile: the gate is defined but NOT wired today; show its applied/not-applied state and the launch-apply checklist |
| Deletion requests | biometric and account deletion request volume and SLA | deletion/compliance tables; /admin/compliance | RECONCILED (surface exists) |
| Data retention posture | retention windows and any past-retention data | compliance tables; /admin/compliance | RECONCILED |
| Age gate: minors blocked | finalize-trigger age-gate blocks (proven minor rejected) | body-scan-analyze safe-log age gate blocked lines + the finalize trigger | RECONCILED |
| Age gate: practitioner overrides | minor scans allowed via a verified practitioner override, with clinical_override_reason recorded | body_photo_sessions (clinical_override_reason, practitioner_id); safe-log practitioner override lines | RECONCILED |
| DOB-missing prompts | users steered to complete CAQ because no DOB is on file | age-frequency-gate dob_missing decision | RECONCILED |
| Practitioner-managed scan volume | scans stamped premium_status_at_scan = practitioner_managed | body_photo_sessions | RECONCILED |
| Geo / region availability | where scans are offered vs withheld | international availability matrix | RECONCILED, but cross-owned: the geo source is the 174 / international surface (/admin/international/availability-matrix). Reference it; do not rebuild it here |
| Inclusivity waitlist volume | inclusivity_waitlist_joined by requested_capability | analytics_events | RECONCILED |
| Disordered-eating response handling | confirm the response NEVER appears in any analytics or practitioner payload | n/a (assertion) | RECONCILED as a GUARANTEE tile, NOT a data panel: the response is profile-only by design (the analytics guard blocks it; assertResponseNotInPractitionerPayload enforces it). Show pass/fail of the biometric-exclusion test, never the response itself |

## Notes and ambiguities

- The consent enforcement migration (20260516000100) is intentionally inert. The dashboard should surface its wired/not-wired state and the human launch-apply checklist, not assume the DB gate is live. Until it is wired, consent is enforced by the application flow plus the funnel events, not by a non-bypassable DB gate.
- The disordered-eating response is never a metric. It is the sharpest privacy case: the analytics guard (scan-analytics.ts) blocks every biometric and the disordered-eating fragments, and the response is absent from every practitioner payload type. Represent it only as a guarantee/test-status tile.
- Geo availability is cross-owned with the 174 international workstream; reference the availability matrix rather than sourcing region data here.
- No depth, CNN, or Tier 2 compliance panel appears; those Phase 2 capabilities do not exist (DEFERRED, see the engineering spec and docs/formavision/phase-2-dependency-gates.md).
