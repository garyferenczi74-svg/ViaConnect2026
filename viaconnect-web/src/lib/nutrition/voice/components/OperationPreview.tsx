/**
 * Operation preview screen per Prompt 170j §11.4.
 *
 * Static cumulative impact chip at top (Hannah push-back: not sticky, not
 * in CTA bar), operation card stack, sticky bottom Apply All / Try Again /
 * Cancel. Tab order intentionally ends at Apply All so keyboard and switch
 * control users iterate every Reject X before they can fire.
 */

'use client';

import { useMemo, useState } from 'react';
import {
  computeCumulativeImpact,
  formatImpactPreview,
  isImplausibleImpact,
} from '../apply/macro-impact';
import type { NLUParseResult, VoiceOperation } from '../types';
import { OperationCard } from './OperationCard';

interface OperationPreviewProps {
  result: NLUParseResult;
  transcript: string;
  onApplyAll: (operations: VoiceOperation[]) => void;
  onTryAgain: () => void;
  onCancel: () => void;
}

export function OperationPreview({
  result,
  transcript,
  onApplyAll,
  onTryAgain,
  onCancel,
}: OperationPreviewProps) {
  const [rejected, setRejected] = useState<Set<number>>(new Set());

  const selectedOperations = useMemo(
    () => result.operations.filter((_, i) => !rejected.has(i)),
    [result.operations, rejected]
  );

  const cumulativeImpact = useMemo(
    () => computeCumulativeImpact(selectedOperations),
    [selectedOperations]
  );
  const impactText = useMemo(() => formatImpactPreview(cumulativeImpact), [cumulativeImpact]);
  const implausible = isImplausibleImpact(cumulativeImpact);

  const toggleReject = (index: number): void => {
    setRejected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const applyLabel =
    selectedOperations.length === result.operations.length
      ? `Apply all`
      : `Apply ${selectedOperations.length} of ${result.operations.length}`;

  return (
    <div
      role="region"
      aria-label="Voice operation preview"
      className="fixed inset-0 z-50 flex flex-col bg-[#1A2744]/85 backdrop-blur-md"
    >
      <div className="flex-1 overflow-y-auto px-4 pt-16 pb-40">
        <div className="mx-auto flex max-w-md flex-col gap-3">
          {transcript && (
            <div className="rounded-full border border-white/10 bg-[#1E3054]/50 px-4 py-2 text-center text-xs text-white/65">
              You said: <span className="text-white/90">{transcript}</span>
            </div>
          )}

          <div
            className={`rounded-2xl border ${
              implausible ? 'border-[#B75E18]/50' : 'border-white/10'
            } bg-[#1E3054]/60 backdrop-blur-md p-4 text-center`}
            aria-live="polite"
          >
            <p className="text-[11px] uppercase tracking-wider text-white/55">Total impact</p>
            <p className="mt-1 text-lg font-semibold text-white">{impactText}</p>
            {implausible && (
              <p className="mt-2 text-xs text-[#B75E18]">Please confirm this is correct</p>
            )}
          </div>

          <ul className="flex flex-col gap-2" aria-label="Operations to apply">
            {result.operations.map((op, i) => (
              <li key={i}>
                <OperationCard
                  op={op}
                  rejected={rejected.has(i)}
                  onToggleReject={() => toggleReject(i)}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-[#1A2744]/95 backdrop-blur-md p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
      >
        <div className="mx-auto flex max-w-md flex-col gap-3">
          <div className="flex items-center justify-between gap-2 text-sm">
            <button
              type="button"
              onClick={onTryAgain}
              className="rounded px-2 py-1 text-white/70 underline transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded px-2 py-1 text-white/70 underline transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              Cancel
            </button>
          </div>
          <button
            type="button"
            onClick={() => onApplyAll(selectedOperations)}
            disabled={selectedOperations.length === 0}
            className="h-14 rounded-full bg-[#2DA5A0] text-base font-semibold text-[#1E3054] shadow-lg shadow-black/30 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2DA5A0]/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {applyLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
