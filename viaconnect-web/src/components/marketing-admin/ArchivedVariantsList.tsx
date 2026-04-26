'use client';

// Prompt #138a Phase 5a: archived variants live indefinitely per spec
// section 6.5 (losers are archived, never deleted). The list lets admins
// review past variants and restore them via the detail page.

import Link from 'next/link';
import { Archive } from 'lucide-react';
import type { MarketingCopyVariantRow } from '@/lib/marketing/variants/types';

export interface ArchivedVariantsListProps {
  variants: MarketingCopyVariantRow[];
}

export function ArchivedVariantsList({ variants }: ArchivedVariantsListProps) {
  if (variants.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.05] bg-white/[0.01] p-4 text-center">
        <p className="text-xs text-white/40">No archived variants.</p>
      </div>
    );
  }

  const sorted = [...variants].sort((a, b) =>
    (b.archived_at ?? b.created_at).localeCompare(a.archived_at ?? a.created_at)
  );

  return (
    <ul className="space-y-1.5">
      {sorted.map((v) => (
        <li key={v.id}>
          <Link
            href={`/admin/marketing/hero-variants/${v.id}`}
            className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.04] transition-colors px-3 py-2 min-h-[44px]"
          >
            <Archive className="h-3.5 w-3.5 text-white/40 flex-none" strokeWidth={1.5} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/70 truncate">
                {v.variant_label}
              </p>
              <p className="text-[10px] text-white/40 font-mono truncate">
                {v.slot_id}
              </p>
            </div>
            {v.archived_at && (
              <span className="text-[10px] text-white/40 flex-none">
                {new Date(v.archived_at).toLocaleDateString()}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
