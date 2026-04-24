// Prompt #124 P5: Consumer-report intake endpoint.
//
// POST /api/marshall/vision/consumer-reports
// Accepts multipart form-data with:
//   concernDescription: string (20..2000)
//   purchaseLocation?:  string
//   purchaseDate?:      ISO yyyy-mm-dd
//   orderNumber?:       string
//   email?:             string (optional, for follow-up)
//   honeypot:           string (must be empty; spam trap)
//   images:             File[] (1..4 JPEG/PNG/WebP/HEIC, <= 10 MB each)
//
// Auth: OPTIONAL. Logged-in consumers' submissions are linked to
// auth.users via submitted_by_user_id; anonymous submissions use the
// service-role client (no direct anon INSERT RLS path exists by design).
//
// Rate limiting: in-memory IP bucket (5 submissions per IP per hour). For
// production this should be replaced with a distributed counter, noted in
// the P5 Jeffery forward-log.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { submitConsumerReport, ConsumerIntakeError } from '@/lib/marshall/vision/consumerIntake';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif',
]);

// Per-IP bucket: 5 submissions per hour. In-memory only (per serverless
// instance); acceptable for P5, flag for distributed rate-limit upgrade.
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT = 5;
const ipBuckets = new Map<string, number[]>();

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!acceptIp(ip)) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many submissions from this IP. Try again later.' },
      { status: 429 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'invalid_form' }, { status: 400 });
  }

  // Honeypot: any non-empty value indicates a bot.
  if ((form.get('honeypot') as string | null)?.trim()) {
    // Return 200 to avoid signaling the bot; log nothing identifying.
    return NextResponse.json({ ok: true, reportId: 'drop' });
  }

  const concernDescription = String(form.get('concernDescription') ?? '').trim();
  const purchaseLocation = strOrNull(form.get('purchaseLocation'));
  const purchaseDate = strOrNull(form.get('purchaseDate'));
  const orderNumber = strOrNull(form.get('orderNumber'));
  const email = strOrNull(form.get('email'));

  const images: Array<{ bytes: Uint8Array; declaredContentType?: string }> = [];
  const imageFields = form.getAll('images');
  for (const v of imageFields) {
    if (!(v instanceof Blob)) continue;
    if (v.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: 'image_too_large', message: `Each image must be <= ${MAX_IMAGE_BYTES / 1024 / 1024} MB` },
        { status: 400 },
      );
    }
    if (v.type && !ALLOWED_CONTENT_TYPES.has(v.type)) {
      return NextResponse.json(
        { error: 'unsupported_image_type', message: `Allowed: JPEG, PNG, WebP, HEIC. Got: ${v.type}` },
        { status: 400 },
      );
    }
    const ab = await v.arrayBuffer();
    images.push({ bytes: new Uint8Array(ab), declaredContentType: v.type || undefined });
    if (images.length >= MAX_IMAGES) break;
  }

  // Optional user context (if the consumer is logged in).
  const sessionClient = createServerClient();
  const { data: { user } } = await sessionClient.auth.getUser();

  const supabaseWriter = createAdminClient();

  try {
    const result = await submitConsumerReport({
      supabase: supabaseWriter,
      submission: {
        submittedByUserId: user?.id,
        submittedByEmail: email ?? undefined,
        purchaseLocation: purchaseLocation ?? undefined,
        purchaseDate: purchaseDate ?? undefined,
        orderNumber: orderNumber ?? undefined,
        concernDescription,
        images,
      },
    });
    return NextResponse.json({
      ok: true,
      reportId: result.reportId,
      phiRedactionApplied: result.phiRedactionApplied,
      acknowledgment: result.acknowledgment,
    });
  } catch (err) {
    if (err instanceof ConsumerIntakeError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 400 });
    }
    // eslint-disable-next-line no-console
    console.error('[consumer-report] submit failed', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

function strOrNull(v: FormDataEntryValue | null): string | null {
  if (v === null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

function acceptIp(ip: string): boolean {
  const now = Date.now();
  const bucket = ipBuckets.get(ip) ?? [];
  const fresh = bucket.filter((t) => now - t < RATE_WINDOW_MS);
  if (fresh.length >= RATE_LIMIT) {
    ipBuckets.set(ip, fresh);
    return false;
  }
  fresh.push(now);
  ipBuckets.set(ip, fresh);
  return true;
}
