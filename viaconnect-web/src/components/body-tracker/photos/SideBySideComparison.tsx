'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { PoseId } from '@/lib/arnold/types';

interface SideBySideComparisonProps {
  beforeSessionId: string;
  afterSessionId: string;
  pose: PoseId;
}

interface SessionData {
  id: string;
  session_date: string;
  full_path: string | null;
  signedUrl: string | null;
}

export function SideBySideComparison({ beforeSessionId, afterSessionId, pose }: SideBySideComparisonProps) {
  const [before, setBefore] = useState<SessionData | null>(null);
  const [after, setAfter] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const pathCol = `${pose}_full_path`;

      async function load(id: string): Promise<SessionData | null> {
        const { data } = await supabase
          .from('body_photo_sessions')
          .select(`id, session_date, ${pathCol}`)
          .eq('id', id)
          .maybeSingle();
        if (!data) return null;
        const row = data as unknown as Record<string, unknown>;
        const path = (row[pathCol] as string | null) ?? null;
        let signedUrl: string | null = null;
        if (path) {
          const { data: s } = await supabase.storage.from('body-progress-photos').createSignedUrl(path, 3600);
          signedUrl = s?.signedUrl ?? null;
        }
        return {
          id: row.id as string,
          session_date: row.session_date as string,
          full_path: path,
          signedUrl,
        };
      }

      const [b, a] = await Promise.all([load(beforeSessionId), load(afterSessionId)]);
      if (mounted) { setBefore(b); setAfter(a); setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [beforeSessionId, afterSessionId, pose]);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] py-8 flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-white/40" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <ComparisonSide data={before} label="Before" />
      <ComparisonSide data={after}  label="After" />
    </div>
  );
}

function ComparisonSide({ data, label }: { data: SessionData | null; label: string }) {
  const d = data?.session_date ? new Date(data.session_date) : null;
  const dateLabel = d ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
      <div className="px-3 py-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">{label}</span>
        <span className="text-[11px] text-white/70">{dateLabel}</span>
      </div>
      <div className="relative aspect-[2/3] bg-[#0B1520]">
        {data?.signedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.signedUrl} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-white/40 px-2 text-center">
            No photo for this pose
          </div>
        )}
      </div>
    </div>
  );
}
