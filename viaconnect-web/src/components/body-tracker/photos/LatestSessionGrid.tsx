'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { PoseId } from '@/lib/arnold/types';
import { PHOTO_POSES } from './poseConstants';

interface Props {
  sessionId: string;
}

interface SessionPaths {
  front_full_path: string | null; front_thumb_path: string | null;
  back_full_path: string | null;  back_thumb_path: string | null;
  left_full_path: string | null;  left_thumb_path: string | null;
  right_full_path: string | null; right_thumb_path: string | null;
}

export function LatestSessionGrid({ sessionId }: Props) {
  const [signed, setSigned] = useState<Record<PoseId, string | null> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from('body_photo_sessions')
        .select('front_full_path, front_thumb_path, back_full_path, back_thumb_path, left_full_path, left_thumb_path, right_full_path, right_thumb_path')
        .eq('id', sessionId)
        .maybeSingle();
      if (!mounted || !data) { setLoading(false); return; }
      const paths = data as SessionPaths;
      const result: Record<PoseId, string | null> = { front: null, back: null, left: null, right: null };
      for (const p of ['front','back','left','right'] as const) {
        const path = paths[`${p}_thumb_path`] ?? paths[`${p}_full_path`];
        if (path) {
          const { data: s } = await supabase.storage.from('body-progress-photos').createSignedUrl(path, 3600);
          result[p] = s?.signedUrl ?? null;
        }
      }
      if (mounted) { setSigned(result); setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [sessionId]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {PHOTO_POSES.map((pose) => {
        const url = signed?.[pose.id] ?? null;
        return (
          <div key={pose.id} className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
            <div className="relative aspect-[2/3] bg-[#0B1520]">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-white/40" strokeWidth={1.5} />
                </div>
              ) : url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={pose.label} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[11px] text-white/40 px-2 text-center">
                  Not captured
                </div>
              )}
            </div>
            <p className="px-2 py-1.5 text-[11px] text-white/65 text-center">{pose.label}</p>
          </div>
        );
      })}
    </div>
  );
}
