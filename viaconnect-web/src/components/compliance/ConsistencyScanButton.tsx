'use client';

// Prompt #127 P7: Trigger a consistency scan from the flags UI.

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

export default function ConsistencyScanButton() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  async function onClick() {
    setErr(null);
    setSummary(null);
    setScanning(true);
    try {
      const res = await fetch('/api/compliance/consistency/check', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setSummary(
        `${body.totalFlags} active, ${body.inserted} new, ${body.reopened} reopened, ${body.refreshed} refreshed, ${body.autoResolved} auto-resolved.`
      );
      router.refresh();
    } catch (scanErr) {
      setErr((scanErr as Error).message);
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={onClick} disabled={scanning}
              className="inline-flex items-center gap-2 rounded-md bg-[#B75E18] hover:bg-[#C96D1E] disabled:opacity-50 transition px-4 py-2 text-sm font-medium text-white w-fit">
        {scanning ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} aria-hidden /> : <RefreshCw className="w-4 h-4" strokeWidth={1.5} aria-hidden />}
        {scanning ? 'Scanning' : 'Run consistency scan'}
      </button>
      {summary ? <div className="text-xs text-emerald-200">{summary}</div> : null}
      {err ? <div className="text-xs text-red-300">{err}</div> : null}
    </div>
  );
}
