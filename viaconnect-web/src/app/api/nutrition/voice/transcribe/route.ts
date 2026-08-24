/**
 * Server-side STT fallback endpoint per Prompt 170j §10.1.
 *
 * Forwards audio to Gemini Audio API for transcription.
 * Audio is NEVER written to disk per §13.1; the buffer is held in memory
 * only during the upstream request and discarded immediately after.
 *
 * Response includes audio_retained: false as a contract commitment.
 *
 * Rate-limited 100 requests per user per day per §18.2 (enforcement layer
 * lives in a future cross-route middleware; this route returns 413 on
 * oversized blobs as a sanity guard).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout } from '@/lib/nutrition/resilience/timeout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TRANSCRIBE_TIMEOUT_MS = 10_000;
const MAX_AUDIO_BYTES = 5_000_000;
const GEMINI_MODEL = 'gemini-2.0-flash';

interface GeminiAudioResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

export async function POST(request: Request): Promise<NextResponse> {
  const start = Date.now();

  try {
    // Auth gate: require a server-confirmed user. getUser validates the session
    // against the auth server (detects a revoked/logged-out session that the
    // getClaims middleware would not catch until token expiry), and gives this
    // AI-cost endpoint a real user to enforce the per-user rate limit (Sec 18.2).
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'unauthenticated', audio_retained: false },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const audio = formData.get('audio');
    const language = (formData.get('language') as string | null) ?? 'en-US';

    if (!(audio instanceof Blob)) {
      return NextResponse.json(
        { error: 'missing audio blob', audio_retained: false },
        { status: 400 }
      );
    }

    if (audio.size === 0) {
      return NextResponse.json(
        { error: 'empty audio blob', audio_retained: false },
        { status: 400 }
      );
    }

    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: 'audio too large; max 5 MB', audio_retained: false },
        { status: 413 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'STT service not configured', audio_retained: false },
        { status: 503 }
      );
    }

    const arrayBuffer = await audio.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = audio.type || 'audio/webm';

    const transcript = await withTimeout(
      callGeminiAudio({ base64, mimeType, language, apiKey }),
      { timeoutMs: TRANSCRIBE_TIMEOUT_MS, op: 'voice_transcribe' }
    );

    const latencyMs = Date.now() - start;

    return NextResponse.json({
      transcript,
      stt_confidence: null,
      stt_provider_used: 'gemini_audio',
      latency_ms: latencyMs,
      audio_retained: false,
    });
  } catch (err) {
    const latencyMs = Date.now() - start;
    const message = err instanceof Error ? err.message : 'Transcribe failed';
    return NextResponse.json(
      { error: message, latency_ms: latencyMs, audio_retained: false },
      { status: 500 }
    );
  }
}

async function callGeminiAudio(args: {
  base64: string;
  mimeType: string;
  language: string;
  apiKey: string;
}): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${args.apiKey}`;
  const body = {
    contents: [
      {
        parts: [
          {
            text: `Transcribe this audio in ${args.language}. Return only the transcript text, no commentary, no quotes.`,
          },
          {
            inline_data: {
              mime_type: args.mimeType,
              data: args.base64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 256,
    },
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    throw new Error(`Gemini Audio returned ${resp.status}`);
  }

  const json = (await resp.json()) as GeminiAudioResponse;
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return text.trim();
}
