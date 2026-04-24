'use client';

// Prompt #125 P5: Approve or reject a pending platform-state change.

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import type { SchedulerPlatform } from '@/lib/marshall/scheduler/types';

export interface PendingChangeActionsProps {
  platform: SchedulerPlatform;
  changeId: string;
  proposerIsSelf: boolean;
}

export default function PendingChangeActions({ platform, changeId, proposerIsSelf }: PendingChangeActionsProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<'approve' | 'reject' | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function act(kind: 'approve' | 'reject', rejectionReason?: string) {
    setErr(null);
    setSubmitting(kind);
    try {
      const res = await fetch(`/api/marshall/scheduler/admin/platforms/${platform}/approve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ changeId, action: kind, rejectionReason }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      router.refresh();
    } catch (actErr) {
      setErr((actErr as Error).message);
    } finally {
      setSubmitting(null);
    }
  }

  if (proposerIsSelf) {
    return (
      <div className="text-[11px] text-white/60">
        You proposed this change; another admin must approve it.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={() => act('approve')}
        disabled={submitting !== null}
        className="inline-flex items-center gap-1 rounded-md border border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/10 px-2 py-1 text-[11px] disabled:opacity-50"
      >
        {submitting === 'approve' ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} /> : <Check className="w-3 h-3" strokeWidth={1.5} />}
        Approve + apply
      </button>
      <button
        type="button"
        onClick={() => {
          const reason = typeof window !== 'undefined'
            ? window.prompt('Rejection reason (required):') ?? ''
            : '';
          if (reason.trim().length < 5) {
            setErr('rejection_reason_too_short');
            return;
          }
          act('reject', reason.trim());
        }}
        disabled={submitting !== null}
        className="inline-flex items-center gap-1 rounded-md border border-red-500/40 text-red-200 hover:bg-red-500/10 px-2 py-1 text-[11px] disabled:opacity-50"
      >
        {submitting === 'reject' ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} /> : <X className="w-3 h-3" strokeWidth={1.5} />}
        Reject
      </button>
      {err ? <span className="text-[11px] text-red-300">{err}</span> : null}
    </div>
  );
}
