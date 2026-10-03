'use client';

import { useState } from 'react';
import { Flag } from 'lucide-react';
import toast from 'react-hot-toast';

const REASONS = [
  { id: 'offensive', label: 'Offensive' },
  { id: 'inaccurate', label: 'Inaccurate' },
  { id: 'harmful', label: 'Harmful' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'other', label: 'Other' },
] as const;

type ReasonId = (typeof REASONS)[number]['id'];

interface ReportAiResponseProps {
  surface: 'advisor' | 'hannah';
  messageId: string | null | undefined;
}

export function ReportAiResponse({ surface, messageId }: ReportAiResponseProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReasonId>('offensive');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  if (!messageId) return null;

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch('/api/ai/report', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surface,
          messageId,
          reason,
          note: note.trim() || undefined,
        }),
      });
      if (!res.ok) {
        toast.error('Could not send the report.');
        return;
      }
      toast.success('Report received.');
      setOpen(false);
      setNote('');
    } catch {
      toast.error('Could not send the report.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-xs text-white/70 hover:bg-white/10 hover:text-white"
        aria-expanded={open}
      >
        <Flag className="w-3.5 h-3.5" strokeWidth={1.5} />
        Report this response
      </button>
      {open && (
        <div className="mt-2 w-full max-w-md rounded-xl border border-white/10 bg-[#1A2744] p-3">
          <label className="block text-xs text-white/60" htmlFor={`report-reason-${messageId}`}>
            Reason
          </label>
          <select
            id={`report-reason-${messageId}`}
            value={reason}
            onChange={(event) => setReason(event.target.value as ReasonId)}
            className="mt-1 w-full min-h-[44px] rounded-lg border border-white/15 bg-transparent px-2 text-base text-white"
          >
            {REASONS.map((item) => (
              <option key={item.id} value={item.id} className="bg-[#1A2744]">
                {item.label}
              </option>
            ))}
          </select>
          <label className="mt-3 block text-xs text-white/60" htmlFor={`report-note-${messageId}`}>
            Note, optional
          </label>
          <textarea
            id={`report-note-${messageId}`}
            value={note}
            maxLength={500}
            onChange={(event) => setNote(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-transparent px-2 py-2 text-base text-white"
            rows={3}
          />
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="min-h-[44px] rounded-lg bg-[#2DA5A0] px-3 text-sm font-semibold text-[#0B1520] disabled:opacity-50"
            >
              {busy ? 'Sending…' : 'Send report'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-[44px] rounded-lg border border-white/15 px-3 text-sm text-white/80"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
