'use client';

// Prompt #106 §5.3 — reconciliation three-pane UI.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ListChecks, PlayCircle, Check, Trash2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Finding {
  finding_id: string;
  finding_type:
    | 'missing_in_catalog'
    | 'catalog_not_in_canonical'
    | 'mismatched_name'
    | 'mismatched_category'
    | 'mismatched_price';
  sku: string;
  canonical_payload_json: Record<string, unknown> | null;
  catalog_payload_json: Record<string, unknown> | null;
  resolution_status: string;
  created_at: string;
}

export default function ReconciliationPage() {
  const [rows, setRows] = useState<Finding[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Retirement modal state
  const [retireTarget, setRetireTarget] = useState<Finding | null>(null);
  const [retireReason, setRetireReason] = useState('');
  const [retireConfirm, setRetireConfirm] = useState('');

  // Bulk image-url confirm
  const [bulkConfirm, setBulkConfirm] = useState('');

  const load = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = createClient() as unknown as any;
    const { data } = await sb
      .from('shop_refresh_reconciliation_findings')
      .select('finding_id, finding_type, sku, canonical_payload_json, catalog_payload_json, resolution_status, created_at')
      .eq('resolution_status', 'pending_review')
      .order('created_at', { ascending: false });
    setRows((data as Finding[] | null) ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const runReconciliation = async () => {
    setBusy(true); setMessage(null);
    const supabase = createClient();
    const { data, error } = await (supabase as unknown as {
      functions: { invoke: (n: string, o: { body: unknown }) => Promise<{ data: unknown; error: { message: string } | null }> }
    }).functions.invoke('shop_reconciliation_run', { body: {} });
    setBusy(false);
    if (error) { setMessage(`Error: ${error.message}`); return; }
    const d = data as { findings_count?: number; run_id?: string };
    setMessage(`Run ${d.run_id?.slice(0, 8)}… created ${d.findings_count ?? 0} findings`);
    await load();
  };

  const insertGapFills = async () => {
    const ids = rows.filter((r) => r.finding_type === 'missing_in_catalog').map((r) => r.finding_id);
    if (ids.length === 0) { setMessage('No missing_in_catalog findings to insert'); return; }
    setBusy(true); setMessage(null);
    const supabase = createClient();
    const { data, error } = await (supabase as unknown as {
      functions: { invoke: (n: string, o: { body: unknown }) => Promise<{ data: unknown; error: { message: string } | null }> }
    }).functions.invoke('shop_catalog_gap_fill_inserter', { body: { findingIds: ids } });
    setBusy(false);
    if (error) { setMessage(`Error: ${error.message}`); return; }
    const d = data as { inserted_count?: number };
    setMessage(`Inserted ${d.inserted_count ?? 0} inactive catalog rows. Upload renders, then publish.`);
    await load();
  };

  const runBulkImageRefresh = async () => {
    if (bulkConfirm !== 'APPROVE IMAGE REFRESH') { setMessage('Typed confirmation does not match'); return; }
    setBusy(true); setMessage(null);
    const supabase = createClient();
    const { data, error } = await (supabase as unknown as {
      functions: { invoke: (n: string, o: { body: unknown }) => Promise<{ data: unknown; error: { message: string } | null }> }
    }).functions.invoke('shop_catalog_image_url_bulk_update', {
      body: { typedConfirmation: bulkConfirm },
    });
    setBusy(false);
    setBulkConfirm('');
    if (error) { setMessage(`Error: ${error.message}`); return; }
    const d = data as { updates_applied?: number; skipped?: unknown[] };
    setMessage(`Updated ${d.updates_applied ?? 0} product_catalog rows; skipped ${d.skipped?.length ?? 0}`);
  };

  const runRetirement = async () => {
    if (!retireTarget) return;
    if (retireConfirm !== 'APPROVE RETIREMENT') { setMessage('Typed confirmation does not match'); return; }
    if (retireReason.trim().length < 20) { setMessage('Reason must be at least 20 characters'); return; }
    setBusy(true); setMessage(null);
    const supabase = createClient();
    const { data, error } = await (supabase as unknown as {
      functions: { invoke: (n: string, o: { body: unknown }) => Promise<{ data: unknown; error: { message: string } | null }> }
    }).functions.invoke('shop_catalog_retirement_executor', {
      body: { findingId: retireTarget.finding_id, typedConfirmation: retireConfirm, reason: retireReason },
    });
    setBusy(false);
    if (error) { setMessage(`Error: ${error.message}`); return; }
    const d = data as { sku?: string; retired?: boolean; already_inactive?: boolean };
    setMessage(`Retired ${d.sku} (${d.retired ? 'flipped' : 'already inactive'})`);
    setRetireTarget(null); setRetireReason(''); setRetireConfirm('');
    await load();
  };

  const missing = rows.filter((r) => r.finding_type === 'missing_in_catalog');
  const stale = rows.filter((r) => r.finding_type === 'catalog_not_in_canonical');
  const mismatch = rows.filter((r) => r.finding_type.startsWith('mismatched_'));

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <Link href="/admin/shop" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Shop refresh
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          Reconciliation
        </h1>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={runReconciliation}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#E8803A]/85 hover:bg-[#E8803A] disabled:opacity-40 text-white px-3 py-1.5 text-xs font-medium"
          >
            <PlayCircle className="h-3.5 w-3.5" strokeWidth={1.5} /> Run reconciliation
          </button>
          <button
            onClick={insertGapFills}
            disabled={busy || missing.length === 0}
            className="rounded-lg bg-blue-500/25 hover:bg-blue-500/40 disabled:opacity-40 text-blue-100 px-3 py-1.5 text-xs font-medium"
          >
            Insert gap-fill rows ({missing.length})
          </button>
        </div>

        {message && (
          <div className="rounded-lg border border-white/[0.08] bg-[#1A2744]/40 p-3 text-xs text-white/85">{message}</div>
        )}

        <div className="grid lg:grid-cols-3 gap-4">
          <Pane title="Missing in catalog" tint="blue" count={missing.length}>
            {missing.map((r) => (
              <div key={r.finding_id} className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                <p className="text-sm text-white/90">{r.sku}</p>
                <p className="text-[10px] text-white/50">{String((r.canonical_payload_json as { name?: string } | null)?.name ?? '')}</p>
                <p className="text-[10px] text-white/55 mt-1">{String((r.canonical_payload_json as { category?: string } | null)?.category ?? '')} · ${String((r.canonical_payload_json as { msrp?: number } | null)?.msrp ?? '')}</p>
              </div>
            ))}
            {missing.length === 0 && <p className="text-xs text-white/55 italic">None pending</p>}
          </Pane>

          <Pane title="Catalog not in canonical" tint="amber" count={stale.length}>
            {stale.map((r) => (
              <div key={r.finding_id} className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-white/90 truncate">{r.sku}</p>
                    <p className="text-[10px] text-white/50 truncate">{String((r.catalog_payload_json as { name?: string } | null)?.name ?? '')}</p>
                    <p className="text-[10px] text-white/55 mt-1">{String((r.catalog_payload_json as { category?: string } | null)?.category ?? '')} · ${String((r.catalog_payload_json as { price?: number } | null)?.price ?? '')}</p>
                  </div>
                  <button
                    onClick={() => { setRetireTarget(r); setRetireReason(''); setRetireConfirm(''); }}
                    className="inline-flex items-center gap-1 rounded-md bg-red-500/25 hover:bg-red-500/40 text-red-100 px-2 py-1 text-[10px] font-medium"
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={1.5} /> Retire
                  </button>
                </div>
              </div>
            ))}
            {stale.length === 0 && <p className="text-xs text-white/55 italic">None pending</p>}
          </Pane>

          <Pane title="Mismatched" tint="violet" count={mismatch.length}>
            {mismatch.map((r) => (
              <div key={r.finding_id} className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                <p className="text-sm text-white/90">{r.sku}</p>
                <p className="text-[10px] text-orange-300">{r.finding_type}</p>
                <p className="text-[10px] text-white/55 mt-1">
                  canonical: {JSON.stringify(r.canonical_payload_json).slice(0, 60)}…
                </p>
                <p className="text-[10px] text-white/55">
                  catalog: {JSON.stringify(r.catalog_payload_json).slice(0, 60)}…
                </p>
              </div>
            ))}
            {mismatch.length === 0 && <p className="text-xs text-white/55 italic">None pending</p>}
          </Pane>
        </div>

        <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 space-y-3">
          <p className="text-sm text-white/90 font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-violet-200" strokeWidth={1.5} />
            Bulk image URL update
          </p>
          <p className="text-xs text-white/70">
            Writes product_catalog.image_url for every primary binding. Requires exact
            typed confirmation. Prior URLs captured to audit log.
          </p>
          <input
            value={bulkConfirm}
            onChange={(e) => setBulkConfirm(e.target.value)}
            placeholder="APPROVE IMAGE REFRESH"
            className="w-full rounded-lg bg-black/40 border border-white/[0.1] p-2 text-xs"
          />
          <button
            onClick={runBulkImageRefresh}
            disabled={busy || bulkConfirm !== 'APPROVE IMAGE REFRESH'}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500/40 hover:bg-violet-500/60 disabled:opacity-40 text-white px-3 py-1.5 text-xs font-medium"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={1.5} /> Run bulk image URL update
          </button>
        </div>

        {retireTarget && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-[#0B1520] border border-white/15 rounded-2xl p-5 max-w-md w-full space-y-3">
              <h2 className="text-sm font-semibold text-white">Retire {retireTarget.sku}</h2>
              <p className="text-xs text-white/65">
                Sets active=FALSE on this product_catalog row. Never deletes. Reason required.
              </p>
              <textarea
                value={retireReason}
                onChange={(e) => setRetireReason(e.target.value)}
                placeholder="Why this SKU is being retired (min 20 chars)"
                rows={3}
                className="w-full rounded-lg bg-black/40 border border-white/[0.1] p-2 text-xs"
              />
              <input
                value={retireConfirm}
                onChange={(e) => setRetireConfirm(e.target.value)}
                placeholder="APPROVE RETIREMENT"
                className="w-full rounded-lg bg-black/40 border border-white/[0.1] p-2 text-xs"
              />
              <div className="flex gap-2">
                <button
                  onClick={runRetirement}
                  disabled={busy || retireConfirm !== 'APPROVE RETIREMENT' || retireReason.trim().length < 20}
                  className="rounded-lg bg-red-500/40 hover:bg-red-500/60 disabled:opacity-40 text-white px-3 py-1.5 text-xs font-medium"
                >
                  Retire
                </button>
                <button onClick={() => setRetireTarget(null)} className="rounded-lg bg-white/10 hover:bg-white/20 text-white/85 px-3 py-1.5 text-xs">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Pane({
  title, tint, count, children,
}: { title: string; tint: 'blue' | 'amber' | 'violet'; count: number; children: React.ReactNode }) {
  const bar: Record<string, string> = {
    blue: 'bg-blue-500/20',
    amber: 'bg-amber-500/20',
    violet: 'bg-violet-500/20',
  };
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 overflow-hidden">
      <div className={`p-3 ${bar[tint]}`}>
        <p className="text-xs font-medium text-white">{title} ({count})</p>
      </div>
      <div className="p-3 space-y-2">{children}</div>
    </div>
  );
}
