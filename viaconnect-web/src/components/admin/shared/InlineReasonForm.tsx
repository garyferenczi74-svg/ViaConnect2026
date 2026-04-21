// Shared replacement for `window.prompt()` in admin review queues.
// Extracted after Michelangelo flagged the prompt() anti-pattern in
// Prompt #100, #101, and #102 reviews.

'use client';

import { useState } from 'react';

export function InlineReasonForm({
  placeholder,
  submitLabel,
  submitTone = 'emerald',
  minLength = 5,
  disabled,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  submitLabel: string;
  submitTone?: 'emerald' | 'red' | 'sky';
  minLength?: number;
  disabled?: boolean;
  onSubmit: (reason: string) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toneClass =
    submitTone === 'red'
      ? 'bg-red-500/20 hover:bg-red-500/30 border-red-500/30 text-red-200'
      : submitTone === 'sky'
      ? 'bg-sky-500/20 hover:bg-sky-500/30 border-sky-500/30 text-sky-200'
      : 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/30 text-emerald-200';

  const submit = async () => {
    if (reason.trim().length < minLength) return;
    setSubmitting(true);
    try {
      await onSubmit(reason.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-2 space-y-2 rounded-lg bg-black/20 p-2">
      <label className="block">
        <span className="sr-only">Reason</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full rounded-md bg-white/[0.04] border border-white/[0.1] px-2 py-1 text-[11px] text-white focus:outline-none focus:border-[#2DA5A0]"
        />
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={disabled || submitting || reason.trim().length < minLength}
          className={`rounded-md border px-2.5 py-0.5 text-[11px] font-semibold disabled:opacity-50 ${toneClass}`}
        >
          {submitting ? 'Saving...' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-md border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-0.5 text-[11px] text-white/70 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
