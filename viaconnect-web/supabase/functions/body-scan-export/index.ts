// =============================================================================
// body-scan-export Edge Function (Prompt #169 T6)
// =============================================================================
// Renders a single-page letter-size PDF body composition tracking report for
// a given body_photo_sessions row and optionally embeds a client-rendered
// Three.js avatar PNG.
//
// Authentication: JWT required. Only the session OWNER may export their scan.
// The service-role client is used ONLY after ownership is confirmed.
//
// Request:  POST { session_id: string; avatar_png_base64?: string }
// Response: { pdf_url: string }   -- signed Supabase Storage URL, 5 min TTL
//           { error: string }      -- with appropriate HTTP status
//
// Storage: private bucket "body-scan-pdfs"
//   Path:  {user_id}/{session_id}/{timestamp}.pdf
//   RLS:   SELECT gated to user_id prefix; INSERT service-role only.
//
// Timeout: 30 s overall; structured JSON log on each major stage boundary.
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { safeLog } from './_shared/safe-log.ts';
import { buildScanPdf, ScanData } from './pdf-builder.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY    = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const PDF_BUCKET        = 'body-scan-pdfs';
const SIGNED_URL_TTL_S  = 300; // 5 minutes
const HANDLER_TIMEOUT_MS = 30_000;

function corsHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders() });
}

function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function userClient(jwt: string): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface ExportRequest {
  session_id: string;
  avatar_png_base64?: string;
}

// Compute the Bio Optimization Score delta for a given user by comparing the
// two most recent entries in bio_optimization_history. Returns null values
// when insufficient history exists.
async function computeBosDelta(
  sa: SupabaseClient,
  userId: string,
): Promise<{ score: number | null; delta: number | null; driver: string | null }> {
  const { data, error } = await sa
    .from('bio_optimization_history')
    .select('score, breakdown')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(2);

  if (error || !data || data.length === 0) {
    return { score: null, delta: null, driver: null };
  }

  const latest = data[0] as { score: number | null; breakdown: Record<string, unknown> | null };
  const prior  = data.length > 1
    ? (data[1] as { score: number | null; breakdown: Record<string, unknown> | null })
    : null;

  const score = latest.score !== null ? Number(latest.score) : null;
  const delta = prior?.score !== null && prior?.score !== undefined && score !== null
    ? parseFloat((score - Number(prior.score)).toFixed(1))
    : null;

  // Attempt to extract a human-readable driver from the breakdown jsonb.
  // The breakdown shape is implementation-defined; we pull a "driver" key if present.
  let driver: string | null = null;
  if (latest.breakdown && typeof latest.breakdown === 'object') {
    const bd = latest.breakdown as Record<string, unknown>;
    if (typeof bd.driver === 'string' && bd.driver.length > 0) {
      driver = bd.driver;
    }
  }

  return { score, delta, driver };
}

// Core handler wrapped in an outer Promise.race so a catastrophic DB hang
// cannot exceed HANDLER_TIMEOUT_MS.
async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405);
  }

  // --- JWT verification ---
  const auth = req.headers.get('authorization') ?? '';
  const jwt  = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!jwt) return json({ error: 'unauthorized' }, 401);

  const uc = userClient(jwt);
  const { data: userData } = await uc.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: 'unauthorized' }, 401);

  // --- Parse request body ---
  let body: ExportRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid JSON body' }, 400);
  }

  const { session_id, avatar_png_base64 } = body;
  if (!session_id || typeof session_id !== 'string') {
    return json({ error: 'session_id is required' }, 400);
  }

  const sa = admin();

  safeLog.info('body-scan-export', 'start', { session_id, user_id: user.id, stage: 'auth_ok' });

  // --- Ownership check (RLS-equivalent in code) ---
  // Use service-role client but gate on user_id match, preventing data leakage
  // to any authenticated user who guesses a session UUID.
  let sessionDate: string | null = null;
  try {
    const { data: sessionRow, error: sessionErr } = await sa
      .from('body_photo_sessions')
      .select('id, user_id, session_date')
      .eq('id', session_id)
      .single();

    if (sessionErr || !sessionRow) {
      return json({ error: 'session not found' }, 404);
    }
    if (sessionRow.user_id !== user.id) {
      safeLog.warn('body-scan-export', 'ownership mismatch', {
        session_id,
        requesting_user: user.id,
        owner_user: sessionRow.user_id,
        stage: 'ownership_check',
      });
      return json({ error: 'forbidden' }, 403);
    }
    sessionDate = sessionRow.session_date ?? null;
  } catch (e) {
    safeLog.error('body-scan-export', 'session fetch failed', { session_id, user_id: user.id, error: String(e), stage: 'session_fetch' });
    return json({ error: 'failed to load session' }, 500);
  }

  // --- Fetch measurements ---
  let measurements: Record<string, number | null> = {};
  try {
    const { data: mRow, error: mErr } = await sa
      .from('body_scan_measurements')
      .select(
        'neck_circ_cm, shoulder_circ_cm, chest_circ_cm, under_bust_circ_cm, ' +
        'waist_natural_circ_cm, waist_navel_circ_cm, hip_circ_cm, ' +
        'right_bicep_circ_cm, left_bicep_circ_cm, ' +
        'right_forearm_circ_cm, left_forearm_circ_cm, ' +
        'right_thigh_circ_cm, left_thigh_circ_cm, ' +
        'right_calf_circ_cm, left_calf_circ_cm',
      )
      .eq('session_id', session_id)
      .maybeSingle();

    if (!mErr && mRow) {
      measurements = mRow as Record<string, number | null>;
    }
  } catch (e) {
    // Fail-open: render PDF without measurements rather than blocking export.
    safeLog.warn('body-scan-export', 'measurements fetch failed', { session_id, user_id: user.id, error: String(e), stage: 'measurements_fetch' });
  }

  // --- Fetch composition ---
  type CompRow = {
    body_fat_pct: number | null;
    ci_low_body_fat_pct: number | null;
    ci_high_body_fat_pct: number | null;
    lean_mass_kg: number | null;
    fat_mass_kg: number | null;
    visceral_fat_index: number | null;
    ag_ratio: number | null;
    vs_ratio: number | null;
    fmi: number | null;
    ffmi: number | null;
    bmi: number | null;
    bmr_kcal: number | null;
  };
  let composition: CompRow | null = null;
  try {
    const { data: cRow, error: cErr } = await sa
      .from('body_scan_composition')
      .select(
        'body_fat_pct, ci_low_body_fat_pct, ci_high_body_fat_pct, ' +
        'lean_mass_kg, fat_mass_kg, visceral_fat_index, ' +
        'ag_ratio, vs_ratio, fmi, ffmi, bmi, bmr_kcal',
      )
      .eq('session_id', session_id)
      .maybeSingle();

    if (!cErr && cRow) {
      composition = cRow as CompRow;
    }
  } catch (e) {
    safeLog.warn('body-scan-export', 'composition fetch failed', { session_id, user_id: user.id, error: String(e), stage: 'composition_fetch' });
  }

  // --- Fetch BOS delta ---
  let bos: { score: number | null; delta: number | null; driver: string | null } = { score: null, delta: null, driver: null };
  try {
    bos = await computeBosDelta(sa, user.id);
  } catch (e) {
    safeLog.warn('body-scan-export', 'bos fetch failed', { session_id, user_id: user.id, error: String(e), stage: 'bos_fetch' });
  }

  safeLog.info('body-scan-export', 'data loaded', {
    session_id,
    user_id: user.id,
    has_measurements: Object.keys(measurements).length > 0,
    has_composition: composition !== null,
    bos_score: bos.score,
    stage: 'data_fetch_complete',
  });

  // --- Render PDF ---
  const scanData: ScanData = {
    sessionId: session_id,
    sessionDate,
    measurements,
    composition,
    bos,
    avatarPngBase64: avatar_png_base64 ?? null,
  };

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await buildScanPdf(scanData);
    safeLog.info('body-scan-export', 'pdf rendered', { session_id, user_id: user.id, bytes: pdfBytes.byteLength, stage: 'pdf_render' });
  } catch (e) {
    safeLog.error('body-scan-export', 'pdf render failed', { session_id, user_id: user.id, error: String(e), stage: 'pdf_render' });
    return json({ error: 'PDF rendering failed' }, 500);
  }

  // --- Upload to storage ---
  const timestamp  = Date.now();
  const storagePath = `${user.id}/${session_id}/${timestamp}.pdf`;

  try {
    const { error: uploadErr } = await sa.storage
      .from(PDF_BUCKET)
      .upload(storagePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadErr) {
      safeLog.error('body-scan-export', 'upload failed', { session_id, user_id: user.id, error: uploadErr.message, stage: 'storage_upload' });
      return json({ error: 'PDF upload failed' }, 500);
    }
  } catch (e) {
    safeLog.error('body-scan-export', 'upload exception', { session_id, user_id: user.id, error: String(e), stage: 'storage_upload' });
    return json({ error: 'PDF upload failed' }, 500);
  }

  // --- Generate signed URL (5 min) ---
  let pdfUrl: string;
  try {
    const { data: signedData, error: signedErr } = await sa.storage
      .from(PDF_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_S);

    if (signedErr || !signedData?.signedUrl) {
      safeLog.error('body-scan-export', 'signed url failed', { session_id, user_id: user.id, error: signedErr?.message ?? 'no url', stage: 'signed_url' });
      return json({ error: 'Could not generate download link' }, 500);
    }
    pdfUrl = signedData.signedUrl;
  } catch (e) {
    safeLog.error('body-scan-export', 'signed url exception', { session_id, user_id: user.id, error: String(e), stage: 'signed_url' });
    return json({ error: 'Could not generate download link' }, 500);
  }

  safeLog.info('body-scan-export', 'complete', { session_id, user_id: user.id, stage: 'done' });
  return json({ pdf_url: pdfUrl });
}

serve((req: Request) => {
  const timeout = new Promise<Response>((resolve) =>
    setTimeout(() => resolve(json({ error: 'request timed out' }, 504)), HANDLER_TIMEOUT_MS),
  );
  return Promise.race([handle(req), timeout]);
});
