'use client';

/**
 * Prompt 212: guided 3-step Hume Band setup via Apple Health / Health Connect.
 */

import { useState } from 'react';
import { Check, ChevronRight, Smartphone } from 'lucide-react';
import {
  getHealthPlatform,
  isHealthConnectEnabled,
  requestHealthPermissions,
  syncHealthSamples,
} from '@/lib/wearables/health-client';

interface HumeSetupFlowProps {
  onComplete: () => void;
  onClose: () => void;
}

export function HumeSetupFlow({ onComplete, onClose }: HumeSetupFlowProps) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const platform = getHealthPlatform();

  const storeName =
    platform === 'android' ? 'Health Connect' : 'Apple Health';

  async function grantPermissions() {
    setBusy(true);
    setMessage(null);
    const res = await requestHealthPermissions();
    setBusy(false);
    if (!res.ok) {
      if (res.reason === 'open_in_app') {
        setMessage('Open the ViaCura mobile app to grant health permissions.');
      } else if (res.reason === 'health_connect_not_enabled') {
        setMessage('Health Connect support is not enabled in this build yet. iOS is fully supported.');
      } else {
        setMessage('Permissions were not granted. You can try again from Settings.');
      }
      return;
    }
    setStep(3);
  }

  async function firstSync() {
    setBusy(true);
    setMessage(null);
    const res = await syncHealthSamples();
    setBusy(false);
    if (!res.ok) {
      setMessage(
        res.reason === 'open_in_app'
          ? 'Open the ViaCura mobile app to complete the first sync.'
          : 'Sync could not finish yet. Permissions look fine; data may still be awaiting from Hume.',
      );
      // Still mark flow complete so UI can show awaiting-data state.
      onComplete();
      return;
    }
    if ((res.sampleCount ?? 0) === 0) {
      setMessage(
        'Permissions granted. No Hume or phone health samples yet. Keep Hume sync enabled and check back after your next reading.',
      );
    }
    onComplete();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#1E3054] p-6 text-white">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="w-5 h-5 text-[#2DA5A0]" strokeWidth={1.5} />
          <h2 className="text-lg font-semibold">Connect Hume Band</h2>
        </div>

        <ol className="space-y-3 mb-6">
          {[1, 2, 3].map((n) => (
            <li
              key={n}
              className={`flex gap-3 rounded-xl border p-3 ${
                step === n ? 'border-[#2DA5A0]/50 bg-[#2DA5A0]/10' : 'border-white/10 bg-black/20'
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  step > n ? 'bg-[#2DA5A0] text-[#0B1520]' : 'bg-white/10 text-white/70'
                }`}
              >
                {step > n ? <Check className="w-4 h-4" strokeWidth={1.5} /> : n}
              </span>
              <div className="text-sm text-white/80">
                {n === 1 && (
                  <>
                    <p className="font-medium text-white">Enable Hume to {storeName}</p>
                    <p className="mt-1 text-white/60">
                      In the Hume app open Me, then Connected Apps, and turn on sync to {storeName}.
                    </p>
                  </>
                )}
                {n === 2 && (
                  <>
                    <p className="font-medium text-white">Grant ViaCura read access</p>
                    <p className="mt-1 text-white/60">
                      Allow heart rate, HRV, sleep, steps, and body composition reads.
                    </p>
                  </>
                )}
                {n === 3 && (
                  <>
                    <p className="font-medium text-white">First sync</p>
                    <p className="mt-1 text-white/60">
                      We pull new samples since your last sync. Missing metrics stay UNKNOWN until
                      data arrives. We never invent zeros.
                    </p>
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>

        {message && (
          <p className="mb-4 text-sm text-[#E8A87C]" role="status">
            {message}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded-xl border border-white/15 text-sm text-white/80"
          >
            Close
          </button>
          {step === 1 && (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 min-h-[44px] rounded-xl bg-[#2DA5A0] text-[#0B1520] text-sm font-semibold inline-flex items-center justify-center gap-1"
            >
              I enabled Hume sync
              <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void grantPermissions()}
              className="flex-1 min-h-[44px] rounded-xl bg-[#2DA5A0] text-[#0B1520] text-sm font-semibold disabled:opacity-50"
            >
              {busy ? 'Requesting…' : 'Grant permissions'}
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void firstSync()}
              className="flex-1 min-h-[44px] rounded-xl bg-[#2DA5A0] text-[#0B1520] text-sm font-semibold disabled:opacity-50"
            >
              {busy ? 'Syncing…' : 'Run first sync'}
            </button>
          )}
        </div>

        {platform === 'android' && !isHealthConnectEnabled() && (
          <p className="mt-3 text-xs text-white/45">
            Health Connect is prepared behind a capability flag. Use iOS HealthKit for full Hume
            phone-health sync in this release.
          </p>
        )}
      </div>
    </div>
  );
}
