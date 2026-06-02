# Sev 1: Payment Failure (on-call playbook)

Entity: Farmceutica Wellness Ltd. Platform: ViaConnect. Consumer brand: Via Cura.

Status: RECONCILED PLAYBOOK, drafted 2026-06-01 (Prompt 171 Sections 8.2, 8.3). Reconciled to the real Stripe and memberships flow per docs/operations/telemetry-architecture.md.

NOTE ON ALERTING: the alerting layer (PagerDuty or Opsgenie plus Sentry plus Better Uptime) is NOT deployed yet. The thresholds below are the SPEC to configure at launch; until then they are watched manually via Vercel logs, the Stripe dashboard, and /admin/alerts.

## Alert and threshold (Section 8.2)

- Trigger: Stripe webhooks are failing or payments / upgrades are not being recorded, so paid access (Platinum, and Body Scan which is Platinum-and-above) does not provision.
- Threshold (spec to configure): Stripe webhook failure rate or checkout success rate breaches the Section 8.2 payment threshold; or formavision_premium_upgrade_completed (formavision_ catalog) drops to zero while formavision_premium_upgrade_clicked continues. Configure the exact values when the pager and Stripe alerting are wired.
- Severity: Sev 1 (revenue and entitlement impacting).

## Real payment surfaces

- Stripe webhook routes: src/app/api/webhooks/stripe/route.ts and src/app/api/stripe/webhook/route.ts.
- Webhook handlers: src/lib/pricing/stripe-webhook-handlers.ts; Stripe client and checkout in src/lib/pricing/stripe.ts and src/lib/pricing/stripe-checkout.ts.
- Memberships / entitlement: Body Scan is Platinum-and-above only. The entitlement is resolved server-side at scan finalize (resolveBodyScanEntitlement in supabase/functions/body-scan-analyze/entitlement.ts and the SQL resolver fn_resolve_body_scan_tier_status). Real tier slugs: free, gold, platinum, platinum_family. Trials: platinum_trials (self_initiated, practitioner_granted).
- Scan upgrade events: formavision_premium_paywall_shown, formavision_premium_upgrade_clicked, formavision_premium_upgrade_completed.

## Typical causes

- Stripe webhook signature verification failing (wrong or rotated webhook signing secret).
- The webhook endpoint erroring (handler exception, timeout) so Stripe retries pile up.
- A checkout.session or invoice.payment event not mapping to a membership update, so paid access does not provision.
- Stripe-side incident or rate limiting.
- A subscription updated in Stripe but the entitlement not re-resolving, so a paid user still hits the Body Scan paywall (premium_required 402).

## Triage steps (reconciled to the real system)

1. Check the Stripe dashboard: are events being delivered, and are deliveries succeeding or failing/retrying against the two webhook routes above?
2. Read the webhook logs: the routes and src/lib/pricing/stripe-webhook-handlers.ts log via safe-log structured logging to Vercel. Look for signature-verification failures and handler exceptions.
3. Verify the webhook signing secret matches the Stripe endpoint; a rotated secret breaks verification for every event.
4. Confirm event-to-membership mapping: for a recent paid customer, trace the Stripe event to the membership/subscription write. If the write is missing, the handler mapping is the fault.
5. Check entitlement resolution: if payment succeeded but Body Scan still shows the paywall, look at the body-scan-analyze entitlement.ts path and the SQL resolver; a non-entitled result returns premium_required (402). Confirm the subscription tier resolves to platinum or platinum_family (or an accepted family link), not a stale value.
6. For trials, confirm platinum_trials state via deriveTrialState; note the trial reminder emails and the auto-revert cron are NOT built, so do not chase a missing reminder or revert event.
7. If the failure is Stripe-side, confirm via Stripe status and move to monitoring and customer communication.

## Escalation (Section 8.3)

- First responder: engineering on-call (role), with the payments owner (role) looped in.
- Escalation point: Gary (per Section 8.3) for any revenue-impacting Sev 1, any customer refund or communication decision, and any secret rotation.
- Record the impacted customers and the timeline for the post-incident review.

## Post-incident review

File a post-incident review using the template in docs/operations/incidents/ (create that directory at launch if it does not exist yet). Include the impacted-payment list, the root cause, the fix, and any reconciliation or refunds.
