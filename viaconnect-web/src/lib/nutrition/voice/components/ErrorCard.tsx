/**
 * Voice error card per Prompt 170j §11.6.
 *
 * Hannah's push-back: 5 error variants share ONE visual chassis but carry
 * distinctly humble first-person copy ("I didn't catch that") so they
 * never read as accusation. role="alert" + aria-live="assertive" ensures
 * screen reader users hear the error immediately.
 */

'use client';

import { Mic } from 'lucide-react';
import type { VoiceErrorClass } from '../types';

interface ErrorCardProps {
  kind: VoiceErrorClass;
  message?: string | null;
  onTryAgain?: () => void;
  onCancel: () => void;
}

interface ErrorCopy {
  title: string;
  body: string;
  ctaTryAgain: boolean;
}

const COPY: Record<VoiceErrorClass, ErrorCopy> = {
  no_speech_detected: {
    title: "I didn't hear anything",
    body: 'Try again, a little closer to the mic if you can.',
    ctaTryAgain: true,
  },
  stt_confidence_too_low: {
    title: "I didn't catch that",
    body: 'Try again, maybe a bit clearer.',
    ctaTryAgain: true,
  },
  no_operations_matched: {
    title: "I didn't catch a specific edit",
    body: 'Try saying things like "Add 2 tablespoons olive oil" or "Remove the bread".',
    ctaTryAgain: true,
  },
  nlu_service_unavailable: {
    title: 'Voice editing is unavailable right now',
    body: 'Tap to edit instead, or try voice again in a minute.',
    ctaTryAgain: false,
  },
  microphone_permission_denied: {
    title: 'Microphone access is needed for voice editing',
    body: 'Open Settings to enable the microphone.',
    ctaTryAgain: false,
  },
  network_error: {
    title: 'Voice editing needs internet right now',
    body: 'Check your connection and try again.',
    ctaTryAgain: true,
  },
};

export function ErrorCard({ kind, message, onTryAgain, onCancel }: ErrorCardProps) {
  const copy = COPY[kind] ?? COPY.nlu_service_unavailable;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-0 z-50 flex flex-col bg-[#1A2744]/85 backdrop-blur-md"
    >
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-[#1E3054]/80 backdrop-blur-md p-6 shadow-xl shadow-black/40">
          <p className="text-lg font-semibold text-white">{copy.title}</p>
          <p className="mt-2 text-sm text-white/75">{copy.body}</p>
          {message && (
            <p className="mt-3 text-xs text-white/40">{message}</p>
          )}

          <div className="mt-6 flex flex-col gap-2">
            {copy.ctaTryAgain && onTryAgain && (
              <button
                type="button"
                onClick={onTryAgain}
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#2DA5A0] text-base font-semibold text-[#1E3054] transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2DA5A0]/40"
              >
                <Mic size={18} strokeWidth={1.5} aria-hidden="true" />
                Try again
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="h-12 rounded-full bg-white/10 text-base font-medium text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              {copy.ctaTryAgain ? 'Cancel' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
