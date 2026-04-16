'use client';

import { useEffect, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SourceBadge } from './SourceBadge';
import type { DetailTable } from './submitEntry';

interface Entry {
  id: string;
  entry_date: string;
  source: string | null;
  manual_source_id: string | null;
  scan_photo_url: string | null;
  notes: string | null;
  created_at: string;
}

interface EntryHistoryTimelineProps {
  category: 'composition' | 'weight' | 'muscle' | 'metabolic';
  limit?: number;
  onChanged?: () => void;
}

const DETAIL_TABLES: Record<EntryHistoryTimelineProps['category'], DetailTable[]> = {
  composition: ['body_tracker_segmental_fat'],
  weight:      ['body_tracker_weight'],
  muscle:      ['body_tracker_segmental_muscle'],
  metabolic:   ['body_tracker_metabolic'],
};

export function EntryHistoryTimeline({ category, limit = 10, onChanged }: EntryHistoryTimelineProps) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setEntries(null);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (mounted) setEntries([]); return; }

      const tables = DETAIL_TABLES[category];
      const { data: detailRows } = await (supabase as any)
        .from(tables[0])
        .select('entry_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit * 2);

      const entryIds = Array.from(new Set<string>((detailRows ?? []).map((r: { entry_id: string }) => r.entry_id))).slice(0, limit);
      if (entryIds.length === 0) {
        if (mounted) setEntries([]);
        return;
      }

      const { data: rows } = await (supabase as any)
        .from('body_tracker_entries')
        .select('id, entry_date, source, manual_source_id, scan_photo_url, notes, created_at')
        .in('id', entryIds)
        .order('entry_date', { ascending: false });

      if (mounted) setEntries((rows ?? []) as Entry[]);
    })();
    return () => { mounted = false; };
  }, [category, limit, refresh]);

  async function handleDelete(id: string) {
    const ok = typeof window !== 'undefined' ? window.confirm('Delete this entry? This will also remove its measurements.') : false;
    if (!ok) return;
    setBusyId(id);
    try {
      const supabase = createClient();
      await supabase.from('body_tracker_entries').delete().eq('id', id);
      setRefresh((r) => r + 1);
      onChanged?.();
    } finally {
      setBusyId(null);
    }
  }

  if (entries === null) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-6 flex items-center justify-center text-white/40">
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
      </div>
    );
  }
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-6 text-center">
        <p className="text-xs text-white/50">No entries yet. Tap Log entry above to add your first reading.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">History</h3>
      <ul className="space-y-2">
        {entries.map((e) => {
          const d = new Date(e.entry_date);
          const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
          return (
            <li
              key={e.id}
              className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-white">{label}</span>
                  <SourceBadge source={e.source} manualSourceId={e.manual_source_id} showStars />
                  {e.scan_photo_url && (
                    <Camera className="h-3.5 w-3.5 text-[#2DA5A0]" strokeWidth={1.5} aria-label="Has scan photo" />
                  )}
                </div>
                {e.notes && <p className="text-xs text-white/55 mt-1 truncate">{e.notes}</p>}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(e.id)}
                disabled={busyId === e.id}
                aria-label="Delete entry"
                className="flex items-center justify-center rounded-lg text-white/50 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors min-h-[36px] min-w-[36px] disabled:opacity-50"
              >
                {busyId === e.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                ) : (
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
