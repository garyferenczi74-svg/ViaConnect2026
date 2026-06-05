// =============================================================================
// Prompt 175g (2026-06-05): client-side barcode telemetry sink.
//
// The supplement barcode scanner runs entirely client-side (html5-qrcode
// in the browser, no upload until the user confirms). 175f instrumented
// the decode loop with a per-second console log, but Vercel runtime logs
// do not capture browser console output, so verifying Gary's directed
// hypothesis "frames are not reaching the decoder" required either an
// iOS Safari Web Inspector trace or a server hop. This route is the
// server hop: a thin POST that takes a PHI-free stats payload and
// pushes one safeLog line to Vercel so the trace is observable in the
// same place every other supplement-vision diagnostic lives.
//
// Payload is bounded and PHI-free. No image data, no user input, no
// scanned barcode value. Counts, dimensions, library state, and a
// session id only.
// =============================================================================

import { NextResponse } from 'next/server';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface BarcodeTelemetryPayload {
  sessionId?: string;
  phase?: string;
  attemptsThisInterval?: number;
  attemptsTotal?: number;
  videoWidth?: number;
  videoHeight?: number;
  readyState?: number;
  scanState?: string;
  // Prompt 175h (2026-06-05): scanError surfaces the hook's error code
  // (permission_denied, no_camera_hardware, camera_in_use, etc.) so a
  // failed-startup session is distinguishable from a healthy one with
  // no decodes. PHI-free: enum value only.
  scanError?: string | null;
  html5QrcodeState?: number | null;
  elapsedMs?: number;
  // Prompt 175h: decoded_rejected phase carries the symbology +
  // length + rejection reason so Vercel logs can tell apart
  //   "ZXing found alphanumeric CODE_128 (Amazon ASIN) -> dropped"
  //   "ZXing found numeric 12-digit but checksum failed -> dropped"
  //   "ZXing found a 9-digit string -> wrong_length -> dropped"
  //   "ZXing never decoded anything"
  // The scanned VALUE is never accepted by the endpoint.
  rejectionReason?: string;
  rejectedFormat?: string;
  valueLength?: number;
}

export async function POST(request: Request) {
  let body: BarcodeTelemetryPayload | null = null;
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === 'object') {
      body = parsed as BarcodeTelemetryPayload;
    }
  } catch {
    body = null;
  }

  if (!body) {
    return NextResponse.json({ ok: false, reason: 'invalid_body' }, { status: 200 });
  }

  // Whitelist + clamp the fields so a runaway client cannot push large
  // strings into the runtime log.
  safeLog.info('caq.supplement-barcode.telemetry', body.phase ?? 'tick', {
    sessionId: typeof body.sessionId === 'string' ? body.sessionId.slice(0, 64) : null,
    phase: typeof body.phase === 'string' ? body.phase.slice(0, 32) : null,
    attemptsThisInterval: clampInt(body.attemptsThisInterval),
    attemptsTotal: clampInt(body.attemptsTotal),
    videoWidth: clampInt(body.videoWidth),
    videoHeight: clampInt(body.videoHeight),
    readyState: clampInt(body.readyState),
    scanState: typeof body.scanState === 'string' ? body.scanState.slice(0, 32) : null,
    scanError: typeof body.scanError === 'string' ? body.scanError.slice(0, 64) : null,
    html5QrcodeState: clampInt(body.html5QrcodeState),
    elapsedMs: clampInt(body.elapsedMs),
    rejectionReason: typeof body.rejectionReason === 'string' ? body.rejectionReason.slice(0, 32) : null,
    rejectedFormat: typeof body.rejectedFormat === 'string' ? body.rejectedFormat.slice(0, 16) : null,
    valueLength: clampInt(body.valueLength),
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

function clampInt(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  const i = Math.floor(v);
  if (i < 0) return 0;
  if (i > 100_000_000) return 100_000_000;
  return i;
}
