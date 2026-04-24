'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function CollectorToggle({ collectorId, enabled }: { collectorId: string; enabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function toggle() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/soc2/collectors/${encodeURIComponent(collectorId)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition ${
          enabled
            ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30'
            : 'bg-slate-500/15 border-slate-400/30 text-slate-200 hover:bg-slate-500/25'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {busy ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} aria-hidden /> : null}
        {enabled ? 'Enabled' : 'Disabled'}
      </button>
      {err ? <span className="text-[10px] text-red-300">{err}</span> : null}
    </div>
  );
}
