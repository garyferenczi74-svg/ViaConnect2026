'use client';

// AddSourceModal — search & add suggested sources, or add a custom source.
// Custom additions trigger the local content seeder so the new source is
// immediately populated in the user's feed without external API calls.

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Plus, Search, X } from 'lucide-react';
import type {
  CategorySlug,
  NewSourceInput,
  ResearchCategory,
  SourceType,
} from '@/lib/research-hub/types';
import { SUGGESTED_SOURCES } from '@/lib/research-hub/suggested-sources';

interface AddSourceModalProps {
  open: boolean;
  category: ResearchCategory;
  /** Names of sources the user already has so we hide them from suggestions. */
  existingSourceNames: Set<string>;
  onAdd: (input: NewSourceInput) => Promise<void> | void;
  onClose: () => void;
}

const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: 'journal',      label: 'Journal' },
  { value: 'website',      label: 'Website' },
  { value: 'platform',     label: 'Platform' },
  { value: 'organization', label: 'Organization' },
  { value: 'influencer',   label: 'Influencer' },
  { value: 'podcast',      label: 'Podcast' },
  { value: 'custom',       label: 'Other' },
];

export function AddSourceModal({
  open,
  category,
  existingSourceNames,
  onAdd,
  onClose,
}: AddSourceModalProps) {
  const [query, setQuery] = useState('');
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customType, setCustomType] = useState<SourceType>('journal');
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState<string[]>([]);

  const slug = category.slug as CategorySlug;
  const suggested = SUGGESTED_SOURCES[slug] || [];

  const filteredSuggested = useMemo(() => {
    return suggested
      .filter((s) => !existingSourceNames.has(s.source_name))
      .filter((s) =>
        query.length === 0
          ? true
          : s.source_name.toLowerCase().includes(query.toLowerCase()),
      );
  }, [suggested, existingSourceNames, query]);

  const handleAddSuggested = async (name: string, url: string | undefined, type: SourceType) => {
    setIsAdding(true);
    try {
      await onAdd({
        source_name: name,
        source_url: url || null,
        source_type: type,
        is_custom: false,
      });
      setJustAdded((prev) => [...prev, name]);
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddCustom = async () => {
    const name = customName.trim();
    if (!name) return;
    setIsAdding(true);
    try {
      await onAdd({
        source_name: name,
        source_url: customUrl.trim() || null,
        source_type: customType,
        is_custom: true,
      });
      setCustomName('');
      setCustomUrl('');
      setCustomType('journal');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1E3054] shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-white/5 p-4 sm:p-5">
              <div>
                <h2 className="text-base font-bold text-white">
                  Add Source to {category.label}
                </h2>
                <p className="mt-0.5 text-[11px] text-white/40">
                  Pick a suggested source or add your own
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/50 hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {/* Search */}
              <div className="relative mb-4">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
                  strokeWidth={1.5}
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${category.label.toLowerCase()}...`}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm text-white placeholder-white/30 focus:border-[#2DA5A0]/40 focus:outline-none focus:ring-2 focus:ring-[#2DA5A0]/20"
                />
              </div>

              {/* Suggested */}
              {filteredSuggested.length > 0 && (
                <div className="mb-5">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    Suggested Sources
                  </p>
                  <ul className="space-y-1.5">
                    {filteredSuggested.map((s) => {
                      const added = justAdded.includes(s.source_name);
                      return (
                        <li
                          key={s.source_name}
                          className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">
                              {s.source_name}
                            </p>
                            {s.source_url && (
                              <p className="truncate text-[10px] text-white/35">
                                {s.source_url}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={added || isAdding}
                            onClick={() =>
                              handleAddSuggested(s.source_name, s.source_url, s.source_type)
                            }
                            className={`flex flex-shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all ${
                              added
                                ? 'border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E]'
                                : 'border-[#2DA5A0]/30 bg-[#2DA5A0]/10 text-[#2DA5A0] hover:bg-[#2DA5A0]/20'
                            }`}
                          >
                            {added ? (
                              <>
                                <Check className="h-3 w-3" strokeWidth={2} />
                                Added
                              </>
                            ) : (
                              <>
                                <Plus className="h-3 w-3" strokeWidth={2} />
                                Add
                              </>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Custom */}
              <div className="rounded-xl border border-orange-400/15 bg-orange-400/[0.04] p-3.5">
                <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-orange-300/80">
                  <Plus className="h-3 w-3" strokeWidth={2} />
                  Add to Research — Custom Source
                </p>
                <div className="space-y-2.5">
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Source name (e.g. Cell Metabolism)"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#B75E18]/40 focus:outline-none"
                  />
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="URL (optional)"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#B75E18]/40 focus:outline-none"
                  />
                  <select
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value as SourceType)}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-[#B75E18]/40 focus:outline-none"
                  >
                    {SOURCE_TYPES.map((t) => (
                      <option key={t.value} value={t.value} className="bg-[#1E3054]">
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddCustom}
                    disabled={!customName.trim() || isAdding}
                    className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-orange-400/30 bg-orange-400/15 px-4 py-2 text-sm font-semibold text-orange-300 transition-all hover:bg-orange-400/25 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" strokeWidth={1.5} />
                    Add Custom Source
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
