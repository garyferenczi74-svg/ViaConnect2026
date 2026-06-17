# Prompt 203: Google Health Connector Activation and Staging Validation

Owner / entity: Farmceutica Wellness Ltd. Brand: Via Cura. Platform: ViaConnect.
Hubs: My Biology (body composition), Bio Optimization gauges (vitals, sleep, activity).
Owning agent: Arnold, orchestrated by Jeffery.
Depends on: Prompt 201b (the connector, built and deployed, dormant behind two flags).

This prompt does not rebuild the connector. It provisions the OAuth credentials
(Gary), flips the two flags on in staging then production (Gary), and validates
three details the code was guessing at against real payloads: the data-point JSON
field shape, the webhook signature scheme, and the getIdentity account mapping.

## What was prepared in code so the staging pass is a single round-trip

1. getIdentity account mapping. The connect callback now calls
   GET /v4/users/me/identity and stores healthUserId and legacyUserId in
   body_tracker_connections.metadata. The webhook routes a notification to the
   user whose stored health_user_id matches the payload healthUserId, falling
   back to the single active connection. (src/lib/integrations/google-health/
   client.ts fetchIdentity, auth.ts storeConnection, callback route.)

2. Real webhook signature verification. webhook-signature.ts implements ECDSA
   P-256 (SHA-256) verification of the raw body against Google's Tink keyset
   (https://www.gstatic.com/googlehealthapi/webhooks/webhooks_public_keyset.json,
   cached 1 hour). It parses the EcdsaPublicKey protobuf (x, y), handles the Tink
   5-byte output prefix, normalizes DER vs IEEE-P1363, and verifies via Web
   Crypto. It is fail-closed by construction: every error path returns false and
   it returns true only on a real cryptographic match, so a parsing bug cannot
   forge a pass. The webhook is now verify-and-ingest: a verified notification
   pulls and ingests; an unverified one is acknowledged with 204 and takes no
   action, with the six-hourly polling sync as the safety net. Because the exact
   signature header name and Tink encoding are confirmed by the first real
   notification, the verifier brute-forces the small candidate space (header name,
   prefix-stripped or not, DER or P1363).

3. Staging capture. With GOOGLE_HEALTH_CAPTURE=true, the connector logs the raw
   first data points per type, the identity response, and the webhook header names
   plus raw body, so the field mapping, units, and signature can be confirmed from
   one staging connect. Default off. Logs may contain PHI, so this is a staging
   tool, not a production default.

No new packages. No schema change (metadata is an existing jsonb column). Email
templates untouched.

## Gary actions (Part A and B)

Part A, Google Cloud:
- Create or confirm a Google Cloud project; enable the Google Health API; confirm
  availability or complete allowlisting / partner enrollment.
- OAuth consent screen: app name, support email, and the read scopes the connector
  uses (health metrics and measurements, activity and fitness, sleep). These are
  sensitive health scopes; for external production Google may require app
  verification and a security assessment. Testing mode with test users is the
  right path for the staging pass and initial use. Confirm the requirement.
- Create an OAuth 2.0 Web Application client; set authorized redirect URIs to the
  callback on both the staging or preview domain and viaconnectapp.com:
  https://<domain>/api/integrations/google-health/callback
- Capture the Client ID, Client Secret, and redirect URIs.

Part B, staging env and flags (Vercel Preview/staging only):
- Set GOOGLE_HEALTH_CLIENT_ID, GOOGLE_HEALTH_CLIENT_SECRET, GOOGLE_HEALTH_TOKEN_KEY
  (32 bytes, openssl rand -base64 32), and confirm CRON_SECRET.
- Set GOOGLE_HEALTH_CAPTURE=true for the validation pass.
- Flip GOOGLE_HEALTH_CONNECTOR=true and NEXT_PUBLIC_GOOGLE_HEALTH_CONNECTOR=true in
  staging only. Leave production off.
- GOOGLE_HEALTH_WEBHOOK_SECRET is no longer used (ECDSA replaces the prior HMAC).
- Confirm the middleware allowlist entry for /api/integrations/google-health/sync
  and the vercel.json cron are intact.

## Part C, the staging validation (what to send me)

Connect a real Google account with a Fitbit or Pixel Watch that has body
composition and vitals history. Then send me the structured logs (scope
lib.integrations.google-health.* and api.integrations.google-health.*), in
particular the capture lines:
- "capture: identity" (so I confirm the healthUserId field name and mapping)
- "capture: raw dataPoints" per type (so I confirm the value field names, units,
  and the time field, and fix any mismatch in the parser)
- "capture: webhook received" (so I confirm the exact signature header name and
  the raw body) plus whether "webhook sync complete" appears (verification passed)
  or the fail-closed path was taken.

With those I will correct any field or unit mismatch, finalize the webhook
verifier if the encoding differs, and confirm last-write-wins for weight and body
fat and the data_type.interval.start_time range plus pagination.

## Part D, production cutover (only after staging is green)

- Set the same secrets on production with the production redirect URI; leave
  GOOGLE_HEALTH_CAPTURE off in production.
- Flip GOOGLE_HEALTH_CONNECTOR and NEXT_PUBLIC_GOOGLE_HEALTH_CONNECTOR on.
- Watch the first cron cycle and the first real webhook in Vercel runtime logs;
  confirm readings appear for a real user.

## Rollback

The connector is flag-gated. Turning both flags off returns it to dormant
instantly, no redeploy. That is the immediate revert if anything misbehaves.

## Open item (timeline risk)

Confirm in the Google console whether the health scopes require app verification
or a security assessment for external production use, and whether testing mode
with test users is sufficient for the initial rollout. Check early so it does not
block the production cutover.
