'use client';

// Prompt #138a Phase 5a: list view for non-archived hero variants.
// Each row links to the detail page and shows badges for the four lifecycle
// gates (word_count_validated, marshall_precheck_passed, steve_approval_at,
// active_in_test). Sorting is stable: active first, then approved, then
// pre-check passed, then drafts, then by created_at desc.

import Link from 'next/link';
import { CheckCircle2, Circle, ExternalLink, Sparkles } from 'lucide-react';
import type { MarketingCopyVariantRow } from '@/lib/marketing/variants/types';

export interface VariantListProps {
  variants: MarketingCopyVariantRow[];
}

export function VariantList({ variants }: VariantListProps) {
  if (variants.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-center">
        <p className="text-sm text-white/60">
          No variants yet. Create one to start.
        </p>
      </div>
    );
  }

  const sorted = [...variants].sort((a, b) => {
    const stage = (v: MarketingCopyVariantRow) =>
      v.active_in_test ? 0
      : v.steve_approval_at ? 1
      : v.marshall_precheck_passed ? 2
      : v.word_count_validated ? 3
      : 4;
    const da = stage(a) - stage(b);
    if (da !== 0) return da;
    return b.created_at.localeCompare(a.created_at);
  });

  return (
    <ul className="space-y-2">
      {sorted.map((v) => (
        <li key={v.id}>
          <Link
            href={`/admin/marketing/hero-variants/${v.id}`}
            className="block rounded-2xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] transition-colors p-4 min-h-[44px]"
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold truncate">
                    {v.variant_label}
                  </span>
                  {v.active_in_test && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#2DA5A0]/20 text-[#2DA5A0] text-[10px] px-2 py-0.5 font-medium">
                      <Sparkles className="h-2.5 w-2.5" strokeWidth={1.5} />
                      Live
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-white/50 mt-0.5 font-mono truncate">
                  {v.slot_id}
                </p>
                <p className="text-xs text-white/70 mt-2 line-clamp-2">
                  {v.headline_text}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:flex-col sm:items-end sm:gap-1 sm:flex-none">
                <Gate ok={v.word_count_validated} label="Word count" />
                <Gate ok={v.marshall_precheck_passed} label="Marshall" />
                <Gate ok={!!v.steve_approval_at} label="Steve" />
              </div>
              <ExternalLink className="hidden sm:block h-4 w-4 text-white/40 flex-none mt-1" strokeWidth={1.5} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Gate({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${
        ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/[0.04] text-white/40'
      }`}
    >
      {ok ? (
        <CheckCircle2 className="h-2.5 w-2.5" strokeWidth={1.5} />
      ) : (
        <Circle className="h-2.5 w-2.5" strokeWidth={1.5} />
      )}
      {label}
    </span>
  );
}
