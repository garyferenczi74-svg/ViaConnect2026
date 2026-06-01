// Prompt 170n Phase C: voice-native capture overlay per Hannah §9.2 wireframes.
//
// Different from 170j voice-edit overlay positioning (which sits over result
// review with meal_draft context visible). Voice-native launches from idle
// state with NO meal context. Mobile full-viewport; desktop 480x560 centered
// modal per Hannah Push-back #2.
//
// Internal states: capturing -> processing-stt -> parsing -> clarifying -> done
// On done, fires onParseComplete with the VoiceNativeParseResult + STT context
// so the parent can transition to result review (phase=reviewing).

'use client';

import { useCallback, useEffect, useState } from 'react';
import { HelpCircle, Loader2, Mic, X } from 'lucide-react';
import { useVoiceCapture } from '@/lib/nutrition/voice/hooks/useVoiceCapture';
import { useVoiceNativeParser } from './useVoiceNativeParser';
import type { VoiceNativeParseResult, SttProvider } from '@/lib/nutrition/voice-native/types';

const HINTS = [
  'Try saying: a Chipotle bowl with chicken and brown rice',
  'Try saying: two scrambled eggs and toast',
  'Try saying: a Chobani vanilla yogurt and an apple',
  'Try saying: a coffee and a banana',
  'Try saying: a turkey sandwich with chips and a Coke',
];

const HINT_CYCLE_MS = 4000;

function mapDeviceProviderToServerEnum(
  provider: string | null,
): SttProvider {
  if (provider === 'capacitor_native') return 'capacitor_native';
  if (provider === 'gemini_audio') return 'gemini_audio';
  if (provider === 'claude_audio') return 'claude_audio';
  return 'web_speech_api';
}

export interface VoiceNativeCaptureOverlayProps {
  open: boolean;
  locale?: string;
  safetyMode?: boolean;
  onClose: () => void;
  onParseComplete: (
    result: VoiceNativeParseResult,
    sttProvider: SttProvider,
    sttConfidenceAvg: number,
    transcript: string,
    audioDurationMs: number,
  ) => void;
}

export function VoiceNativeCaptureOverlay({
  open,
  locale,
  safetyMode,
  onClose,
  onParseComplete,
}: VoiceNativeCaptureOverlayProps): JSX.Element | null {
  const [hintIndex, setHintIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const capture = useVoiceCapture();
  const parser = useVoiceNativeParser();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent): void => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!open || capture.state.status === 'capturing') return;
    const t = window.setInterval(() => {
      setHintIndex((i) => (i + 1) % HINTS.length);
    }, HINT_CYCLE_MS);
    return () => window.clearInterval(t);
  }, [open, capture.state.status]);

  useEffect(() => {
    if (open && capture.state.status === 'idle') {
      void capture.startCapture();
    }
  }, [open, capture]);

  useEffect(() => {
    if (capture.state.status === 'completed' && capture.state.transcript.length > 0 && parser.state.stage === 'idle') {
      const providerEnum = mapDeviceProviderToServerEnum(capture.state.stt_provider);
      const sttConfAvg = capture.state.stt_confidence ?? 0.85;
      void parser.parse(capture.state.transcript, providerEnum, sttConfAvg, { locale, safetyMode });
    }
  }, [capture.state, parser, locale, safetyMode]);

  useEffect(() => {
    if (parser.state.stage === 'done' && parser.state.result) {
      const providerEnum = mapDeviceProviderToServerEnum(capture.state.stt_provider);
      const sttConfAvg = capture.state.stt_confidence ?? 0.85;
      const durationMs = capture.state.capture_started_at
        ? Date.now() - capture.state.capture_started_at
        : 0;
      onParseComplete(
        parser.state.result,
        providerEnum,
        sttConfAvg,
        capture.state.transcript,
        durationMs,
      );
      parser.reset();
      capture.reset();
    }
  }, [parser, capture, onParseComplete]);

  const handleStop = useCallback(() => {
    capture.stopCapture();
  }, [capture]);

  const handleCancel = useCallback(() => {
    capture.cancelCapture();
    parser.reset();
    onClose();
  }, [capture, parser, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, handleCancel]);

  if (!open) return null;

  const isCapturing = capture.state.status === 'capturing';
  const isProcessingStt = capture.state.status === 'processing';
  const isParsing = parser.state.stage === 'loading';
  const hasTranscript = capture.state.transcript.length > 0;
  const hasError = capture.state.status === 'error' || parser.state.stage === 'error';
  const errorMessage = capture.state.error?.message
    ?? parser.state.error?.message
    ?? 'Something went wrong. Try again.';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-native-title"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1A2744]/92 px-6 backdrop-blur-md md:items-center md:justify-center"
    >
      <div className="relative flex w-full max-w-lg flex-col items-center gap-6 rounded-2xl bg-[#1E3054]/40 p-6 text-white shadow-2xl md:max-h-[90vh] md:w-[480px] md:p-8">
        <button
          type="button"
          onClick={handleCancel}
          aria-label="Cancel voice capture"
          className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full text-white/85 hover:bg-white/5"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
        >
          <X className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          aria-label="Voice entry help"
          className="absolute left-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full text-white/70 hover:bg-white/5"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
        >
          <HelpCircle className="h-5 w-5" strokeWidth={1.5} />
        </button>

        <h2 id="voice-native-title" className="sr-only">Voice meal log</h2>

        <MicRing pulsing={isCapturing && !reducedMotion} />

        <div className="min-h-[4rem] w-full text-center">
          {isCapturing && !hasTranscript && (
            <p className="text-lg font-medium text-white/85" aria-live="polite">
              Listening, take your time
            </p>
          )}
          {hasTranscript && (isCapturing || isProcessingStt) && (
            <p className="text-lg font-medium text-white" aria-live="polite" aria-atomic="false">
              {capture.state.transcript}
            </p>
          )}
          {isProcessingStt && !hasTranscript && (
            <p className="text-lg font-medium text-white/80" aria-live="polite">
              Got it...
            </p>
          )}
          {isParsing && (
            <div className="inline-flex items-center gap-2 text-base text-white/85" aria-live="polite">
              <Loader2 className="h-5 w-5 animate-spin text-[#2DA5A0]" strokeWidth={1.5} aria-hidden="true" />
              Understanding your meal...
            </div>
          )}
          {parser.state.stage === 'clarifying' && parser.state.result && parser.state.result.clarification_questions.length > 0 && (
            <VoiceClarificationCard
              question={parser.state.result.clarification_questions[0]}
              onResolve={(answer) => {
                if (parser.state.result) {
                  void parser.resolveClarification(parser.state.result.clarification_questions[0], answer, { locale, safetyMode });
                }
              }}
            />
          )}
          {hasError && (
            <div role="alert" className="rounded-xl border border-[#FCA5A5]/40 bg-[#FCA5A5]/[0.06] px-4 py-3 text-sm text-[#FCA5A5]">
              {errorMessage}
            </div>
          )}
        </div>

        {isCapturing && (
          <button
            type="button"
            onClick={handleStop}
            disabled={!isCapturing}
            aria-label="Stop voice capture"
            className="flex h-14 min-w-[10rem] items-center justify-center rounded-full bg-[#2DA5A0] px-8 text-base font-semibold text-white shadow-lg transition-transform hover:bg-[#2DA5A0]/90 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
          >
            Stop
          </button>
        )}

        {hasError && (
          <div className="flex flex-col gap-2 w-full">
            <button
              type="button"
              onClick={() => {
                parser.reset();
                capture.reset();
                void capture.startCapture();
              }}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#2DA5A0] px-6 text-sm font-semibold text-white hover:bg-[#2DA5A0]/90"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="text-center text-sm text-white/70 underline hover:text-white"
            >
              Cancel
            </button>
          </div>
        )}

        {(isCapturing || isProcessingStt) && (
          <p
            className="text-sm text-white/55 text-center transition-opacity"
            aria-hidden="true"
          >
            {HINTS[hintIndex]}
          </p>
        )}
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
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[#2DA5A0] text-white">
        <Mic size={32} strokeWidth={1.5} />
      </div>
    </div>
  );
}

function VoiceClarificationCard({
  question,
  onResolve,
}: {
  question: import('@/lib/nutrition/voice-native/types').VoiceNativeClarificationQuestion;
  onResolve: (answer: string) => void;
}): JSX.Element {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <section
      role="group"
      aria-labelledby="vn-clarification-q"
      className="rounded-xl border border-white/[0.06] bg-[#1A2744]/40 p-4 text-left"
    >
      <p id="vn-clarification-q" className="text-sm font-medium text-white">
        {question.question_text}
      </p>
      <div role="radiogroup" aria-labelledby="vn-clarification-q" className="mt-4 flex flex-wrap gap-2">
        {question.option_chips.map((chip) => {
          const isSelected = selected === chip;
          return (
            <button
              key={chip}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelected(chip)}
              className={`inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm transition-colors ${
                isSelected
                  ? 'border-2 border-[#2DA5A0] bg-[#2DA5A0]/15 text-[#2DA5A0]'
                  : 'border border-white/[0.06] bg-[#1E3054]/55 text-white/90 hover:bg-[#1E3054]/80'
              }`}
            >
              {chip}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => { if (selected) onResolve(selected); }}
        disabled={!selected}
        className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#2DA5A0] text-sm font-semibold text-white transition-colors hover:bg-[#2DA5A0]/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Continue
      </button>
    </section>
  );
}
