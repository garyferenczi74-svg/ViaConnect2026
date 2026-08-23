/**
 * POST /api/genetics/lifemetrics/webhook
 *
 * Inbound LifeMetrics receiver for Farmceutica Wellness (y0urbrand tenant 355).
 * Existing POST /api/genex/genemetrics outbound poll stays. This route is the
 * webhook they can point at once tenant 355 has a key and a webhook secret.
 *
 * How to set the webhook URL once keys exist:
 *   1. Set LIFEMETRICS_WEBHOOK_SECRET (and LIFEMETRICS_API_KEY if you want the
 *      optional pull helper) in the ViaConnect host env. Do not commit secrets.
 *   2. In https://farmceutica-wellness.labs.y0urbrand.com/admin/tenants/355
 *      create a webhook subscription to:
 *      https://www.viaconnectapp.com/api/genetics/lifemetrics/webhook
 *   3. Subscribe to genetics_result.uploaded, genome_result.processing_succeeded,
 *      lab_results.received, lab_order.results_ready. Optional metadata-only
 *      event: insight_report.generation_succeeded.
 *   LifeMetrics may sign with X-LifeMetrics-Signature or X-Webhook-Signature
 *   (HMAC-SHA256 of the raw body). This receiver accepts either.
 *
 * Fail closed on a missing or bad HMAC. Idempotent on event_id. No genetics
 * in logs. UNKNOWN counts stay null, never a fabricated 0.
 *
 * Standing rules: no em or en dashes, TypeScript strict (no any).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { readLifemetricsWebhookSecret } from '@/lib/genetics/lifemetricsWebhookSignature';
import { handleLifemetricsWebhook } from '@/lib/genetics/lifemetricsWebhookHandler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  let admin = null;
  try {
    admin = createAdminClient();
  } catch {
    admin = null;
  }
  const result = await handleLifemetricsWebhook(
    rawBody,
    request.headers,
    readLifemetricsWebhookSecret(),
    admin,
  );
  return NextResponse.json(result.body, { status: result.status });
}
