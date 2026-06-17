# Prompt 201b: Google Health API Connector (web server-to-server)

Owner / entity: Farmceutica Wellness Ltd. Brand: Via Cura. Platform: ViaConnect.
Hub: My Biology (body composition) plus the Bio Optimization gauges. Owning agent:
Arnold, orchestrated by Jeffery.
Status: built and reviewed; feature-flagged OFF; held for Gary localhost sign-off and
Google Cloud provisioning before activation.

## Two stale premises corrected before any code

1. The spec depends on "Prompt 201a, the single cross-domain funnel with a domain tag."
   That funnel was never built. The Prompt 201 funnel (ingest-body-composition) is
   body-composition only. Decision (Gary): reuse the existing stores rather than build a
   new unified funnel. Body goes through the 201 funnel; vitals, sleep, and activity go to
   the Bio Optimization gauge stores that already exist.
2. The spec assumes the prior wearables OAuth pipeline (data_source_connections,
   tokenManager). That table was never applied to production (verified: to_regclass is
   null in live; the generic OAuth callback even carries a @ts-expect-error for it). So the
   connector keeps its connection and token state in body_tracker_connections (the Prompt
   201 table that does exist), tokens encrypted at the application layer.

Also verified against live before writing the gauge path: daily_scores keys on
(user_id, date) and has no score_date, data_mode, or source_breakdown column (migration
drift). The writer was built to the real schema, and source_breakdown was added additively.

## Architecture

One connector, real REST API, no Capacitor. OAuth 2.0 server-to-server. Three destination
stores, all already in production:

- body (weight, body_fat) -> Prompt 201 funnel (ingest-body-composition) in a new SERVICE
  mode -> body_composition_readings -> Arnold reconcile -> projection to body_tracker_weight.
  One funnel, one reconciliation.
- vitals (HRV, resting HR, oxygen saturation, respiratory rate, heart rate), sleep, activity
  (steps, distance, floors, exercise, active zone minutes, calories) -> daily_scores (the
  Bio Optimization gauge inputs) plus a wearable_integrations device row.
- tokens + connection state -> body_tracker_connections.metadata, encrypted.

The funnel's service mode: an internal caller presents the service-role key in
x-ingest-service-key (constant-time compared) plus a trusted userId in the body, since the
webhook and polling sync have no user session. The user-JWT path is unchanged. This keeps a
single ingestion funnel and one reconciliation for body data.

## Components

New library, src/lib/integrations/google-health/:
- config.ts: the single v4 schema map. Data-type registry with the kebab-case (endpoint) vs
  snake_case (filter) encoding, list-vs-reconcile per type, canonical units, domain routing
  targets, scope URLs. Pinned to v4. Everything PROVISIONAL until allowlisted; one-file fix.
- crypto.ts: AES-256-GCM token encryption (GOOGLE_HEALTH_TOKEN_KEY). Fails closed without a key.
- auth.ts: authorize-URL builder, code exchange, refresh (timeout + fail-open). Encrypts
  before store, decrypts on read, in body_tracker_connections.metadata.
- client.ts: REST v4 client (list + reconcile), abort-timeout, logs unexpected fields rather
  than throwing.
- provenance.ts: maps Google provenance to device_origin / app_origin; reuses Prompt 201 Hume
  tagging.
- ingest.ts: domain routing. Unit normalization to canonical plus sane-range rejection
  (UNKNOWN, never zero); body to the funnel; vitals/sleep/activity to daily_scores with a
  non-destructive merge (never downgrades a manual day; marks it mixed) plus
  wearable_integrations.
- sync.ts: pulls every enabled data type (concurrently) and routes; refreshes last-sync.

Routes, src/app/api/integrations/google-health/:
- start: builds the consent URL, httpOnly state cookie.
- callback: verifies state, exchanges code, stores encrypted tokens.
- webhook: verifies signature (fails closed without a secret), pulls the changed window, ingests.
- sync: polling fallback (CRON_SECRET protected, bounded concurrency, saturation log).

Wiring: connected-sources registry (google_health active oauth2; fitbit deprecated,
supersededBy google_health, connect control removed, history retained); funnel
SOURCE_CAPABILITIES; reconcile priority (native 0, google_health 1, apple_health 2, fitbit 3,
garmin 4, manual 5); appRegistry; feature flag google_health_connector (default off). UI: a
new oauth_connect card action, a superseded "Connect via Google Health" action for Fitbit,
data-type chips, success/error toasts.

## Applied to live now (safe, additive, flag-off)

- Migration: reconcile_body_composition priority adds google_health (relative order of
  existing sources preserved). Verified.
- Migration: daily_scores.source_breakdown jsonb added (additive, default empty). Verified.

## Deferred to staging activation (Gary)

- Redeploy ingest-body-composition with the service-mode branch and the google_health
  capability. NOT redeployed now on purpose: the branch is only exercised when the flag is on
  and a connection syncs, and redeploying the live funnel from hand-typed content risks the
  Apple Health and manual paths. Deploy it from the repo file (supabase functions deploy) at
  staging time.

## Review (Jeffery, security, Arnold, performance, Michelangelo) and fixes applied

- Service-mode key compare made constant-time.
- Webhook signature fails closed when GOOGLE_HEALTH_WEBHOOK_SECRET is unset.
- body_fat normalization driven by unit, not magnitude guessing; vitals clamped to sane ranges.
- Polling fan-out parallelized; bounded connection concurrency; no-silent-cap saturation log.
- daily_scores writer corrected to the real live schema (date key, no data_mode); the JSONB
  bag given a home.
- FUNNEL_URL guarded when the env var is absent.
- Hard rules verified: no em or en dashes; package.json untouched; no email template change;
  no edit to an applied migration; design tokens and Lucide strokeWidth 1.5 in the UI.

## Gary actions and open items

1. Provision the Google Cloud project, OAuth consent screen, enable the Google Health API,
   and provide GOOGLE_HEALTH_CLIENT_ID and GOOGLE_HEALTH_CLIENT_SECRET as server secrets.
   Confirm whether the Health API needs allowlisting or approval before production use
   (the spec flags this as a blocker to confirm before activation).
2. Provide GOOGLE_HEALTH_TOKEN_KEY (32 bytes, base64 or hex) and GOOGLE_HEALTH_WEBHOOK_SECRET.
3. Redeploy the ingest-body-composition edge function from the repo (service-mode branch).
4. Add /api/integrations/google-health/sync to the middleware cron allowlist and the Vercel
   cron schedule, or the polling fallback will 307 to login and never run.
5. Verify scope URLs, endpoint paths, the webhook signature scheme, and the provenance shape
   against live Google Health docs once allowlisted; they are centralized in config.ts and
   client.ts and marked PROVISIONAL.
6. Hannah/scoring: confirm whether active_zone_minutes or per-session exercise is canonical
   for the Exercise gauge, and that recovery_hrv (ms) and sleep_hours are the exact inputs the
   Recovery and Sleep weights expect.
7. Flip google_health_connector on (web) only after staging verification.

## Acceptance criteria status

Met in code, pending live verification with credentials: OAuth round-trip with encrypted
tokens and timed fail-open refresh; weight and body fat as latest-per-day with provenance;
vitals, sleep, activity to the gauges through the single funnel pattern with domain routing;
webhook with signature verify plus polling fallback; google_health active and fitbit
superseded with history retained; no nutrition path; v4 pinned and schema centralized;
timeouts, fail-open, structured logging throughout; additive migrations only; email templates
untouched; no package.json change; responsive, tokens applied, no emojis.

## Localhost verification steps

1. With the flag off, open My Biology then Connections. Google Health shows as coming soon;
   Fitbit shows "Now part of Google Health" with a Connect via Google Health control.
2. With the flag on (and credentials set) in staging, click Connect Google Health, complete
   consent, and confirm the card flips to connected with a last-sync time.
3. Trigger a sync and confirm weight and body fat appear in My Biology with a device badge,
   and that vitals/sleep/activity reach the gauges.
4. Re-run a sync and confirm idempotency (no duplicate body readings).
