'use client';

// Prompt #96 Phase 3: Financial model tool client.
//
// Non-binding what-if calculator. Practitioner adds line items by
// SKU+quantity+retail-price, picks timeline, sees the production cost
// breakdown + projected gross profit + tier breakpoint visualization.
// Pulls eligible SKUs from /api/admin/white-label/catalog (read endpoint
// returns all rows; we filter to is_white_label_eligible=true here).

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Calculator,
  Plus,
  Trash2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { modelProductionRun, type ProductionModel } from '@/lib/white-label/financial-model';
import { MOQ_PER_SKU, MIN_ORDER_VALUE_CENTS } from '@/lib/white-label/schema-types';

interface CatalogRow {
  product_catalog_id: string;
  base_msrp_cents: number;
  is_white_label_eligible: boolean;
  is_active: boolean;
  product_catalog: { id: string; name: string; sku: string } | null;
}

interface LineDraft {
  productCatalogId: string;
  baseMsrpCents: number;
  quantity: number;
  retailPriceCents: number;
}

const TIERS = [
  { id: 'tier_100_499',  label: '100 to 499 units',  percent: 60 },
  { id: 'tier_500_999',  label: '500 to 999 units',  percent: 65 },
  { id: 'tier_1000_plus', label: '1000+ units',      percent: 70 },
];

const fmtUsd = (c: number | null | undefined) =>
  c == null ? 'n/a' : `$${(c / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function FinancialModelClient() {
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [timeline, setTimeline] = useState<'standard' | 'expedited'>('standard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch('/api/admin/white-label/catalog');
        const json = await r.json();
        if (!r.ok) {
          // Practitioners do not have admin access to this endpoint;
          // a 403 here is expected. Show a friendlier message.
          if (r.status === 403) {
            setError('Catalog read needs ViaCura admin access. Contact your account manager.');
            return;
          }
          throw new Error(json.error ?? `HTTP ${r.status}`);
        }
        const rows = (json.rows ?? []) as CatalogRow[];
        setCatalog(rows.filter((r) => r.is_white_label_eligible && r.is_active));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function addLine() {
    if (catalog.length === 0) return;
    const first = catalog[0];
    setLines((ls) => [
      ...ls,
      {
        productCatalogId: first.product_catalog_id,
        baseMsrpCents: first.base_msrp_cents,
        quantity: MOQ_PER_SKU,
        retailPriceCents: Math.round(first.base_msrp_cents * 1.5),
      },
    ]);
  }
  function removeLine(i: number) {
    setLines((ls) => ls.filter((_, idx) => idx !== i));
  }
  function updateLine(i: number, patch: Partial<LineDraft>) {
    setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  }

  const result: { ok: true; model: ProductionModel } | { ok: false; error: string } | null = useMemo(() => {
    if (lines.length === 0) return null;
    try {
      const model = modelProductionRun({
        items: lines.map((l, i) => ({
          labelDesignId: `model_${i}`,
          productCatalogId: l.productCatalogId,
          quantity: l.quantity,
          baseMsrpCents: l.baseMsrpCents,
          projectedRetailPriceCents: l.retailPriceCents,
        })),
        timeline,
      });
      return { ok: true, model };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }, [lines, timeline]);

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/practitioner/white-label/enroll" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> White-label
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold mt-2 inline-flex items-center gap-2">
          <Calculator className="w-6 h-6 text-copper" strokeWidth={1.5} /> Financial model
        </h1>
        <p className="text-sm text-gray-400 mt-1 max-w-2xl">
          Non-binding what-if. Add SKUs and quantities, set your projected retail prices, see your production cost, deposit, and projected gross profit.
        </p>
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

      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: line items */}
          <section className="lg:col-span-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-wider text-gray-400">Production lines</p>
                <button
                  onClick={addLine}
                  disabled={catalog.length === 0}
                  className="text-xs px-2 py-1 rounded border border-white/10 hover:bg-white/[0.06] inline-flex items-center gap-1 disabled:opacity-40"
                >
                  <Plus className="w-3 h-3" strokeWidth={1.5} /> Add line
                </button>
              </div>

              <div className="space-y-2">
                {lines.length === 0 && (
                  <p className="text-xs text-gray-500 italic">No lines yet. Click Add line to start modeling.</p>
                )}
                {lines.map((line, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center text-sm">
                    <select
                      value={line.productCatalogId}
                      onChange={(e) => {
                        const pid = e.target.value;
                        const row = catalog.find((r) => r.product_catalog_id === pid);
                        updateLine(i, {
                          productCatalogId: pid,
                          baseMsrpCents: row?.base_msrp_cents ?? line.baseMsrpCents,
                        });
                      }}
                      className="col-span-5 bg-white/[0.06] border border-white/10 rounded px-2 py-1"
                    >
                      {catalog.map((r) => (
                        <option key={r.product_catalog_id} value={r.product_catalog_id}>
                          {r.product_catalog?.name ?? r.product_catalog_id} ({fmtUsd(r.base_msrp_cents)})
                        </option>
                      ))}
                    </select>
                    <label className="col-span-3 text-xs text-gray-400">
                      Qty
                      <input type="number" min={MOQ_PER_SKU} value={line.quantity}
                        onChange={(e) => updateLine(i, { quantity: Math.max(0, Number(e.target.value) || 0) })}
                        className="w-full bg-white/[0.06] border border-white/10 rounded px-2 py-1 text-white text-sm mt-0.5" />
                    </label>
                    <label className="col-span-3 text-xs text-gray-400">
                      Retail $
                      <input type="number" min={0}
                        value={(line.retailPriceCents / 100).toFixed(2)}
                        onChange={(e) => updateLine(i, { retailPriceCents: Math.max(0, Math.round(Number(e.target.value) * 100)) })}
                        className="w-full bg-white/[0.06] border border-white/10 rounded px-2 py-1 text-white text-sm mt-0.5" />
                    </label>
                    <button
                      onClick={() => removeLine(i)}
                      className="col-span-1 text-rose-300 hover:text-rose-200"
                      title="Remove line"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Timeline</p>
              <div className="flex gap-2">
                {(['standard', 'expedited'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeline(t)}
                    className={`text-xs px-3 py-1.5 rounded border ${
                      timeline === t ? 'border-copper text-copper bg-copper/10' : 'border-white/10 text-gray-300 hover:text-white'
                    }`}
                  >
                    {t === 'standard' ? 'Standard (8 weeks)' : 'Expedited (6 weeks, +15%)'}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Right: results */}
          <section>
            {result?.ok === false && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                {result.error}
              </div>
            )}
            {result?.ok === true && (
              <ResultPanel model={result.model} />
            )}
            {result === null && (
              <p className="text-xs text-gray-500 italic">Add at least one line to see the projection.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function ResultPanel({ model }: { model: ProductionModel }) {
  return (
    <div className="space-y-3">
      <Tier active={model.applied_discount_tier} totalUnits={model.total_units} />

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Production cost</p>
        <Row label="Subtotal"            value={fmtUsd(model.subtotal_cents)} />
        {model.expedited_surcharge_cents > 0 && (
          <Row label="Expedited surcharge" value={fmtUsd(model.expedited_surcharge_cents)} />
        )}
        <Row label="Total"               value={fmtUsd(model.total_cents)} bold />
        <Row label="50% deposit"         value={fmtUsd(model.deposit_cents)} />
        <Row label="50% on shipment"     value={fmtUsd(model.final_payment_cents)} />
      </div>

      {model.projected_total_revenue_cents != null && (
        <div className="rounded-xl border border-portal-green/30 bg-portal-green/10 p-4">
          <p className="text-xs uppercase tracking-wider text-portal-green mb-2 inline-flex items-center gap-1">
            <TrendingUp className="w-3 h-3" strokeWidth={1.5} /> Projected at retail
          </p>
          <Row label="Total revenue"  value={fmtUsd(model.projected_total_revenue_cents)} />
          <Row label="Gross profit"   value={fmtUsd(model.projected_total_margin_cents)} bold />
        </div>
      )}

      {!model.meets_minimum_order_value && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
          Total ({fmtUsd(model.total_cents)}) is below the minimum order value of {fmtUsd(MIN_ORDER_VALUE_CENTS)}. Add SKUs or increase quantities.
        </div>
      )}
    </div>
  );
}

function Tier({ active, totalUnits }: { active: string; totalUnits: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">
        Tier ; {totalUnits.toLocaleString()} units
      </p>
      <div className="space-y-1">
        {TIERS.map((t) => (
          <div
            key={t.id}
            className={`flex items-center justify-between px-2 py-1.5 rounded text-xs ${
              t.id === active ? 'bg-copper/20 text-copper border border-copper/40' : 'text-gray-400'
            }`}
          >
            <span>{t.label}</span>
            <span>{t.percent}% off MSRP</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-gray-400">{label}</span>
      <span className={bold ? 'font-semibold' : ''}>{value}</span>
    </div>
  );
}
