'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Signature, Archive, Loader2 } from 'lucide-react';

export interface DispositionButtonsProps {
  rowId: string;
  alreadySignedOff: boolean;
  alreadyArchived: boolean;
}

export default function DispositionButtons({ rowId, alreadySignedOff, alreadyArchived }: DispositionButtonsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<'signoff' | 'archive' | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function post(path: string, action: 'signoff' | 'archive') {
    setErr(null);
    setBusy(action);
    try {
      const res = await fetch(path, { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {!alreadySignedOff && !alreadyArchived ? (
          <button
            type="button"
            onClick={() => post(`/api/admin/soc2/manual-evidence/${rowId}/signoff`, 'signoff')}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-md border border-emerald-400/40 bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50 transition px-3 py-1.5 text-xs font-medium text-emerald-200"
          >
            <Signature className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
            {busy === 'signoff' ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} aria-hidden /> : null}
            Sign off
          </button>
        ) : null}
        {!alreadyArchived ? (
          <button
            type="button"
            onClick={() => post(`/api/admin/soc2/manual-evidence/${rowId}/archive`, 'archive')}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/[0.05] hover:bg-white/[0.08] disabled:opacity-50 transition px-3 py-1.5 text-xs font-medium text-white/80"
          >
            <Archive className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
            {busy === 'archive' ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} aria-hidden /> : null}
            Archive
          </button>
        ) : null}
      </div>
      {err ? (
        <div className="rounded-md border border-red-400/40 bg-red-500/10 text-red-200 text-xs px-2.5 py-1.5">
          {err}
        </div>
      ) : null}
    </div>
  );
}
