'use client';

// Photo Sync prompt §3.7: admin catalog-health page.
//
// Lists every active product whose image_url is NULL, PLACEHOLDER, or
// points at a missing supplement-photos object. Each row shows a deep
// link to the Supabase Storage dashboard for the appropriate bucket
// folder so admin can upload directly. Auto-refreshes every 60 sec
// (Supabase realtime subscription would also fire on inserts/updates
// against products + products_image_audit, but the 60s poll is the
// simple-fallback baseline).

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, RefreshCw, Loader2, AlertCircle, ImageOff, ExternalLink,
} from 'lucide-react';

interface Row {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  image_url: string | null;
  classification: 'NULL' | 'PLACEHOLDER' | 'STALE_SUPABASE';
}

interface Payload {
  rows: Row[];
  bucket_dashboard_url: string;
  counts: { total_active_products: number; missing_or_stale: number };
}

const CLS_TONE: Record<Row['classification'], string> = {
  NULL:            'border-rose-500/40 text-rose-300 bg-rose-500/10',
  PLACEHOLDER:     'border-amber-500/40 text-amber-300 bg-amber-500/10',
  STALE_SUPABASE:  'border-orange-500/40 text-orange-300 bg-orange-500/10',
};

export default function CatalogHealthPage(): JSX.Element {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch('/api/admin/catalog-health');
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/admin" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Admin
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold inline-flex items-center gap-2">
              <ImageOff className="w-6 h-6" strokeWidth={1.5} />
              Catalog health
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Active products whose image is missing, stale, or a placeholder. Refreshes every 60 seconds.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            {data && (
              <a
                href={data.bucket_dashboard_url}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10"
              >
                <ExternalLink className="w-3 h-3" strokeWidth={1.5} /> Open bucket
              </a>
            )}
            <button onClick={load} className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Refresh
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 inline-flex items-center gap-2">
          <AlertCircle className="w-4 h-4" strokeWidth={1.5} /> {error}
        </div>
      )}

      {loading && (
        <div className="text-sm text-gray-400 inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Loading
        </div>
      )}

      {data && (
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Active products</div>
            <div className="text-3xl font-bold">{data.counts.total_active_products.toLocaleString()}</div>
          </section>
          <section className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Missing or stale</div>
            <div className="text-3xl font-bold text-rose-300">{data.counts.missing_or_stale.toLocaleString()}</div>
          </section>
          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs text-gray-400">
            <div className="uppercase tracking-wide mb-1">Workflow</div>
            Click a row category to deep-link to the Supabase Storage folder, upload the image with the matching SKU as filename, then run the photo-sync runbook to update the products table.
          </section>
        </div>
      )}

      {data && data.rows.length === 0 && !loading && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-sm text-emerald-300">
          All active products have valid images.
        </div>
      )}

      {data && data.rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wide text-gray-400">
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-3 py-2">SKU</th>
                <th className="text-left px-3 py-2">Product</th>
                <th className="text-left px-3 py-2">Category</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id} className="border-b border-white/[0.04]">
                  <td className="px-3 py-2 font-mono text-xs">{r.sku}</td>
                  <td className="px-3 py-2 text-white">{r.name}</td>
                  <td className="px-3 py-2 text-gray-400">{r.category ?? '(uncategorized)'}</td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${CLS_TONE[r.classification]}`}>
                      {r.classification}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <a
                      href={data.bucket_dashboard_url + (r.category ? `?folder=${encodeURIComponent(r.category)}` : '')}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs px-2 py-1 rounded border border-copper text-copper hover:bg-copper/10 inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" strokeWidth={1.5} /> Upload
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
