'use client';

import { useEffect, useState } from 'react';
import { Loader2, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { OutcomeStackCard, type OutcomeStackCardComponent } from '@/components/pricing/OutcomeStackCard';
import type { OutcomeStack } from '@/types/pricing';
import { dollarsToCents } from '@/lib/pricing/format';

interface StackWithMeta {
  stack: OutcomeStack;
  components: OutcomeStackCardComponent[];
  individualTotalCents: number;
  bundlePriceCents: number;
}

export default function OutcomeStacksPage() {
  const [loaded, setLoaded] = useState<StackWithMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = createClient();
      try {
        const [stacksR, compsR, skusR] = await Promise.all([
          supabase.from('outcome_stacks').select('*').eq('is_active', true).order('sort_order'),
          supabase.from('outcome_stack_components').select('stack_id, sku, is_primary, sort_order'),
          supabase.from('master_skus').select('sku, name, msrp'),
        ]);

        if (stacksR.error) throw stacksR.error;

        const stacks = (stacksR.data ?? []) as OutcomeStack[];
        const comps = (compsR.data ?? []) as Array<{ stack_id: string; sku: string; is_primary: boolean; sort_order: number }>;
        const skus = (skusR.data ?? []) as Array<{ sku: string; name: string; msrp: number }>;
        const skuMap = new Map(skus.map((s) => [s.sku, s]));

        const combined: StackWithMeta[] = stacks.map((s) => {
          const stackComps = comps
            .filter((c) => c.stack_id === s.id)
            .sort((a, b) => a.sort_order - b.sort_order);
          const componentDisplay: OutcomeStackCardComponent[] = stackComps.map((c) => {
            const sku = skuMap.get(c.sku);
            return {
              sku: c.sku,
              name: sku?.name ?? `SKU ${c.sku}`,
              isPrimary: c.is_primary,
            };
          });
          const individualTotalCents = stackComps.reduce(
            (sum, c) => sum + dollarsToCents(Number(skuMap.get(c.sku)?.msrp ?? 0)),
            0,
          );
          const bundlePriceCents = Math.round(
            individualTotalCents * (1 - s.bundle_discount_percent / 100),
          );
          return { stack: s, components: componentDisplay, individualTotalCents, bundlePriceCents };
        });

        if (mounted) setLoaded(combined);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load stacks');
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <main className="min-h-screen bg-[#0B1520] text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-5 w-5 text-[#7C3AED]" strokeWidth={1.5} />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7C3AED]">
              Outcome stacks
            </p>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-white">Pre built protocols, 20% off MSRP</h1>
          <p className="mt-3 text-sm sm:text-base text-white/65 max-w-2xl leading-relaxed">
            Seven curated stacks targeting specific outcomes. Each saves 20% versus buying the
            components individually. Good starting point before completing the full CAQ or GeneX360.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-4 text-sm text-[#FCA5A5]">
            {error}
          </div>
        )}

        {!loaded && !error && (
          <div className="flex items-center justify-center py-20 text-white/50">
            <Loader2 className="h-6 w-6 animate-spin" strokeWidth={1.5} />
          </div>
        )}

        {loaded && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {loaded.map(({ stack, components, individualTotalCents, bundlePriceCents }) => (
              <OutcomeStackCard
                key={stack.id}
                stack={stack}
                components={components}
                individualTotalCents={individualTotalCents}
                bundlePriceCents={bundlePriceCents}
                onSelect={(id) => {
                  window.location.href = `/shop/stacks/${id}`;
                }}
              />
            ))}
          </div>
        )}

        <footer className="mt-12 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-[11px] text-white/55 leading-relaxed max-w-3xl">
          <p>
            Supplement recommendations are informational; they do not replace medical advice. Speak
            with a qualified healthcare provider before starting new supplements.
          </p>
        </footer>
      </div>
    </main>
  );
}
