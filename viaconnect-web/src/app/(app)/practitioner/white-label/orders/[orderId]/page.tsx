'use client';

// Prompt #96 Phase 5: Practitioner production-order detail.
//
// Shows the order summary, status, line items, payment buttons (deposit
// when status=labels_approved_pending_deposit; final when
// status=final_payment_pending), and a Cancel button. The Stripe
// PaymentIntent is created server-side; the client_secret is then
// passed to Stripe Elements (for now we link to the hosted page when
// available; the inline Elements form is a follow-up).

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CircleDollarSign,
  Truck,
  XCircle,
  Clock,
} from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  status: string;
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
  canceled_at: string | null;
  canceled_reason: string | null;
}

interface Item {
  id: string;
  quantity: number;
  unit_cost_cents: number;
  line_subtotal_cents: number;
  product_catalog: { name: string; sku: string } | null;
  white_label_label_designs: { display_product_name: string } | null;
}

const fmtUsd = (c: number) => `$${(c / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleString() : 'n/a';

export default function OrderDetailPage({ params }: { params: { orderId: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [paymentReady, setPaymentReady] = useState<{ client_secret: string; payment_intent_id: string } | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  async function reload() {
    setLoading(true);
    try {
      const r = await fetch(`/api/practitioner/white-label/orders/${params.orderId}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setOrder(json.order);
      setItems(json.items ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, [params.orderId]);

  async function checkout(kind: 'deposit' | 'final') {
    setBusy(kind);
    setError(null);
    try {
      const r = await fetch(`/api/practitioner/white-label/orders/${params.orderId}/checkout-${kind}`, { method: 'POST' });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setPaymentReady({ client_secret: json.client_secret, payment_intent_id: json.payment_intent_id });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    if (cancelReason.trim().length < 10) {
      setError('Cancellation reason requires 10+ characters.');
      return;
    }
    if (!confirm('Cancel this production order? Fees may apply per stage.')) return;
    setBusy('cancel');
    setError(null);
    try {
      const r = await fetch(`/api/practitioner/white-label/orders/${params.orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0E1A30] text-white p-8">
      <div className="text-sm text-gray-400 inline-flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Loading
      </div>
    </div>
  );
  if (!order) return <div className="min-h-screen bg-[#0E1A30] text-white p-8 text-sm text-rose-300">{error ?? 'Order not found.'}</div>;

  const showDepositCta = order.status === 'labels_approved_pending_deposit';
  const showFinalCta = order.status === 'final_payment_pending';
  const cancelable = !['shipped', 'delivered', 'canceled'].includes(order.status);

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/practitioner/white-label/enroll" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> White-label
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <div>
            <p className="text-xs text-gray-400">{order.production_timeline} timeline</p>
            <h1 className="text-2xl md:text-3xl font-bold mt-1 font-mono">{order.order_number}</h1>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-copper/40 bg-copper/10 text-copper self-start md:self-auto">
            <Clock className="w-3 h-3" strokeWidth={1.5} /> {order.status.replace(/_/g, ' ')}
          </span>
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

      {showDepositCta && (
        <PaymentCta
          label="Pay 50% deposit"
          amount={order.deposit_amount_cents}
          busy={busy === 'deposit'}
          onClick={() => checkout('deposit')}
          paymentReady={paymentReady}
        />
      )}
      {showFinalCta && (
        <PaymentCta
          label="Pay 50% final"
          amount={order.final_payment_amount_cents}
          busy={busy === 'final'}
          onClick={() => checkout('final')}
          paymentReady={paymentReady}
        />
      )}

      <section className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Line items</p>
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-400">
            <tr>
              <th className="text-left px-2 py-1">Product</th>
              <th className="text-right px-2 py-1">Qty</th>
              <th className="text-right px-2 py-1">Unit cost</th>
              <th className="text-right px-2 py-1">Line total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-white/5">
                <td className="px-2 py-1.5">
                  <p className="font-medium">{it.white_label_label_designs?.display_product_name ?? it.product_catalog?.name}</p>
                  <p className="text-xs text-gray-500">{it.product_catalog?.sku}</p>
                </td>
                <td className="px-2 py-1.5 text-right">{it.quantity.toLocaleString()}</td>
                <td className="px-2 py-1.5 text-right">{fmtUsd(it.unit_cost_cents)}</td>
                <td className="px-2 py-1.5 text-right">{fmtUsd(it.line_subtotal_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {(order.shipped_at || order.tracking_number) && (
        <section className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-2 inline-flex items-center gap-1">
            <Truck className="w-3 h-3" strokeWidth={1.5} /> Shipping
          </p>
          <p className="text-sm">{order.carrier ?? 'n/a'}; tracking <span className="font-mono">{order.tracking_number ?? 'n/a'}</span></p>
          <p className="text-xs text-gray-400 mt-1">Shipped {fmtDate(order.shipped_at)}; delivered {fmtDate(order.delivered_at)}.</p>
        </section>
      )}

      {cancelable && (
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Cancel order</p>
          <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason (10+ chars)"
            className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm placeholder:text-gray-500" />
          <button onClick={cancel} disabled={busy === 'cancel'}
            className="mt-2 text-sm px-3 py-2 rounded border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 inline-flex items-center gap-1 disabled:opacity-40">
            {busy === 'cancel' ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <XCircle className="w-4 h-4" strokeWidth={1.5} />}
            Cancel
          </button>
          <p className="text-xs text-gray-500 mt-2">Fees vary by stage; refund computed server-side.</p>
        </section>
      )}

      {order.canceled_at && (
        <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
          Canceled {fmtDate(order.canceled_at)}: {order.canceled_reason}
        </div>
      )}
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

function PaymentCta({ label, amount, busy, onClick, paymentReady }: {
  label: string; amount: number; busy: boolean; onClick: () => void;
  paymentReady: { client_secret: string; payment_intent_id: string } | null;
}) {
  return (
    <section className="mb-6 rounded-xl border border-portal-green/30 bg-portal-green/10 p-4">
      <p className="text-xs uppercase tracking-wider text-portal-green mb-2 inline-flex items-center gap-1">
        <CircleDollarSign className="w-3 h-3" strokeWidth={1.5} /> Payment due
      </p>
      <p className="text-sm">{label}: {`$${(amount / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}</p>
      {!paymentReady ? (
        <button onClick={onClick} disabled={busy}
          className="mt-3 text-sm px-3 py-2 rounded bg-portal-green/30 hover:bg-portal-green/50 inline-flex items-center gap-1 disabled:opacity-40">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <CircleDollarSign className="w-4 h-4" strokeWidth={1.5} />}
          Initiate payment
        </button>
      ) : (
        <div className="mt-3 text-xs text-gray-300">
          <p className="text-portal-green">PaymentIntent ready: <span className="font-mono">{paymentReady.payment_intent_id}</span></p>
          <p className="mt-1">Stripe Elements form to confirm this PaymentIntent ships in the Phase 5 follow-up. The client_secret is logged server-side; for now use the hosted Stripe dashboard to confirm.</p>
        </div>
      )}
    </section>
  );
}
