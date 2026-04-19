'use client';

// Botanicals database. Reads the existing herbs table (32 rows shipped in
// earlier prompts) and presents a searchable list with category filter +
// detail panel. Latin binomial, traditional uses, modern research, dosing,
// contraindications, and ViaCura formulations rendered when present.

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Leaf,
  Search,
  Filter,
  AlertCircle,
  Loader2,
  ChevronRight,
  X,
} from 'lucide-react';

const supabase = createClient();

interface Herb {
  id: string;
  common_name: string;
  latin_binomial?: string | null;
  category: string | null;
  description: string | null;
  traditional_uses?: string | null;
  modern_research?: string | null;
  dosing?: string | null;
  contraindications: string | null;
  rating: number | null;
}

export default function BotanicalsPage() {
  const [herbs, setHerbs] = useState<Herb[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Herb | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from('herbs')
        .select('*')
        .order('common_name', { ascending: true });
      if (cancelled) return;
      setHerbs((data ?? []) as Herb[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const h of herbs) if (h.category) set.add(h.category);
    return Array.from(set).sort();
  }, [herbs]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return herbs.filter((h) => {
      if (categoryFilter !== 'all' && h.category !== categoryFilter) return false;
      if (q) {
        const blob = `${h.common_name} ${h.latin_binomial ?? ''} ${h.description ?? ''}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [herbs, search, categoryFilter]);

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
          <Leaf className="h-5 w-5 text-emerald-300" strokeWidth={1.5} />
        </span>
        <div>
          <h1 className="text-xl font-semibold md:text-2xl">Botanicals</h1>
          <p className="text-xs text-white/55">
            Materia medica reference. Western, TCM, and Ayurvedic uses are merged into the canonical
            view as the database expands.
          </p>
        </div>
      </header>

      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-[#0B1424] px-3 py-2">
          <Search className="h-4 w-4 text-white/40" strokeWidth={1.5} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search common name, Latin, or description"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-white/40" strokeWidth={1.5} />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0B1424] px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <CenteredLoader />
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-12 text-center text-sm text-white/55">
          No botanicals match the current filters.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => setSelected(h)}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  {h.category && (
                    <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-300">
                      {h.category}
                    </p>
                  )}
                  <h3 className="text-base font-semibold text-white">{h.common_name}</h3>
                  {h.latin_binomial && (
                    <p className="text-xs italic text-white/45">{h.latin_binomial}</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-white/40" strokeWidth={1.5} />
              </div>
              {h.description && (
                <p className="text-sm leading-relaxed text-white/65 line-clamp-3">{h.description}</p>
              )}
              {h.contraindications && (
                <p className="inline-flex items-center gap-1 text-[11px] text-amber-300">
                  <AlertCircle className="h-3 w-3" strokeWidth={1.5} />
                  Has contraindications
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {selected && <DetailDrawer herb={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function DetailDrawer({ herb, onClose }: { herb: Herb; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/55 p-4 md:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0E1A30] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {herb.category && (
              <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-300">{herb.category}</p>
            )}
            <h2 className="text-xl font-semibold text-white">{herb.common_name}</h2>
            {herb.latin_binomial && (
              <p className="text-sm italic text-white/55">{herb.latin_binomial}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-white/65 hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </header>

        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1 text-sm">
          {herb.description && <Section title="Overview" body={herb.description} />}
          {herb.traditional_uses && <Section title="Traditional uses" body={herb.traditional_uses} />}
          {herb.modern_research && <Section title="Modern research" body={herb.modern_research} />}
          {herb.dosing && <Section title="Dosing" body={herb.dosing} />}
          {herb.contraindications && (
            <Section title="Contraindications and cautions" body={herb.contraindications} amber />
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, body, amber }: { title: string; body: string; amber?: boolean }) {
  return (
    <div>
      <p
        className={`mb-1 text-[10px] uppercase tracking-[0.18em] ${
          amber ? 'text-amber-300' : 'text-white/45'
        }`}
      >
        {title}
      </p>
      <p className={`leading-relaxed ${amber ? 'text-amber-100' : 'text-white/80'}`}>{body}</p>
    </div>
  );
}

function CenteredLoader() {
  return (
    <div className="flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] p-12 text-white/50">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" strokeWidth={1.5} />
      Loading botanicals
    </div>
  );
}
