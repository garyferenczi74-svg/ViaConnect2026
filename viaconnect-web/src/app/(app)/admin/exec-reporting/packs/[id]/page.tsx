'use client';

// Prompt #105 Phase 2b.3 — pack detail + CFO/CEO workflow + render.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, FileText, Check, Send, Lock, Download, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Pack {
  pack_id: string;
  short_code: string;
  pack_title: string;
  period_type: string;
  period_start: string;
  period_end: string;
  state: string;
  cfo_approved_at: string | null;
  cfo_approved_by: string | null;
  ceo_issued_at: string | null;
  ceo_issued_by: string | null;
  aggregation_snapshot_id: string;
}

interface Section {
  section_id: string;
  section_order: number;
  section_type: string;
  title: string;
  commentary_md: string | null;
  commentary_source: string;
}

interface Distribution {
  distribution_id: string;
  member_id: string;
  watermark_token: string;
  distributed_at: string;
  access_revoked_at: string | null;
  board_members?: { display_name: string; email_distribution: string };
}

const STATE_COLORS: Record<string, string> = {
  draft: 'bg-white/10 text-white/80',
  mdna_pending: 'bg-blue-500/20 text-blue-200',
  mdna_drafted: 'bg-blue-500/30 text-blue-100',
  cfo_review: 'bg-amber-500/25 text-amber-100',
  cfo_approved: 'bg-emerald-500/25 text-emerald-100',
  pending_ceo_approval: 'bg-orange-500/30 text-orange-100',
  issued: 'bg-violet-500/30 text-violet-100',
  erratum_issued: 'bg-red-500/20 text-red-200',
  archived: 'bg-white/5 text-white/50',
};

export default function PackDetailPage() {
  const params = useParams<{ id: string }>();
  const [pack, setPack] = useState<Pack | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [issueConfirm, setIssueConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const load = useCallback(async () => {
    if (!params?.id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = createClient() as unknown as any;

    const { data: user } = await sb.auth.getUser();
    if (user?.user?.id) {
      const { data: prof } = await sb.from('profiles').select('role').eq('id', user.user.id).maybeSingle();
      setUserRole((prof as { role?: string } | null)?.role ?? null);
    }

    const { data: p } = await sb
      .from('board_packs')
      .select('pack_id, short_code, pack_title, period_type, period_start, period_end, state, cfo_approved_at, cfo_approved_by, ceo_issued_at, ceo_issued_by, aggregation_snapshot_id')
      .eq('pack_id', params.id)
      .maybeSingle();
    setPack(p as Pack | null);

    if (p) {
      const { data: s } = await sb
        .from('board_pack_sections')
        .select('section_id, section_order, section_type, title, commentary_md, commentary_source')
        .eq('pack_id', params.id)
        .order('section_order', { ascending: true });
      setSections((s as Section[] | null) ?? []);

      if ((p as { state: string }).state === 'issued' || (p as { state: string }).state === 'erratum_issued') {
        const { data: d } = await sb
          .from('board_pack_distributions')
          .select('distribution_id, member_id, watermark_token, distributed_at, access_revoked_at, board_members!inner(display_name, email_distribution)')
          .eq('pack_id', params.id);
        setDistributions((d as Distribution[] | null) ?? []);
      }
    }
  }, [params]);

  useEffect(() => { load(); }, [load]);

  const transition = async (toState: string) => {
    if (!pack) return;
    setBusy(true); setErr(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = createClient() as unknown as any;
    const { data, error } = await sb.functions.invoke('exec-transition-pack', {
      body: { packId: pack.pack_id, toState },
    });
    setBusy(false);
    if (error || (data && (data as { error?: string }).error)) {
      setErr((error?.message as string) ?? (data as { error?: string; detail?: string }).detail ?? 'Transition failed');
      return;
    }
    await load();
  };

  const issue = async () => {
    if (!pack) return;
    setBusy(true); setErr(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = createClient() as unknown as any;
    const { data, error } = await sb.functions.invoke('exec-issue-pack', {
      body: { packId: pack.pack_id, typedConfirmation: confirmText },
    });
    setBusy(false);
    if (error || (data && (data as { error?: string }).error)) {
      setErr((error?.message as string) ?? (data as { error?: string; detail?: string }).detail ?? 'Issue failed');
      return;
    }
    setIssueConfirm(false); setConfirmText('');
    await load();
  };

  const renderPreview = async (format: 'pdf' | 'xlsx' | 'pptx') => {
    if (!pack) return;
    setBusy(true); setErr(null);
    const resp = await fetch(`/api/admin/exec-reporting/packs/${pack.pack_id}/render`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ format }),
    });
    const j = await resp.json();
    setBusy(false);
    if (!resp.ok) {
      setErr(j.detail ?? j.error ?? 'Render failed');
      return;
    }
    setErr(`Rendered: ${j.storage_path} (${j.byte_size} bytes, sha256=${j.sha256.slice(0, 8)}…)`);
  };

  if (!pack) {
    return (
      <div className="min-h-screen bg-[#0B1520] text-white p-6">
        <Link href="/admin/exec-reporting/packs" className="text-xs text-white/60">← Packs</Link>
        <p className="mt-4 text-sm text-white/70">Loading...</p>
      </div>
    );
  }

  const isCFO = userRole === 'cfo' || userRole === 'admin';
  const isCEO = userRole === 'ceo';

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        <Link href="/admin/exec-reporting/packs" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Packs
        </Link>

        <div className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-5 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#E8803A]" strokeWidth={1.5} />
                {pack.pack_title}
              </h1>
              <p className="text-xs text-white/55 mt-1">{pack.short_code}</p>
            </div>
            <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-medium ${STATE_COLORS[pack.state] ?? 'bg-white/10 text-white/80'}`}>
              {pack.state}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-white/70 pt-1">
            <span>Period: {pack.period_type} {pack.period_start} → {pack.period_end}</span>
            <span>CFO: {pack.cfo_approved_at ? pack.cfo_approved_at.slice(0, 10) : '—'}</span>
            <span>CEO: {pack.ceo_issued_at ? pack.ceo_issued_at.slice(0, 10) : '—'}</span>
          </div>
        </div>

        {/* Workflow actions */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/40 p-4 space-y-3">
          <p className="text-xs font-medium text-white/85">Workflow</p>
          <div className="flex flex-wrap gap-2">
            {pack.state === 'draft' && (
              <button onClick={() => transition('mdna_pending')} disabled={busy} className="rounded-lg bg-blue-500/25 hover:bg-blue-500/40 text-blue-100 px-3 py-1.5 text-xs font-medium">
                Start MD&A drafting
              </button>
            )}
            {pack.state === 'mdna_drafted' && (
              <button onClick={() => transition('cfo_review')} disabled={busy} className="rounded-lg bg-amber-500/25 hover:bg-amber-500/40 text-amber-100 px-3 py-1.5 text-xs font-medium">
                Submit for CFO review
              </button>
            )}
            {pack.state === 'cfo_review' && isCFO && (
              <>
                <button onClick={() => transition('cfo_approved')} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/25 hover:bg-emerald-500/40 text-emerald-100 px-3 py-1.5 text-xs font-medium">
                  <Check className="h-3.5 w-3.5" strokeWidth={1.5} /> CFO approve
                </button>
                <button onClick={() => transition('mdna_drafted')} disabled={busy} className="rounded-lg bg-white/10 hover:bg-white/20 text-white/85 px-3 py-1.5 text-xs">
                  Return for rework
                </button>
              </>
            )}
            {pack.state === 'cfo_review' && !isCFO && (
              <p className="text-xs text-white/55">Awaiting CFO review. Only the CFO may approve.</p>
            )}
            {pack.state === 'cfo_approved' && (
              <button onClick={() => transition('pending_ceo_approval')} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500/25 hover:bg-orange-500/40 text-orange-100 px-3 py-1.5 text-xs font-medium">
                <Send className="h-3.5 w-3.5" strokeWidth={1.5} /> Request CEO issue
              </button>
            )}
            {pack.state === 'pending_ceo_approval' && isCEO && !issueConfirm && (
              <button onClick={() => setIssueConfirm(true)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500/25 hover:bg-violet-500/40 text-violet-100 px-3 py-1.5 text-xs font-medium">
                <Lock className="h-3.5 w-3.5" strokeWidth={1.5} /> Issue pack
              </button>
            )}
            {pack.state === 'pending_ceo_approval' && !isCEO && (
              <p className="text-xs text-white/55 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.5} />
                Only the CEO (role=ceo; admin cannot substitute) may issue this pack.
              </p>
            )}
            {pack.state === 'issued' && (
              <p className="text-xs text-violet-200">
                Issued — content frozen. Distributions created for eligible board members.
              </p>
            )}
          </div>

          {issueConfirm && pack.state === 'pending_ceo_approval' && (
            <div className="rounded-lg bg-violet-500/10 border border-violet-500/30 p-3 space-y-2">
              <p className="text-xs text-violet-100 font-medium">
                Type <code className="bg-black/30 px-1 rounded">ISSUE PACK</code> exactly to confirm. This action is irreversible.
              </p>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full rounded-lg bg-black/40 border border-white/[0.1] p-2 text-xs"
                placeholder="ISSUE PACK"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={issue}
                  disabled={busy || confirmText !== 'ISSUE PACK'}
                  className="rounded-lg bg-violet-500/40 hover:bg-violet-500/60 disabled:opacity-40 text-white px-3 py-1.5 text-xs font-medium"
                >
                  Issue now
                </button>
                <button
                  onClick={() => { setIssueConfirm(false); setConfirmText(''); }}
                  className="rounded-lg bg-white/10 hover:bg-white/20 text-white/85 px-3 py-1.5 text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {err && <p className="text-xs text-red-300">{err}</p>}
        </div>

        {/* Render preview */}
        {(pack.state === 'cfo_review' || pack.state === 'cfo_approved' || pack.state === 'pending_ceo_approval' || pack.state === 'issued') && (
          <div className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/40 p-4 space-y-2">
            <p className="text-xs font-medium text-white/85">Preview render</p>
            <div className="flex gap-2">
              <button onClick={() => renderPreview('pdf')} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/85 px-3 py-1.5 text-xs">
                <Download className="h-3.5 w-3.5" strokeWidth={1.5} /> PDF
              </button>
              <button onClick={() => renderPreview('xlsx')} disabled={busy} className="rounded-lg bg-white/10 hover:bg-white/20 text-white/85 px-3 py-1.5 text-xs">
                XLSX
              </button>
              <button onClick={() => renderPreview('pptx')} disabled={busy} className="rounded-lg bg-white/10 hover:bg-white/20 text-white/85 px-3 py-1.5 text-xs">
                PPTX
              </button>
            </div>
          </div>
        )}

        {/* Sections */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-5 space-y-4">
          <h2 className="text-sm font-medium text-white/85">Sections ({sections.length})</h2>
          {sections.map((s) => (
            <div key={s.section_id} className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/90">{s.section_order}. {s.title}</p>
                <span className="text-[10px] text-white/50">{s.commentary_source}</span>
              </div>
              {s.commentary_md && (
                <p className="text-xs text-white/70 mt-2 whitespace-pre-wrap">{s.commentary_md}</p>
              )}
            </div>
          ))}
          {sections.length === 0 && (
            <p className="text-xs text-white/55">No sections yet. Use exec-generate-mdna to draft sections.</p>
          )}
        </div>

        {/* Distributions (if issued) */}
        {distributions.length > 0 && (
          <div className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 overflow-hidden">
            <div className="p-3 border-b border-white/[0.08]">
              <p className="text-xs font-medium text-white/85">Distributions ({distributions.length})</p>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-black/20 text-white/60">
                <tr>
                  <th className="text-left font-normal p-3">Member</th>
                  <th className="text-left font-normal p-3">Email</th>
                  <th className="text-left font-normal p-3">Distributed</th>
                  <th className="text-left font-normal p-3">Token (short)</th>
                  <th className="text-left font-normal p-3">Access</th>
                </tr>
              </thead>
              <tbody>
                {distributions.map((d) => (
                  <tr key={d.distribution_id} className="border-t border-white/[0.05]">
                    <td className="p-3 text-white/85">{d.board_members?.display_name ?? d.member_id}</td>
                    <td className="p-3 text-white/70">{d.board_members?.email_distribution ?? '—'}</td>
                    <td className="p-3 text-white/65">{d.distributed_at.slice(0, 19).replace('T', ' ')}</td>
                    <td className="p-3 text-white/55 font-mono text-[10px]">{d.watermark_token.slice(0, 8)}…</td>
                    <td className="p-3 text-white/70">
                      {d.access_revoked_at ? <span className="text-red-300">revoked</span> : <span className="text-emerald-300">active</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
