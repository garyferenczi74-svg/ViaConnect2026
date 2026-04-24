'use client';

import { useState, type FormEvent } from 'react';
import { Loader2, Mail, CheckCircle2 } from 'lucide-react';

export default function AuditorLoginForm() {
  const [email, setEmail] = useState('');
  const [firm, setFirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auditor/send-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), firmName: firm.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setSent(true);
    } catch (submitErr) {
      setErr((submitErr as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4 space-y-2 text-sm">
        <div className="flex items-center gap-2 text-emerald-200">
          <CheckCircle2 className="w-5 h-5" strokeWidth={1.5} aria-hidden />
          <span className="font-semibold">Check your email</span>
        </div>
        <p className="text-emerald-100/90 text-sm">
          If your grant is active, a secure link is on its way to {email}. The link expires after one use. Open it from the same device and browser you used to request it.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-xs font-medium text-white/80 mb-1.5">Auditor email</label>
        <input
          id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          disabled={submitting} required
          className="w-full rounded-md bg-white/[0.04] border border-white/[0.14] text-sm text-white placeholder-white/30 px-3 py-2 focus:outline-none focus:border-white/30"
          placeholder="auditor@firm.com"
        />
      </div>
      <div>
        <label htmlFor="firm" className="block text-xs font-medium text-white/80 mb-1.5">Firm name</label>
        <input
          id="firm" type="text" value={firm} onChange={(e) => setFirm(e.target.value)}
          disabled={submitting} required
          className="w-full rounded-md bg-white/[0.04] border border-white/[0.14] text-sm text-white placeholder-white/30 px-3 py-2 focus:outline-none focus:border-white/30"
          placeholder="Firm LLP"
        />
        <p className="text-[11px] text-white/40 mt-1">Must match exactly how your engagement letter lists the firm.</p>
      </div>
      {err ? (
        <div className="rounded-md border border-red-400/40 bg-red-500/10 text-sm text-red-200 px-3 py-2">{err}</div>
      ) : null}
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center gap-2 w-full rounded-md bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition px-4 py-2.5 text-sm font-medium text-black"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} aria-hidden /> : <Mail className="w-4 h-4" strokeWidth={1.5} aria-hidden />}
        {submitting ? 'Sending' : 'Send secure link'}
      </button>
    </form>
  );
}
