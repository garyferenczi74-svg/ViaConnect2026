'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Prompt 231: scan consent notice, mirroring the 226 disclaimer pattern.
 * Body copy is server-fetched (GET /api/scan/consent), never composed
 * client-side; Continue POSTs the ack server-side, never localStorage.
 * The practitioner-visibility line is hard-coded here so it always renders
 * regardless of the DB copy. Uses var(--card) / var(--orange) / var(--teal)
 * tokens and the .font-instrument opt-in class, matching PoseTitleCard.
 */

interface ConsentStatus {
  ok: boolean;
  available: boolean;
  version?: string;
  bodyMarkdown?: string;
  acknowledged?: boolean;
}

export interface ConsentNoticeProps {
  onAcknowledged?: (version: string) => void;
}

export function ConsentNotice({ onAcknowledged }: ConsentNoticeProps) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ConsentStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/scan/consent');
      if (res.status === 401) {
        setStatus({ ok: false, available: false });
        return;
      }
      const data = (await res.json()) as ConsentStatus;
      setStatus(data);
      if (data.acknowledged && data.version) {
        onAcknowledged?.(data.version);
      }
    } catch {
      setStatus({ ok: false, available: false });
    } finally {
      setLoading(false);
    }
  }, [onAcknowledged]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  async function handleContinue() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/scan/consent', { method: 'POST' });
      const data = (await res.json()) as { ok?: boolean; version?: string };
      if (data.ok && data.version) {
        onAcknowledged?.(data.version);
      } else {
        setError('Could not record consent. Try again.');
      }
    } catch {
      setError('Could not record consent. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div
        className="font-instrument rounded-2xl bg-[var(--card)] p-6 text-sm text-white/60"
        data-testid="scan-consent-loading"
      >
        Loading consent...
      </div>
    );
  }

  if (!status?.available) {
    return (
      <div
        className="font-instrument rounded-2xl border border-[var(--orange)]/40 bg-[var(--card)] p-6 space-y-2"
        data-testid="scan-consent-unavailable"
      >
        <h2 className="text-base font-semibold text-white">Scan consent unavailable</h2>
        <p className="text-xs text-white/60 leading-relaxed">
          Scan consent copy is being finalized. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <div
      className="font-instrument rounded-2xl border border-[var(--orange)]/40 bg-[var(--card)] p-5 md:p-6 space-y-4"
      data-testid="scan-consent-notice"
      data-consent-version={status.version}
    >
      <h2 className="text-base font-semibold text-white">Before your scan</h2>
      <div
        className="prose prose-invert prose-sm max-w-none text-white/75 whitespace-pre-wrap text-sm leading-relaxed"
        data-testid="scan-consent-body"
      >
        {status.bodyMarkdown}
      </div>
      <p
        className="text-xs text-amber-200 leading-relaxed"
        data-testid="scan-consent-practitioner-notice"
      >
        If you have a linked practitioner and you share body photos with them, they can view your scan photos the same way they can view your other body-tracker photos.
      </p>
      {error ? (
        <p className="text-xs text-red-300" data-testid="scan-consent-error">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleContinue()}
        className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-[var(--teal)] disabled:opacity-50"
        data-testid="scan-consent-continue"
      >
        I understand. Continue
      </button>
    </div>
  );
}
