'use client';

// Prompt #125 P4: Override sign-off form.
//
// Captures practitioner intent: justification (50-2000 chars) +
// acknowledgment checkbox. Server captures IP + UA from the request.
// No client-side auto-submit; explicit button click only.

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Loader2, ShieldAlert, FileSignature } from 'lucide-react';

export interface OverrideSignoffFormProps {
  scanId: string;
  findingIds: string[];
}

export default function OverrideSignoffForm({ scanId, findingIds }: OverrideSignoffFormProps) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ack, setAck] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (!ack) {
      setErr('acknowledgment_required');
      return;
    }
    const fd = new FormData(e.currentTarget);
    const payload = {
      findingIds,
      justification: String(fd.get('justification') ?? '').trim(),
    };
    if (payload.justification.length < 50) {
      setErr('justification_too_short');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/marshall/scheduler/scans/${encodeURIComponent(scanId)}/override`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      router.push(`/practitioner/marshall/scheduler/posts/${encodeURIComponent(scanId)}`);
      router.refresh();
    } catch (submitErr) {
      setErr((submitErr as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="rounded-md border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200 space-y-1.5">
        <div className="font-semibold">You are overriding a Marshall decision.</div>
        <ul className="list-disc ml-4 space-y-1 text-amber-200/90">
          <li>The override is signed with your identity, IP, user agent, and timestamp.</li>
          <li>No clearance receipt is issued for this scan.</li>
          <li>If Hounddog catches this post later, no good-faith credit applies; severity is unadjusted.</li>
          <li>Repeated overrides on the same rule type trigger a pattern flag for compliance review.</li>
        </ul>
      </div>

      <div>
        <label htmlFor="justification" className="block text-xs font-medium text-white/80 mb-1.5">
          Justification * (50-2000 characters)
        </label>
        <textarea
          id="justification"
          name="justification"
          rows={5}
          required
          minLength={50}
          maxLength={2000}
          disabled={submitting}
          placeholder="Explain why you are overriding. Cite your sources if you are standing behind a claim Marshall flagged."
          className="w-full rounded-md bg-white/[0.04] border border-white/[0.14] text-xs text-white placeholder-white/30 px-3 py-2 focus:outline-none focus:border-white/30"
        />
      </div>

      <label className="flex items-start gap-2 text-xs text-white/80 cursor-pointer">
        <input
          type="checkbox"
          checked={ack}
          onChange={(e) => setAck(e.target.checked)}
          disabled={submitting}
          className="mt-0.5"
        />
        <span>
          I have read the consequences above. I am overriding {findingIds.length} finding{findingIds.length === 1 ? '' : 's'}
          {' '}({findingIds.join(', ')}) and accept full compliance responsibility for this published post.
        </span>
      </label>

      {err ? (
        <div className="flex items-start gap-2 rounded-md border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
          <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
          <span>{err}</span>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting || !ack}
        className="inline-flex items-center gap-2 rounded-md bg-[#B75E18] hover:bg-[#a75217] disabled:opacity-50 text-white px-4 py-2 text-sm font-medium"
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
        ) : (
          <FileSignature className="w-4 h-4" strokeWidth={1.5} />
        )}
        {submitting ? 'Signing' : 'Sign override'}
      </button>
    </form>
  );
}
