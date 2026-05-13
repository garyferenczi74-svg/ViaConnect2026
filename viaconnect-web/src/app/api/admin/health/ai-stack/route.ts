// Prompt #164 (#163 fold-in): ping Gemini + USDA and persist results to
// system_health_checks. Token-gated. Cron can hit this with a fixed query token.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { withAbortTimeout } from '@/lib/utils/with-timeout';
import { GEMINI_MODEL } from '@/lib/nutrition/gemini-prompts';

const TIMEOUT = 5000;

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token');
  const expected = process.env.ADMIN_HEALTH_TOKEN;
  if (!expected || token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [gemini, usda] = await Promise.all([pingGemini(), pingUSDA()]);
  const admin = createAdminClient();
  const geminiInsert = await admin.from('system_health_checks').insert({
    check_name: 'gemini_api',
    status: gemini.status,
    latency_ms: gemini.latencyMs,
    error_code: gemini.errorCode,
    error_message: gemini.errorMessage,
    metadata: { model: GEMINI_MODEL },
  });
  if (geminiInsert.error) {
    safeLog.warn('api.admin.health.ai-stack', 'gemini insert failed', { error: geminiInsert.error });
  }
  const usdaInsert = await admin.from('system_health_checks').insert({
    check_name: 'usda_api',
    status: usda.status,
    latency_ms: usda.latencyMs,
    error_code: usda.errorCode,
    error_message: usda.errorMessage,
    metadata: null,
  });
  if (usdaInsert.error) {
    safeLog.warn('api.admin.health.ai-stack', 'usda insert failed', { error: usdaInsert.error });
  }
  return NextResponse.json({ gemini, usda });
}

interface PingResult {
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  errorCode: string | null;
  errorMessage: string | null;
}

async function pingGemini(): Promise<PingResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { status: 'down', latencyMs: 0, errorCode: 'AUTH_MISSING', errorMessage: 'GEMINI_API_KEY unset' };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  const t0 = Date.now();
  try {
    const res = await withAbortTimeout((s) => fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }], generationConfig: { maxOutputTokens: 16 } }),
      signal: s,
    }), TIMEOUT, 'health.gemini');
    const latencyMs = Date.now() - t0;
    if (!res.ok) {
      const rawBody = await res.text().then((t) => t.slice(0, 200)).catch(() => null);
      const errorMessage = rawBody ? rawBody.replace(/key=[^&\s"]+/g, 'key=REDACTED') : null;
      return { status: res.status >= 500 ? 'down' : 'degraded', latencyMs, errorCode: `HTTP_${res.status}`, errorMessage };
    }
    return { status: 'healthy', latencyMs, errorCode: null, errorMessage: null };
  } catch (err) {
    return { status: 'down', latencyMs: Date.now() - t0, errorCode: 'EXCEPTION', errorMessage: String(err).slice(0, 200) };
  }
}

async function pingUSDA(): Promise<PingResult> {
  const key = process.env.USDA_FDC_API_KEY || 'DEMO_KEY';
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=apple&pageSize=1&api_key=${key}`;
  const t0 = Date.now();
  try {
    const res = await withAbortTimeout((s) => fetch(url, { signal: s }), TIMEOUT, 'health.usda');
    const latencyMs = Date.now() - t0;
    if (!res.ok) {
      return { status: res.status >= 500 ? 'down' : 'degraded', latencyMs, errorCode: `HTTP_${res.status}`, errorMessage: null };
    }
    return { status: 'healthy', latencyMs, errorCode: null, errorMessage: null };
  } catch (err) {
    return { status: 'down', latencyMs: Date.now() - t0, errorCode: 'EXCEPTION', errorMessage: String(err).slice(0, 200) };
  }
}
