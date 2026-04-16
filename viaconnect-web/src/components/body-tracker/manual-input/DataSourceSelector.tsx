'use client';

import { Star } from 'lucide-react';
import {
  DATA_SOURCES,
  DATA_SOURCE_GROUP_LABELS,
  confidenceStars,
  type DataSource,
  type DataSourceGroup,
  type DataSourceId,
} from '@/lib/body-tracker/manual-input';

interface DataSourceSelectorProps {
  value: DataSourceId | null;
  onChange: (id: DataSourceId) => void;
  filterGroups?: DataSourceGroup[];
}

const GROUP_ORDER: DataSourceGroup[] = ['professional', 'device', 'manual', 'clinical', 'other'];

export function DataSourceSelector({ value, onChange, filterGroups }: DataSourceSelectorProps) {
  const visible = filterGroups
    ? DATA_SOURCES.filter((s) => filterGroups.includes(s.group))
    : DATA_SOURCES;

  const grouped: Record<DataSourceGroup, DataSource[]> = {
    professional: [], device: [], manual: [], clinical: [], other: [],
  };
  for (const s of visible) grouped[s.group].push(s);

  return (
    <fieldset className="space-y-3">
      <legend className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-2">
        Where did you get this data?
      </legend>
      {GROUP_ORDER.map((grp) => {
        const items = grouped[grp];
        if (items.length === 0) return null;
        return (
          <div key={grp} className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/45 bg-white/[0.02]">
              {DATA_SOURCE_GROUP_LABELS[grp]}
            </div>
            <ul className="divide-y divide-white/[0.05]">
              {items.map((s) => {
                const Icon = s.icon;
                const selected = value === s.id;
                const stars = confidenceStars(s.confidence);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => onChange(s.id)}
                      aria-pressed={selected}
                      className={`w-full flex items-start gap-3 px-3 py-3 text-left min-h-[56px] transition-colors ${
                        selected ? 'bg-[#2DA5A0]/15' : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border ${
                          selected ? 'border-[#2DA5A0]' : 'border-white/30'
                        }`}
                      >
                        {selected && <span className="h-2.5 w-2.5 rounded-full bg-[#2DA5A0]" />}
                      </span>
                      <Icon className="h-4 w-4 flex-none text-white/70 mt-0.5" strokeWidth={1.5} />
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-white truncate">{s.label}</span>
                          <span className="flex items-center gap-0.5 flex-none" aria-label={`${stars} of 5 confidence`}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${i < stars ? 'fill-[#E8803A] text-[#E8803A]' : 'text-white/20'}`}
                                strokeWidth={1.5}
                              />
                            ))}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-[11px] text-white/55 leading-snug">
                          {s.description}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </fieldset>
  );
}
