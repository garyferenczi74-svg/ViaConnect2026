'use client';

// Prompt #160 section 3.2: photo-based meal entry route.
// /dashboard/nutrition/photo-ai

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Camera, PencilLine, Sparkles, X } from 'lucide-react';
import { MealTypeSelector } from '@/components/nutrition/MealTypeSelector';
import { AnalyzingState } from '@/components/nutrition/AnalyzingState';
import { AnalysisErrorCard } from '@/components/nutrition/AnalysisErrorCard';
import type { MealType } from '@/lib/nutrition/schema';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

function toLocalDatetimeInput(d: Date): string {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

export default function PhotoAiPage() {
  const router = useRouter();
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [loggedAt, setLoggedAt] = useState<string>(() => toLocalDatetimeInput(new Date()));
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(selected: File | null) {
    // Prompt #163a section 5.1: namespaced client logging at every state
    // transition so the next photo-route failure is diagnosable from the
    // browser console without log archaeology.
    console.log('[photo-ai] file selected', {
      hasFile: !!selected,
      name: selected?.name,
      size: selected?.size,
      type: selected?.type,
    });
    setError(null);
    if (!selected) {
      setFile(null);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      console.warn('[photo-ai] file rejected: too large', { size: selected.size });
      setError(`Image too large (${(selected.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB. Please resize and try again.`);
      return;
    }
    const t = selected.type.toLowerCase();
    if (!ALLOWED_TYPES.includes(t)) {
      console.warn('[photo-ai] file rejected: unsupported type', { type: t });
      if (t === 'image/heic' || t === 'image/heif') {
        setError('HEIC photos from iPhone are not yet supported. In Photos, tap Share, then Save as JPEG and upload that file. Or change iPhone settings: Settings, Camera, Formats, Most Compatible.');
        return;
      }
      setError('Unsupported image type. Use JPG, PNG, or WEBP.');
      return;
    }
    console.log('[photo-ai] file accepted, set state');
    setFile(selected);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(selected);
    });
  }

  async function handleAnalyze() {
    console.log('[photo-ai] submit invoked', {
      hasFile: !!file,
      mealType,
      loggedAt,
      hasNote: !!note.trim(),
    });
    if (!file) {
      console.warn('[photo-ai] submit aborted: no file in state');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('image', file);
      form.append('mealType', mealType);
      form.append('loggedAt', new Date(loggedAt).toISOString());
      if (note.trim()) form.append('note', note.trim().slice(0, 500));

      console.log('[photo-ai] fetch starting', { url: '/api/nutrition/analyze-photo' });
      const res = await fetch('/api/nutrition/analyze-photo', {
        method: 'POST',
        body: form,
      });
      console.log('[photo-ai] fetch returned', { status: res.status, ok: res.ok });
      if (!res.ok) {
        const body = await res.json().catch(() => null) as unknown;
        const errField = (body && typeof body === 'object' && body !== null && 'error' in body)
          ? (body as { error: unknown }).error
          : undefined;
        let msg: string;
        if (typeof errField === 'string') {
          msg = errField;
        } else if (errField && typeof errField === 'object' && 'message' in errField && typeof (errField as { message: unknown }).message === 'string') {
          msg = (errField as { message: string }).message;
        } else {
          msg = 'Analysis failed';
        }
        console.warn('[photo-ai] non-2xx response', { status: res.status, body, msg, msgType: typeof msg });
        setError(msg);
        setSubmitting(false);
        return;
      }
      const { logId } = await res.json();
      console.log('[photo-ai] success, navigating to review', { logId });
      router.push(`/nutrition/log-meal/review?logId=${logId}`);
    } catch (err) {
      console.error('[photo-ai] fetch threw', err);
      setError('Network error. Try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:py-8">
      <header className="mb-5">
        <h1 className="text-xl font-bold text-white sm:text-2xl">Photo AI</h1>
        <p className="mt-1 text-sm text-white/40">Snap your plate. Gordan reads the photo and computes the macros.</p>
      </header>

      {submitting && <AnalyzingState subtitle="Identifying foods and estimating portions" />}

      {!submitting && error && (
        <div className="mb-5">
          <AnalysisErrorCard
            message={error}
            onRetry={() => {
              setError(null);
              void handleAnalyze();
            }}
            onManual={() => setError(null)}
          />
        </div>
      )}

      {!submitting && (
        <div className="space-y-5 rounded-2xl border border-white/[0.08] bg-[#1E3054]/60 p-4 backdrop-blur-md sm:p-5">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">Meal type</p>
            <MealTypeSelector value={mealType} onChange={setMealType} />
          </div>

          <div>
            <label htmlFor="logged-at" className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-white/40">
              Date and time
            </label>
            <input
              id="logged-at"
              type="datetime-local"
              value={loggedAt}
              onChange={(e) => setLoggedAt(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/5 px-3 py-2 text-sm text-white focus:border-[#2DA5A0] focus:outline-none"
            />
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">Meal photo</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              capture="environment"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            {previewUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Meal preview" className="w-full rounded-xl border border-white/[0.08] object-cover" />
                <button
                  type="button"
                  onClick={() => handleFile(null)}
                  className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-black/60 text-white backdrop-blur"
                  aria-label="Remove photo"
                >
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  console.log('[photo-ai] picker triggered');
                  inputRef.current?.click();
                }}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/[0.12] bg-white/[0.03] py-12 text-white/55 transition-colors hover:bg-white/[0.06]"
              >
                <Camera className="h-8 w-8" strokeWidth={1.5} />
                <span className="text-sm font-medium">Tap to capture or upload</span>
                <span className="text-[11px] text-white/30">JPG, PNG, or WEBP, up to 10 MB. iPhone HEIC not supported.</span>
              </button>
            )}
          </div>

          <div>
            <label htmlFor="meal-note" className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-white/40">
              Add context (optional)
            </label>
            <input
              id="meal-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder="Example: cooked in olive oil, large portion"
              className="w-full rounded-xl border border-white/[0.08] bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-[#2DA5A0] focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!file}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#B75E18] px-6 py-3 text-sm font-semibold text-white transition-all min-h-[48px] hover:bg-[#B75E18]/90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto w-full"
            >
              <Sparkles className="h-4 w-4" strokeWidth={1.5} />
              Analyze Photo
            </button>
            <Link
              href="/nutrition/log-meal"
              className="inline-flex items-center justify-center gap-2 text-xs font-medium text-[#2DA5A0] hover:underline"
            >
              <PencilLine className="h-3.5 w-3.5" strokeWidth={1.5} />
              Type Instead
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
