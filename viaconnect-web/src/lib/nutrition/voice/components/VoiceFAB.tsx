/**
 * Voice edit floating action button per Prompt 170j §11.1.
 *
 * 56px Teal circle, bottom-right of the result review screen above the
 * existing Save bar. Hidden when voice is unavailable (no STT provider,
 * permission denied, kill switch off).
 */

'use client';

import { Mic } from 'lucide-react';

interface VoiceFABProps {
  available: boolean;
  busy?: boolean;
  onClick: () => void;
}

export function VoiceFAB({ available, busy, onClick }: VoiceFABProps) {
  if (!available) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label="Voice edit. Double tap to start."
      className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#2DA5A0] text-[#1E3054] shadow-lg shadow-black/30 transition-transform active:scale-95 hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2DA5A0]/40 disabled:opacity-60"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)',
      }}
    >
      <Mic size={24} strokeWidth={1.5} aria-hidden="true" />
    </button>
  );
}
