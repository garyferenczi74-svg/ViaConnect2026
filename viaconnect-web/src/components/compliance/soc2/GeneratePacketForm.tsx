'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { PlayCircle, Loader2, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface GenerateResult {
  ok: boolean;
  packetId?: string;
  packetUuid?: string;
  storageKey?: string;
  sizeBytes?: number;
  rootHash?: string;
  totalFiles?: number;
  collectorErrorCount?: number;
  coverageGaps?: readonly string[];
  error?: string;
}

export default function GeneratePacketForm({ defaultStart, defaultEnd }: { defaultStart: string; defaultEnd: string }) {
  const router = useRouter();
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [attestationType, setAttestationType] = useState<'Type I' | 'Type II'>('Type II');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setResult(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/soc2/packets/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          period: { start: new Date(start).toISOString(), end: new Date(end).toISOString() },
          attestationType,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as GenerateResult;
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setResult(body);
    } catch (submitErr) {
      setErr((submitErr as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Period start" htmlFor="start">
            <input
              id="start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)}
              disabled={submitting} required className={inputClasses}
            />
          </Field>
          <Field label="Period end" htmlFor="end">
            <input
              id="end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)}
              disabled={submitting} required className={inputClasses}
            />
          </Field>
        </div>
        <Field label="Attestation type" htmlFor="attestationType">
          <select
            id="attestationType"
            value={attestationType}
            onChange={(e) => setAttestationType(e.target.value as 'Type I' | 'Type II')}
            disabled={submitting}
            className={inputClasses}
          >
            <option value="Type II">Type II (operating effectiveness over a period)</option>
            <option value="Type I">Type I (design point-in-time)</option>
          </select>
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
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#B75E18] hover:bg-[#C96D1E] disabled:opacity-50 disabled:cursor-not-allowed transition px-4 py-2 text-sm font-medium text-white"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} aria-hidden /> : <PlayCircle className="w-4 h-4" strokeWidth={1.5} aria-hidden />}
          {submitting ? 'Generating, this can take up to a minute' : 'Generate packet now'}
        </button>
      </form>

      {result ? (
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4 space-y-2 text-sm text-emerald-100">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-300" strokeWidth={1.5} aria-hidden />
            <span className="font-semibold">Packet generated</span>
          </div>
          <div className="text-xs text-emerald-200/90 space-y-0.5">
            <div>UUID: <span className="font-mono">{result.packetUuid}</span></div>
            <div>Storage key: <span className="font-mono">{result.storageKey}</span></div>
            <div>Root hash: <span className="font-mono break-all">{result.rootHash}</span></div>
            <div>Files: <span className="tabular-nums">{result.totalFiles}</span></div>
            <div>Collector errors: <span className="tabular-nums">{result.collectorErrorCount}</span></div>
            {result.coverageGaps && result.coverageGaps.length > 0 ? (
              <div>Coverage gaps: <span className="font-mono">{result.coverageGaps.join(', ')}</span></div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => router.push(`/admin/compliance/soc2/packets/${result.packetId}`)}
            className="inline-flex items-center gap-2 rounded-md bg-white/[0.08] hover:bg-white/[0.12] transition px-3 py-1.5 text-xs font-medium text-white"
          >
            Open detail
          </button>
        </div>
      ) : null}
    </div>
  );
}

const inputClasses = 'w-full rounded-md bg-white/[0.04] border border-white/[0.14] text-sm text-white placeholder-white/30 px-3 py-2 focus:outline-none focus:border-white/30';

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-white/80 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
