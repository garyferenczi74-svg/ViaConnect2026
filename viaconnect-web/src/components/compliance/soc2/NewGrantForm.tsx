'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ShieldAlert, Loader2, UserPlus } from 'lucide-react';

export interface PacketOption {
  id: string;
  packet_uuid: string;
  period_start: string;
  period_end: string;
}

export default function NewGrantForm({ packets }: { packets: readonly PacketOption[] }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [firm, setFirm] = useState('');
  const [expiresAt, setExpiresAt] = useState(defaultExpiresAt());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function togglePacket(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (selected.size === 0) {
      setErr('Select at least one packet to share with the auditor.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/soc2/auditor-grants', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          auditorEmail: email.trim(),
          auditorFirm: firm.trim(),
          packetIds: Array.from(selected),
          expiresAt: new Date(expiresAt).toISOString(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      router.push('/admin/compliance/soc2/auditor-grants');
    } catch (submitErr) {
      setErr((submitErr as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Auditor email" htmlFor="email" required>
          <input
            id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            disabled={submitting} required className={inputClasses}
            placeholder="auditor@firm.com"
          />
        </Field>
        <Field label="Auditor firm" htmlFor="firm" required>
          <input
            id="firm" type="text" value={firm} onChange={(e) => setFirm(e.target.value)}
            disabled={submitting} required className={inputClasses}
            placeholder="Firm LLP"
          />
        </Field>
      </div>
      <Field label="Expires at (max 90 days)" htmlFor="expiresAt" required>
        <input
          id="expiresAt" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
          disabled={submitting} required className={inputClasses}
        />
      </Field>
      <Field label={`Packets in scope (${selected.size} selected)`} htmlFor="packets" required>
        <div className="max-h-72 overflow-y-auto rounded-md border border-white/[0.14] bg-white/[0.04] p-2 space-y-1">
          {packets.length === 0 ? (
            <p className="text-xs text-white/50 italic px-2 py-1">No packets available to grant.</p>
          ) : packets.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer rounded px-2 py-1 hover:bg-white/[0.04]">
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => togglePacket(p.id)} disabled={submitting} className="w-3.5 h-3.5" />
              <span className="font-mono text-white/80 truncate">{p.packet_uuid}</span>
              <span className="ml-auto text-white/50">{p.period_start.slice(0, 10)} → {p.period_end.slice(0, 10)}</span>
            </label>
          ))}
        </div>
      </Field>

      {err ? (
        <div className="flex items-start gap-2 rounded-md border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
          <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden />
          <span>{err}</span>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-[#B75E18] hover:bg-[#C96D1E] disabled:opacity-50 transition px-4 py-2 text-sm font-medium text-white"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} aria-hidden /> : <UserPlus className="w-4 h-4" strokeWidth={1.5} aria-hidden />}
        {submitting ? 'Creating' : 'Create grant'}
      </button>
    </form>
  );
}

const inputClasses = 'w-full rounded-md bg-white/[0.04] border border-white/[0.14] text-sm text-white placeholder-white/30 px-3 py-2 focus:outline-none focus:border-white/30';

function Field({ label, htmlFor, required, children }: { label: string; htmlFor: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-white/80 mb-1.5">
        {label}{required ? ' *' : ''}
      </label>
      {children}
    </div>
  );
}

function defaultExpiresAt(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 30);
  return d.toISOString().slice(0, 10);
}
