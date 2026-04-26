'use client';

// Prompt #138a Phase 5a: hero variant list page.
// Reads marketing_copy_variants and splits into active/archived sections.
// Filter by framing. New variant button links to /new.

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { VariantList } from '@/components/marketing-admin/VariantList';
import { ArchivedVariantsList } from '@/components/marketing-admin/ArchivedVariantsList';
import type { MarketingCopyVariantRow, VariantFraming } from '@/lib/marketing/variants/types';

const supabase = createClient();

const FRAMING_OPTIONS: Array<{ value: VariantFraming | ''; label: string }> = [
  { value: '', label: 'All framings' },
  { value: 'process_narrative', label: 'Process Narrative' },
  { value: 'outcome_first', label: 'Outcome First' },
  { value: 'proof_first', label: 'Proof First' },
  { value: 'time_to_value', label: 'Time to Value' },
  { value: 'other', label: 'Other' },
];

export default function HeroVariantsListPage() {
  const [variants, setVariants] = useState<MarketingCopyVariantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [framingFilter, setFramingFilter] = useState<VariantFraming | ''>('');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('marketing_copy_variants')
        .select('*')
        .eq('surface', 'hero')
        .order('created_at', { ascending: false });
      setVariants((data ?? []) as MarketingCopyVariantRow[]);
      setLoading(false);
    })();
  }, []);

  const { active, archived } = useMemo(() => {
    const filterFn = (v: MarketingCopyVariantRow) =>
      !framingFilter || v.framing === framingFilter;
    return {
      active: variants.filter((v) => !v.archived).filter(filterFn),
      archived: variants.filter((v) => v.archived).filter(filterFn),
    };
  }, [variants, framingFilter]);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        <Link
          href="/admin/marketing"
          className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Marketing
        </Link>

        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">Hero variants</h1>
            <p className="text-xs text-white/60 mt-1">
              {loading ? 'Loading...' : `${active.length} active, ${archived.length} archived`}
            </p>
          </div>
          <Link
            href="/admin/marketing/hero-variants/new"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#2DA5A0] px-4 py-2 text-sm font-semibold text-[#0B1520] hover:bg-[#3DBAB5] min-h-[44px]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            New variant
          </Link>
        </header>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={framingFilter}
            onChange={(e) => setFramingFilter(e.target.value as VariantFraming | '')}
            className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white min-h-[44px] focus:outline-none focus:border-[#2DA5A0]"
          >
            {FRAMING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#0B1520]">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-center">
            <p className="text-sm text-white/40">Loading variants...</p>
          </div>
        ) : (
          <VariantList variants={active} />
        )}

        <section>
          <button
            onClick={() => setShowArchived((s) => !s)}
            className="text-xs text-white/60 hover:text-white mb-2 min-h-[44px] flex items-center"
          >
            {showArchived ? 'Hide' : 'Show'} archived ({archived.length})
          </button>
          {showArchived && <ArchivedVariantsList variants={archived} />}
        </section>
      </div>
    </div>
  );
}
