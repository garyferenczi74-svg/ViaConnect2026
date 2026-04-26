'use client';

// Prompt #138a Phase 5a: hero variant detail page.
// Routes:
//   GET  /api/marketing/variants/[id]                  load variant + recent events
//   PATCH /api/marketing/variants/[id]                 edit text fields (resets gates)
//   POST /api/marketing/variants/[id]/precheck         run word count + Marshall
//   POST /api/marketing/variants/[id]/approve|revoke   Steve action
//   POST /api/marketing/variants/[id]/activate         body: { active: boolean }
//   POST /api/marketing/variants/[id]/archive          body: { archived: boolean }

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, ScanSearch, Sparkles, Power, Archive, RotateCcw, Pencil, Save, X,
} from 'lucide-react';
import { VariantEditor, type VariantEditorState } from '@/components/marketing-admin/VariantEditor';
import { VariantPreview } from '@/components/marketing-admin/VariantPreview';
import { PreCheckResultPanel, type PreCheckFinding } from '@/components/marketing-admin/PreCheckResultPanel';
import { SteveApprovalAction } from '@/components/marketing-admin/SteveApprovalAction';
import type { MarketingCopyVariantRow, MarketingCopyVariantEventRow } from '@/lib/marketing/variants/types';

interface PreCheckPayload {
  passed: boolean;
  blockerCount: number;
  warnCount: number;
  findings: PreCheckFinding[];
  wordCount: { ok: boolean; headlineWithinBudget: boolean; subheadlineWithinBudget: boolean };
}

export default function HeroVariantDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [variant, setVariant] = useState<MarketingCopyVariantRow | null>(null);
  const [events, setEvents] = useState<MarketingCopyVariantEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editState, setEditState] = useState<VariantEditorState | null>(null);
  const [busy, setBusy] = useState(false);
  const [precheck, setPrecheck] = useState<PreCheckPayload | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/marketing/variants/${id}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Load failed');
        setLoading(false);
        return;
      }
      const v = json.variant as MarketingCopyVariantRow;
      setVariant(v);
      setEvents((json.events ?? []) as MarketingCopyVariantEventRow[]);
      setEditState({
        slot_id: v.slot_id,
        variant_label: v.variant_label,
        framing: v.framing,
        headline_text: v.headline_text,
        subheadline_text: v.subheadline_text,
        cta_label: v.cta_label,
        cta_destination: v.cta_destination ?? '',
      });
      setLoading(false);
    } catch (err) {
      setError((err as Error).message ?? 'Network error');
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void reload(); }, [reload]);

  async function saveEdit() {
    if (!editState) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/marketing/variants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variant_label: editState.variant_label.trim(),
        headline_text: editState.headline_text.trim(),
        subheadline_text: editState.subheadline_text.trim(),
        cta_label: editState.cta_label.trim(),
        cta_destination: editState.cta_destination.trim() || null,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setError(json.error ?? 'Save failed');
      setBusy(false);
      return;
    }
    setEditing(false);
    setBusy(false);
    setPrecheck(null);
    await reload();
  }

  async function runPrecheck() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/marketing/variants/${id}/precheck`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? 'Pre-check failed');
      setBusy(false);
      return;
    }
    setPrecheck({
      passed: !!json.passed,
      blockerCount: json.blockerCount ?? 0,
      warnCount: json.warnCount ?? 0,
      findings: (json.findings ?? []) as PreCheckFinding[],
      wordCount: json.wordCount,
    });
    setBusy(false);
    await reload();
  }

  async function setActive(active: boolean) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/marketing/variants/${id}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setError(json.error ?? `Activation failed${json.reasons ? `: ${json.reasons.join(', ')}` : ''}`);
      setBusy(false);
      return;
    }
    setBusy(false);
    await reload();
  }

  async function setArchived(archived: boolean) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/marketing/variants/${id}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setError(json.error ?? 'Archive failed');
      setBusy(false);
      return;
    }
    setBusy(false);
    await reload();
  }

  if (loading || !variant || !editState) {
    return (
      <div className="min-h-screen bg-[#0B1520] text-white p-6">
        <p className="text-sm text-white/40">Loading variant...</p>
      </div>
    );
  }

  const approvable = variant.word_count_validated && variant.marshall_precheck_passed;

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <Link
          href="/admin/marketing/hero-variants"
          className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Hero variants
        </Link>

        <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-semibold truncate">
                {variant.variant_label}
              </h1>
              {variant.active_in_test && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#2DA5A0]/20 text-[#2DA5A0] text-[10px] px-2 py-0.5 font-medium">
                  <Sparkles className="h-2.5 w-2.5" strokeWidth={1.5} />
                  Live
                </span>
              )}
              {variant.archived && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 text-white/60 text-[10px] px-2 py-0.5 font-medium">
                  <Archive className="h-2.5 w-2.5" strokeWidth={1.5} />
                  Archived
                </span>
              )}
            </div>
            <p className="text-[11px] text-white/50 mt-0.5 font-mono">{variant.slot_id}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!variant.archived && !variant.active_in_test && !editing && (
              <button
                onClick={() => setEditing(true)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-xs font-medium text-white hover:bg-white/[0.08] min-h-[44px]"
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                Edit
              </button>
            )}
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <section className="space-y-3">
            {editing ? (
              <>
                <VariantEditor state={editState} onChange={setEditState} lockIdentity disabled={busy} />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setEditing(false); void reload(); }}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-xs font-medium text-white hover:bg-white/[0.08] min-h-[44px]"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#2DA5A0] px-3 py-2 text-xs font-semibold text-[#0B1520] hover:bg-[#3DBAB5] disabled:opacity-50 min-h-[44px]"
                  >
                    <Save className="h-3.5 w-3.5" strokeWidth={2} />
                    {busy ? 'Saving...' : 'Save'}
                  </button>
                </div>
                <p className="text-[11px] text-white/40">
                  Saving resets word-count, Marshall, and Steve gates.
                </p>
              </>
            ) : (
              <>
                <ReadOnlyField label="Headline" value={variant.headline_text} />
                <ReadOnlyField label="Subheadline" value={variant.subheadline_text} />
                <div className="grid grid-cols-2 gap-3">
                  <ReadOnlyField label="CTA label" value={variant.cta_label} />
                  <ReadOnlyField label="CTA destination" value={variant.cta_destination ?? '/signup'} mono />
                </div>
                <ReadOnlyField label="Framing" value={variant.framing} mono />
              </>
            )}
          </section>

          <section className="space-y-3">
            <VariantPreview
              headline={editing ? editState.headline_text : variant.headline_text}
              subheadline={editing ? editState.subheadline_text : variant.subheadline_text}
              ctaLabel={editing ? editState.cta_label : variant.cta_label}
              ctaDestination={editing ? editState.cta_destination : (variant.cta_destination ?? '')}
            />
          </section>
        </div>

        {!variant.archived && (
          <>
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-white/80">Lifecycle</h2>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={runPrecheck}
                  disabled={busy || variant.active_in_test}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  <ScanSearch className="h-4 w-4" strokeWidth={1.5} />
                  Run pre-check
                </button>
                {variant.active_in_test ? (
                  <button
                    onClick={() => setActive(false)}
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-500/20 disabled:opacity-50 min-h-[44px]"
                  >
                    <Power className="h-4 w-4" strokeWidth={1.5} />
                    Deactivate
                  </button>
                ) : (
                  <button
                    onClick={() => setActive(true)}
                    disabled={busy || !approvable || !variant.steve_approval_at}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#2DA5A0] px-4 py-2 text-sm font-semibold text-[#0B1520] hover:bg-[#3DBAB5] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                  >
                    <Sparkles className="h-4 w-4" strokeWidth={2} />
                    Activate in test
                  </button>
                )}
              </div>
            </section>

            {precheck && (
              <PreCheckResultPanel
                passed={precheck.passed}
                blockerCount={precheck.blockerCount}
                warnCount={precheck.warnCount}
                findings={precheck.findings}
                wordCountOk={precheck.wordCount?.ok ?? true}
              />
            )}

            <SteveApprovalAction
              variantId={id}
              approved={!!variant.steve_approval_at}
              approvedAt={variant.steve_approval_at}
              approvalNote={variant.steve_approval_note}
              approvable={approvable}
              onChanged={() => void reload()}
            />
          </>
        )}

        <section className="flex flex-col sm:flex-row gap-2">
          {variant.archived ? (
            <button
              onClick={() => setArchived(false)}
              disabled={busy}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-xs font-medium text-white hover:bg-white/[0.08] min-h-[44px]"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
              Restore from archive
            </button>
          ) : (
            <button
              onClick={() => setArchived(true)}
              disabled={busy}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-xs font-medium text-white/70 hover:bg-white/[0.04] min-h-[44px]"
            >
              <Archive className="h-3.5 w-3.5" strokeWidth={1.5} />
              Archive variant
            </button>
          )}
        </section>

        {events.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-white/80 mb-2">Recent events</h2>
            <ul className="space-y-1.5">
              {events.slice(0, 20).map((e) => (
                <li
                  key={e.id}
                  className="flex items-center gap-2 text-xs text-white/70 rounded-xl bg-white/[0.02] border border-white/[0.05] px-3 py-2"
                >
                  <span className="font-mono text-[10px] uppercase rounded bg-white/[0.05] px-1.5 py-0.5">
                    {e.event_kind}
                  </span>
                  <span className="text-white/40 text-[11px]">
                    {new Date(e.occurred_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
      <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">{label}</p>
      <p className={`text-sm text-white ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  );
}
