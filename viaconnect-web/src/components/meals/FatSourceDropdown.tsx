'use client';

// Prompt 184b: searchable, scrollable fat-source dropdown. Shows Hannah's
// curated health tier inline next to each source. Replaces the broken Good Fat
// and Healthy Fat split with a single source selector on the Fat field. Built
// for desktop and mobile (44px touch targets, text-base inputs to avoid iOS
// zoom). Lucide icons at strokeWidth 1.5; brand palette; Instrument Sans.

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import type { FatSourceProfile, FatHealthTier } from '@/lib/nutrition/fat-sources';

const TIER_STYLE: Record<FatHealthTier, { label: string; cls: string }> = {
  favorable: { label: 'Favorable', cls: 'bg-[#2DA5A0]/15 text-[#2DA5A0]' },
  moderate: { label: 'Moderate', cls: 'bg-[#C9A23A]/15 text-[#C9A23A]' },
  limit: { label: 'Limit', cls: 'bg-[#B75E18]/15 text-[#B75E18]' },
  neutral: { label: 'Neutral', cls: 'bg-white/10 text-white/60' },
};

export interface FatSourceDropdownProps {
  readonly value: string | null;
  readonly onChange: (id: string | null) => void;
  readonly fatSources: FatSourceProfile[];
  readonly disabled?: boolean;
  readonly label?: string;
}

export function FatSourceDropdown({
  value,
  onChange,
  fatSources,
  disabled,
  label = 'Fat source',
}: FatSourceDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const selected = useMemo(
    () => fatSources.find((s) => s.id === value) ?? null,
    [fatSources, value],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return fatSources;
    return fatSources.filter((s) => s.displayName.toLowerCase().includes(q));
  }, [fatSources, search]);

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1 block text-[11px] font-medium text-white/55">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex min-h-[44px] w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-base text-white/90 disabled:opacity-50"
      >
        <span className="truncate">{selected ? selected.displayName : 'Not specified'}</span>
        <ChevronDown strokeWidth={1.5} className="ml-2 h-4 w-4 shrink-0 text-white/50" />
      </button>

      {open && !disabled && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-[#1A2744] shadow-xl">
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
            <Search strokeWidth={1.5} className="h-4 w-4 shrink-0 text-white/40" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sources"
              className="w-full bg-transparent text-base text-white/90 placeholder:text-white/35 focus:outline-none"
            />
          </div>
          <ul role="listbox" className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-white/45">No matching sources</li>
            )}
            {filtered.map((s) => {
              const tier = s.healthTier ? TIER_STYLE[s.healthTier] : null;
              const isSel = s.id === value;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    onClick={() => {
                      onChange(s.id);
                      setOpen(false);
                      setSearch('');
                    }}
                    className="flex min-h-[44px] w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-white/5"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {isSel ? (
                        <Check strokeWidth={1.5} className="h-4 w-4 shrink-0 text-[#2DA5A0]" />
                      ) : (
                        <span className="h-4 w-4 shrink-0" />
                      )}
                      <span className={`truncate text-base ${isSel ? 'text-white' : 'text-white/85'}`}>
                        {s.displayName}
                      </span>
                    </span>
                    {tier && (
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${tier.cls}`}>
                        {tier.label}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
