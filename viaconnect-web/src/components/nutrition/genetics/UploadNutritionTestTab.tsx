'use client';

// Prompt 187 Task 4 (2026-06-11): Tab 2, Upload Your Nutrition Testing.
//
// Flow: client side validation (extension + mime + 20 MB cap, inline errors,
// NO row inserted on a validation failure), then storage upload to the
// private nutrition-test-uploads bucket at {user_id}/{upload_id}/{filename},
// then the nutrition_test_uploads row insert with the client generated id,
// then the hannah-analyze-nutrition-test edge function invoke. The function
// walks the row through analyzing -> analyzed/failed itself; the list refresh
// after the invoke settles picks the terminal status up. Every supabase call
// is timeout wrapped and fails open with one safeLog.warn line; an analysis
// failure marks the list entry, never the page.
//
// The two 187 tables are live but not yet in the generated Database types, so
// calls go through the narrow structural client surface below with results
// cast to explicit shapes at each call site (the useNutritionHubMetrics
// idiom).

import { useCallback, useEffect, useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getDisplayName } from '@/lib/getDisplayName';
import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout } from '@/lib/utils/with-timeout';
import { FdaDisclaimer } from '@/components/compliance/FdaDisclaimer';
import {
  findingFromRow,
  uploadFromRow,
  type FindingConfidence,
  type FindingDirection,
  type NutritionGeneticFinding,
  type NutritionTestUpload,
} from '@/lib/nutrition/genetics/types';

const BUCKET = 'nutrition-test-uploads';
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB, also enforced server side
const READ_TIMEOUT_MS = 4_000;
const INSERT_TIMEOUT_MS = 4_000;
const STORAGE_TIMEOUT_MS = 15_000;
// Hannah's model run can take a while, so the invoke gets a long leash.
const INVOKE_TIMEOUT_MS = 120_000;

const ACCEPT_ATTR = '.pdf,.png,.jpg,.jpeg,.webp,.csv';

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  csv: 'text/csv',
};

const ERROR_OVERSIZE = 'That file is larger than 20 MB. Please choose a smaller file.';
const ERROR_UNSUPPORTED =
  'That file type is not supported. Accepted formats: .pdf, .png, .jpg, .jpeg, .webp, .csv.';
const ERROR_UPLOAD_FAILED = 'The upload could not be completed. Please try again.';
const ERROR_RECORD_FAILED = 'The file uploaded but could not be recorded. Please try again.';
const ANALYSIS_FAILED_REASON = 'The analysis did not complete. Please try uploading again.';
const DROPZONE_ANALYZING_COPY =
  'Analyzing your test. You can leave this tab; the result lands in the list below.';

const UPLOADS_SELECT =
  'id, user_id, storage_path, original_filename, mime_type, file_size_bytes, ' +
  'source_company, status, failure_reason, created_at, analyzed_at';

const FINDINGS_SELECT =
  'id, user_id, source, source_ref_id, category, item_name, item_slug, direction, ' +
  'strength, confidence, estimated, rationale, created_at, superseded_at';

// Narrow structural surface of the supabase client this tab uses. Each call
// site casts its awaited result to an explicit shape.
interface UploadTabClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        body: File,
        options?: { contentType?: string; upsert?: boolean },
      ) => Promise<{ error: { message?: string } | null }>;
    };
  };
  functions: {
    invoke: (
      name: string,
      options?: { body?: Record<string, unknown> },
    ) => Promise<{ data: unknown; error: { message?: string } | null }>;
  };
}

const supabase = createClient() as unknown as UploadTabClient;

// Minimal filename sanitization per the storage path convention: strips path
// separators ONLY, so the name cannot escape its {user_id}/{upload_id}/ prefix.
// Storage applies its own sanitization server side, and original_filename
// renders verbatim in the uploads list below.
function sanitizeFilename(name: string): string {
  return name.replace(/[\\/]/g, '_');
}

type Validation = { ok: true; mime: string } | { ok: false; error: string };

function validateFile(file: File): Validation {
  if (file.size > MAX_FILE_BYTES) return { ok: false, error: ERROR_OVERSIZE };
  const dot = file.name.lastIndexOf('.');
  // Browsers already report mime types lowercase; the toLowerCase on the
  // extension is the load-bearing case coercion here.
  const ext = dot >= 0 ? file.name.slice(dot + 1).toLowerCase() : '';
  const extMime = MIME_BY_EXTENSION[ext];
  if (!extMime) return { ok: false, error: ERROR_UNSUPPORTED };
  const reported = file.type;
  if (reported === '' || reported === extMime) return { ok: true, mime: extMime };
  // Windows browsers commonly report .csv files with the legacy Excel mime.
  if (ext === 'csv' && reported === 'application/vnd.ms-excel') {
    return { ok: true, mime: 'text/csv' };
  }
  if (Object.values(MIME_BY_EXTENSION).includes(reported)) {
    return { ok: true, mime: reported };
  }
  return { ok: false, error: ERROR_UNSUPPORTED };
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function StatusChip({ upload }: { upload: NutritionTestUpload }) {
  const base = 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium';
  switch (upload.status) {
    case 'analyzing':
      return (
        <span
          className={`${base} animate-pulse border-[#2DA5A0]/40 bg-[#2DA5A0]/10 text-[#2DA5A0]`}
        >
          Analyzing
        </span>
      );
    case 'analyzed':
      return (
        <span className={`${base} border-[#2DA5A0]/40 bg-[#2DA5A0]/15 text-[#2DA5A0]`}>
          Analyzed
        </span>
      );
    case 'failed':
      return (
        <span
          title={upload.failureReason ?? undefined}
          className={`${base} border-[#B75E18]/40 bg-[#B75E18]/15 text-[#B75E18]`}
        >
          Failed
        </span>
      );
    default:
      return (
        <span className={`${base} border-white/10 bg-white/[0.06] text-white/55`}>Uploaded</span>
      );
  }
}

function DirectionChip({ direction }: { direction: FindingDirection }) {
  const base = 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium';
  if (direction === 'need') {
    return (
      <span className={`${base} border-[#2DA5A0]/40 bg-[#2DA5A0]/10 text-[#2DA5A0]`}>
        Needs more
      </span>
    );
  }
  if (direction === 'avoid') {
    return (
      <span className={`${base} border-[#B75E18]/40 bg-[#B75E18]/10 text-[#B75E18]`}>
        Should limit
      </span>
    );
  }
  if (direction === 'neutral') {
    return <span className={`${base} border-white/10 bg-white/[0.04] text-white/55`}>Adequate</span>;
  }
  // Unknown renders this neutral chip with an explanation, NEVER a zero or an
  // empty bar.
  return (
    <span
      title="This marker could not be read from the document"
      className={`${base} border-white/10 bg-white/[0.04] text-white/30`}
    >
      Unknown
    </span>
  );
}

function ConfidenceChip({ confidence }: { confidence: FindingConfidence }) {
  const label =
    confidence === 'high'
      ? 'High confidence'
      : confidence === 'medium'
        ? 'Medium confidence'
        : 'Low confidence';
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-white/55">
      {label}
    </span>
  );
}

const FINDING_GROUPS = [
  { key: 'food', title: 'Foods' },
  { key: 'vitamin', title: 'Vitamins' },
  { key: 'mineral', title: 'Minerals' },
  { key: 'other', title: 'Other Markers' },
] as const;

export interface UploadNutritionTestTabProps {
  readonly userId: string;
}

export function UploadNutritionTestTab({ userId }: UploadNutritionTestTabProps) {
  const [uploads, setUploads] = useState<NutritionTestUpload[] | null>(null);
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);
  const [findingsByUpload, setFindingsByUpload] = useState<
    Record<string, NutritionGeneticFinding[]>
  >({});
  const [sourceCompany, setSourceCompany] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // busy covers the storage upload + row insert leg; invoking covers the edge
  // function leg, so a second file cannot start while an analysis is in flight.
  const [invoking, setInvoking] = useState(false);

  const fetchUploads = useCallback(async (): Promise<NutritionTestUpload[] | null> => {
    try {
      const result = (await withTimeout(
        supabase
          .from('nutrition_test_uploads')
          .select(UPLOADS_SELECT)
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        READ_TIMEOUT_MS,
        'nutrition.genetics.uploads.list',
      )) as { data: Record<string, unknown>[] | null; error: { message?: string } | null };
      if (result.error) {
        safeLog.warn('nutrition.genetics.upload', 'uploads read failed', {
          userId,
          error: result.error.message ?? 'supabase error response',
        });
        return null;
      }
      return (Array.isArray(result.data) ? result.data : []).map(uploadFromRow);
    } catch (err) {
      safeLog.warn('nutrition.genetics.upload', 'uploads read failed', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }, [userId]);

  // Initial uploads load. Fails open to an empty list; the selection defaults
  // to the most recent analyzed upload.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const list = await fetchUploads();
      if (cancelled) return;
      setUploads(list ?? []);
      const newestAnalyzed = (list ?? []).find((u) => u.status === 'analyzed');
      if (newestAnalyzed) setSelectedUploadId((prev) => prev ?? newestAnalyzed.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchUploads]);

  // Findings for the selected upload, fetched once per upload id and cached
  // for the life of this mount. Active rows are preferred; superseded rows
  // show only when the upload has no active rows left.
  useEffect(() => {
    if (!selectedUploadId || findingsByUpload[selectedUploadId]) return;
    let cancelled = false;
    void (async () => {
      let next: NutritionGeneticFinding[] = [];
      try {
        const result = (await withTimeout(
          supabase
            .from('nutrition_genetic_findings')
            .select(FINDINGS_SELECT)
            .eq('user_id', userId)
            .eq('source_ref_id', selectedUploadId)
            .order('created_at', { ascending: false }),
          READ_TIMEOUT_MS,
          'nutrition.genetics.uploads.findings',
        )) as { data: Record<string, unknown>[] | null; error: { message?: string } | null };
        if (result.error) {
          safeLog.warn('nutrition.genetics.upload', 'findings read failed', {
            userId,
            uploadId: selectedUploadId,
            error: result.error.message ?? 'supabase error response',
          });
        } else {
          const rows = (Array.isArray(result.data) ? result.data : []).map(findingFromRow);
          const active = rows.filter((r) => r.supersededAt === null);
          next = active.length > 0 ? active : rows;
        }
      } catch (err) {
        safeLog.warn('nutrition.genetics.upload', 'findings read failed', {
          userId,
          uploadId: selectedUploadId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      if (!cancelled) {
        setFindingsByUpload((prev) => ({ ...prev, [selectedUploadId]: next }));
      }
    })();
    return () => {
      cancelled = true;
    };
    // findingsByUpload omitted: the cache key guard above makes this run once per upload id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUploadId, userId]);

  const handleFile = useCallback(
    async (file: File) => {
      if (busy || invoking) return;
      setInlineError(null);
      const validation = validateFile(file);
      if (!validation.ok) {
        // Client side validation failure: inline error only, no row inserted.
        setInlineError(validation.error);
        return;
      }
      setBusy(true);

      const uploadId = crypto.randomUUID();
      const safeName = sanitizeFilename(file.name);
      const storagePath = `${userId}/${uploadId}/${safeName}`;
      const company = sourceCompany.trim() === '' ? null : sourceCompany.trim();

      // 1. Storage upload.
      try {
        const stored = (await withTimeout(
          supabase
            .storage.from(BUCKET)
            .upload(storagePath, file, { contentType: validation.mime, upsert: false }),
          STORAGE_TIMEOUT_MS,
          'nutrition.genetics.uploads.storage',
        )) as { error: { message?: string } | null };
        if (stored.error) {
          safeLog.warn('nutrition.genetics.upload', 'storage upload failed', {
            userId,
            uploadId,
            error: stored.error.message ?? 'storage error response',
          });
          setInlineError(ERROR_UPLOAD_FAILED);
          setBusy(false);
          return;
        }
      } catch (err) {
        safeLog.warn('nutrition.genetics.upload', 'storage upload failed', {
          userId,
          uploadId,
          error: err instanceof Error ? err.message : String(err),
        });
        setInlineError(ERROR_UPLOAD_FAILED);
        setBusy(false);
        return;
      }

      // 2. Row insert carrying the client generated id.
      try {
        const inserted = (await withTimeout(
          supabase.from('nutrition_test_uploads').insert({
            id: uploadId,
            user_id: userId,
            storage_path: storagePath,
            original_filename: safeName,
            mime_type: validation.mime,
            file_size_bytes: file.size,
            source_company: company,
            status: 'uploaded',
          }),
          INSERT_TIMEOUT_MS,
          'nutrition.genetics.uploads.insert',
        )) as { error: { message?: string } | null };
        if (inserted.error) {
          safeLog.warn('nutrition.genetics.upload', 'upload row insert failed', {
            userId,
            uploadId,
            error: inserted.error.message ?? 'supabase error response',
          });
          setInlineError(ERROR_RECORD_FAILED);
          setBusy(false);
          return;
        }
      } catch (err) {
        safeLog.warn('nutrition.genetics.upload', 'upload row insert failed', {
          userId,
          uploadId,
          error: err instanceof Error ? err.message : String(err),
        });
        setInlineError(ERROR_RECORD_FAILED);
        setBusy(false);
        return;
      }

      // 3. Optimistic list entry: the chip shows Analyzing while the edge
      // function walks the row through analyzing -> analyzed/failed itself.
      const optimistic: NutritionTestUpload = {
        id: uploadId,
        userId,
        storagePath,
        originalFilename: safeName,
        mimeType: validation.mime,
        fileSizeBytes: file.size,
        sourceCompany: company,
        status: 'analyzing',
        failureReason: null,
        createdAt: new Date().toISOString(),
        analyzedAt: null,
      };
      setUploads((prev) => [optimistic, ...(prev ?? [])]);
      setBusy(false);
      setInvoking(true);

      // 4. Invoke the analysis, then refresh the list (the function wrote the
      // terminal status). Any failure marks THIS list entry, never the page.
      try {
        const invoked = (await withTimeout(
          supabase.functions.invoke('hannah-analyze-nutrition-test', {
            body: { upload_id: uploadId },
          }),
          INVOKE_TIMEOUT_MS,
          'nutrition.genetics.uploads.invoke',
        )) as {
          data: { status?: string; error?: string } | null;
          error: { message?: string } | null;
        };
        if (invoked.error) {
          safeLog.warn('nutrition.genetics.upload', 'analysis invoke returned an error', {
            userId,
            uploadId,
            error: invoked.error.message ?? 'invoke error response',
          });
        }
        const analyzed = invoked.data?.status === 'analyzed';
        const fresh = await fetchUploads();
        if (fresh) {
          // If the invoke errored before the function settled the row, the
          // entry would come back non terminal; surface the failure instead
          // of leaving a stale chip.
          const settled = fresh.map((u) =>
            u.id === uploadId && u.status !== 'analyzed' && u.status !== 'failed'
              ? { ...u, status: 'failed' as const, failureReason: ANALYSIS_FAILED_REASON }
              : u,
          );
          setUploads(settled);
          if (settled.some((u) => u.id === uploadId && u.status === 'analyzed')) {
            setSelectedUploadId(uploadId);
          }
        } else {
          // The refresh failed open; settle the optimistic entry from the
          // invoke response so the chip cannot stick on Analyzing.
          setUploads((prev) =>
            (prev ?? []).map((u) =>
              u.id === uploadId
                ? analyzed
                  ? { ...u, status: 'analyzed' as const, analyzedAt: new Date().toISOString() }
                  : {
                      ...u,
                      status: 'failed' as const,
                      failureReason: invoked.data?.error ?? ANALYSIS_FAILED_REASON,
                    }
                : u,
            ),
          );
          if (analyzed) setSelectedUploadId(uploadId);
        }
      } catch (err) {
        // A client timeout or network rejection here does not stop the edge
        // function, which may still complete server side. The failed mark
        // below is local to this mount; the next uploads fetch on mount reads
        // the durable row status, so the cross session state self heals
        // without a DB re-check loop.
        safeLog.warn('nutrition.genetics.upload', 'analysis invoke failed', {
          userId,
          uploadId,
          error: err instanceof Error ? err.message : String(err),
        });
        setUploads((prev) =>
          (prev ?? []).map((u) =>
            u.id === uploadId
              ? { ...u, status: 'failed' as const, failureReason: ANALYSIS_FAILED_REASON }
              : u,
          ),
        );
      } finally {
        setInvoking(false);
      }
    },
    [busy, invoking, userId, sourceCompany, fetchUploads],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (busy || invoking) return;
      const dropped = e.dataTransfer.files?.[0];
      if (dropped) void handleFile(dropped);
    },
    [busy, invoking, handleFile],
  );

  const onSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      // Allow re-selecting the same file after a failure.
      e.target.value = '';
      if (busy || invoking) return;
      if (selected) void handleFile(selected);
    },
    [busy, invoking, handleFile],
  );

  const selectedUpload = selectedUploadId
    ? ((uploads ?? []).find((u) => u.id === selectedUploadId) ?? null)
    : null;
  const selectedFindings = selectedUploadId ? findingsByUpload[selectedUploadId] : undefined;

  return (
    <div className="space-y-5">
      {/* Dropzone + testing company. Stacks on mobile, side by side at md+. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
            dragOver
              ? 'border-[#2DA5A0] bg-[#2DA5A0]/5'
              : 'border-white/[0.12] bg-[#1E3054]/35 hover:border-white/[0.2]'
          }`}
        >
          <Upload className="h-8 w-8 text-white/40" strokeWidth={1.5} aria-hidden="true" />
          <span className="text-sm font-medium text-white">
            {busy
              ? 'Uploading your file'
              : invoking
                ? DROPZONE_ANALYZING_COPY
                : 'Tap to upload your nutrition test'}
          </span>
          <span className="text-[12px] text-white/55">
            or drag and drop. Accepted: .pdf, .png, .jpg, .jpeg, .webp, .csv, up to 20 MB.
          </span>
          <input
            type="file"
            accept={ACCEPT_ATTR}
            onChange={onSelect}
            disabled={busy || invoking}
            className="hidden"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="nutrition-test-source-company"
            className="text-[12px] font-medium text-white/75"
          >
            Testing company
          </label>
          <input
            id="nutrition-test-source-company"
            type="text"
            value={sourceCompany}
            onChange={(e) => setSourceCompany(e.target.value)}
            placeholder="Who ran this test?"
            className="min-h-[44px] rounded-xl border border-white/10 bg-[#1E3054] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#2DA5A0]/60 focus:outline-none"
          />
          <p className="text-[11px] leading-relaxed text-white/40">
            Optional, saved with the upload so you can tell your results apart.
          </p>
        </div>
      </div>

      {inlineError ? (
        <p
          role="alert"
          className="rounded-xl border border-[#B75E18]/40 bg-[#B75E18]/10 px-3 py-2 text-[12px] text-[#B75E18]"
        >
          {inlineError}
        </p>
      ) : null}

      {/* Uploads list. */}
      <section
        aria-label="Your nutrition test uploads"
        className="rounded-2xl border border-white/[0.08] bg-[#1E3054] p-4 md:p-5"
      >
        <h2 className="text-xl font-semibold text-white">Your uploads</h2>
        {uploads === null ? (
          <p className="mt-3 text-[12px] text-white/40">Loading your uploads</p>
        ) : uploads.length === 0 ? (
          <p className="mt-3 text-[12px] text-white/55">
            No uploads yet. Your uploaded tests will appear here.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {uploads.map((u) => (
              <li key={u.id} className="rounded-xl border border-white/[0.06] bg-[#1A2744]/40 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <FileText
                    className="h-4 w-4 flex-shrink-0 text-white/40"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-white">
                    {u.originalFilename}
                  </span>
                  <StatusChip upload={u} />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-6 text-[11px] text-white/45">
                  {u.sourceCompany ? <span>{u.sourceCompany}</span> : null}
                  <span>{formatDate(u.createdAt)}</span>
                  {u.status === 'analyzed' ? (
                    <button
                      type="button"
                      onClick={() => setSelectedUploadId(u.id)}
                      className="font-medium text-[#2DA5A0] underline-offset-2 hover:underline"
                    >
                      View Results
                    </button>
                  ) : null}
                </div>
                {u.status === 'failed' && u.failureReason ? (
                  <p className="mt-1 pl-6 text-[11px] text-[#B75E18]">{u.failureReason}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* AI Results panel for the selected analyzed upload. */}
      {selectedUpload && selectedUpload.status === 'analyzed' ? (
        <section
          aria-label="AI analysis results"
          className="rounded-2xl border border-[#2DA5A0]/25 bg-[#1E3054] p-4 md:p-5"
        >
          <header className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-white">
                {selectedUpload.sourceCompany ?? 'Uploaded test'}
              </h2>
              <p className="mt-0.5 text-sm text-white/85">
                {selectedUpload.analyzedAt
                  ? `Analyzed ${formatDate(selectedUpload.analyzedAt)}`
                  : 'Analyzed'}
              </p>
            </div>
            <span className="text-[11px] text-white/55">
              Analyzed by {getDisplayName('hannah')}
            </span>
          </header>

          {selectedFindings === undefined ? (
            <p className="mt-3 text-[12px] text-white/40">Loading findings</p>
          ) : selectedFindings.length === 0 ? (
            <p className="mt-3 text-[12px] text-white/55">
              No findings were extracted from this document.
            </p>
          ) : (
            <div className="mt-4 space-y-5">
              {FINDING_GROUPS.map(({ key, title }) => {
                const group = selectedFindings.filter((f) => f.category === key);
                if (group.length === 0) return null;
                return (
                  <div key={key}>
                    <h3 className="text-[12px] font-semibold uppercase tracking-wide text-white/55">
                      {title}
                    </h3>
                    <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                      {group.map((f) => (
                        <div
                          key={f.id}
                          className="rounded-xl border border-white/[0.06] bg-[#1A2744]/40 p-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="min-w-0 flex-1 text-[13px] font-medium text-white">
                              {f.itemName}
                            </span>
                            <DirectionChip direction={f.direction} />
                            <ConfidenceChip confidence={f.confidence} />
                          </div>
                          {f.rationale ? (
                            <p className="mt-1.5 text-[12px] leading-relaxed text-white/[0.62]">
                              {f.rationale}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {/* Informational, not medical advice. */}
      <FdaDisclaimer slot="modal-inline" />
    </div>
  );
}

export default UploadNutritionTestTab;
