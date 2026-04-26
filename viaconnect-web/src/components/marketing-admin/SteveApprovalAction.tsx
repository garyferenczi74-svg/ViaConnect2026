'use client';

// Prompt #138a Phase 5a: Steve Rica approval / revocation control.
// Per spec section 7.6 the gate is compliance_admin or superadmin; the
// API enforces this so the UI just exposes the actions to anyone who can
// reach the page. Approval requires the variant to have already passed
// word-count + Marshall pre-check (server-side 409 enforces it).

import { useState } from 'react';
import { ShieldCheck, Undo2 } from 'lucide-react';

export interface SteveApprovalActionProps {
  variantId: string;
  approved: boolean;
  approvedAt: string | null;
  approvalNote: string | null;
  /** True when word-count and Marshall pre-check have passed; false → approve disabled. */
  approvable: boolean;
  onChanged: () => void;
}

export function SteveApprovalAction({
  variantId, approved, approvedAt, approvalNote, approvable, onChanged,
}: SteveApprovalActionProps) {
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function callAction(path: 'approve' | 'revoke', body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/marketing/variants/${variantId}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? `${path} failed`);
        setBusy(false);
        return;
      }
      onChanged();
      setBusy(false);
      if (path === 'approve') setNote('');
      if (path === 'revoke') setReason('');
    } catch (err) {
      setError((err as Error).message ?? 'Network error');
      setBusy(false);
    }
  }

  if (approved) {
    return (
      <div className="rounded-2xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 p-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="h-5 w-5 text-[#2DA5A0] flex-none mt-0.5" strokeWidth={1.5} />
          <div className="text-sm flex-1">
            <p className="font-semibold text-[#3DBAB5]">Approved by Steve</p>
            <p className="text-xs text-white/60 mt-0.5">
              {approvedAt ? new Date(approvedAt).toLocaleString() : ''}
            </p>
            {approvalNote && (
              <p className="text-xs text-white/80 mt-2 italic">"{approvalNote}"</p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-medium text-white/80">
            Revocation reason
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy}
              placeholder="e.g. retroactive Marshall finding"
              className="mt-1 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white min-h-[44px] focus:outline-none focus:border-rose-400 disabled:opacity-50"
            />
          </label>
          <button
            onClick={() => callAction('revoke', { reason })}
            disabled={busy || !reason.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            <Undo2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            {busy ? 'Revoking...' : 'Revoke approval'}
          </button>
          {error && <p className="text-xs text-rose-300">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.1] bg-white/[0.04] p-4 space-y-3">
      <div className="flex items-start gap-2.5">
        <ShieldCheck className="h-5 w-5 text-white/60 flex-none mt-0.5" strokeWidth={1.5} />
        <div className="text-sm flex-1">
          <p className="font-semibold text-white">Steve approval</p>
          <p className="text-xs text-white/60 mt-0.5">
            {approvable
              ? 'Word-count and Marshall pre-check passed. Ready for approval.'
              : 'Run word-count + Marshall pre-check first.'}
          </p>
        </div>
      </div>
      {approvable && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-white/80">
            Approval note (optional)
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={busy}
              placeholder="Rationale for the approval"
              className="mt-1 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2DA5A0] disabled:opacity-50 resize-y"
            />
          </label>
          <button
            onClick={() => callAction('approve', { note: note.trim() || undefined })}
            disabled={busy}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#2DA5A0] px-3 py-2 text-xs font-semibold text-[#0B1520] hover:bg-[#3DBAB5] disabled:opacity-50 min-h-[44px]"
          >
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} />
            {busy ? 'Approving...' : 'Approve variant'}
          </button>
          {error && <p className="text-xs text-rose-300">{error}</p>}
        </div>
      )}
    </div>
  );
}
