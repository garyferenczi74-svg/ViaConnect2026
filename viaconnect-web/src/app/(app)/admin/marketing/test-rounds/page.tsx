'use client';

// Prompt #138a Phase 5b: test rounds list (replaces the Phase 5a stub).
// TestRoundDashboard renders running, paused, and ended rounds.
// New round button routes to /new.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, FlaskConical, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { TestRoundDashboard } from '@/components/marketing-admin/TestRoundDashboard';
import type { MarketingCopyTestRoundRow } from '@/lib/marketing/variants/types';

const supabase = createClient();

export default function TestRoundsListPage() {
  const [rounds, setRounds] = useState<MarketingCopyTestRoundRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('marketing_copy_test_rounds')
        .select('*')
        .eq('surface', 'hero')
        .order('started_at', { ascending: false });
      setRounds((data ?? []) as MarketingCopyTestRoundRow[]);
      setLoading(false);
    })();
  }, []);

  const active = rounds.filter((r) => !r.ended_at);
  const ended = rounds.filter((r) => r.ended_at);

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
            <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
              Test rounds
            </h1>
            <p className="text-xs text-white/60 mt-1">
              {loading ? 'Loading...' : `${active.length} running, ${ended.length} ended`}
            </p>
          </div>
          <Link
            href="/admin/marketing/test-rounds/new"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#2DA5A0] px-4 py-2 text-sm font-semibold text-[#0B1520] hover:bg-[#3DBAB5] min-h-[44px]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            New round
          </Link>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-center">
            <p className="text-sm text-white/40">Loading test rounds...</p>
          </div>
        ) : (
          <TestRoundDashboard rounds={rounds} />
        )}
      </div>
    </div>
  );
}
