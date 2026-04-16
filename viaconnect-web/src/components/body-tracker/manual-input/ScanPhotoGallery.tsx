'use client';

import { useEffect, useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface PhotoRow {
  path: string;
  signedUrl: string;
  entryDate: string;
}

interface ScanPhotoGalleryProps {
  category: 'composition' | 'muscle' | 'metabolic' | 'weight' | 'all';
}

const CATEGORY_TO_DETAIL: Record<Exclude<ScanPhotoGalleryProps['category'], 'all'>, string> = {
  composition: 'body_tracker_segmental_fat',
  muscle:      'body_tracker_segmental_muscle',
  metabolic:   'body_tracker_metabolic',
  weight:      'body_tracker_weight',
};

export function ScanPhotoGallery({ category }: ScanPhotoGalleryProps) {
  const [photos, setPhotos] = useState<PhotoRow[] | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setPhotos(null);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (mounted) setPhotos([]); return; }

      let entryIds: string[] | null = null;
      if (category !== 'all') {
        const detailTable = CATEGORY_TO_DETAIL[category];
        const { data: rows } = await (supabase as any)
          .from(detailTable)
          .select('entry_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        entryIds = Array.from(new Set<string>((rows ?? []).map((r: { entry_id: string }) => r.entry_id)));
        if (entryIds && entryIds.length === 0) { if (mounted) setPhotos([]); return; }
      }

      const query = (supabase as any)
        .from('body_tracker_entries')
        .select('id, entry_date, scan_photo_url')
        .eq('user_id', user.id)
        .not('scan_photo_url', 'is', null)
        .order('entry_date', { ascending: false });
      if (entryIds) query.in('id', entryIds);

      const { data: entries } = await query;
      const list = (entries ?? []) as Array<{ id: string; entry_date: string; scan_photo_url: string }>;
      if (list.length === 0) { if (mounted) setPhotos([]); return; }

      const signed: PhotoRow[] = [];
      for (const row of list) {
        const { data } = await supabase.storage
          .from('body-tracker-scans')
          .createSignedUrl(row.scan_photo_url, 60 * 60);
        if (data?.signedUrl) {
          signed.push({ path: row.scan_photo_url, signedUrl: data.signedUrl, entryDate: row.entry_date });
        }
      }
      if (mounted) setPhotos(signed);
    })();
    return () => { mounted = false; };
  }, [category]);

  if (photos === null) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-8 flex items-center justify-center text-white/40">
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
      </div>
    );
  }
  if (photos.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center">
        <Camera className="h-5 w-5 mx-auto mb-2 text-white/30" strokeWidth={1.5} />
        <p className="text-xs text-white/50">No scan photos yet. Attach one when logging an entry.</p>
      </div>
    );
  }

  const isPdf = (p: string) => p.toLowerCase().endsWith('.pdf');

  return (
    <>
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">Scan gallery</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {photos.map((p) => {
            const d = new Date(p.entryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            return (
              <button
                key={p.path}
                type="button"
                onClick={() => !isPdf(p.path) && setLightbox(p.signedUrl)}
                className="relative aspect-square overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02] hover:border-white/[0.2] transition-colors"
              >
                {isPdf(p.path) ? (
                  <a href={p.signedUrl} target="_blank" rel="noopener noreferrer" className="w-full h-full flex items-center justify-center text-xs text-white/60">
                    PDF
                  </a>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.signedUrl} alt={`Scan from ${d}`} className="w-full h-full object-cover" />
                )}
                <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1 text-[10px] text-white">
                  {d}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Close"
            className="absolute top-4 right-4 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 min-h-[44px] min-w-[44px]"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Scan" className="max-h-[90vh] max-w-[92vw] rounded-lg" />
        </div>
      )}
    </>
  );
}
