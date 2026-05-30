/**
 * Clarification card per Prompt 170j §11.5.
 *
 * Hannah's push-back: visually distinguished from error card via Teal
 * "Quick question" header + chip-based answer UI. Round 2 escalates to
 * "One more thing" (gentler). Round 3 falls through to error state at
 * the orchestrator layer.
 */

'use client';

import { Mic } from 'lucide-react';
import type { NLUParseResult } from '../types';

interface ClarificationCardProps {
  result: NLUParseResult;
  roundNumber: 1 | 2;
  onAnswer: (selectedTarget: string) => void;
  onRetryVoice: () => void;
  onCancel: () => void;
}

export function ClarificationCard({
  result,
  roundNumber,
  onAnswer,
  onRetryVoice,
  onCancel,
}: ClarificationCardProps) {
  const header = roundNumber === 1 ? 'Quick question' : 'One more thing';
  const question = result.clarification_question ?? 'Which one did you mean?';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clarification-header"
      className="fixed inset-0 z-50 flex flex-col bg-[#1A2744]/85 backdrop-blur-md"
    >
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-[#1E3054]/80 backdrop-blur-md p-6 shadow-xl shadow-black/40">
          <p
            id="clarification-header"
            className="text-[11px] uppercase tracking-wider text-[#2DA5A0] font-semibold"
          >
            {header}
          </p>
          <p className="mt-2 text-lg font-medium text-white">{question}</p>

          {result.ambiguous_targets.length > 0 && (
            <div
              className="mt-4 flex flex-wrap gap-2"
              role="list"
              aria-label="Answer choices"
            >
              {result.ambiguous_targets.map((target) => (
                <button
                  key={target}
                  type="button"
                  onClick={() => onAnswer(target)}
                  className="min-h-[44px] rounded-full border border-[#2DA5A0]/40 bg-[#2DA5A0]/15 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#2DA5A0]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/60"
                >
                  {target}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onRetryVoice}
            className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <Mic size={16} strokeWidth={1.5} aria-hidden="true" />
            Or say what you mean
          </button>
        </div>
      </div>

      <div
        className="p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
      >
        <button
          type="button"
          onClick={onCancel}
          className="mx-auto block rounded px-2 py-1 text-sm text-white/70 underline transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
