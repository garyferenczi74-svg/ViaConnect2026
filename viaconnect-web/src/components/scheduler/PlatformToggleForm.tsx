'use client';

// Prompt #125 P5: Propose a platform kill-switch mode change.

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import type { SchedulerPlatform } from '@/lib/marshall/scheduler/types';

export interface PlatformToggleFormProps {
  platform: SchedulerPlatform;
  currentMode: 'active' | 'scan_only' | 'disabled';
}

const MODE_OPTIONS: Array<{ value: 'active' | 'scan_only' | 'disabled'; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'scan_only', label: 'Scan only (no interception)' },
  { value: 'disabled', label: 'Disabled (reject all events)' },
];

export default function PlatformToggleForm({ platform, currentMode }: PlatformToggleFormProps) {
  const router = useRouter();
  const [proposedMode, setProposedMode] = useState<'active' | 'scan_only' | 'disabled'>(currentMode);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const reason = String(fd.get('reason') ?? '').trim();
    if (proposedMode === currentMode) {
      setErr('no_change_proposed');
      return;
    }
    if (reason.length < 20) {
      setErr('reason_too_short_min_20');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/marshall/scheduler/admin/platforms/${platform}/propose`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ proposedMode, reason }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      router.refresh();
    } catch (submitErr) {
      setErr((submitErr as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-[11px] text-white/60">Propose mode:</label>
        <select
          value={proposedMode}
          onChange={(e) => setProposedMode(e.target.value as 'active' | 'scan_only' | 'disabled')}
          disabled={submitting}
          className="rounded-md bg-white/[0.04] border border-white/10 text-xs text-white px-2 py-1"
        >
          {MODE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <textarea
        name="reason"
        rows={2}
        minLength={20}
        maxLength={2000}
        placeholder="Reason (required, 20-2000 chars). Explain the trigger and expected duration."
        className="w-full rounded-md bg-white/[0.04] border border-white/10 text-xs text-white placeholder-white/30 px-2 py-1"
        disabled={submitting}
      />
      {err ? (
        <div className="flex items-start gap-2 rounded-md border border-red-400/40 bg-red-500/10 p-2 text-[11px] text-red-200">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5" strokeWidth={1.5} />
          <span>{err}</span>
        </div>
      ) : null}
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-1.5 rounded-md bg-[#B75E18] hover:bg-[#a75217] disabled:opacity-50 text-white px-3 py-1 text-xs"
      >
        {submitting ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} /> : null}
        Propose change
      </button>
    </form>
  );
}
