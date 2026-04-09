'use client';

// SourceManager — horizontal source chip strip with "Add to Research" button.

import { AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import type { UserSource } from '@/lib/research-hub/types';
import { SourceCard } from './SourceCard';

interface SourceManagerProps {
  sources: UserSource[];
  onAdd: () => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onToggleAlerts: (id: string, notify: boolean) => void;
  onRemove: (id: string) => void;
}

export function SourceManager({
  sources,
  onAdd,
  onToggleActive,
  onToggleAlerts,
  onRemove,
}: SourceManagerProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#1E3054] p-3.5 sm:p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
          Your Sources ({sources.filter((s) => s.is_active).length} active)
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <AnimatePresence>
          {sources.map((s) => (
            <SourceCard
              key={s.id}
              source={s}
              onToggleActive={onToggleActive}
              onToggleAlerts={onToggleAlerts}
              onRemove={onRemove}
            />
          ))}
        </AnimatePresence>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-orange-400/40 bg-orange-400/[0.04] px-3 py-1.5 text-xs font-medium text-orange-300 transition-all hover:border-orange-400/60 hover:bg-orange-400/10"
        >
          <Plus className="h-3 w-3" strokeWidth={2} />
          Add to Research
        </button>
      </div>
    </div>
  );
}
