'use client';

/**
 * Prompt 226h Wave B: Science & Authorities source registry transparency.
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, ShieldAlert } from 'lucide-react';
import type {
  IngestSourceStatusRow,
  SourceRegistryRow,
} from '@/lib/kb/unifiedEvidence226h';

function statusTone(status: string | null): string {
  const s = (status ?? '').toLowerCase();
  if (s === 'live') return 'text-[#2DA5A0] border-[#2DA5A0]/30 bg-[#2DA5A0]/10';
  if (s === 'pending_access')
    return 'text-amber-200 border-amber-500/30 bg-amber-500/10';
  if (s === 'degraded') return 'text-orange-200 border-orange-500/30 bg-orange-500/10';
  if (s === 'blocked') return 'text-red-200 border-red-500/30 bg-red-500/10';
  return 'text-white/50 border-white/15 bg-white/5';
}

export function SourceRegistryPanel() {
  const [sources, setSources] = useState<SourceRegistryRow[]>([]);
  const [ingestStatus, setIngestStatus] = useState<IngestSourceStatusRow[]>(
    [],
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        const res = await fetch('/api/kb/source-registry');
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || json.error === 'Unauthorized') {
          setError('Sign in to view the live source registry.');
          return;
        }
        if (!json.ok) {
          setError(String(json.error ?? 'Registry unavailable'));
          return;
        }
        setSources(json.sources ?? []);
        setIngestStatus(json.ingestStatus ?? []);
      } catch {
        if (!cancelled) setError('Registry unavailable');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      className="space-y-4"
      data-testid="science-source-registry"
      aria-label="Evidence source registry"
    >
      <div>
        <h2 className="text-base font-semibold text-white">
          Evidence source registry
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-white/45">
          Sources Hannah and Collection 14 evidence surfaces can read, with tier,
          status, and freshness. Pending or blocked sources are shown honestly.
        </p>
      </div>

      {busy ? (
        <p className="text-xs text-white/40">Loading registry...</p>
      ) : null}
      {error ? (
        <p className="text-xs text-amber-200" data-testid="science-registry-error">
          {error}
        </p>
      ) : null}

      {ingestStatus.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ingestStatus.map((s) => (
            <div
              key={s.sourceSystem}
              className={`rounded-xl border px-3 py-2 ${statusTone(s.status)}`}
              data-testid={`ingest-status-${s.sourceSystem}`}
            >
              <div className="flex items-center gap-2">
                {s.status === 'live' ? (
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                ) : s.status === 'pending_access' ? (
                  <Clock3 className="h-3.5 w-3.5" strokeWidth={1.5} />
                ) : (
                  <ShieldAlert className="h-3.5 w-3.5" strokeWidth={1.5} />
                )}
                <p className="text-xs font-semibold uppercase tracking-wide">
                  {s.sourceSystem}
                </p>
                <span className="ml-auto text-[10px]">{s.status}</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed opacity-80">
                {s.coverageNote || s.reason}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <ul className="space-y-2 list-none">
        {sources.map((src) => (
          <li
            key={src.id}
            className="rounded-xl border border-white/[0.08] bg-[var(--card)]/70 p-3"
            data-testid={`registry-source-${src.domain.replace(/\./g, '-')}`}
          >
            <div className="flex flex-wrap items-start gap-2 justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{src.label}</p>
                <p className="text-[11px] text-white/40">{src.domain}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-white/60">
                  Tier {src.sourceTier ?? 'UNKNOWN'}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] ${statusTone(
                    src.registryStatus,
                  )}`}
                >
                  {src.registryStatus ?? src.approvalStatus}
                </span>
              </div>
            </div>
            {src.coverageNote ? (
              <p className="mt-2 text-[11px] leading-relaxed text-white/50">
                {src.coverageNote}
              </p>
            ) : null}
            {src.blockedReason ? (
              <p className="mt-1 text-[11px] leading-relaxed text-amber-100/80 flex gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" strokeWidth={1.5} />
                {src.blockedReason}
              </p>
            ) : null}
            <p className="mt-2 text-[10px] text-white/35">
              Last success:{' '}
              {src.lastSuccessfulRun
                ? new Date(src.lastSuccessfulRun).toISOString()
                : 'UNKNOWN'}
              {src.transport ? ` · Transport: ${src.transport}` : ''}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
