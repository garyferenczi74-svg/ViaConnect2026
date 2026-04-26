'use client';

// Prompt #138a Phase 5a: new variant page.
// Uses VariantEditor for the form and VariantPreview for live render.
// Submit POSTs to /api/marketing/variants then routes to the detail page.

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { VariantEditor, EMPTY_VARIANT_STATE, type VariantEditorState } from '@/components/marketing-admin/VariantEditor';
import { VariantPreview } from '@/components/marketing-admin/VariantPreview';
import { validateWordCounts } from '@/lib/marketing/variants/wordCount';

export default function NewHeroVariantPage() {
  const router = useRouter();
  const [state, setState] = useState<VariantEditorState>(EMPTY_VARIANT_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wc = validateWordCounts(state.headline_text, state.subheadline_text);
  const requiredFilled = !!(
    state.slot_id.trim() &&
    state.variant_label.trim() &&
    state.headline_text.trim() &&
    state.subheadline_text.trim() &&
    state.cta_label.trim()
  );
  const submittable = requiredFilled && wc.ok && !submitting;

  async function handleSubmit() {
    if (!submittable) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/marketing/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_id: state.slot_id.trim(),
          surface: 'hero',
          variant_label: state.variant_label.trim(),
          framing: state.framing,
          headline_text: state.headline_text.trim(),
          subheadline_text: state.subheadline_text.trim(),
          cta_label: state.cta_label.trim(),
          cta_destination: state.cta_destination.trim() || null,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.error ?? 'Create failed');
        setSubmitting(false);
        return;
      }
      router.push(`/admin/marketing/hero-variants/${body.id}`);
    } catch (err) {
      setError((err as Error).message ?? 'Network error');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <Link
          href="/admin/marketing/hero-variants"
          className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Hero variants
        </Link>

        <header>
          <h1 className="text-xl sm:text-2xl font-semibold">New hero variant</h1>
          <p className="text-xs text-white/60 mt-1">
            Drafts ship inactive. Activation requires word-count, Marshall pre-check, and
            Steve approval.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <VariantEditor state={state} onChange={setState} disabled={submitting} />
          <VariantPreview
            headline={state.headline_text}
            subheadline={state.subheadline_text}
            ctaLabel={state.cta_label}
            ctaDestination={state.cta_destination}
          />
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Link
            href="/admin/marketing/hero-variants"
            className="inline-flex items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.08] min-h-[44px]"
          >
            Cancel
          </Link>
          <button
            onClick={handleSubmit}
            disabled={!submittable}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#2DA5A0] px-4 py-2 text-sm font-semibold text-[#0B1520] hover:bg-[#3DBAB5] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            <Save className="h-4 w-4" strokeWidth={2} />
            {submitting ? 'Creating...' : 'Save draft'}
          </button>
        </div>
      </div>
    </div>
  );
}
