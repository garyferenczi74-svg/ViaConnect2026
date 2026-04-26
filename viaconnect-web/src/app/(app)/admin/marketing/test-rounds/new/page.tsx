'use client';

// Prompt #138a Phase 5b: new test round page.
// Pick a test_id and the active variants to include in the rotation.
// Submit POSTs to /api/marketing/test-rounds; the route validates that
// every selected slot is currently active_in_test=true.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FlaskConical, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { MarketingCopyVariantRow } from '@/lib/marketing/variants/types';

const supabase = createClient();

export default function NewTestRoundPage() {
  const router = useRouter();
  const [activeVariants, setActiveVariants] = useState<MarketingCopyVariantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [testId, setTestId] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('marketing_copy_variants')
        .select('*')
        .eq('surface', 'hero')
        .eq('active_in_test', true)
        .eq('archived', false);
      setActiveVariants((data ?? []) as MarketingCopyVariantRow[]);
      setLoading(false);
    })();
  }, []);

  const submittable = !!testId.trim() && selectedSlots.size >= 2 && !submitting;

  async function handleSubmit() {
    if (!submittable) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/marketing/test-rounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        test_id: testId.trim(),
        surface: 'hero',
        active_slot_ids: [...selectedSlots],
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setError(json.error ?? 'Create failed');
      setSubmitting(false);
      return;
    }
    router.push(`/admin/marketing/test-rounds/${json.id}`);
  }

  function toggle(slot: string) {
    setSelectedSlots((s) => {
      const next = new Set(s);
      if (next.has(slot)) next.delete(slot);
      else next.add(slot);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
        <Link
          href="/admin/marketing/test-rounds"
          className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Test rounds
        </Link>

        <header>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
            New test round
          </h1>
          <p className="text-xs text-white/60 mt-1">
            Pick a stable test ID and at least two currently active variants to rotate.
          </p>
        </header>

        <label className="block">
          <span className="text-xs font-medium text-white/80">Test ID</span>
          <input
            type="text"
            value={testId}
            onChange={(e) => setTestId(e.target.value)}
            disabled={submitting}
            placeholder="hero_2026q2"
            className="mt-1.5 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-base text-white font-mono min-h-[44px] focus:outline-none focus:border-[#2DA5A0] disabled:opacity-50"
          />
          <p className="text-[11px] text-white/40 mt-1">
            Stable across pause and resume; same test ID means same visitor sees the same variant.
          </p>
        </label>

        <div>
          <p className="text-xs font-medium text-white/80 mb-1.5">
            Active variants ({activeVariants.length} eligible)
          </p>
          {loading ? (
            <p className="text-xs text-white/40 px-3 py-2">Loading...</p>
          ) : activeVariants.length === 0 ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-sm text-amber-100">
                No active variants. Activate at least two variants in the variants list before
                starting a test round.
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {activeVariants.map((v) => (
                <li key={v.slot_id}>
                  <label className="flex items-start gap-3 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] p-3 cursor-pointer min-h-[44px]">
                    <input
                      type="checkbox"
                      checked={selectedSlots.has(v.slot_id)}
                      onChange={() => toggle(v.slot_id)}
                      disabled={submitting}
                      className="mt-0.5 h-4 w-4 accent-[#2DA5A0]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{v.variant_label}</p>
                      <p className="text-[11px] text-white/50 font-mono truncate">{v.slot_id}</p>
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Link
            href="/admin/marketing/test-rounds"
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
            {submitting ? 'Starting...' : 'Start round'}
          </button>
        </div>
      </div>
    </div>
  );
}
