'use client';

// Prompt #96 Phase 5: Admin production tracking for one order.
//
// Shows the current status with a milestone bar, the line items + QC
// fields, and buttons to advance to each valid next status. Lot
// numbers + expiration + QC pass entered inline before flipping to
// quality_control.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Truck,
  Factory,
  ClipboardCheck,
  CircleDollarSign,
  Package,
  Clock,
  Ban,
} from 'lucide-react';
import { ALLOWED_TRANSITIONS, type ProductionStatus } from '@/lib/white-label/production-state-machine';
import { PRODUCTION_ORDER_STATUSES } from '@/lib/white-label/schema-types';

interface OrderDetail {
  id: string;
  order_number: string;
  status: ProductionStatus;
  production_timeline: 'standard' | 'expedited';
  total_units: number;
  total_cents: number;
  applied_discount_tier: string;
  applied_discount_percent: number;
  deposit_amount_cents: number;
  final_payment_amount_cents: number;
  deposit_paid_at: string | null;
  final_payment_paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  carrier: string | null;
  tracking_number: string | null;
}

interface LineItem {
  id: string;
  label_design_id: string;
  product_catalog_id: string;
  quantity: number;
  unit_cost_cents: number;
  line_subtotal_cents: number;
  lot_number: string | null;
  expiration_date: string | null;
  qc_passed: boolean | null;
  product_catalog: { name: string; sku: string } | null;
  white_label_label_designs: { display_product_name: string; version_number: number } | null;
}

const STATUS_ICON: Partial<Record<ProductionStatus, typeof Truck>> = {
  quote: Clock,
  labels_pending_review: ClipboardCheck,
  labels_approved_pending_deposit: CircleDollarSign,
  deposit_paid: CircleDollarSign,
  in_production: Factory,
  quality_control: ClipboardCheck,
  final_payment_pending: CircleDollarSign,
  shipped: Truck,
  delivered: Package,
  canceled: Ban,
};

const fmtUsd = (c: number) => `$${(c / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function ProductionAdminPage({ params }: { params: { orderId: string } }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState<ProductionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lotEdits, setLotEdits] = useState<Record<string, { lot_number: string; expiration_date: string; qc_passed: boolean; qc_notes: string }>>({});
  const [tracking, setTracking] = useState({ carrier: '', tracking_number: '' });

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/white-label/production/${params.orderId}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setOrder(json.order);
      setItems(json.items ?? []);
      // Pre-fill lot edit drafts from existing values.
      const drafts: Record<string, any> = {};
      for (const it of (json.items ?? []) as LineItem[]) {
        drafts[it.id] = {
          lot_number: it.lot_number ?? '',
          expiration_date: it.expiration_date ?? '',
          qc_passed: it.qc_passed ?? false,
          qc_notes: '',
        };
      }
      setLotEdits(drafts);
      if (json.order?.carrier) setTracking({ carrier: json.order.carrier, tracking_number: json.order.tracking_number ?? '' });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, [params.orderId]);

  async function transition(to: ProductionStatus) {
    if (!order) return;
    setTransitioning(to);
    setError(null);
    try {
      const body: Record<string, unknown> = { to };
      if (to === 'quality_control') {
        body.lot_updates = items.map((it) => ({
          item_id: it.id,
          lot_number: lotEdits[it.id]?.lot_number ?? '',
          expiration_date: lotEdits[it.id]?.expiration_date ?? '',
          qc_passed: lotEdits[it.id]?.qc_passed ?? false,
          qc_notes: lotEdits[it.id]?.qc_notes,
        })).filter((u) => u.lot_number && u.expiration_date);
      }
      if (to === 'shipped') {
        if (!tracking.carrier || !tracking.tracking_number) {
          throw new Error('Carrier + tracking number required to mark as shipped.');
        }
        body.tracking = tracking;
      }
      const r = await fetch(`/api/admin/white-label/production/${params.orderId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTransitioning(null);
    }
  }

  const validNext = useMemo(() => order ? ALLOWED_TRANSITIONS[order.status] : [], [order]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1A30] text-white p-8">
        <div className="text-sm text-gray-400 inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Loading
        </div>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="min-h-screen bg-[#0E1A30] text-white p-8 text-sm text-rose-300">
        {error ?? 'Order not found.'}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/admin/white-label" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> White-label
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <div>
            <p className="text-xs text-gray-400">Order ; {order.production_timeline} timeline</p>
            <h1 className="text-2xl md:text-3xl font-bold mt-1 font-mono">{order.order_number}</h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill status={order.status} />
            <button onClick={reload} className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10">
              <RefreshCw className="w-3 h-3" strokeWidth={1.5} /> Refresh
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 inline-flex items-center gap-2">
          <AlertCircle className="w-4 h-4" strokeWidth={1.5} /> {error}
        </div>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Total" value={fmtUsd(order.total_cents)} />
        <Stat label="Deposit" value={`${fmtUsd(order.deposit_amount_cents)}${order.deposit_paid_at ? ' paid' : ''}`} />
        <Stat label="Final" value={`${fmtUsd(order.final_payment_amount_cents)}${order.final_payment_paid_at ? ' paid' : ''}`} />
        <Stat label="Units / tier" value={`${order.total_units} ; ${order.applied_discount_percent}% off`} />
      </section>

      <section className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Line items</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-400">
              <tr>
                <th className="text-left px-2 py-1">Product</th>
                <th className="text-right px-2 py-1">Qty</th>
                <th className="text-right px-2 py-1">Unit cost</th>
                <th className="text-left px-2 py-1">Lot #</th>
                <th className="text-left px-2 py-1">Expires</th>
                <th className="text-center px-2 py-1">QC</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-white/5">
                  <td className="px-2 py-1.5">
                    <p className="font-medium">{it.white_label_label_designs?.display_product_name ?? it.product_catalog?.name}</p>
                    <p className="text-xs text-gray-500">{it.product_catalog?.sku} ; v{it.white_label_label_designs?.version_number}</p>
                  </td>
                  <td className="px-2 py-1.5 text-right">{it.quantity.toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-right">{fmtUsd(it.unit_cost_cents)}</td>
                  <td className="px-2 py-1.5">
                    <input value={lotEdits[it.id]?.lot_number ?? ''}
                      onChange={(e) => setLotEdits((s) => ({ ...s, [it.id]: { ...s[it.id], lot_number: e.target.value } }))}
                      className="bg-white/[0.06] border border-white/10 rounded px-2 py-1 text-xs w-32" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="date" value={lotEdits[it.id]?.expiration_date ?? ''}
                      onChange={(e) => setLotEdits((s) => ({ ...s, [it.id]: { ...s[it.id], expiration_date: e.target.value } }))}
                      className="bg-white/[0.06] border border-white/10 rounded px-2 py-1 text-xs" />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input type="checkbox" checked={lotEdits[it.id]?.qc_passed ?? false}
                      onChange={(e) => setLotEdits((s) => ({ ...s, [it.id]: { ...s[it.id], qc_passed: e.target.checked } }))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Shipping (required for shipped transition)</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input value={tracking.carrier} onChange={(e) => setTracking((s) => ({ ...s, carrier: e.target.value }))}
            placeholder="Carrier (UPS, FedEx, ...)"
            className="bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm" />
          <input value={tracking.tracking_number} onChange={(e) => setTracking((s) => ({ ...s, tracking_number: e.target.value }))}
            placeholder="Tracking number"
            className="bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm" />
        </div>
      </section>

      <section>
        <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Advance milestone</p>
        <div className="flex flex-wrap gap-2">
          {validNext.length === 0 && (
            <p className="text-sm text-gray-500 italic">{order.status} is terminal.</p>
          )}
          {validNext.map((to) => (
            <button
              key={to}
              disabled={!!transitioning}
              onClick={() => transition(to)}
              className="text-sm px-3 py-2 rounded border border-copper/40 text-copper hover:bg-copper/10 inline-flex items-center gap-1 disabled:opacity-40"
            >
              {transitioning === to ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />}
              Mark {to.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: ProductionStatus }) {
  const Icon = STATUS_ICON[status] ?? Clock;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-copper/40 bg-copper/10 text-copper">
      <Icon className="w-3 h-3" strokeWidth={1.5} /> {status.replace(/_/g, ' ')}
    </span>
  );
}
