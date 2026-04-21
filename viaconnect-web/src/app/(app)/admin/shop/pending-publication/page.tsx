'use client';

// Prompt #106 §7.3 — gap-fill publication queue.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Check, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface InactiveRow {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  image_url: string | null;
}

function isPlaceholder(url: string | null): boolean {
  return !!url && url.includes('/supplement-photos/placeholders/');
}

export default function PendingPublicationPage() {
  const [rows, setRows] = useState<InactiveRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = createClient() as unknown as any;
    const { data } = await sb.from('product_catalog')
      .select('id, sku, name, category, price, image_url')
      .eq('active', false)
      .in('category', [
        'base-formulations', 'advanced-formulations', 'womens-health',
        'sproutables-childrens', 'snp-support-formulations', 'functional-mushrooms',
      ])
      .order('category')
      .order('sku');
    setRows((data as InactiveRow[] | null) ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const eligibleCount = rows.filter((r) => selected.has(r.sku) && !isPlaceholder(r.image_url)).length;
  const phrase = `PUBLISH ${selected.size} SKUS`;
  const canActivate = selected.size > 0 && eligibleCount === selected.size && confirm === phrase;

  const activate = async () => {
    if (!canActivate) return;
    setBusy(true); setMessage(null);
    const supabase = createClient();
    const { data, error } = await (supabase as unknown as {
      functions: { invoke: (n: string, o: { body: unknown }) => Promise<{ data: unknown; error: { message: string } | null }> }
    }).functions.invoke('shop_sku_activation_handler', {
      body: { skus: Array.from(selected), typedConfirmation: confirm },
    });
    setBusy(false); setConfirm('');
    if (error) { setMessage(`Error: ${error.message}`); return; }
    const d = data as { activated_count?: number; error?: string; violations?: Array<{ sku: string; reason: string }> };
    if (d.error) {
      setMessage(`Preflight failed: ${(d.violations ?? []).map((v) => `${v.sku} (${v.reason})`).join(', ')}`);
      return;
    }
    setMessage(`Activated ${d.activated_count ?? 0} SKUs`);
    setSelected(new Set());
    await load();
  };

  const toggle = (sku: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku); else next.add(sku);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        <Link href="/admin/shop" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Shop refresh
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          Pending publication
        </h1>
        <p className="text-xs text-white/60">
          Gap-fill rows sit as active=FALSE until real bottle renders replace their placeholders.
          Selection requires exact typed-confirmation before activation.
        </p>

        <div className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-black/20 text-white/60">
              <tr>
                <th className="w-8"></th>
                <th className="text-left font-normal p-3">SKU</th>
                <th className="text-left font-normal p-3">Name</th>
                <th className="text-left font-normal p-3">Category</th>
                <th className="text-right font-normal p-3">Price</th>
                <th className="text-left font-normal p-3">Image</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const placeholder = isPlaceholder(r.image_url);
                return (
                  <tr key={r.id} className="border-t border-white/[0.05]">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selected.has(r.sku)}
                        onChange={() => toggle(r.sku)}
                        disabled={placeholder}
                      />
                    </td>
                    <td className="p-3 text-white/85">{r.sku}</td>
                    <td className="p-3 text-white/70">{r.name}</td>
                    <td className="p-3 text-white/60">{r.category}</td>
                    <td className="p-3 text-right text-white/70 tabular-nums">${r.price.toFixed(2)}</td>
                    <td className="p-3">
                      {placeholder ? (
                        <span className="inline-flex items-center gap-1 text-amber-300">
                          <AlertTriangle className="h-3 w-3" strokeWidth={1.5} /> placeholder
                        </span>
                      ) : (
                        <span className="text-emerald-300">bound</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-center text-xs text-white/55">No inactive in-scope rows</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {selected.size > 0 && (
          <div className="rounded-2xl border border-[#E8803A]/30 bg-[#E8803A]/5 p-4 space-y-3">
            <p className="text-xs font-medium text-white/85">
              Publish {selected.size} SKUs — type exactly <code className="bg-black/30 px-1 rounded">{phrase}</code>
            </p>
            {eligibleCount < selected.size && (
              <p className="text-xs text-amber-300">
                {selected.size - eligibleCount} selected row(s) have placeholder image_url and cannot be published.
              </p>
            )}
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={phrase}
              className="w-full rounded-lg bg-black/40 border border-white/[0.1] p-2 text-xs"
            />
            <button
              onClick={activate}
              disabled={!canActivate || busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/40 hover:bg-emerald-500/60 disabled:opacity-40 text-white px-3 py-1.5 text-xs font-medium"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={1.5} /> Activate {selected.size} now
            </button>
          </div>
        )}

        {message && (
          <div className="rounded-lg border border-white/[0.08] bg-[#1A2744]/40 p-3 text-xs text-white/85">{message}</div>
        )}
      </div>
    </div>
  );
}
