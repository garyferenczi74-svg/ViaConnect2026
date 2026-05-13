'use client';

// Prompt #160 section 3.1: text-based meal entry route.
// /dashboard/nutrition/log-meal

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mic, ImagePlus, Sparkles } from 'lucide-react';
import { MealTypeSelector } from '@/components/nutrition/MealTypeSelector';
import { AnalyzingState } from '@/components/nutrition/AnalyzingState';
import { AnalysisErrorCard } from '@/components/nutrition/AnalysisErrorCard';
import type { MealType } from '@/lib/nutrition/schema';

function toLocalDatetimeInput(d: Date): string {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

export default function LogMealPage() {
  // eslint-disable-next-line no-console
  console.log('[#164 LogMealPage render v3-cbc68808+]');
  const router = useRouter();
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [loggedAt, setLoggedAt] = useState<string>(() => toLocalDatetimeInput(new Date()));
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dictating, setDictating] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    const W = window as Window & {
      SpeechRecognition?: typeof SpeechRecognition;
      webkitSpeechRecognition?: typeof SpeechRecognition;
    };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) return;
    setSpeechSupported(true);
    const recog = new Ctor();
    recog.lang = 'en-US';
    recog.continuous = false;
    recog.interimResults = false;
    recog.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(' ');
      setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recog.onend = () => setDictating(false);
    recog.onerror = () => setDictating(false);
    recognitionRef.current = recog;
    return () => {
      try { recog.abort(); } catch { /* ignore */ }
    };
  }, []);

  function toggleDictation() {
    const recog = recognitionRef.current;
    if (!recog) return;
    if (dictating) {
      recog.stop();
    } else {
      try {
        recog.start();
        setDictating(true);
      } catch {
        setDictating(false);
      }
    }
  }

  async function handleAnalyze() {
    if (description.trim().length < 5) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/nutrition/analyze-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim().slice(0, 2000),
          mealType,
          loggedAt: new Date(loggedAt).toISOString(),
        }),
      });
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
        // eslint-disable-next-line no-console
        console.log('[#164 analyze-text non-2xx]', { status: res.status, body, msg, msgType: typeof msg });
        setError(msg);
        setSubmitting(false);
        return;
      }
      const { logId } = await res.json();
      router.push(`/nutrition/log-meal/review?logId=${logId}`);
    } catch {
      setError('Network error. Try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:py-8">
      <header className="mb-5">
        <h1 className="text-xl font-bold text-white sm:text-2xl">Log a Meal</h1>
        <p className="mt-1 text-sm text-white/40">Describe what you ate. Gordan will compute the macros.</p>
      </header>

      {submitting && <AnalyzingState subtitle="Estimating macros from your description" />}

      {!submitting && error && (
        <div className="mb-5">
          <AnalysisErrorCard
            message={error}
            onRetry={() => {
              setError(null);
              void handleAnalyze();
            }}
            onManual={() => {
              setError(null);
            }}
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
            <label htmlFor="meal-description" className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-white/40">
              Describe your meal
            </label>
            <div className="relative">
              <textarea
                id="meal-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="Describe what you ate. Example: Two scrambled eggs with avocado toast on sourdough and a black coffee."
                className="w-full rounded-xl border border-white/[0.08] bg-white/5 p-3 text-sm text-white placeholder:text-white/25 focus:border-[#2DA5A0] focus:outline-none"
              />
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleDictation}
                  className={`absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                    dictating
                      ? 'border-[#B75E18]/60 bg-[#B75E18]/20 text-[#B75E18]'
                      : 'border-white/[0.08] bg-white/5 text-white/55 hover:bg-white/10'
                  }`}
                  aria-label={dictating ? 'Stop dictation' : 'Start dictation'}
                  aria-pressed={dictating}
                >
                  <Mic className="h-4 w-4" strokeWidth={1.5} />
                </button>
              )}
            </div>
            <p className="mt-1 text-[11px] text-white/30">{description.length} / 2000 characters</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={description.trim().length < 5}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#B75E18] px-6 py-3 text-sm font-semibold text-white transition-all min-h-[48px] hover:bg-[#B75E18]/90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto w-full"
            >
              <Sparkles className="h-4 w-4" strokeWidth={1.5} />
              Analyze Meal
            </button>
            <Link
              href="/nutrition/photo-ai"
              className="inline-flex items-center justify-center gap-2 text-xs font-medium text-[#2DA5A0] hover:underline"
            >
              <ImagePlus className="h-3.5 w-3.5" strokeWidth={1.5} />
              Use Photo Instead
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
