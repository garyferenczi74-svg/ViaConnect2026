'use client';

// Prompt #127 P7: Inline resolve dialog for a consistency flag.

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Loader2, Check, CircleX } from 'lucide-react';

export default function ResolveFlagDialog({ flagId }: { flagId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const resolutionNote = String(fd.get('resolutionNote') ?? '').trim();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/compliance/consistency/flags/${encodeURIComponent(flagId)}/resolve`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ resolutionNote }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setOpen(false);
      router.refresh();
    } catch (resolveErr) {
      setErr((resolveErr as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1 text-[11px] text-white/70 hover:text-white border border-white/[0.14] rounded-md px-2 py-0.5">
        <Check className="w-3 h-3" strokeWidth={1.5} aria-hidden />
        Resolve
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex items-start gap-2 mt-2 w-full">
      <textarea name="resolutionNote" rows={2} required minLength={10} disabled={submitting}
                placeholder="Why is this flag no longer a concern? (10+ chars)"
                className="flex-1 rounded-md bg-white/[0.04] border border-white/[0.14] text-xs text-white placeholder-white/30 px-2 py-1 focus:outline-none focus:border-white/30" />
      <div className="flex flex-col gap-1">
        <button type="submit" disabled={submitting}
                className="inline-flex items-center gap-1 rounded-md bg-[#B75E18] hover:bg-[#C96D1E] disabled:opacity-50 transition px-2 py-1 text-[11px] font-medium text-white">
          {submitting ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} aria-hidden /> : <Check className="w-3 h-3" strokeWidth={1.5} aria-hidden />}
          Resolve
        </button>
        <button type="button" onClick={() => { setOpen(false); setErr(null); }}
                className="inline-flex items-center gap-1 text-[11px] text-white/60 hover:text-white px-2">
          <CircleX className="w-3 h-3" strokeWidth={1.5} aria-hidden />
          Cancel
        </button>
        {err ? <span className="text-[11px] text-red-300">{err}</span> : null}
      </div>
    </form>
  );
}
