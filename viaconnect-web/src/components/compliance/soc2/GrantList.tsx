'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Archive, Clock, Loader2, Users, AlertTriangle } from 'lucide-react';

export interface GrantRow {
  id: string;
  auditor_email: string;
  auditor_firm: string;
  packet_ids: string[];
  granted_at: string;
  expires_at: string;
  revoked: boolean;
  revoked_at: string | null;
  access_count: number;
}

export default function GrantList({ rows }: { rows: readonly GrantRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function revoke(id: string) {
    setErr(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/soc2/auditor-grants/${encodeURIComponent(id)}/revoke`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-white/50">
        No auditor grants yet. Use the button above to invite your first auditor.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {err ? (
        <div className="rounded-md border border-red-400/40 bg-red-500/10 text-red-200 text-xs px-3 py-2">{err}</div>
      ) : null}
      {rows.map((r) => {
        const now = Date.now();
        const expiresMs = new Date(r.expires_at).getTime();
        const daysRemaining = Math.round((expiresMs - now) / 86_400_000);
        const expired = expiresMs <= now;
        return (
          <article key={r.id} className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-3">
            <div className="flex items-start gap-2 flex-wrap">
              <Users className="w-4 h-4 text-[#B75E18] mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white truncate">{r.auditor_firm}</div>
                <div className="text-xs text-white/60 truncate">{r.auditor_email}</div>
              </div>
              <StateBadge revoked={r.revoked} expired={expired} />
              {!r.revoked && !expired ? (
                <button
                  type="button"
                  onClick={() => revoke(r.id)}
                  disabled={busyId !== null}
                  className="inline-flex items-center gap-1 rounded-md border border-red-400/40 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 transition px-2 py-1 text-[11px] font-medium text-red-200"
                >
                  {busyId === r.id ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} aria-hidden /> : <Archive className="w-3 h-3" strokeWidth={1.5} aria-hidden />}
                  Revoke
                </button>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-white/60">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" strokeWidth={1.5} aria-hidden />
                Granted {r.granted_at.slice(0, 10)}
              </span>
              <span>Expires {r.expires_at.slice(0, 10)}</span>
              {!r.revoked && !expired ? (
                <span className={daysRemaining <= 7 ? 'text-amber-300' : 'text-white/60'}>{daysRemaining}d remaining</span>
              ) : null}
              <span>Packets: {r.packet_ids.length}</span>
              <span>Accesses: <span className="tabular-nums text-white">{r.access_count}</span></span>
              {r.revoked && r.revoked_at ? <span className="text-red-300">Revoked {r.revoked_at.slice(0, 10)}</span> : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function StateBadge({ revoked, expired }: { revoked: boolean; expired: boolean }) {
  if (revoked) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-red-400/40 bg-red-500/15 text-red-200 px-1.5 py-0.5 text-[11px]">
        <Archive className="w-3 h-3" strokeWidth={1.5} aria-hidden />
        revoked
      </span>
    );
  }
  if (expired) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/40 bg-amber-500/15 text-amber-200 px-1.5 py-0.5 text-[11px]">
        <AlertTriangle className="w-3 h-3" strokeWidth={1.5} aria-hidden />
        expired
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-500/15 text-emerald-200 px-1.5 py-0.5 text-[11px]">
      active
    </span>
  );
}
