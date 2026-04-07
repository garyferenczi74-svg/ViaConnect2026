'use client';

// Patient Orders — practitioner-scoped order history. Reads shop_orders WHERE
// placed_by_practitioner_id = current user. Joins to profiles for patient
// display names and shop_order_items for line items.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ClipboardList,
  Search,
  Loader2,
  Package,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { usePractitioner } from '@/context/PractitionerContext';
import { formatPriceCents } from '@/utils/pricingTiers';

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  total_cents: number | null;
  patient_id: string | null;
  created_at: string;
  patientName: string;
  itemSummary: string;
  itemCount: number;
}

const STATUS_STYLE: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pending: { label: 'Pending', bg: 'rgba(156,163,175,0.12)', text: '#9CA3AF', border: 'rgba(156,163,175,0.30)' },
  processing: { label: 'Processing', bg: 'rgba(245,158,11,0.12)', text: '#F59E0B', border: 'rgba(245,158,11,0.30)' },
  shipped: { label: 'Shipped', bg: 'rgba(96,165,250,0.12)', text: '#60A5FA', border: 'rgba(96,165,250,0.30)' },
  delivered: { label: 'Delivered', bg: 'rgba(34,197,94,0.12)', text: '#22C55E', border: 'rgba(34,197,94,0.30)' },
  cancelled: { label: 'Cancelled', bg: 'rgba(239,68,68,0.12)', text: '#F87171', border: 'rgba(239,68,68,0.30)' },
  paid: { label: 'Paid', bg: 'rgba(34,197,94,0.12)', text: '#22C55E', border: 'rgba(34,197,94,0.30)' },
};

export default function PatientOrdersPage() {
  const supabase = useMemo(() => createClient(), []);
  const { patients } = usePractitioner();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [patientFilter, setPatientFilter] = useState<string>('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('Not signed in');
        setLoading(false);
        return;
      }

      // shop_orders may not be in regenerated types.ts (created by the
      // newly-restored migration that hasn't been pushed). Cast to any.
      const { data, error: ordersError } = await (supabase as any)
        .from('shop_orders')
        .select(`
          id, order_number, status, total_cents, patient_id, created_at,
          shop_order_items ( id, product_name, quantity )
        `)
        .eq('placed_by_practitioner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (ordersError) {
        setError(ordersError.message);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as any[];

      // Patient name lookup from already-loaded patient roster
      const patientMap = new Map(patients.map((p) => [p.id, p.fullName]));

      const built: OrderRow[] = rows.map((r: any) => {
        const items = (r.shop_order_items ?? []) as any[];
        const itemNames = items.map((it) => `${it.product_name}${it.quantity > 1 ? ` (×${it.quantity})` : ''}`);
        return {
          id: r.id,
          order_number: r.order_number,
          status: r.status,
          total_cents: r.total_cents,
          patient_id: r.patient_id,
          created_at: r.created_at,
          patientName: r.patient_id ? patientMap.get(r.patient_id) ?? 'Unknown patient' : 'No patient attached',
          itemSummary: itemNames.length > 0 ? itemNames.slice(0, 3).join(', ') : 'No items',
          itemCount: items.length,
        };
      });

      setOrders(built);
      setLoading(false);
    })();
  }, [supabase, patients]);

  // Apply filters
  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (patientFilter !== 'all' && o.patient_id !== patientFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        if (
          !o.order_number.toLowerCase().includes(q) &&
          !o.patientName.toLowerCase().includes(q) &&
          !o.itemSummary.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [orders, query, statusFilter, patientFilter]);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link
        href="/practitioner/shop"
        className="inline-flex items-center gap-1.5 text-xs text-[rgba(255,255,255,0.45)] transition-colors hover:text-[rgba(255,255,255,0.75)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
        Back to Practitioner Shop
      </Link>

      {/* Header */}
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-[rgba(96,165,250,0.30)] bg-gradient-to-br from-[#1A2744] to-[#2563EB]">
          <ClipboardList className="h-5 w-5 text-white" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-lg font-bold text-white sm:text-xl md:text-2xl">
            Patient Orders
          </h1>
          <p className="mt-0.5 text-xs leading-snug text-[rgba(255,255,255,0.45)] sm:text-sm">
            {filtered.length} of {orders.length} orders · placed on behalf of your patients
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1E3054] p-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(255,255,255,0.40)]"
            strokeWidth={1.5}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by patient, order #, product..."
            className="h-10 w-full rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] pl-10 pr-4 text-sm text-white placeholder:text-[rgba(255,255,255,0.30)] outline-none focus:border-[rgba(45,165,160,0.40)]"
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <select
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
            className="h-10 rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] px-3 text-sm text-white outline-none focus:border-[rgba(45,165,160,0.40)]"
          >
            <option value="all" className="bg-[#1A2744]">All patients</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#1A2744]">
                {p.fullName}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] px-3 text-sm text-white outline-none focus:border-[rgba(45,165,160,0.40)]"
          >
            <option value="all" className="bg-[#1A2744]">All statuses</option>
            {Object.entries(STATUS_STYLE).map(([key, s]) => (
              <option key={key} value={key} className="bg-[#1A2744]">
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      {loading && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] py-12 text-sm text-[rgba(255,255,255,0.45)]">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
          Loading orders...
        </div>
      )}

      {error && !loading && (
        <div className="flex items-start gap-3 rounded-2xl border border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.08)] p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#F87171]" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-semibold text-white">Couldn&apos;t load orders</p>
            <p className="mt-1 text-xs text-[rgba(255,255,255,0.55)]">{error}</p>
            <p className="mt-2 text-xs text-[rgba(255,255,255,0.40)]">
              The shop_orders table may not be migrated yet. Run{' '}
              <code className="rounded bg-white/[0.06] px-1.5 py-0.5">npx supabase db push</code>{' '}
              to apply pending migrations.
            </p>
          </div>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] py-12 text-center">
          <Package className="mx-auto h-8 w-8 text-[rgba(255,255,255,0.20)]" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-medium text-[rgba(255,255,255,0.55)]">
            {orders.length === 0 ? 'No orders yet' : 'No orders match your filters'}
          </p>
          <p className="mt-1 text-xs text-[rgba(255,255,255,0.40)]">
            {orders.length === 0
              ? 'Place your first order on behalf of a patient to see it here.'
              : 'Try adjusting your filters or clearing the search.'}
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {filtered.map((o) => {
          const status = STATUS_STYLE[o.status] ?? STATUS_STYLE.pending;
          return (
            <li
              key={o.id}
              className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1E3054] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] text-[rgba(255,255,255,0.40)]">
                    {o.order_number}
                  </p>
                  <p className="mt-0.5 break-words text-sm font-semibold text-white">
                    {o.patientName}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-[rgba(255,255,255,0.55)]">
                    {o.itemSummary}
                    {o.itemCount > 3 && ` +${o.itemCount - 3} more`}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-[rgba(255,255,255,0.40)]">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-2.5 w-2.5" strokeWidth={1.5} />
                      {new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {o.total_cents != null && (
                      <span className="font-semibold text-[rgba(255,255,255,0.65)]">
                        {formatPriceCents(o.total_cents)}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className="flex-shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: status.bg,
                    color: status.text,
                    borderColor: status.border,
                  }}
                >
                  {status.label}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
