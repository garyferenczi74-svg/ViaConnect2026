/**
 * Voice capture overlay per Prompt 170j §11.2 and §11.3.
 *
 * Full-screen Navy backdrop with the pulsing Teal mic ring + live
 * transcription + Stop button + rotating hint examples. Reduced-motion
 * variant collapses ring animation and surfaces the "Listening, take your
 * time" label per Hannah's §11.2 push-back. Live region announcements
 * cover the transcript progression for screen reader users.
 */

'use client';

import { HelpCircle, Mic, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { VoiceCaptureState } from '../hooks/useVoiceCapture';

interface VoiceCaptureOverlayProps {
  state: VoiceCaptureState;
  onStop: () => void;
  onCancel: () => void;
  onShowHelp?: () => void;
}

const HINTS = [
  'Add 2 tablespoons olive oil',
  'Remove the bread',
  'Change the chicken to grilled',
  'Make it half a portion',
  'I also had an apple',
];

export function VoiceCaptureOverlay({
  state,
  onStop,
  onCancel,
  onShowHelp,
}: VoiceCaptureOverlayProps) {
  const [hintIndex, setHintIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent): void => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setHintIndex((i) => (i + 1) % HINTS.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const isCapturing = state.status === 'capturing';
  const isProcessing = state.status === 'processing';
  const hasTranscript = Boolean(state.transcript);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Voice capture"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1A2744]/80 backdrop-blur-md px-8"
    >
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel voice capture"
        className="absolute right-4 top-6 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
      >
        <X size={20} strokeWidth={1.5} aria-hidden="true" />
      </button>

      {onShowHelp && (
        <button
          type="button"
          onClick={onShowHelp}
          aria-label="Voice editing help"
          className="absolute left-4 top-6 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
        >
          <HelpCircle size={20} strokeWidth={1.5} aria-hidden="true" />
        </button>
      )}

      <div className="flex w-full max-w-md flex-col items-center gap-6 text-white">
        <MicRing pulsing={isCapturing && !reducedMotion} />

        <div className="min-h-[3rem] w-full text-center">
          {isCapturing && !hasTranscript && (
            <p className="text-lg font-medium text-white/85" aria-live="polite">
              Listening, take your time
            </p>
          )}
          {hasTranscript && (
            <p
              className="text-lg font-medium text-white"
              aria-live="polite"
              aria-atomic="false"
            >
              {state.transcript}
            </p>
          )}
          {isProcessing && (
            <p className="text-lg font-medium text-white/80" aria-live="polite">
              Got it, processing...
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onStop}
          disabled={!isCapturing}
          aria-label="Stop voice capture"
          className="flex h-16 min-w-[12rem] items-center justify-center rounded-full bg-[#2DA5A0] px-8 text-base font-semibold text-[#1E3054] shadow-lg shadow-black/30 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40 disabled:opacity-50"
        >
          Stop
        </button>

        <p
          className="text-sm text-white/55 text-center transition-opacity duration-500"
          aria-hidden="true"
        >
          Try saying: {HINTS[hintIndex]}
        </p>
      </div>
    </div>
  );
}

function MicRing({ pulsing }: { pulsing: boolean }) {
  return (
    <div className="relative flex h-28 w-28 items-center justify-center" aria-hidden="true">
      {pulsing && (
        <>
          <span className="absolute inset-0 animate-ping rounded-full bg-[#2DA5A0]/30" />
          <span className="absolute inset-2 animate-pulse rounded-full bg-[#2DA5A0]/20" />
        </>
      )}
      <span className="absolute inset-0 rounded-full bg-[#2DA5A0]/15" />
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[#2DA5A0] text-[#1E3054]">
        <Mic size={32} strokeWidth={1.5} />
      </div>
    </div>
  );
}
