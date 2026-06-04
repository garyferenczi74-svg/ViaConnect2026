import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { withAbortTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { getCircuitBreaker, isCircuitBreakerError } from '@/lib/utils/circuit-breaker';

// Prompt 175 Part A (2026-06-04): every user-facing error string in this
// route has been replaced with neutral copy + a typed outcome code so the
// CAQ photo block can degrade gracefully to its existing manual search.
// The string "ANTHROPIC_API_KEY not set in .env.local" must NEVER reach
// the browser; server-side safeLog retains the actual condition.

const visionBreaker = getCircuitBreaker('claude-vision');

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ANTHROPIC_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type AnthropicMime = typeof ANTHROPIC_ALLOWED_MIME[number];
const HEIC_MIME = ['image/heic', 'image/heif'];
const MAX_BYTES_AFTER_NORMALIZE = 5 * 1024 * 1024;

// Neutral user-facing copy mapped from internal outcome codes. Never names
// the internal config or the upstream provider.
const USER_MESSAGE_FOR_MANUAL_FALLBACK =
  'We could not read your label automatically. Please add it using the search below.';
const USER_MESSAGE_FOR_RETRY =
  'Photo analysis hit a snag. Please try again, or add it using the search below.';
const USER_MESSAGE_FOR_UNSUPPORTED =
  'Unsupported image format. Please use a JPEG, PNG, WebP, or HEIC photo.';
const USER_MESSAGE_FOR_HEIC_CONVERT =
  'Could not read that HEIC photo. Try retaking in JPG mode, or upload a different photo.';

type SupplementVisionOutcome =
  | 'success'
  | 'config_missing'
  | 'circuit_open'
  | 'timeout'
  | 'upstream_error'
  | 'unsupported_image'
  | 'heic_convert_failed'
  | 'parse_failed'
  | 'unknown';

export async function POST(request: Request) {
  try {
    const { imageBase64, mimeType } = await request.json();
    if (!imageBase64) {
      return NextResponse.json(
        { success: false, outcomeCode: 'unsupported_image', error: 'No image was sent.' satisfies string },
        { status: 400 },
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Server log retains the actionable detail; client gets neutral copy
      // mapped to the manual-fallback branch by outcomeCode.
      safeLog.warn('api.ai.supplement-vision', 'extraction unavailable: ANTHROPIC_API_KEY missing on server', {});
      return NextResponse.json(
        {
          success: false,
          outcomeCode: 'config_missing' satisfies SupplementVisionOutcome,
          error: USER_MESSAGE_FOR_MANUAL_FALLBACK,
        },
        { status: 503 },
      );
    }

    let normalizedBase64: string = imageBase64;
    let normalizedMime: string = (typeof mimeType === 'string' ? mimeType : 'image/jpeg').toLowerCase();

    if (HEIC_MIME.includes(normalizedMime)) {
      try {
        const inputBuffer = Buffer.from(imageBase64, 'base64');
        let outputBuffer = await sharp(inputBuffer).jpeg({ quality: 85 }).toBuffer();
        if (outputBuffer.byteLength > MAX_BYTES_AFTER_NORMALIZE) {
          outputBuffer = await sharp(inputBuffer)
            .resize({ width: 1800, withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();
        }
        normalizedBase64 = outputBuffer.toString('base64');
        normalizedMime = 'image/jpeg';
      } catch {
        return NextResponse.json(
          {
            success: false,
            outcomeCode: 'heic_convert_failed' satisfies SupplementVisionOutcome,
            error: USER_MESSAGE_FOR_HEIC_CONVERT,
          },
          { status: 400 },
        );
      }
    }

    if (!ANTHROPIC_ALLOWED_MIME.includes(normalizedMime as AnthropicMime)) {
      return NextResponse.json(
        {
          success: false,
          outcomeCode: 'unsupported_image' satisfies SupplementVisionOutcome,
          error: USER_MESSAGE_FOR_UNSUPPORTED,
        },
        { status: 400 },
      );
    }

    let res: Response;
    try {
      res = await visionBreaker.execute(() =>
        withAbortTimeout(
          (signal) => fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 4096,
              messages: [{ role: 'user', content: [
                { type: 'image', source: { type: 'base64', media_type: normalizedMime, data: normalizedBase64 } },
                { type: 'text', text: 'You are a supplement product identification engine. Look at this supplement product photo and extract ALL information. Return ONLY valid JSON (no markdown, no backticks): {"brand":"string","productName":"string","servingSize":"string","totalCount":0,"ingredients":[{"name":"string","form":"string or null","amount":0,"unit":"mg","isPartOfBlend":false}],"overallConfidence":"high or medium or low"}' }
              ]}]
            }),
            signal,
          }),
          30000,
          'api.ai.supplement-vision.claude-vision',
        )
      );
    } catch (apiErr) {
      if (isCircuitBreakerError(apiErr)) {
        safeLog.warn('api.ai.supplement-vision', 'vision circuit open', { error: apiErr });
        return NextResponse.json(
          {
            success: false,
            outcomeCode: 'circuit_open' satisfies SupplementVisionOutcome,
            error: USER_MESSAGE_FOR_RETRY,
          },
          { status: 503 },
        );
      }
      if (isTimeoutError(apiErr)) {
        safeLog.warn('api.ai.supplement-vision', 'vision timeout', { error: apiErr });
        return NextResponse.json(
          {
            success: false,
            outcomeCode: 'timeout' satisfies SupplementVisionOutcome,
            error: USER_MESSAGE_FOR_RETRY,
          },
          { status: 504 },
        );
      }
      safeLog.error('api.ai.supplement-vision', 'vision fetch failed', { error: apiErr });
      return NextResponse.json(
        {
          success: false,
          outcomeCode: 'upstream_error' satisfies SupplementVisionOutcome,
          error: USER_MESSAGE_FOR_RETRY,
        },
        { status: 502 },
      );
    }

    if (!res.ok) {
      // Read the upstream body for server logs ONLY; never echo it back to
      // the client. Stripping HTTP status from the client response too so
      // the surface stays neutral.
      const upstreamBody = await res.text();
      safeLog.error('api.ai.supplement-vision', 'vision non-2xx', { status: res.status, errBody: upstreamBody.slice(0, 200) });
      return NextResponse.json(
        {
          success: false,
          outcomeCode: 'upstream_error' satisfies SupplementVisionOutcome,
          error: USER_MESSAGE_FOR_RETRY,
        },
        { status: 502 },
      );
    }

    const data = await res.json();
    const text = data.content?.find((b: { type: string; text?: string }) => b.type === 'text')?.text || '';
    const clean = text.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
    const m = clean.match(/\{[\s\S]*\}/);
    if (!m) {
      safeLog.warn('api.ai.supplement-vision', 'no JSON in response', { previewLen: clean.length });
      return NextResponse.json(
        {
          success: false,
          outcomeCode: 'parse_failed' satisfies SupplementVisionOutcome,
          error: USER_MESSAGE_FOR_MANUAL_FALLBACK,
        },
        { status: 502 },
      );
    }

    try {
      const parsed = JSON.parse(m[0]);
      return NextResponse.json({
        success: true,
        outcomeCode: 'success' satisfies SupplementVisionOutcome,
        data: parsed,
      });
    } catch (parseErr) {
      safeLog.warn('api.ai.supplement-vision', 'JSON parse failed', { error: parseErr });
      return NextResponse.json(
        {
          success: false,
          outcomeCode: 'parse_failed' satisfies SupplementVisionOutcome,
          error: USER_MESSAGE_FOR_MANUAL_FALLBACK,
        },
        { status: 502 },
      );
    }
  } catch (err: unknown) {
    safeLog.error('api.ai.supplement-vision', 'unexpected error', { error: err });
    return NextResponse.json(
      {
        success: false,
        outcomeCode: 'unknown' satisfies SupplementVisionOutcome,
        error: USER_MESSAGE_FOR_RETRY,
      },
      { status: 500 },
    );
  }
}
