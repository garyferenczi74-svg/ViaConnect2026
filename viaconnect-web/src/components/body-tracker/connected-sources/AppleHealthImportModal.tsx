'use client';

// Prompt 201: Apple Health web import flow.
//
// The user drops their Health export zip (or picks it). We:
//   1. resolve userId via supabase.auth.getUser()
//   2. insert an apple_health_imports staging row, returning its id
//   3. upload the zip to the private apple-health-imports bucket at
//      {userId}/{importId}.zip
//   4. POST the parse request to the server route, which streams the zip,
//      normalizes records, and posts them through the ingestion funnel
//   5. render the results summary, including the Hume Body Pod attribution count
//
// Hume Health (the Body Pod, operated by FitTrack Inc) has no public API; it
// reaches us only as an attribution origin tagged on Apple Health records. The
// summary surfaces that attribution count with a small badge.
//
// Resilience: every async step is wrapped; failures surface a graceful message
// and never crash the modal. Design tokens: Card #1E3054 on Deep Navy #1A2744,
// Teal #2DA5A0, Orange #B75E18. Lucide at strokeWidth 1.5. No emojis. No em or
// en dashes anywhere.

import { useCallback, useRef, useState } from 'react';
import {
  X,
  UploadCloud,
  FileArchive,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  CalendarRange,
  ListChecks,
  CopyMinus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { parseImportSummary, isImportComplete, type ImportSummary } from '@/lib/body-tracker/connected-sources/import-summary';
import { withAbortTimeout, isTimeoutError } from '@/lib/utils/with-timeout';

const BUCKET = 'apple-health-imports';
const PARSE_ENDPOINT = '/api/body-tracker/connected-sources/apple-health/parse';
const MAX_BYTES = 200 * 1024 * 1024; // mirrors the bucket file_size_limit (200 MB)

type Phase = 'idle' | 'uploading' | 'parsing' | 'done' | 'error';

export type HealthXmlImportIntent = 'apple' | 'hume';

export const HEALTH_XML_IMPORT_COPY = {
  apple: {
    title: 'Import from Apple Health',
    lead: 'On your iPhone open Health, tap your profile picture, then Export All Health Data. Upload the .xml or .zip here.',
    dropTitle: 'Drop your Health export XML',
    fileError:
      'Choose an Apple Health export .xml or .zip. On iPhone open Health, tap your profile, then Export All Health Data.',
    toast: 'Apple Health import complete',
  },
  hume: {
    title: 'Import Hume Body Pod',
    lead: 'Hume has no public developer API. Upload an Apple Health export so Hume-tagged body and weight rows can ingest.',
    dropTitle: 'Drop your Hume-tagged Health export XML',
    fileError:
      'Choose an Apple Health export .xml or .zip so Hume-tagged body and weight rows can ingest.',
    toast: 'Hume Body Pod import complete',
  },
} as const;

interface AppleHealthImportModalProps {
  open: boolean;
  intent?: HealthXmlImportIntent;
  onClose: () => void;
  onImported?: () => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'n/a';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'n/a';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function AppleHealthImportModal({
  open,
  intent = 'apple',
  onClose,
  onImported,
}: AppleHealthImportModalProps) {
  const copy = HEALTH_XML_IMPORT_COPY[intent];
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<ImportSummary | null>(null);

  const reset = useCallback(() => {
    setPhase('idle');
    setErrorMsg(null);
    setResult(null);
    setDragActive(false);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const runImport = useCallback(
    async (file: File) => {
      setErrorMsg(null);
      setResult(null);

      // Light client-side guards. The bucket enforces type and size server side.
      const name = (file.name || '').toLowerCase();
      const isXml = name.endsWith('.xml');
      const isZip = name.endsWith('.zip');
      if (!isXml && !isZip) {
        setPhase('error');
        setErrorMsg(copy.fileError);
        return;
      }
      if (file.size > MAX_BYTES) {
        setPhase('error');
        setErrorMsg('That export is larger than 200 MB. Try exporting a shorter date range from the Health app.');
        return;
      }

      const supabase = createClient();

      // Step 1: resolve the signed-in user.
      let userId: string;
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) {
          setPhase('error');
          setErrorMsg('Please sign in again to import your Health data.');
          return;
        }
        userId = data.user.id;
      } catch {
        setPhase('error');
        setErrorMsg('We could not confirm your session. Please sign in again.');
        return;
      }

      // Step 2: create the staging row.
      let importId: string;
      try {
        const { data, error } = await supabase
          .from('apple_health_imports')
          .insert({ user_id: userId, file_name: file.name })
          .select('id')
          .single();
        if (error || !data?.id) {
          setPhase('error');
          setErrorMsg('We could not start the import. Please try again in a moment.');
          return;
        }
        importId = data.id as string;
      } catch {
        setPhase('error');
        setErrorMsg('We could not start the import. Please try again in a moment.');
        return;
      }

      // Step 3: upload the zip.
      setPhase('uploading');
      const ext = isXml ? 'xml' : 'zip';
      const storagePath = `${BUCKET}/${userId}/${importId}.${ext}`;
      try {
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(`${userId}/${importId}.${ext}`, file, {
            upsert: true,
            contentType: isXml ? 'application/xml' : 'application/zip',
          });
        if (error) {
          setPhase('error');
          setErrorMsg('The upload did not complete. Check your connection and try again.');
          return;
        }
      } catch {
        setPhase('error');
        setErrorMsg('The upload did not complete. Check your connection and try again.');
        return;
      }

      // Step 4: parse on the server.
      setPhase('parsing');
      try {
        const res = await withAbortTimeout(
          (signal) => fetch(PARSE_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ importId, storagePath, fileKind: ext }),
            signal,
          }),
          // 300000ms (300s) matches the parse route's maxDuration = 300; keep the two in sync.
          300000,
          'apple-health-parse',
        );
        const json = res.ok ? await res.json().catch(() => null) : null;
        if (!res.ok || !isImportComplete(json)) {
          setPhase('error');
          setErrorMsg('We uploaded your file but could not finish reading it. Please try again.');
          return;
        }
        setResult(parseImportSummary(json));
        setPhase('done');
        toast.success(copy.toast);
        onImported?.();
      } catch (err) {
        setPhase('error');
        setErrorMsg(
          isTimeoutError(err)
            ? 'Reading your Health data is taking longer than expected. Please try again.'
            : 'We uploaded your file but could not finish reading it. Please try again.',
        );
      }
    },
    [copy.fileError, copy.toast, onImported],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void runImport(file);
    },
    [runImport],
  );

  if (!open) return null;

  const busy = phase === 'uploading' || phase === 'parsing';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      data-import-intent={intent}
      onClick={busy ? undefined : handleClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/[0.08] bg-[#1A2744] p-5 sm:rounded-3xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">{copy.title}</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-white/55">
              {copy.lead}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            aria-label="Close import"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Drop zone (idle / error states allow re-pick) */}
        {(phase === 'idle' || phase === 'error') && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
              dragActive
                ? 'border-[#2DA5A0] bg-[#2DA5A0]/[0.08]'
                : 'border-white/[0.14] bg-[#1E3054]/40'
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1E3054]">
              <UploadCloud className="h-6 w-6 text-[#2DA5A0]" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{copy.dropTitle}</p>
              <p className="mt-1 text-[12px] text-white/45">Drag and drop the file here or click to browse</p>
            </div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-1 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#2DA5A0]/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/60"
            >
              <FileArchive className="h-4 w-4" strokeWidth={1.5} />
              Choose file
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".xml,.zip,application/xml,text/xml,application/zip,application/x-zip-compressed"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void runImport(f);
              }}
            />
          </div>
        )}

        {/* Error message */}
        {phase === 'error' && errorMsg && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#B75E18]/30 bg-[#B75E18]/10 px-3 py-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#B75E18]" strokeWidth={1.5} />
            <p className="text-[12px] leading-relaxed text-white/80">{errorMsg}</p>
          </div>
        )}

        {/* Progress */}
        {busy && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.08] bg-[#1E3054]/50 p-8 text-center">
            <Loader2 className="h-7 w-7 animate-spin text-[#2DA5A0]" strokeWidth={1.5} />
            <p className="text-sm font-medium text-white">
              {phase === 'uploading' ? 'Uploading your export' : 'Reading your Health data'}
            </p>
            <p className="text-[12px] text-white/45">
              {phase === 'uploading'
                ? 'This can take a minute for large exports.'
                : 'Normalizing records and tagging Hume Body Pod readings.'}
            </p>
          </div>
        )}

        {/* Results summary */}
        {phase === 'done' && result && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-3 py-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2DA5A0]" strokeWidth={1.5} />
              <p className="text-sm font-medium text-white">Import complete</p>
            </div>

            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/[0.06] bg-[#1E3054] p-3">
                <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/45">
                  <ListChecks className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Records imported
                </dt>
                <dd className="mt-1 text-xl font-semibold text-white">{result.recordsIngested}</dd>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-[#1E3054] p-3">
                <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/45">
                  <CopyMinus className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Duplicates skipped
                </dt>
                <dd className="mt-1 text-xl font-semibold text-white">{result.recordsDeduped}</dd>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-[#1E3054] p-3 sm:col-span-2">
                <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/45">
                  <CalendarRange className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Date range
                </dt>
                <dd className="mt-1 text-sm font-medium text-white">
                  {formatDate(result.dateRangeStart)} to {formatDate(result.dateRangeEnd)}
                </dd>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-[#1E3054] p-3 sm:col-span-2">
                <dt className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-white/45">
                  <span>Attributed to your device</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#2DA5A0]/15 px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-[#2DA5A0] ring-1 ring-inset ring-[#2DA5A0]/30">
                    Hume Body Pod
                  </span>
                </dt>
                <dd className="mt-1 text-xl font-semibold text-white">{result.recordsAttributedHume}</dd>
              </div>
            </dl>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={reset}
                className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-sm font-medium text-white/75 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50"
              >
                Import another
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-[#2DA5A0] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#2DA5A0]/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/60"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AppleHealthImportModal;
