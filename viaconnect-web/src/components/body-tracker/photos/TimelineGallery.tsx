'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { PoseId } from '@/lib/arnold/types';

interface TimelineGalleryProps {
  pose: PoseId;
  onSelect?: (sessionId: string) => void;
  selectedIds?: string[];
}

interface TimelineItem {
  sessionId: string;
  date: string;
  signedUrl: string | null;
}

export function TimelineGallery({ pose, onSelect, selectedIds = [] }: TimelineGalleryProps) {
  const [items, setItems] = useState<TimelineItem[] | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (mounted) setItems([]); return; }
      const pathCol = `${pose}_thumb_path`;
      const fullCol = `${pose}_full_path`;
      const { data } = await supabase
        .from('body_photo_sessions')
        .select(`id, session_date, ${pathCol}, ${fullCol}`)
        .eq('user_id', user.id)
        .order('session_date', { ascending: true })
        .limit(30);
      if (!mounted || !data) { if (mounted) setItems([]); return; }

      const out: TimelineItem[] = [];
      for (const row of data as unknown as Array<Record<string, unknown>>) {
        const path = (row[pathCol] as string | null) ?? (row[fullCol] as string | null);
        let signedUrl: string | null = null;
        if (path) {
          const { data: s } = await supabase.storage.from('body-progress-photos').createSignedUrl(path, 3600);
          signedUrl = s?.signedUrl ?? null;
        }
        out.push({ sessionId: row.id as string, date: row.session_date as string, signedUrl });
      }
      if (mounted) setItems(out);
    })();
    return () => { mounted = false; };
  }, [pose]);

  if (items === null) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] py-8 flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-white/40" strokeWidth={1.5} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-6 text-center text-xs text-white/50">
        No sessions with this pose captured yet.
      </div>
    );
  }

  return (
    <div className="flex overflow-x-auto scrollbar-hide gap-2 pb-1">
      {items.map((it) => {
        const d = new Date(it.date);
        const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const isSelected = selectedIds.includes(it.sessionId);
        return (
          <button
            key={it.sessionId}
            type="button"
            onClick={() => onSelect?.(it.sessionId)}
            className={`flex-none w-20 rounded-lg border overflow-hidden transition-colors ${
              isSelected
                ? 'border-[#2DA5A0] ring-2 ring-[#2DA5A0]/40'
                : 'border-white/[0.08] hover:border-white/[0.2]'
            }`}
          >
            <div className="relative aspect-[2/3] bg-[#0B1520]">
              {it.signedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.signedUrl} alt={label} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[9px] text-white/40">
                  no photo
                </div>
              )}
            </div>
            <p className="text-[10px] text-white/70 py-1 text-center">{label}</p>
          </button>
        );
      })}
    </div>
  );
}
