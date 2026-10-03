'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import type { AiSharingStatus } from './useAiSharingStatus';

interface AiDataSharingConsentProps {
  status: AiSharingStatus;
  onAgreed?: () => void;
  onDeclined?: () => void;
  showSettingsActions?: boolean;
}

export function AiDataSharingConsent({
  status,
  onAgreed,
  onDeclined,
  showSettingsActions = false,
}: AiDataSharingConsentProps) {
  const [busy, setBusy] = useState<'agree' | 'revoke' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(action: 'agree' | 'revoke') {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch('/api/ai/consent', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        setError('That choice could not be saved. Try again.');
        return;
      }
      await status.refresh();
      if (action === 'agree') onAgreed?.();
      if (action === 'revoke') onDeclined?.();
    } catch {
      setError('That choice could not be saved. Try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="w-full rounded-2xl border border-white/10 bg-[#1E3054] p-4 sm:p-6 text-white">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-5 h-5 text-[#2DA5A0]" strokeWidth={1.5} />
        <h2 className="text-lg sm:text-xl font-semibold">Share data with AI providers?</h2>
      </div>
      <p className="text-sm sm:text-base text-white/80 leading-relaxed">{status.intro}</p>
      <ul className="mt-4 space-y-3">
        {status.vendors.map((vendor) => (
          <li key={vendor.name} className="text-sm leading-relaxed">
            <span className="font-semibold text-white">{vendor.name}.</span>{' '}
            <span className="text-white/75">{vendor.data}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-white/80 leading-relaxed">{status.decline}</p>
      <p className="mt-3 text-xs text-white/45">
        Consent text {status.version}.{' '}
        <Link href="/privacy" className="underline text-[#2DA5A0]">
          Privacy policy
        </Link>
        {' · '}
        <Link href="/account/ai-sharing" className="underline text-[#2DA5A0]">
          AI sharing settings
        </Link>
      </p>
      {error && (
        <p className="mt-3 text-sm text-[#FCA5A5]" role="alert">
          {error}
        </p>
      )}
      <div className="mt-5 flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void send('agree')}
          className="min-h-[44px] w-full sm:w-auto rounded-xl bg-[#2DA5A0] px-4 text-sm font-semibold text-[#0B1520] disabled:opacity-50"
        >
          {busy === 'agree' ? 'Saving…' : 'Agree'}
        </button>
        {showSettingsActions && status.consented ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void send('revoke')}
            className="min-h-[44px] w-full sm:w-auto rounded-xl border border-white/20 px-4 text-sm font-medium text-white/80 disabled:opacity-50"
          >
            {busy === 'revoke' ? 'Saving…' : 'Withdraw agreement'}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => onDeclined?.()}
            className="min-h-[44px] w-full sm:w-auto rounded-xl border border-white/20 px-4 text-sm font-medium text-white/80 disabled:opacity-50"
          >
            Don&apos;t agree
          </button>
        )}
      </div>
      {showSettingsActions && (
        <p className="mt-3 text-sm text-white/70" role="status">
          {status.consented
            ? 'AI sharing is on for this consent text.'
            : 'AI sharing is off. AI features that send personal data will not run while the store gate is on.'}
        </p>
      )}
    </section>
  );
}
