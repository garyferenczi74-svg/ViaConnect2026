'use client';

// Prompt #96 Phase 5: Practitioner order-builder client.
//
// Lists practitioner's approved labels; lets them set a quantity per
// label, picks the timeline, posts to /orders. The pure quote
// calculator is run client-side for the live preview; the server
// re-runs it for the binding number.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { calculateProductionQuote } from '@/lib/white-label/production-quote';
import { MOQ_PER_SKU, MIN_ORDER_VALUE_CENTS } from '@/lib/white-label/schema-types';

interface ApprovedLabel {
  id: string;
  display_product_name: string;
  product_catalog_id: string;
  status: string;
  is_current_version: boolean;
  product_catalog: { id: string; name: string; sku: string } | null;
}

interface QuotePreview {
  base_msrp_cents: number;
}

const fmtUsd = (c: number) => `$${(c / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function OrderBuilderClient() {
  const router = useRouter();
  const [labels, setLabels] = useState<ApprovedLabel[]>([]);
  const [catalog, setCatalog] = useState<Map<string, number>>(new Map()); // product_catalog_id -> base_msrp_cents
  const [lines, setLines] = useState<Array<{ label_design_id: string; quantity: number }>>([]);
  const [timeline, setTimeline] = useState<'standard' | 'expedited'>('standard');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [r1, r2] = await Promise.all([
          fetch('/api/practitioner/white-label/labels'),
          fetch('/api/admin/white-label/catalog'),
        ]);
        const j1 = await r1.json();
        if (!r1.ok) throw new Error(j1.error ?? `Labels ${r1.status}`);
        const allLabels = (j1.designs ?? []) as ApprovedLabel[];
        setLabels(allLabels.filter((l) => ['approved', 'production_ready'].includes(l.status)));
        if (r2.ok) {
          const j2 = await r2.json();
          const map = new Map<string, number>();
          for (const row of (j2.rows ?? []) as Array<{ product_catalog_id: string; base_msrp_cents: number }>) {
            map.set(row.product_catalog_id, row.base_msrp_cents);
          }
          setCatalog(map);
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function addLine() {
    if (labels.length === 0) return;
    setLines((ls) => [...ls, { label_design_id: labels[0].id, quantity: MOQ_PER_SKU }]);
  }
  function removeLine(i: number) {
    setLines((ls) => ls.filter((_, idx) => idx !== i));
  }
  function updateLine(i: number, patch: Partial<{ label_design_id: string; quantity: number }>) {
    setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  }

  const preview = useMemo(() => {
    if (lines.length === 0) return null;
    try {
      const items = lines.map((l) => {
        const lbl = labels.find((x) => x.id === l.label_design_id);
        const msrp = lbl ? (catalog.get(lbl.product_catalog_id) ?? 0) : 0;
        return {
          label_design_id: l.label_design_id,
          product_catalog_id: lbl?.product_catalog_id ?? '',
          quantity: l.quantity,
          base_msrp_cents: msrp,
        };
      });
      return calculateProductionQuote({ items, timeline });
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [lines, timeline, labels, catalog]);

  async function submit() {
    if (lines.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch('/api/practitioner/white-label/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: lines, timeline }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      router.push(`/practitioner/white-label/orders/${json.order.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1A30] text-white p-8">
        <div className="text-sm text-gray-400 inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Loading
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/practitioner/white-label/enroll" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> White-label
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold mt-2">New production order</h1>
        <p className="text-sm text-gray-400 mt-1">
          {labels.length} approved labels available. Minimum order value {fmtUsd(MIN_ORDER_VALUE_CENTS)}.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 inline-flex items-center gap-2">
          <AlertCircle className="w-4 h-4" strokeWidth={1.5} /> {error}
        </div>
      )}

      {labels.length === 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
          You have no approved labels yet. Submit at least one label for compliance review and have it approved before building a production order.
        </div>
      )}

      {labels.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <section className="lg:col-span-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-wider text-gray-400">Production lines</p>
                <button onClick={addLine} className="text-xs px-2 py-1 rounded border border-white/10 hover:bg-white/[0.06] inline-flex items-center gap-1">
                  <Plus className="w-3 h-3" strokeWidth={1.5} /> Add line
                </button>
              </div>
              {lines.length === 0 && <p className="text-xs text-gray-500 italic">No lines; click Add line.</p>}
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center text-sm mb-2">
                  <select
                    value={line.label_design_id}
                    onChange={(e) => updateLine(i, { label_design_id: e.target.value })}
                    className="col-span-8 bg-white/[0.06] border border-white/10 rounded px-2 py-1"
                  >
                    {labels.map((l) => (
                      <option key={l.id} value={l.id}>{l.display_product_name} ({l.product_catalog?.sku})</option>
                    ))}
                  </select>
                  <input type="number" min={MOQ_PER_SKU} value={line.quantity}
                    onChange={(e) => updateLine(i, { quantity: Math.max(0, Number(e.target.value) || 0) })}
                    className="col-span-3 bg-white/[0.06] border border-white/10 rounded px-2 py-1 text-sm" />
                  <button onClick={() => removeLine(i)} className="col-span-1 text-rose-300 hover:text-rose-200" title="Remove">
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Timeline</p>
              <div className="flex gap-2">
                {(['standard', 'expedited'] as const).map((t) => (
                  <button key={t} onClick={() => setTimeline(t)}
                    className={`text-xs px-3 py-1.5 rounded border ${
                      timeline === t ? 'border-copper text-copper bg-copper/10' : 'border-white/10 text-gray-300 hover:text-white'
                    }`}>
                    {t === 'standard' ? 'Standard (8 weeks)' : 'Expedited (6 weeks, +15%)'}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section>
            {preview && 'error' in preview ? (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{preview.error}</div>
            ) : preview ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
                <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Quote preview</p>
                <Row label="Total units" value={preview.total_units.toLocaleString()} />
                <Row label={`Tier (${preview.applied_discount_percent}% off)`} value={preview.applied_discount_tier.replace(/_/g, ' ')} />
                <Row label="Subtotal" value={fmtUsd(preview.subtotal_cents)} />
                {preview.expedited_surcharge_cents > 0 && <Row label="Expedited surcharge" value={fmtUsd(preview.expedited_surcharge_cents)} />}
                <Row label="Total" value={fmtUsd(preview.total_cents)} bold />
                <Row label="50% deposit" value={fmtUsd(preview.deposit_cents)} />
                <Row label="50% on shipment" value={fmtUsd(preview.final_payment_cents)} />
                {!preview.meets_minimum_order_value && (
                  <p className="text-xs text-amber-300 mt-2">Below minimum order value of {fmtUsd(preview.minimum_order_value_cents)}.</p>
                )}
                <button
                  onClick={submit}
                  disabled={submitting || !preview.meets_minimum_order_value}
                  className="w-full mt-3 px-4 py-2 rounded bg-copper hover:bg-amber-600 text-white text-sm inline-flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />}
                  Submit quote
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">Add at least one line to see the quote.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm py-0.5">
      <span className="text-gray-400">{label}</span>
      <span className={bold ? 'font-semibold' : ''}>{value}</span>
    </div>
  );
}
