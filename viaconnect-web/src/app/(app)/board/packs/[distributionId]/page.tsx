'use client';

// Prompt #105 Phase 2b.4 — board member distribution detail + download flow.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download, Shield, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface DistributionDetail {
  distribution_id: string;
  pack_id: string;
  watermark_token: string;
  distributed_at: string;
  access_revoked_at: string | null;
  board_packs?: {
    pack_title: string;
    short_code: string;
    period_type: string;
    period_start: string;
    period_end: string;
    ceo_issued_at: string | null;
    state: string;
  };
}

export default function BoardDistributionDetail() {
  const params = useParams<{ distributionId: string }>();
  const [dist, setDist] = useState<DistributionDetail | null>(null);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!params?.distributionId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = createClient() as unknown as any;
    const { data } = await sb
      .from('board_pack_distributions')
      .select(`
        distribution_id, pack_id, watermark_token, distributed_at, access_revoked_at,
        board_packs!inner(pack_title, short_code, period_type, period_start, period_end, ceo_issued_at, state)
      `)
      .eq('distribution_id', params.distributionId)
      .maybeSingle();
    setDist(data as DistributionDetail | null);
  }, [params]);

  useEffect(() => { load(); }, [load]);

  const download = async (format: 'pdf' | 'xlsx' | 'pptx') => {
    if (!dist) return;
    setBusy(true); setErr(null); setDownloadUrl(null);
    const resp = await fetch(`/api/board/packs/${dist.distribution_id}/download`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ format, acknowledgmentTyped: ack }),
    });
    const j = await resp.json();
    setBusy(false);
    if (!resp.ok) {
      setErr(j.detail ?? j.error ?? 'Download failed');
      return;
    }
    setDownloadUrl(j.signed_url as string);
  };

  if (!dist) {
    return (
      <div className="min-h-screen bg-[#0B1520] text-white p-6">
        <Link href="/board/packs" className="text-xs text-white/60">← My packs</Link>
        <p className="mt-4 text-sm text-white/70">Loading...</p>
      </div>
    );
  }

  const isActive = !dist.access_revoked_at;

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
        <Link href="/board/packs" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> My packs
        </Link>

        <div className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-5 space-y-2">
          <h1 className="text-lg font-semibold">{dist.board_packs?.pack_title}</h1>
          <p className="text-xs text-white/55">{dist.board_packs?.short_code}</p>
          <div className="flex flex-wrap gap-4 text-xs text-white/70 pt-1">
            <span>Period: {dist.board_packs?.period_type} {dist.board_packs?.period_start} → {dist.board_packs?.period_end}</span>
            <span>Issued: {dist.board_packs?.ceo_issued_at ? dist.board_packs.ceo_issued_at.slice(0, 10) : '—'}</span>
            <span>Distributed: {dist.distributed_at.slice(0, 10)}</span>
          </div>
        </div>

        {!isActive && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-red-300 mt-0.5" strokeWidth={1.5} />
            <div className="text-xs text-red-100">
              <p className="font-medium">Access revoked</p>
              <p className="text-red-200/80 mt-0.5">
                Your access to this distribution has been revoked. Contact the exec-reporting admin.
              </p>
            </div>
          </div>
        )}

        {isActive && (
          <div className="rounded-xl border border-white/[0.08] bg-[#1A2744]/40 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Shield className="h-4 w-4 text-emerald-300 mt-0.5" strokeWidth={1.5} />
              <div className="text-xs text-white/80 space-y-1">
                <p className="font-medium">Confidentiality acknowledgment</p>
                <p className="text-white/60">
                  These materials are confidential and intended solely for the named recipient.
                  Every page carries a unique watermark tied to your identity. Downloads are logged.
                  Do not forward, copy, or reproduce.
                </p>
              </div>
            </div>
            <label className="flex items-start gap-2 text-xs text-white/85">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                className="mt-0.5"
              />
              <span>I acknowledge the above and agree to the confidentiality terms.</span>
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => download('pdf')}
                disabled={busy || !ack}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#E8803A]/85 hover:bg-[#E8803A] disabled:opacity-40 text-white px-3 py-1.5 text-xs font-medium"
              >
                <Download className="h-3.5 w-3.5" strokeWidth={1.5} /> Download PDF (watermarked)
              </button>
              <button
                onClick={() => download('xlsx')}
                disabled={busy || !ack}
                className="rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white/85 px-3 py-1.5 text-xs"
              >
                Download XLSX
              </button>
              <button
                onClick={() => download('pptx')}
                disabled={busy || !ack}
                className="rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white/85 px-3 py-1.5 text-xs"
              >
                Download PPTX
              </button>
            </div>

            {downloadUrl && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                <p className="font-medium">Ready.</p>
                <a href={downloadUrl} target="_blank" rel="noopener" className="text-[#E8803A] hover:underline break-all">
                  Open signed URL (valid for 10 minutes)
                </a>
              </div>
            )}

            {err && <p className="text-xs text-red-300">{err}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
