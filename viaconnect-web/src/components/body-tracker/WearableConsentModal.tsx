'use client';

/**
 * Prompt 212: explicit consent before WHOOP authorize or HealthKit read.
 * Plain language, no diagnostic claims. Kelsey-reviewed structure.
 */

import { ShieldCheck, X } from 'lucide-react';

interface WearableConsentModalProps {
  provider: 'whoop' | 'oura' | 'health';
  open: boolean;
  onAccept: () => void;
  onClose: () => void;
}

export function WearableConsentModal({
  provider,
  open,
  onAccept,
  onClose,
}: WearableConsentModalProps) {
  if (!open) return null;

  const title =
    provider === 'whoop'
      ? 'Connect WHOOP'
      : provider === 'oura'
        ? 'Connect Oura'
        : 'Connect phone health data';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wearable-consent-title"
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1E3054] p-6 text-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#2DA5A0]" strokeWidth={1.5} />
            <h2 id="wearable-consent-title" className="text-lg font-semibold">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-white/60" strokeWidth={1.5} />
          </button>
        </div>

        <div className="space-y-3 text-sm text-white/75 leading-relaxed">
          <p>
            ViaCura will collect recovery, sleep, heart-rate variability, activity, and
            related biometric readings from this source when available.
          </p>
          <p>
            These readings power your <strong className="text-white">Bio Optimization Score</strong>{' '}
            and personalization of your wellness experience. They are not used to diagnose,
            treat, or prescribe anything.
          </p>
          <p>
            Data is retained while your account is active and while the connection remains
            enabled. You can disconnect anytime. When you disconnect you can choose to keep
            historical rows or permanently delete wearable data for that source.
          </p>
          <p className="text-xs text-white/50">
            Health data is never used for advertising and is not sold to third parties.
          </p>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded-xl border border-white/15 text-white/80 text-sm font-medium hover:bg-white/5"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 min-h-[44px] rounded-xl bg-[#2DA5A0] text-[#0B1520] text-sm font-semibold hover:bg-[#2DA5A0]/90"
          >
            I agree and continue
          </button>
        </div>
      </div>
    </div>
  );
}
