// =============================================================================
// hannah-analyze-nutrition-test Edge Function (Prompt #187 Task 3)
// =============================================================================
// Triggered by the client after a third party nutrition or nutrigenomic test
// file lands in the private nutrition-test-uploads bucket. Downloads the file,
// sends it to Claude with Hannah's extraction system prompt, validates the
// strict JSON output with zod, supersedes the user's prior uploaded_test
// findings, and inserts the new rows into nutrition_genetic_findings.
//
// Request:  POST { upload_id: string }  (JWT required, must be upload owner)
// Response: { status: 'analyzed', findings_count, summary } on success,
//           structured error JSON otherwise.
//
// Helpers are local copies of the supabase/functions/_shared equivalents
// because the controller deploys this function as a single file via MCP.
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { z } from 'https://esm.sh/zod@3.23.8';

// ---------- env and constants -------------------------------------------------

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY      = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const MODEL         = Deno.env.get('HANNAH_NUTRITION_MODEL') ?? 'claude-sonnet-4-6';

const BUCKET = 'nutrition-test-uploads';

const STORAGE_TIMEOUT_MS = 15000;
const MODEL_TIMEOUT_MS   = 90000;
const DB_TIMEOUT_MS      = 10000;
const CSV_MAX_CHARS      = 200000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------- helpers -----------------------------------------------------------

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
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

class TimeoutError extends Error {
  readonly operation: string;
  readonly timeoutMs: number;

  constructor(operation: string, timeoutMs: number) {
    super(`Operation "${operation}" timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
    this.operation = operation;
    this.timeoutMs = timeoutMs;
  }
}

async function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  operation: string,
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new TimeoutError(operation, timeoutMs));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, Math.min(i + chunk, buf.length)));
  }
  return btoa(binary);
}

function extractJson(raw: string): unknown {
  let s = raw.trim();
  // Strip markdown fences if the model returned them despite instructions
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  // If there is preamble text, find the first { and last }
  const first = s.indexOf('{');
  const last  = s.lastIndexOf('}');
  if (first >= 0 && last > first) s = s.slice(first, last + 1);
  return JSON.parse(s);
}

// Mirrors the web app's safeLog shape; edge logs land in Supabase function logs.
function logEvent(
  level: 'info' | 'warn' | 'error',
  message: string,
  fields: {
    upload_id: string | null;
    user_id: string | null;
    duration_ms: number;
    outcome: 'analyzed' | 'failed' | 'rejected';
    reason_class?: string;
  },
): void {
  console.log(JSON.stringify({ scope: 'hannah.analyze-nutrition-test', level, message, ...fields }));
}

// Best effort fail open: mark the upload row failed without ever throwing.
async function markFailed(db: SupabaseClient, uploadId: string, reason: string): Promise<void> {
  try {
    await withTimeout(
      db.from('nutrition_test_uploads')
        .update({ status: 'failed', failure_reason: reason.slice(0, 500) })
        .eq('id', uploadId),
      DB_TIMEOUT_MS,
      'hannah-analyze-nutrition-test.mark-failed',
    );
  } catch {
    // Swallowed by design: the caller already logs the underlying failure.
  }
}

// ---------- zod schema for the model output ------------------------------------

const FindingSchema = z.object({
  category: z.enum(['food', 'vitamin', 'mineral', 'other']),
  item_name: z.string().min(1).max(120),
  item_slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  direction: z.enum(['need', 'avoid', 'neutral', 'unknown']),
  strength: z.enum(['strong', 'moderate', 'weak']),
  confidence: z.enum(['high', 'medium', 'low']),
  estimated: z.boolean(),
  rationale: z.string().min(1).max(300),
});

const AnalysisSchema = z.object({
  summary: z.string(),
  findings: z.array(FindingSchema).max(60),
});

// ---------- Hannah system prompt (inlined for Deno isolation) ------------------

const HANNAH_SYSTEM_PROMPT = `
You are Hannah, ViaConnect's AI nutrition and genomics analyst for FarmCeutica Wellness LLC.
You are given a third party nutrition or nutrigenomic test document uploaded by a user.
Extract and interpret its contents into STRICT JSON ONLY. No prose, no markdown fences.
Your entire response must match this schema exactly:

{
  "summary": string,
  "findings": [
    {
      "category": "food" | "vitamin" | "mineral" | "other",
      "item_name": string,
      "item_slug": kebab-case string (lowercase letters and digits separated by single hyphens),
      "direction": "need" | "avoid" | "neutral" | "unknown",
      "strength": "strong" | "moderate" | "weak",
      "confidence": "high" | "medium" | "low",
      "estimated": boolean,
      "rationale": string
    }
  ]
}

LOCKED EXTRACTION RULES:
- Any nutrient, marker, or value that cannot be extracted is recorded with direction "unknown" and is NEVER invented as zero or guessed.
- Every finding carries the estimated flag and a confidence.
- Maximum 60 findings.
- rationale is one plain-language sentence.
- No medical diagnoses.
- No em dashes or en dashes in any output text. Write plain sentences with commas and periods.
`.trim();

// ---------- main ----------------------------------------------------------------

interface UploadRow {
  id: string;
  user_id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  source_company: string | null;
  status: 'uploaded' | 'analyzing' | 'analyzed' | 'failed';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);

  const startedAt = Date.now();
  let uploadId: string | null = null;
  let userId: string | null = null;
  let ownedRow = false;
  const db = admin();

  try {
    if (!ANTHROPIC_KEY) {
      logEvent('error', 'ANTHROPIC_API_KEY not configured', {
        upload_id: null, user_id: null, duration_ms: Date.now() - startedAt,
        outcome: 'rejected', reason_class: 'config',
      });
      return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);
    }

    // 1. Validate body
    const body = await req.json().catch(() => ({}));
    const rawId = (body as Record<string, unknown>).upload_id;
    if (typeof rawId !== 'string' || !UUID_RE.test(rawId)) {
      logEvent('warn', 'invalid request body', {
        upload_id: null, user_id: null, duration_ms: Date.now() - startedAt,
        outcome: 'rejected', reason_class: 'request',
      });
      return json({ error: 'upload_id (uuid) required' }, 400);
    }
    uploadId = rawId;

    // 2. Auth + ownership (the user scoped client lets RLS enforce ownership)
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer /i, '');
    if (!jwt) {
      logEvent('warn', 'missing JWT', {
        upload_id: uploadId, user_id: null, duration_ms: Date.now() - startedAt,
        outcome: 'rejected', reason_class: 'auth',
      });
      return json({ error: 'Missing JWT' }, 401);
    }

    const uc = userClient(jwt);
    const { data: userInfo } = await uc.auth.getUser();
    userId = userInfo.user?.id ?? null;
    if (!userId) {
      logEvent('warn', 'invalid JWT', {
        upload_id: uploadId, user_id: null, duration_ms: Date.now() - startedAt,
        outcome: 'rejected', reason_class: 'auth',
      });
      return json({ error: 'Invalid JWT' }, 401);
    }

    const { data: uploadData, error: rowErr } = await uc
      .from('nutrition_test_uploads')
      .select('id, user_id, storage_path, original_filename, mime_type, source_company, status')
      .eq('id', uploadId)
      .maybeSingle();
    if (rowErr || !uploadData) {
      logEvent('warn', 'upload row not found', {
        upload_id: uploadId, user_id: userId, duration_ms: Date.now() - startedAt,
        outcome: 'rejected', reason_class: 'not_found',
      });
      return json({ error: 'Upload not found or not accessible' }, 404);
    }
    const upload = uploadData as UploadRow;
    if (upload.user_id !== userId) {
      logEvent('warn', 'upload owned by another user', {
        upload_id: uploadId, user_id: userId, duration_ms: Date.now() - startedAt,
        outcome: 'rejected', reason_class: 'forbidden',
      });
      return json({ error: 'Forbidden' }, 403);
    }
    if (upload.status === 'analyzing') {
      logEvent('warn', 'analysis already in flight', {
        upload_id: uploadId, user_id: userId, duration_ms: Date.now() - startedAt,
        outcome: 'rejected', reason_class: 'in_flight',
      });
      return json({ error: 'Analysis already in flight for this upload' }, 409);
    }
    // 'uploaded', 'failed', and 'analyzed' all proceed; a re-analysis run
    // supersedes the prior findings in step 8a.
    ownedRow = true;

    // 3. Mark analyzing via the service role client
    try {
      const { error: setErr } = await withTimeout(
        db.from('nutrition_test_uploads')
          .update({ status: 'analyzing', failure_reason: null })
          .eq('id', uploadId),
        DB_TIMEOUT_MS,
        'hannah-analyze-nutrition-test.set-analyzing',
      );
      if (setErr) throw new Error(setErr.message);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'set analyzing failed';
      await markFailed(db, uploadId, `db: ${msg}`);
      logEvent('error', 'failed to set analyzing status', {
        upload_id: uploadId, user_id: userId, duration_ms: Date.now() - startedAt,
        outcome: 'failed', reason_class: 'db',
      });
      return json({ status: 'failed', error: 'Could not start analysis' }, 502);
    }

    // 4. Download the file from the private bucket
    let fileBlob: Blob;
    try {
      const { data, error } = await withTimeout(
        db.storage.from(BUCKET).download(upload.storage_path),
        STORAGE_TIMEOUT_MS,
        'hannah-analyze-nutrition-test.storage-download',
      );
      if (error || !data) throw new Error(error?.message ?? 'empty download');
      fileBlob = data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'download failed';
      await markFailed(db, uploadId, `storage: ${msg}`);
      logEvent('error', 'storage download failed', {
        upload_id: uploadId, user_id: userId, duration_ms: Date.now() - startedAt,
        outcome: 'failed', reason_class: 'storage',
      });
      return json({ status: 'failed', error: 'Could not read the uploaded file' }, 502);
    }

    // 5. Build the model content by mime type
    const mime = (upload.mime_type ?? '').toLowerCase();
    const content: Array<Record<string, unknown>> = [];
    if (mime === 'application/pdf') {
      content.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: await blobToBase64(fileBlob) },
      });
    } else if (mime === 'image/png' || mime === 'image/jpeg' || mime === 'image/webp') {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: mime, data: await blobToBase64(fileBlob) },
      });
    } else if (mime === 'text/csv' || mime === 'application/vnd.ms-excel') {
      const csvText = (await fileBlob.text()).slice(0, CSV_MAX_CHARS);
      content.push({
        type: 'text',
        text: `CSV contents of the uploaded test file (${upload.original_filename}):\n\n${csvText}`,
      });
    } else {
      await markFailed(db, uploadId, 'unsupported mime type');
      logEvent('warn', 'unsupported mime type', {
        upload_id: uploadId, user_id: userId, duration_ms: Date.now() - startedAt,
        outcome: 'failed', reason_class: 'unsupported_mime',
      });
      return json({ status: 'failed', error: `Unsupported mime type: ${upload.mime_type}` }, 415);
    }

    const instructionParts = [
      'Analyze the attached third party nutrition or nutrigenomic test content.',
      `Original filename: ${upload.original_filename}`,
    ];
    if (upload.source_company) instructionParts.push(`Source company: ${upload.source_company}`);
    instructionParts.push('Extract and interpret the findings. Respond with STRICT JSON only, matching the schema in your instructions.');
    content.push({ type: 'text', text: instructionParts.join('\n') });

    // 6. Model call.
    // PHI EGRESS POINT: the uploaded test document leaves Supabase and reaches
    // Anthropic at this fetch call. Same BAA requirement as arnold-vision-analyze
    // applies before production launch. Owner: gary@farmceuticawellness.com.
    let apiResponse: Response;
    try {
      apiResponse = await withTimeout(
        fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': ANTHROPIC_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: MODEL,
            max_tokens: 4000,
            system: HANNAH_SYSTEM_PROMPT,
            messages: [{ role: 'user', content }],
          }),
        }),
        MODEL_TIMEOUT_MS,
        'hannah-analyze-nutrition-test.claude-api',
      );
    } catch (e) {
      const timedOut = e instanceof TimeoutError;
      const msg = e instanceof Error ? e.message : 'model call failed';
      await markFailed(db, uploadId, `model: ${msg}`);
      logEvent('error', timedOut ? 'model call timeout' : 'model call failed', {
        upload_id: uploadId, user_id: userId, duration_ms: Date.now() - startedAt,
        outcome: 'failed', reason_class: 'model',
      });
      return json({ status: 'failed', error: 'Model call failed' }, timedOut ? 504 : 502);
    }

    if (!apiResponse.ok) {
      const errTxt = await apiResponse.text().catch(() => '');
      await markFailed(db, uploadId, `model: api ${apiResponse.status} ${errTxt.slice(0, 200)}`);
      logEvent('error', 'model api non 2xx', {
        upload_id: uploadId, user_id: userId, duration_ms: Date.now() - startedAt,
        outcome: 'failed', reason_class: 'model',
      });
      return json({ status: 'failed', error: `Model API failure: ${apiResponse.status}` }, 502);
    }

    let parsedRaw: unknown;
    try {
      const apiJson = await apiResponse.json();
      const rawText = (apiJson?.content?.[0]?.text ?? '') as string;
      parsedRaw = extractJson(rawText);
    } catch {
      await markFailed(db, uploadId, 'validation: model output was not parseable JSON');
      logEvent('error', 'model output not parseable JSON', {
        upload_id: uploadId, user_id: userId, duration_ms: Date.now() - startedAt,
        outcome: 'failed', reason_class: 'validation',
      });
      return json({ status: 'failed', error: 'Model output was not parseable JSON' }, 422);
    }

    // 7. Validate the parsed JSON. NO findings are written on validation
    // failure, so a bad model run never leaves orphan rows.
    const parsed = AnalysisSchema.safeParse(parsedRaw);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')
        .slice(0, 400);
      await markFailed(db, uploadId, `validation: ${issues}`);
      logEvent('error', 'model output failed schema validation', {
        upload_id: uploadId, user_id: userId, duration_ms: Date.now() - startedAt,
        outcome: 'failed', reason_class: 'validation',
      });
      return json({ status: 'failed', error: 'Model output failed validation' }, 422);
    }

    const rows = parsed.data.findings.map((f) => ({
      user_id: userId,
      source: 'uploaded_test',
      source_ref_id: uploadId,
      category: f.category,
      item_name: f.item_name,
      item_slug: f.item_slug,
      direction: f.direction,
      strength: f.strength,
      confidence: f.confidence,
      estimated: f.estimated,
      rationale: f.rationale,
    }));

    // 8. Persist: supersede THEN insert THEN mark analyzed. supabase-js gives
    // no transaction across these calls. If the insert fails after the
    // supersede succeeded, the prior findings stay superseded and the upload
    // is marked failed; a re-run re-creates the findings, so this is an
    // accepted tradeoff.
    try {
      const { error: supErr } = await withTimeout(
        db.from('nutrition_genetic_findings')
          .update({ superseded_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('source', 'uploaded_test')
          .is('superseded_at', null),
        DB_TIMEOUT_MS,
        'hannah-analyze-nutrition-test.supersede-findings',
      );
      if (supErr) throw new Error(`supersede: ${supErr.message}`);

      if (rows.length > 0) {
        const { error: insErr } = await withTimeout(
          db.from('nutrition_genetic_findings').insert(rows),
          DB_TIMEOUT_MS,
          'hannah-analyze-nutrition-test.insert-findings',
        );
        if (insErr) throw new Error(`insert: ${insErr.message}`);
      }

      // nutrition_test_uploads has NO summary column. The validated summary
      // is returned only in this response JSON as a nice to have; the UI
      // renders the findings rows.
      const { error: doneErr } = await withTimeout(
        db.from('nutrition_test_uploads')
          .update({ status: 'analyzed', analyzed_at: new Date().toISOString(), failure_reason: null })
          .eq('id', uploadId),
        DB_TIMEOUT_MS,
        'hannah-analyze-nutrition-test.set-analyzed',
      );
      if (doneErr) throw new Error(`status update: ${doneErr.message}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'persist failed';
      await markFailed(db, uploadId, `persist: ${msg}`);
      logEvent('error', 'persist failed', {
        upload_id: uploadId, user_id: userId, duration_ms: Date.now() - startedAt,
        outcome: 'failed', reason_class: 'persist',
      });
      return json({ status: 'failed', error: 'Could not persist findings' }, 502);
    }

    logEvent('info', 'analysis complete', {
      upload_id: uploadId, user_id: userId, duration_ms: Date.now() - startedAt,
      outcome: 'analyzed',
    });
    return json({ status: 'analyzed', findings_count: rows.length, summary: parsed.data.summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    if (uploadId && ownedRow) await markFailed(db, uploadId, `unhandled: ${msg}`);
    logEvent('error', 'unhandled failure', {
      upload_id: uploadId, user_id: userId, duration_ms: Date.now() - startedAt,
      outcome: ownedRow ? 'failed' : 'rejected', reason_class: 'unhandled',
    });
    return json({ status: 'failed', error: msg }, 500);
  }
});
