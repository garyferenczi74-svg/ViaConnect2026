# Prompt 201: Hume Body Pod Plug-In and Connected Sources Build-Out

Owner / entity: Farmceutica Wellness Ltd. Brand: Via Cura. Platform: ViaConnect.
Hub: My Biology (route /body-tracker). Owning agent: Arnold, orchestrated by Jeffery.
Status: built and reviewed; held for Gary localhost sign-off before the app code goes to main.

## What was decided up front (corrects the stale assumptions)

- Hume Health has no public developer API. Hume is an attribution origin only, tagged as
  device_origin = 'hume_body_pod'. No code calls, OAuths into, or polls a Hume endpoint.
  This supersedes the Prompt 77 and 85 device series.
- There was no "unified body-composition store" in the codebase. Body composition lives in
  the wide denormalized body_tracker_weight table, which is what the hub and gauges read.
  Per Gary: a new normalized readings table is the funnel target, and Arnold reconciliation
  projects the resolved winner into body_tracker_weight so existing surfaces show imported
  data with no redesign.
- body_tracker_connections did not exist in the live database (migration drift). It was
  created additively with the Prompt 201 shape.

## Architecture

One funnel, many sources. Web Apple Health import and the future native bridge both post
NormalizedSample[] to a single ingestion edge function. No second pipeline.

Flow: source -> normalize -> ingest-body-composition (capability-validate, idempotent
upsert) -> reconcile_body_composition RPC (winner per metric and UTC day by source
priority, alternates retained via superseded_by) -> projection into body_tracker_weight.

## Components shipped

Schema (additive migrations 20260615000010 through 000014, all live):
- body_composition_readings: normalized store. Columns source_id, device_origin, metric_key,
  value (null when UNKNOWN, never zero), unit, measured_at, external_id, is_estimated,
  confidence, is_resolved, superseded_by, metadata. Plain unique idempotency index on
  (user_id, source_id, metric_key, measured_at, external_id). RLS own-row.
- body_tracker_connections: per-source connection state (status, last_sync_at, auth_method,
  metadata). RLS own-row.
- apple_health_imports: parse staging and summary. RLS own-row.
- reconcile_body_composition(user_id, days[]): SECURITY DEFINER, service_role only, sargable
  range plus exact day-set membership, set-based winner resolution.
- apple-health-imports storage bucket: private, own-folder RLS.

Registry: src/lib/body-tracker/connected-sources/registry.ts and metrics.ts. Single source of
truth for the 5 sources (apple_health active, manual_entry active, google_health_connect,
fitbit, garmin scaffolded), the ConnectedSource shape, the BodyMetricKey taxonomy, and the
configurable Hume match list ("hume health", "hume", "fittrack").

Ingestion funnel: supabase/functions/ingest-body-composition/index.ts. Deployed and ACTIVE,
verify_jwt on. User resolved server-side from the JWT, capability validation vs the registry,
idempotent upsert, reconcile RPC, bounded projection (120-day cap, logged), timeouts and
fail-open and structured logging throughout.

Apple Health parser: src/app/api/body-tracker/connected-sources/apple-health/parse/route.ts.
Streams the export zip from storage (fflate streaming Unzip plus chunked Record extraction so
the large XML is never fully in memory), extracts the 4 HealthKit body-composition types,
normalizes units (lb to kg, g to kg, body-fat fraction to 0-100, original retained), attributes
Hume per record, posts two device-origin batches to the funnel, writes the import summary.
Storage path is derived server-side (no IDOR), with a basename match and a decompressed-size cap.

UI: src/app/(app)/(consumer)/body-tracker/connections/page.tsx (registry-driven) plus
src/components/body-tracker/connected-sources/ (ConnectedSourceCard, AppleHealthImportModal,
ManualEntryModal, iconMap). Drag-drop import with a results summary and a Hume Body Pod
attribution count, a Manual Entry modal carrying the full metric set (unfilled stay UNKNOWN),
scaffold cards disabled with honest notes, and the native control feature-detected via
detectPlatform and gated behind the native_health_bridge flag (default off, no Capacitor or
HealthKit package added).

## Acceptance criteria status

Met: no Hume API; registry-driven page; Apple Health ingest of weight, body fat, lean mass, BMI
with Hume badging; re-import idempotency and deduped count; unit normalization to canonical with
the original retained; UNKNOWN not zero; manual full-set entry; single funnel; reconciliation
priority with retained alternates; native control feature-detected and flag-gated off; timeouts,
fail-open, structured logging; responsive with design tokens, no emojis, Lucide strokeWidth 1.5;
additive migrations only, no email templates touched, package.json untouched.

## Review (Jeffery, Arnold, Michelangelo, security, performance)

HOLD with 4 bounded must-fix items, all applied:
1. Projection stamps body_tracker_weight.created_at to the measurement day so a back-dated
   import never flips the displayed current weight.
2. Parse route derives the storage path server-side (closes a potential cross-tenant read).
3. Parse route adds a decompressed-size cap and a basename match (zip-bomb and entry-name guards).
4. Reconcile RPC uses a sargable measured_at range plus a supporting index.

## Deferred (nice-to-have, not blocking)

- skeletal_muscle_mass and metabolic_age are stored in body_composition_readings but not yet
  projected to body_tracker_weight (no column) or surfaced on the hub. Not lost; a future view.
- A Hume provenance chip where imported data lands on the hub and weight surfaces.
- Partial projection index and (select auth.uid()) RLS wraps (autohealer handles the latter).

## Separate pre-existing bug (out of 201 scope)

src/lib/scoring/sources/body-tracker-source.ts selects weight_kg and recorded_at from
body_tracker_weight, which has neither column, so that scoring source returns a null latest
weight today. Not introduced by 201. Recommend a follow-up fix.

## Localhost verification steps

1. Open My Biology then Connections. Confirm the 5 source cards render with accurate statuses
   and notes.
2. Upload a real Apple Health export that includes Body Pod readings. Confirm the summary shows
   imported counts, the date range, and a Hume Body Pod attribution count.
3. Re-upload the same file. Confirm zero new rows and a nonzero deduped count.
4. Add a manual reading with only weight filled. Confirm the other fields read as Not available
   rather than 0.
5. Confirm weight, body fat, lean mass, and BMI appear in the body-composition view with the
   correct source badges.
6. Confirm a mobile viewport is usable and on-brand.
