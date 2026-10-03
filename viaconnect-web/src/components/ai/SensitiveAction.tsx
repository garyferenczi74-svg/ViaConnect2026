'use client';

import { useState } from 'react';
import { AiDataSharingConsent } from './AiDataSharingConsent';
import { useAiSharingStatus } from './useAiSharingStatus';
import type { DisclosureKind } from '@/lib/ai/data-sharing/consent';

/**
 * When the store gate is off, runs the action immediately.
 * When it is on, shows the AI agree screen if needed, then the
 * permission disclosure, and only then runs the action.
 */
export function useSensitiveAction() {
  const status = useAiSharingStatus();
  const [pending, setPending] = useState<{ kind: DisclosureKind; run: () => void } | null>(null);
  const [step, setStep] = useState<'consent' | 'disclosure'>('disclosure');

  function guard(kind: DisclosureKind, run: () => void) {
    if (!status.gateEnabled) {
      run();
      return;
    }
    setPending({ kind, run });
    setStep(status.consented ? 'disclosure' : 'consent');
  }

  function close() {
    setPending(null);
  }

  const panel = pending ? (
    <div className="mt-3 rounded-2xl border border-white/10 bg-[#1A2744] p-4">
      {step === 'consent' ? (
        <AiDataSharingConsent
          status={status}
          onAgreed={() => setStep('disclosure')}
          onDeclined={close}
        />
      ) : (
        <div>
          <p className="text-sm text-white/85 leading-relaxed">{status.disclosures[pending.kind]}</p>
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => {
                const run = pending.run;
                setPending(null);
                run();
              }}
              className="min-h-[44px] w-full sm:w-auto rounded-xl bg-[#2DA5A0] px-4 text-sm font-semibold text-[#0B1520]"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={close}
              className="min-h-[44px] w-full sm:w-auto rounded-xl border border-white/20 px-4 text-sm text-white/80"
            >
              Not now
            </button>
          </div>
        </div>
      )}
    </div>
  ) : null;

  return { guard, panel, status };
}
