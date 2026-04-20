'use client';

// Prompt #100 Phase 5: admin MAP policy editor.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PolicyEditorForm } from '@/components/admin/map/PolicyEditorForm';
import { formatPriceFromCents } from '@/lib/pricing/format';

interface PolicyRow {
  policy_id: string;
  product_id: string;
  tier: string;
  map_price_cents: number;
  msrp_cents: number;
  ingredient_cost_floor_cents: number;
  map_enforcement_start_date: string;
}

export default function AdminPoliciesPage() {
  const [rows, setRows] = useState<PolicyRow[]>([]);

  const refresh = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any;
    const { data } = await supabase.from('map_policies').select('*').order('created_at', { ascending: false }).limit(100);
    setRows((data ?? []) as PolicyRow[]);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
        <Link href="/admin/map" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> MAP Enforcement
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          MAP policies
        </h1>

        <PolicyEditorForm onSaved={refresh} />

        <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-white/50 text-[10px] uppercase tracking-wide">
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-2 px-2">Product</th>
                <th className="text-left py-2 px-2">Tier</th>
                <th className="text-right py-2 px-2">MSRP</th>
                <th className="text-right py-2 px-2">MAP</th>
                <th className="text-right py-2 px-2">Floor</th>
                <th className="text-left py-2 px-2">Starts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.policy_id} className="border-b border-white/[0.04]">
                  <td className="py-2 px-2 text-white/80 font-mono text-[10px]">{r.product_id.slice(0, 8)}</td>
                  <td className="py-2 px-2 text-white/70">{r.tier}</td>
                  <td className="py-2 px-2 text-right text-white/80">{formatPriceFromCents(r.msrp_cents)}</td>
                  <td className="py-2 px-2 text-right text-white">{formatPriceFromCents(r.map_price_cents)}</td>
                  <td className="py-2 px-2 text-right text-white/55">{formatPriceFromCents(r.ingredient_cost_floor_cents)}</td>
                  <td className="py-2 px-2 text-white/70">{r.map_enforcement_start_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
