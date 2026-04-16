'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Video } from 'lucide-react';
import { HannahAvatar } from './HannahAvatar';
import { useFeatureFlag } from '@/lib/config/feature-flags/hooks';

const HANNAH_IMG =
  'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Mobile%20Hero/Hannah%204.png';

export function AvatarLauncher() {
  const [open, setOpen] = useState(false);
  const enabled = useFeatureFlag('hannah_avatar_enabled');

  if (!enabled) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[44px] items-center gap-2 px-3 py-2 text-sm text-white/80 hover:text-white rounded-lg hover:bg-white/5 transition"
        aria-label="Talk to Hannah as avatar"
      >
        <div className="relative h-6 w-6 overflow-hidden rounded-full border border-[#2DA5A0]/40">
          <Image
            src={HANNAH_IMG}
            alt="Hannah"
            fill
            className="object-cover object-top"
            sizes="24px"
          />
        </div>
        <Video strokeWidth={1.5} className="w-4 h-4 text-[#2DA5A0]" />
        <span className="hidden sm:inline">Talk to Hannah</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <HannahAvatar onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
