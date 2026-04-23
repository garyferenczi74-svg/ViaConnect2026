'use client';

// Prompt #114 P2a read + P2b write actions: Recordation detail.
//
// Full row view + IC classes table + renewal countdown. P2b adds:
//   - Status transition buttons gated by allowedNextStatuses()
//   - Mark counsel-reviewed action (PATCH counsel_reviewed:true)
//   - CEO approve action (POST /ceo-approve — SECURITY DEFINER RPC)
//   - Inline IC class add form + remove buttons (trademark only)

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CalendarClock,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  FileText,
  Gavel,
  ShieldCheck,
  Plus,
  Trash2,
  ArrowRight,
  XCircle,
  Package,
} from 'lucide-react';
import {
  type CustomsRecordationStatus,
  type CustomsRecordationType,
  recordationRenewalCountdownState,
} from '@/lib/customs/types';
import { formatCents } from '@/lib/customs/cbpFeeCalculator';
import { allowedNextStatuses } from '@/lib/customs/recordationStateMachine';

interface Recordation {
  recordation_id: string;
  recordation_type: CustomsRecordationType;
  status: CustomsRecordationStatus;
  mark_text: string | null;
  mark_image_vault_ref: string | null;
  uspto_registration_number: string | null;
  uspto_registration_date: string | null;
  uspto_renewal_date: string | null;
  copyright_registration_number: string | null;
  copyright_registration_date: string | null;
  cbp_recordation_number: string | null;
  cbp_recordation_date: string | null;
  cbp_expiration_date: string | null;
  cbp_grace_expiration_date: string | null;
  total_ic_count: number | null;
  total_fee_cents: number | null;
  renewal_fee_cents: number | null;
  ceo_approval_required: boolean;
  ceo_approved_by: string | null;
  ceo_approved_at: string | null;
  counsel_reviewed_by: string | null;
  counsel_reviewed_at: string | null;
  submitted_at: string | null;
  iprr_confirmation_vault_ref: string | null;
  trade_secrets_flag: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface RecordationClass {
  class_row_id: string;
  international_class: number;
  class_description: string;
  fee_cents: number;
  renewal_fee_cents: number;
  authorized_manufacturers: string[];
  countries_of_manufacture: string[];
}

interface LinkedProduct {
  recordation_product_id: string;
  sku: string;
  linked_at: string;
  product_name: string | null;
  product_category: string | null;
  product_msrp: number | null;
}

interface MasterSku {
  sku: string;
  name: string;
  category: string;
  msrp: number;
}

const STATUS_TONE: Record<CustomsRecordationStatus, string> = {
  draft:         'border-white/10 text-gray-300 bg-white/5',
  pending_fee:   'border-amber-500/30 text-amber-300 bg-amber-500/10',
  under_review:  'border-sky-500/40 text-sky-300 bg-sky-500/10',
  active:        'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
  grace_period:  'border-orange-500/40 text-orange-300 bg-orange-500/10',
  expired:       'border-rose-500/40 text-rose-300 bg-rose-500/10',
  withdrawn:     'border-white/5 text-gray-500 bg-white/[0.01]',
};

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

export default function RecordationDetailPage() {
  const params = useParams<{ id: string }>();
  const recordationId = params?.id ?? '';

  const [recordation, setRecordation] = useState<Recordation | null>(null);
  const [classes, setClasses] = useState<RecordationClass[]>([]);
  const [feeLedgerCount, setFeeLedgerCount] = useState(0);
  const [linkedProducts, setLinkedProducts] = useState<LinkedProduct[]>([]);
  const [masterSkus, setMasterSkus] = useState<MasterSku[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rRec, rProducts, rSkus] = await Promise.all([
        fetch(`/api/admin/legal/customs/recordations/${recordationId}`),
        fetch(`/api/admin/legal/customs/recordations/${recordationId}/products`),
        fetch('/api/admin/legal/customs/master-skus'),
      ]);
      const recJson = await rRec.json();
      if (!rRec.ok) throw new Error(recJson.error ?? `HTTP ${rRec.status}`);
      setRecordation(recJson.recordation);
      setClasses(recJson.classes ?? []);
      setFeeLedgerCount(recJson.fee_ledger_count ?? 0);

      const productsJson = await rProducts.json();
      if (rProducts.ok) setLinkedProducts(productsJson.rows ?? []);

      const skusJson = await rSkus.json();
      if (rSkus.ok) setMasterSkus(skusJson.rows ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [recordationId]);

  useEffect(() => { reload(); }, [reload]);

  async function patchRecordation(patch: Record<string, unknown>, actionKey: string) {
    if (actionBusy) return;
    setActionBusy(actionKey);
    setError(null);
    try {
      const r = await fetch(`/api/admin/legal/customs/recordations/${recordationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionBusy(null);
    }
  }

  async function postCeoApprove() {
    if (actionBusy) return;
    setActionBusy('ceo-approve');
    setError(null);
    try {
      const r = await fetch(`/api/admin/legal/customs/recordations/${recordationId}/ceo-approve`, {
        method: 'POST',
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionBusy(null);
    }
  }

  async function addClass(ic: number, description: string) {
    if (actionBusy) return;
    setActionBusy('add-class');
    setError(null);
    try {
      const r = await fetch(`/api/admin/legal/customs/recordations/${recordationId}/classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ international_class: ic, class_description: description }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionBusy(null);
    }
  }

  async function removeClass(classRowId: string) {
    if (actionBusy) return;
    setActionBusy(`remove-${classRowId}`);
    setError(null);
    try {
      const r = await fetch(
        `/api/admin/legal/customs/recordations/${recordationId}/classes?classRowId=${classRowId}`,
        { method: 'DELETE' },
      );
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionBusy(null);
    }
  }

  async function linkProduct(sku: string) {
    if (actionBusy) return;
    setActionBusy('link-product');
    setError(null);
    try {
      const r = await fetch(`/api/admin/legal/customs/recordations/${recordationId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionBusy(null);
    }
  }

  async function unlinkProduct(sku: string) {
    if (actionBusy) return;
    setActionBusy(`unlink-${sku}`);
    setError(null);
    try {
      const r = await fetch(
        `/api/admin/legal/customs/recordations/${recordationId}/products?sku=${encodeURIComponent(sku)}`,
        { method: 'DELETE' },
      );
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionBusy(null);
    }
  }

  const countdownState = recordation?.cbp_expiration_date
    ? recordationRenewalCountdownState(
        daysBetween(new Date(), new Date(recordation.cbp_expiration_date)),
      )
    : null;

  const nextStatuses = recordation ? allowedNextStatuses(recordation.status) : [];
  const showCeoButton =
    recordation !== null &&
    (recordation.total_fee_cents ?? 0) > 100_000 &&
    recordation.ceo_approved_at === null &&
    recordation.status !== 'withdrawn' &&
    recordation.status !== 'expired';

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link
          href="/admin/legal/customs/recordations"
          className="text-xs text-gray-400 hover:text-white inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Recordations
        </Link>
        <div className="flex flex-col gap-3 mt-2 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold inline-flex items-center gap-2">
              <ShieldCheck className="w-6 h-6" strokeWidth={1.5} />
              {recordation?.mark_text ?? recordation?.copyright_registration_number ?? 'Recordation detail'}
            </h1>
            {recordation && (
              <p className="text-sm text-gray-400 mt-1 font-mono">
                {recordation.cbp_recordation_number ?? 'no CBP number yet'}
              </p>
            )}
          </div>
          {recordation && (
            <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#2DA5A0]/40 text-[#2DA5A0]">
                {recordation.recordation_type}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_TONE[recordation.status]}`}>
                {recordation.status}
              </span>
            </div>
          )}
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

      {recordation && !loading && (
        <>
          <section className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
            <h2 className="text-sm uppercase tracking-wide text-gray-400 mb-3">Actions</h2>
            <div className="flex flex-wrap gap-2">
              {!recordation.counsel_reviewed_at && (
                <ActionButton
                  Icon={CheckCircle2}
                  label="Mark counsel reviewed"
                  onClick={() => patchRecordation({ counsel_reviewed: true }, 'counsel-review')}
                  busy={actionBusy === 'counsel-review'}
                  tone="teal"
                />
              )}
              {showCeoButton && (
                <ActionButton
                  Icon={Gavel}
                  label="CEO approve (MFA required)"
                  onClick={postCeoApprove}
                  busy={actionBusy === 'ceo-approve'}
                  tone="orange"
                />
              )}
              {nextStatuses
                .filter((s) => s !== 'withdrawn')
                .map((nextStatus) => (
                  <ActionButton
                    key={nextStatus}
                    Icon={ArrowRight}
                    label={`Advance to ${nextStatus}`}
                    onClick={() =>
                      patchRecordation(
                        advancePayload(recordation.status, nextStatus),
                        `advance-${nextStatus}`,
                      )
                    }
                    busy={actionBusy === `advance-${nextStatus}`}
                    tone="teal"
                  />
                ))}
              {nextStatuses.includes('withdrawn') && (
                <ActionButton
                  Icon={XCircle}
                  label="Withdraw"
                  onClick={() => patchRecordation({ status: 'withdrawn' }, 'withdraw')}
                  busy={actionBusy === 'withdraw'}
                  tone="muted"
                />
              )}
              {nextStatuses.length === 0 && !showCeoButton && recordation.counsel_reviewed_at && (
                <span className="text-xs text-gray-500 italic">No further actions available in the current status.</span>
              )}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-3">
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 md:p-5 lg:col-span-2">
              <h2 className="text-sm uppercase tracking-wide text-gray-400 mb-3">Filing details</h2>
              <dl className="grid gap-3 sm:grid-cols-2">
                <DetailField label="CBP recordation number" value={recordation.cbp_recordation_number} mono />
                <DetailField label="CBP recordation date" value={recordation.cbp_recordation_date} />
                <DetailField label="CBP expiration" value={recordation.cbp_expiration_date} />
                <DetailField label="Grace period ends" value={recordation.cbp_grace_expiration_date} />
                {recordation.recordation_type === 'trademark' && (
                  <>
                    <DetailField label="USPTO registration" value={recordation.uspto_registration_number} mono />
                    <DetailField label="USPTO registration date" value={recordation.uspto_registration_date} />
                    <DetailField label="USPTO renewal date" value={recordation.uspto_renewal_date} />
                  </>
                )}
                {recordation.recordation_type === 'copyright' && (
                  <>
                    <DetailField label="Copyright registration" value={recordation.copyright_registration_number} mono />
                    <DetailField label="Copyright registration date" value={recordation.copyright_registration_date} />
                  </>
                )}
                <DetailField
                  label="Total fee"
                  value={recordation.total_fee_cents !== null ? formatCents(recordation.total_fee_cents) : null}
                />
                <DetailField
                  label="Renewal fee"
                  value={recordation.renewal_fee_cents !== null ? formatCents(recordation.renewal_fee_cents) : null}
                />
              </dl>
              {recordation.notes && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Notes</div>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{recordation.notes}</p>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
              <h2 className="text-sm uppercase tracking-wide text-gray-400 mb-3">Lifecycle</h2>
              <div className="space-y-3">
                {countdownState && recordation.cbp_expiration_date && (
                  <CountdownPill
                    state={countdownState}
                    expirationDate={recordation.cbp_expiration_date}
                  />
                )}
                <TimelineRow
                  Icon={CheckCircle2}
                  label="Counsel review"
                  value={recordation.counsel_reviewed_at}
                  pending="not yet reviewed"
                />
                <TimelineRow
                  Icon={Gavel}
                  label="CEO approval"
                  value={recordation.ceo_approved_at}
                  pending={
                    recordation.ceo_approval_required
                      ? 'required, not yet signed'
                      : 'not required for this fee tier'
                  }
                />
                <TimelineRow
                  Icon={FileText}
                  label="Submitted to IPRR"
                  value={recordation.submitted_at}
                  pending="not yet submitted"
                />
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 md:p-5 lg:col-span-3">
              <h2 className="text-sm uppercase tracking-wide text-gray-400 mb-3 inline-flex items-center gap-2">
                <Package className="w-4 h-4" strokeWidth={1.5} /> Products covered ({linkedProducts.length})
              </h2>
              <p className="text-xs text-gray-500 mb-3 max-w-3xl">
                SKUs that bear this mark. Detention workflow (P4) will pull MSRP from these rows to compute § 133.27 civil fines. Changing this list does not alter master_skus; links here are customs-scoped.
              </p>
              {linkedProducts.length === 0 ? (
                <div className="text-sm text-gray-400 italic mb-3">
                  No products linked yet. Add one below.
                </div>
              ) : (
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-white/5">
                        <th className="py-2 pr-4">SKU</th>
                        <th className="py-2 pr-4">Product</th>
                        <th className="py-2 pr-4">Category</th>
                        <th className="py-2 pr-4">MSRP</th>
                        <th className="py-2 pr-4 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {linkedProducts.map((p) => (
                        <tr key={p.recordation_product_id} className="border-b border-white/5">
                          <td className="py-2 pr-4 font-mono">{p.sku}</td>
                          <td className="py-2 pr-4">{p.product_name ?? <span className="italic text-gray-500">unknown</span>}</td>
                          <td className="py-2 pr-4 text-gray-400">{p.product_category ?? ''}</td>
                          <td className="py-2 pr-4">
                            {p.product_msrp !== null ? formatCents(Math.round(p.product_msrp * 100)) : ''}
                          </td>
                          <td className="py-2 pr-4">
                            <button
                              onClick={() => unlinkProduct(p.sku)}
                              disabled={actionBusy === `unlink-${p.sku}`}
                              className="text-xs text-rose-300 hover:text-rose-200 inline-flex items-center gap-1 disabled:opacity-50"
                              title="Unlink product"
                            >
                              {actionBusy === `unlink-${p.sku}`
                                ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} />
                                : <Trash2 className="w-3 h-3" strokeWidth={1.5} />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <LinkProductForm
                masterSkus={masterSkus}
                linkedSkus={linkedProducts.map((p) => p.sku)}
                onLink={linkProduct}
                busy={actionBusy === 'link-product'}
              />
            </section>

            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 md:p-5 lg:col-span-3">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="text-sm uppercase tracking-wide text-gray-400">
                  International Classes ({classes.length})
                </h2>
                <span className="text-xs text-gray-500">
                  {feeLedgerCount > 0
                    ? `${feeLedgerCount} fee ledger ${feeLedgerCount === 1 ? 'entry' : 'entries'}`
                    : 'no fee postings yet'}
                </span>
              </div>
              {recordation.recordation_type === 'copyright' ? (
                <div className="text-sm text-gray-400 italic">
                  Copyright recordations have no International Class breakdown.
                </div>
              ) : (
                <>
                  {classes.length === 0 && (
                    <div className="text-sm text-gray-400 italic mb-3">
                      No IC classes yet. Add one below.
                    </div>
                  )}
                  {classes.length > 0 && (
                    <div className="overflow-x-auto mb-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-white/5">
                            <th className="py-2 pr-4">IC</th>
                            <th className="py-2 pr-4">Description</th>
                            <th className="py-2 pr-4">Initial fee</th>
                            <th className="py-2 pr-4">Renewal fee</th>
                            <th className="py-2 pr-4 w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {classes.map((c) => (
                            <tr key={c.class_row_id} className="border-b border-white/5">
                              <td className="py-2 pr-4 font-mono">{c.international_class}</td>
                              <td className="py-2 pr-4">{c.class_description}</td>
                              <td className="py-2 pr-4">{formatCents(c.fee_cents)}</td>
                              <td className="py-2 pr-4">{formatCents(c.renewal_fee_cents)}</td>
                              <td className="py-2 pr-4">
                                <button
                                  onClick={() => removeClass(c.class_row_id)}
                                  disabled={actionBusy === `remove-${c.class_row_id}`}
                                  className="text-xs text-rose-300 hover:text-rose-200 inline-flex items-center gap-1 disabled:opacity-50"
                                  title="Remove IC class"
                                >
                                  {actionBusy === `remove-${c.class_row_id}`
                                    ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} />
                                    : <Trash2 className="w-3 h-3" strokeWidth={1.5} />}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <AddClassForm onAdd={addClass} busy={actionBusy === 'add-class'} />
                </>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function advancePayload(from: CustomsRecordationStatus, to: CustomsRecordationStatus): Record<string, unknown> {
  const payload: Record<string, unknown> = { status: to };
  if (from === 'draft' && to === 'pending_fee') {
    payload.submitted_at = new Date().toISOString();
  }
  return payload;
}

function DetailField({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500 mb-0.5">{label}</dt>
      <dd className={`text-sm ${mono ? 'font-mono' : ''} ${value ? 'text-white' : 'text-gray-500 italic'}`}>
        {value ?? 'not set'}
      </dd>
    </div>
  );
}

function TimelineRow({
  Icon,
  label,
  value,
  pending,
}: {
  Icon: typeof CheckCircle2;
  label: string;
  value: string | null;
  pending: string;
}) {
  const done = value !== null;
  return (
    <div className="flex items-start gap-3">
      <Icon
        className={`w-4 h-4 mt-0.5 ${done ? 'text-[#2DA5A0]' : 'text-gray-500'}`}
        strokeWidth={1.5}
      />
      <div className="min-w-0">
        <div className="text-sm">{label}</div>
        <div className={`text-xs ${done ? 'text-gray-400' : 'text-gray-500 italic'}`}>
          {done ? value : pending}
        </div>
      </div>
    </div>
  );
}

interface CountdownPillProps {
  state: ReturnType<typeof recordationRenewalCountdownState>;
  expirationDate: string;
}

function CountdownPill({ state, expirationDate }: CountdownPillProps) {
  const tone =
    state === 'healthy'
      ? 'border-[#2DA5A0]/40 bg-[#2DA5A0]/10 text-[#2DA5A0]'
      : state === 'caution'
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
      : state === 'critical'
      ? 'border-[#B75E18]/60 bg-[#B75E18]/20 text-[#B75E18]'
      : state === 'grace'
      ? 'border-[#B75E18]/60 bg-[#B75E18]/30 text-orange-200'
      : 'border-rose-500/60 bg-rose-500/30 text-rose-200';

  const Icon =
    state === 'healthy'
      ? CalendarClock
      : state === 'caution'
      ? Clock
      : state === 'critical'
      ? AlertTriangle
      : AlertOctagon;

  const label =
    state === 'healthy'
      ? 'Healthy renewal window'
      : state === 'caution'
      ? 'Renewal window approaching'
      : state === 'critical'
      ? 'Renewal due soon'
      : state === 'grace'
      ? 'In CBP grace period'
      : 'Recordation expired';

  return (
    <div className={`rounded-lg border px-3 py-2 ${tone} inline-flex items-center gap-2 text-xs`}>
      <Icon className="w-4 h-4" strokeWidth={1.5} />
      <div>
        <div className="font-semibold">{label}</div>
        <div className="opacity-80">Expires {expirationDate}</div>
      </div>
    </div>
  );
}

function ActionButton({
  Icon,
  label,
  onClick,
  busy,
  tone,
}: {
  Icon: typeof CheckCircle2;
  label: string;
  onClick: () => void;
  busy: boolean;
  tone: 'teal' | 'orange' | 'muted';
}) {
  const classes =
    tone === 'teal'
      ? 'border-[#2DA5A0]/50 bg-[#2DA5A0]/15 text-[#2DA5A0] hover:bg-[#2DA5A0]/25'
      : tone === 'orange'
      ? 'border-[#B75E18]/60 bg-[#B75E18]/20 text-[#B75E18] hover:bg-[#B75E18]/30'
      : 'border-white/10 text-gray-300 hover:text-white hover:border-white/20';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`text-sm px-3 py-2 rounded border min-h-[44px] md:min-h-0 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${classes}`}
    >
      {busy ? (
        <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
      ) : (
        <Icon className="w-4 h-4" strokeWidth={1.5} />
      )}
      {label}
    </button>
  );
}

function LinkProductForm({
  masterSkus,
  linkedSkus,
  onLink,
  busy,
}: {
  masterSkus: MasterSku[];
  linkedSkus: string[];
  onLink: (sku: string) => void;
  busy: boolean;
}) {
  const [selectedSku, setSelectedSku] = useState<string>('');

  const available = masterSkus.filter((m) => !linkedSkus.includes(m.sku));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSku || busy) return;
    onLink(selectedSku);
    setSelectedSku('');
  }

  if (available.length === 0) {
    return (
      <div className="pt-3 border-t border-white/5 text-xs text-gray-500 italic">
        All {masterSkus.length} SKUs from master_skus are already linked to this recordation.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 md:flex-row md:items-end pt-3 border-t border-white/5">
      <div className="flex-1 min-w-0">
        <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1">Link a SKU</label>
        <select
          value={selectedSku}
          onChange={(e) => setSelectedSku(e.target.value)}
          className="w-full bg-[#0E1A30] border border-white/10 rounded px-3 py-2 text-base"
        >
          <option value="">Select a SKU</option>
          {available.map((m) => (
            <option key={m.sku} value={m.sku}>
              {m.sku} &mdash; {m.name} ({m.category})
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={busy || !selectedSku}
        className="text-sm px-3 py-2 rounded border border-[#2DA5A0]/50 bg-[#2DA5A0]/15 text-[#2DA5A0] hover:bg-[#2DA5A0]/25 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] md:min-h-0 inline-flex items-center gap-2 self-start md:self-auto"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <Plus className="w-4 h-4" strokeWidth={1.5} />}
        Link product
      </button>
    </form>
  );
}

function AddClassForm({
  onAdd,
  busy,
}: {
  onAdd: (ic: number, description: string) => void;
  busy: boolean;
}) {
  const [ic, setIc] = useState<number>(1);
  const [description, setDescription] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || description.trim().length < 3) return;
    onAdd(ic, description.trim());
    setDescription('');
    setIc(1);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 md:flex-row md:items-end pt-3 border-t border-white/5">
      <div className="flex-shrink-0">
        <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1">IC</label>
        <input
          type="number"
          min={1}
          max={45}
          step={1}
          value={ic}
          onChange={(e) => setIc(Math.max(1, Math.min(45, parseInt(e.target.value, 10) || 1)))}
          className="w-24 bg-[#0E1A30] border border-white/10 rounded px-3 py-2 text-base"
        />
      </div>
      <div className="flex-1 min-w-0">
        <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Dietary supplements; nutritional supplements."
          className="w-full bg-[#0E1A30] border border-white/10 rounded px-3 py-2 text-base"
        />
      </div>
      <button
        type="submit"
        disabled={busy || description.trim().length < 3}
        className="text-sm px-3 py-2 rounded border border-[#2DA5A0]/50 bg-[#2DA5A0]/15 text-[#2DA5A0] hover:bg-[#2DA5A0]/25 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] md:min-h-0 inline-flex items-center gap-2 self-start md:self-auto"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <Plus className="w-4 h-4" strokeWidth={1.5} />}
        Add IC class
      </button>
    </form>
  );
}
