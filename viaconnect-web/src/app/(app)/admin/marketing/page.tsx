'use client';

// Prompt #138a Phase 5a: marketing admin landing.
// Two cards (hero variants, test rounds) plus quick stats from
// marketing_copy_variants. Authenticated read works because Phase 2 RLS
// admits marketing_admin / admin / superadmin / compliance_admin.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Layers, Megaphone, FlaskConical, ShieldCheck, Archive } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface VariantStats {
  total: number;
  draft: number;
  precheck_passed: number;
  approved: number;
  active: number;
  archived: number;
}

const EMPTY_STATS: VariantStats = {
  total: 0, draft: 0, precheck_passed: 0, approved: 0, active: 0, archived: 0,
};

export default function MarketingAdminLandingPage() {
  const [stats, setStats] = useState<VariantStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('marketing_copy_variants')
        .select('marshall_precheck_passed, steve_approval_at, active_in_test, archived');
      const rows = (data ?? []) as Array<{
        marshall_precheck_passed: boolean;
        steve_approval_at: string | null;
        active_in_test: boolean;
        archived: boolean;
      }>;
      const next: VariantStats = { ...EMPTY_STATS, total: rows.length };
      for (const r of rows) {
        if (r.archived) next.archived += 1;
        else if (r.active_in_test) next.active += 1;
        else if (r.steve_approval_at) next.approved += 1;
        else if (r.marshall_precheck_passed) next.precheck_passed += 1;
        else next.draft += 1;
      }
      setStats(next);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <header>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
            Marketing
          </h1>
          <p className="text-xs text-white/60 mt-1">
            Homepage hero variants, A/B tests, Marshall pre-check gating
          </p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <StatTile label="Total variants" value={loading ? null : stats.total} />
          <StatTile label="Draft" value={loading ? null : stats.draft} />
          <StatTile label="Pre-check passed" value={loading ? null : stats.precheck_passed} />
          <StatTile label="Approved (idle)" value={loading ? null : stats.approved} />
          <StatTile label="Active in test" value={loading ? null : stats.active} accent />
          <StatTile label="Archived" value={loading ? null : stats.archived} muted />
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/admin/marketing/hero-variants"
            className="rounded-2xl border border-white/[0.1] bg-white/[0.04] p-5 hover:bg-white/[0.08] transition-colors min-h-[44px]"
          >
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
              <h2 className="text-base font-semibold">Hero variants</h2>
            </div>
            <p className="text-xs text-white/60">
              Create, pre-check, approve, activate, archive homepage hero copy variants.
            </p>
          </Link>
          <Link
            href="/admin/marketing/test-rounds"
            className="rounded-2xl border border-white/[0.1] bg-white/[0.04] p-5 hover:bg-white/[0.08] transition-colors min-h-[44px]"
          >
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
              <h2 className="text-base font-semibold">Test rounds</h2>
            </div>
            <p className="text-xs text-white/60">
              Run, pause, resume, and close A/B test rounds. Promote a winner per spec section 6.4.
            </p>
          </Link>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-[#2DA5A0] flex-none mt-0.5" strokeWidth={1.5} />
            <div className="text-xs text-white/70 leading-relaxed">
              Every variant must pass word-count validation, Marshall pre-check, and Steve
              Rica approval before it can be activated in a test round. The activation gate
              is enforced at the database level, the API layer, and the UI; an active
              variant cannot be edited without first deactivating it.
            </div>
          </div>
        </section>

        {stats.archived > 0 && (
          <section className="text-xs text-white/50 flex items-center gap-1.5">
            <Archive className="h-3.5 w-3.5" strokeWidth={1.5} />
            Archived variants are preserved indefinitely per spec section 6.5.
          </section>
        )}
      </div>
    </div>
  );
}

function StatTile({
  label, value, accent = false, muted = false,
}: { label: string; value: number | null; accent?: boolean; muted?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        accent
          ? 'border-[#2DA5A0]/40 bg-[#2DA5A0]/10'
          : muted
            ? 'border-white/[0.05] bg-white/[0.02]'
            : 'border-white/[0.1] bg-white/[0.04]'
      }`}
    >
      <p className={`text-2xl font-bold ${muted ? 'text-white/60' : 'text-white'}`}>
        {value === null ? ' ' : value}
      </p>
      <p className="text-[11px] text-white/60 mt-0.5">{label}</p>
    </div>
  );
}
