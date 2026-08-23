'use client';

// Prompt #160 section 3.3: client-side review form. Handles edits, save,
// re-analyze, discard. Renders MealResultCard.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, RotateCcw, Trash2 } from 'lucide-react';
import { MealResultCard } from '@/components/nutrition/MealResultCard';
import type { NutritionAnalysis } from '@/lib/nutrition/schema';

interface ReviewFormProps {
  readonly logId: string;
  readonly initial: NutritionAnalysis;
}

export function ReviewForm({ logId, initial }: ReviewFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [analysis, setAnalysis] = useState<NutritionAnalysis>(initial);
  const [fatSourceId, setFatSourceId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<null | 'save' | 'discard'>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSubmitting('save');
    setError(null);
    try {
      const res = await fetch('/api/nutrition/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId, edits: analysis, fatSourceId }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: 'Save failed' }));
        setError(msg);
        setSubmitting(null);
        return;
      }
      // Prompt 180d (2026-06-08): invalidate user-meals so Today's
      // Meals + Daily Macros + Nutrition Score refresh when the
      // user lands back on /nutrition. The QueryClient default
      // staleTime of 5 minutes would otherwise mask the new row.
      void queryClient.invalidateQueries({ queryKey: ['user-meals'] });
      router.push('/nutrition?logged=1');
    } catch {
      setError('Network error. Try again.');
      setSubmitting(null);
    }
  }

  async function handleDiscard() {
    setSubmitting('discard');
    setError(null);
    try {
      const res = await fetch('/api/nutrition/discard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId }),
      });
      // Prompt 228 D2: only leave after the server confirms the delete.
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          typeof body?.error === 'string'
            ? body.error
            : 'Could not discard. Your meal is still here.',
        );
        setSubmitting(null);
        return;
      }
      router.push('/nutrition/log-meal');
    } catch {
      setError('Network error. Try again. Your meal is still here.');
      setSubmitting(null);
    }
  }

  function handleReanalyze() {
    router.push('/nutrition/log-meal');
  }

  return (
    <div className="space-y-5">
      <MealResultCard
        analysis={analysis}
        onChange={setAnalysis}
        fatSourceId={fatSourceId}
        onFatSourceChange={setFatSourceId}
      />

      {error && (
        <p className="text-xs text-[#FCA5A5]">{error}</p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handleSave}
          disabled={submitting !== null}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] px-6 py-3 text-sm font-semibold text-white transition-all min-h-[48px] hover:bg-[#2DA5A0]/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
          {submitting === 'save' ? 'Saving...' : 'Save to Log'}
        </button>
        <button
          type="button"
          onClick={handleReanalyze}
          disabled={submitting !== null}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/5 px-4 py-3 text-sm font-medium text-white/70 transition-all min-h-[48px] hover:bg-white/10"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
          Re-analyze
        </button>
        <button
          type="button"
          onClick={handleDiscard}
          disabled={submitting !== null}
          className="inline-flex items-center justify-center gap-2 text-sm font-medium text-red-400 transition-colors hover:text-red-300"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.5} />
          {submitting === 'discard' ? 'Discarding...' : 'Discard'}
        </button>
      </div>
    </div>
  );
}
