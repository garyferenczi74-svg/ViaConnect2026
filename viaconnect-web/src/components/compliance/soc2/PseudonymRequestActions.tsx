'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';

export interface PseudonymRequestActionsProps {
  logId: number;
  viewerRole: string;
  state: 'pending' | 'steve_approved' | 'thomas_approved' | 'both_approved' | 'resolved' | 'denied';
  knownContexts: readonly string[];
}

const STEVE_ROLES = new Set(['compliance_officer', 'compliance_admin', 'admin', 'superadmin']);
const THOMAS_ROLES = new Set(['legal_counsel', 'superadmin']);

export default function PseudonymRequestActions({ logId, viewerRole, state, knownContexts }: PseudonymRequestActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<'approve' | 'deny' | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [context, setContext] = useState('');
  const [showDeny, setShowDeny] = useState(false);

  const canSteve = STEVE_ROLES.has(viewerRole);
  const canThomas = THOMAS_ROLES.has(viewerRole);
  const steveSigned = state === 'steve_approved' || state === 'both_approved' || state === 'resolved';
  const thomasSigned = state === 'thomas_approved' || state === 'both_approved' || state === 'resolved';
  const terminal = state === 'resolved' || state === 'denied';

  async function approve(slot: 'steve' | 'thomas') {
    setErr(null);
    setBusy('approve');
    try {
      const res = await fetch(`/api/admin/soc2/pseudonym-requests/${logId}/approve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slot, context: context.trim() || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function deny() {
    setErr(null);
    if (denyReason.trim().length < 10) {
      setErr('Please provide a reason of at least 10 characters.');
      return;
    }
    setBusy('deny');
    try {
      const res = await fetch(`/api/admin/soc2/pseudonym-requests/${logId}/deny`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: denyReason.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (terminal) return null;

  return (
    <div className="space-y-2">
      {state === 'both_approved' || state === 'steve_approved' || state === 'thomas_approved' ? (
        <div>
          <label className="block text-[11px] font-medium text-white/70 mb-1">
            Resolution context (required after the second approval)
          </label>
          <select
            value={context}
            onChange={(e) => setContext(e.target.value)}
            disabled={busy !== null}
            className="w-full rounded-md bg-white/[0.04] border border-white/[0.14] text-xs text-white px-2 py-1.5 focus:outline-none focus:border-white/30"
          >
            <option value="">Select a context</option>
            {knownContexts.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {canSteve && !steveSigned ? (
          <button
            type="button" onClick={() => approve('steve')} disabled={busy !== null}
            className="inline-flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50 px-2.5 py-1 text-[11px] font-medium text-emerald-200"
          >
            {busy === 'approve' ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} aria-hidden /> : <Check className="w-3 h-3" strokeWidth={1.5} aria-hidden />}
            Approve as Steve
          </button>
        ) : null}
        {canThomas && !thomasSigned ? (
          <button
            type="button" onClick={() => approve('thomas')} disabled={busy !== null}
            className="inline-flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50 px-2.5 py-1 text-[11px] font-medium text-emerald-200"
          >
            {busy === 'approve' ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} aria-hidden /> : <Check className="w-3 h-3" strokeWidth={1.5} aria-hidden />}
            Approve as Thomas
          </button>
        ) : null}
        <button
          type="button" onClick={() => setShowDeny(!showDeny)} disabled={busy !== null}
          className="inline-flex items-center gap-1 rounded-md border border-red-400/40 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 px-2.5 py-1 text-[11px] font-medium text-red-200"
        >
          <X className="w-3 h-3" strokeWidth={1.5} aria-hidden />
          Deny
        </button>
      </div>

      {showDeny ? (
        <div className="space-y-2">
          <textarea
            value={denyReason} onChange={(e) => setDenyReason(e.target.value)} rows={2}
            disabled={busy !== null}
            placeholder="Why are you denying this request?"
            className="w-full rounded-md bg-white/[0.04] border border-white/[0.14] text-xs text-white px-2 py-1.5 focus:outline-none focus:border-white/30"
          />
          <button
            type="button" onClick={deny} disabled={busy !== null}
            className="inline-flex items-center gap-1 rounded-md bg-red-500 hover:bg-red-600 disabled:opacity-50 px-2.5 py-1 text-[11px] font-medium text-white"
          >
            {busy === 'deny' ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} aria-hidden /> : null}
            Confirm denial
          </button>
        </div>
      ) : null}

      {err ? (
        <div className="rounded-md border border-red-400/40 bg-red-500/10 text-red-200 text-[11px] px-2 py-1">{err}</div>
      ) : null}
    </div>
  );
}
