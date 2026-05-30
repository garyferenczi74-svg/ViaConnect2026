/**
 * First-time voice editing tutorial per Prompt 170j §11.8.
 *
 * 3-slide carousel. Hannah's UX: privacy framing on slide 3 co-living with
 * the preview-before-apply explanation as two prose paragraphs. The
 * "on your device when possible" qualifier is load-bearing across three
 * appearances (this tutorial, Settings privacy footer, permission-denied
 * hint).
 *
 * Shown once per user via localStorage flag. Triggered from useVoiceSession.
 */

'use client';

import { Mic, X } from 'lucide-react';
import { useState } from 'react';

interface VoiceTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface Slide {
  title: string;
  body: React.ReactNode;
}

const SLIDES: Slide[] = [
  {
    title: 'Voice editing makes meal corrections hands-free',
    body: (
      <>
        <p>
          Just finished cooking? Hands full? Tap the mic button to edit your meal with your voice.
        </p>
      </>
    ),
  },
  {
    title: 'Try saying things like',
    body: (
      <ul className="space-y-2">
        <li className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white/85">
          &ldquo;Add 2 tablespoons olive oil&rdquo;
        </li>
        <li className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white/85">
          &ldquo;Remove the bread&rdquo;
        </li>
        <li className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white/85">
          &ldquo;Change the chicken to grilled&rdquo;
        </li>
        <li className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white/85">
          &ldquo;Make it half a portion&rdquo;
        </li>
      </ul>
    ),
  },
  {
    title: 'A quick word about your voice',
    body: (
      <>
        <p>You will see a preview before any change is applied. You can reject any edit, undo within 10 seconds, or cancel anytime.</p>
        <p className="mt-3 text-white/75">
          Your voice is processed on your device when possible. When we need to send audio to our servers for transcription, it is used only for that and discarded immediately. Audio is never retained.
        </p>
      </>
    ),
  },
];

export function VoiceTutorial({ onComplete, onSkip }: VoiceTutorialProps) {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  const advance = (): void => {
    if (isLast) {
      onComplete();
    } else {
      setIndex(index + 1);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
      className="fixed inset-0 z-50 flex flex-col bg-[#1A2744]/95 backdrop-blur-md"
    >
      <div className="flex items-center justify-between px-4 pt-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/55">
          <span aria-label={`Slide ${index + 1} of ${SLIDES.length}`}>
            {index + 1} / {SLIDES.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onSkip}
          aria-label="Skip voice editing tutorial"
          className="flex min-h-[44px] items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          Skip
          <X size={14} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-6">
        <div className="mx-auto w-full max-w-md">
          <h2 id="tutorial-title" className="text-2xl font-semibold text-white">
            {slide.title}
          </h2>
          <div className="mt-4 text-base leading-relaxed text-white/80">{slide.body}</div>
        </div>
      </div>

      <div
        className="flex flex-col gap-3 px-6 pb-6"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
      >
        <div className="mx-auto flex w-full max-w-md flex-col gap-3">
          <div className="flex justify-center gap-2" aria-hidden="true">
            {SLIDES.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-8 bg-[#2DA5A0]' : 'w-1.5 bg-white/20'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={advance}
            className="flex h-14 items-center justify-center gap-2 rounded-full bg-[#2DA5A0] text-base font-semibold text-[#1E3054] shadow-lg shadow-black/30 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2DA5A0]/40"
          >
            {isLast && <Mic size={18} strokeWidth={1.5} aria-hidden="true" />}
            {isLast ? 'Got it, start listening' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

const TUTORIAL_SEEN_KEY = 'viaconnect_voice_tutorial_seen';

export function hasSeenTutorial(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(TUTORIAL_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markTutorialSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
  } catch {
    // ignore quota errors
  }
}
