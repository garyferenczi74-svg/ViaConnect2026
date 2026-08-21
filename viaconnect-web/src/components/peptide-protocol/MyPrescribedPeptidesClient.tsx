'use client';

/**
 * Prompt 226: consumer adds their prescribed peptides from the full catalog.
 * Dose values come from the user's Rx, not the platform.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Calculator } from 'lucide-react';

type AllowItem = { id: string; slug: string; displayName: string; iuEnabled: boolean };
type RxItem = {
  id: string;
  peptide_id: string;
  displayName: string;
  slug: string;
  dose_amount: number;
  dose_unit: string;
  vial_amount: number | null;
  vial_unit: string | null;
  diluent_ml: number | null;
  frequency_text: string;
  label: string;
};

export function MyPrescribedPeptidesClient() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<RxItem[]>([]);
  const [allowlist, setAllowlist] = useState<AllowItem[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [msg, setMsg] = useState('');

  const [peptideId, setPeptideId] = useState('');
  const [doseAmount, setDoseAmount] = useState('');
  const [doseUnit, setDoseUnit] = useState<'mg' | 'mcg' | 'IU'>('mg');
  const [vialAmount, setVialAmount] = useState('');
  const [vialUnit, setVialUnit] = useState<'mg' | 'mcg' | 'IU'>('mg');
  const [diluentMl, setDiluentMl] = useState('');
  const [frequencyText, setFrequencyText] = useState('');
  const [label, setLabel] = useState('');

  const selected = allowlist.find((a) => a.id === peptideId);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/peptides/prescribed');
      if (res.status === 401) {
        setMsg('Sign in to save prescribed peptides.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setUnavailable(Boolean(data.allowlistUnavailable));
      setItems(data.items ?? []);
      setAllowlist(data.allowlist ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleAdd() {
    setMsg('');
    const res = await fetch('/api/peptides/prescribed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        peptideId,
        doseAmount: Number(doseAmount),
        doseUnit,
        vialAmount: vialAmount === '' ? null : Number(vialAmount),
        vialUnit: vialAmount === '' ? null : vialUnit,
        diluentMl: diluentMl === '' ? null : Number(diluentMl),
        frequencyText,
        label,
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      setMsg(data.message || data.error || 'Could not save');
      return;
    }
    setDoseAmount('');
    setVialAmount('');
    setDiluentMl('');
    setFrequencyText('');
    setLabel('');
    setMsg('Saved. These values came from you (your prescription), not ViaConnect.');
    void refresh();
  }

  async function handleDelete(id: string) {
    setMsg('');
    const res = await fetch(`/api/peptides/prescribed?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!data.ok) {
      setMsg(data.error || 'Delete failed');
      return;
    }
    void refresh();
  }

  function converterHref(item: RxItem): string {
    const q = new URLSearchParams();
    q.set('peptideId', item.peptide_id);
    q.set('dose', String(item.dose_amount));
    q.set('doseUnit', item.dose_unit);
    if (item.vial_amount != null) {
      q.set('vial', String(item.vial_amount));
      if (item.vial_unit) q.set('vialUnit', item.vial_unit);
    }
    if (item.diluent_ml != null) q.set('diluent', String(item.diluent_ml));
    q.set('fromRx', '1');
    return `/peptide-protocol/converter?${q.toString()}`;
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#1E3054]/50 p-4 text-sm text-white/45">
        Loading your prescribed peptides...
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="my-prescribed-peptides">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-white">My prescribed peptides</h2>
        <p className="text-xs text-white/50 leading-relaxed">
          Add peptides your licensed clinician prescribed. You enter the dose from your Rx.
          ViaConnect does not recommend doses. The list includes Collection 14 educational and
          restricted monographs (adverse-reference exclusions stay out).
        </p>
      </div>

      {unavailable ? (
        <p className="text-xs text-amber-200/80">
          Peptide catalog unavailable. Retry shortly.
        </p>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#1E3054] p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-white/70">
          <label className="space-y-1 md:col-span-2">
            Compound
            <select
              className="w-full rounded-xl bg-[#1A2744] border border-white/15 px-3 py-2 text-sm text-white"
              value={peptideId}
              onChange={(e) => setPeptideId(e.target.value)}
              data-testid="rx-peptide"
            >
              <option value="">Select...</option>
              {allowlist.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            Prescribed dose (from your Rx)
            <div className="flex gap-2">
              <input
                type="number"
                className="flex-1 rounded-xl bg-[#1A2744] border border-white/15 px-3 py-2 text-sm text-white"
                value={doseAmount}
                onChange={(e) => setDoseAmount(e.target.value)}
                placeholder=""
                data-testid="rx-dose"
              />
              <select
                className="rounded-xl bg-[#1A2744] border border-white/15 px-2 text-sm text-white"
                value={doseUnit}
                onChange={(e) => setDoseUnit(e.target.value as 'mg' | 'mcg' | 'IU')}
              >
                <option value="mg">mg</option>
                <option value="mcg">mcg</option>
                <option value="IU" disabled={!selected?.iuEnabled}>
                  IU
                </option>
              </select>
            </div>
          </label>
          <label className="space-y-1">
            Nickname (optional)
            <input
              className="w-full rounded-xl bg-[#1A2744] border border-white/15 px-3 py-2 text-sm text-white"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
          <label className="space-y-1">
            Vial amount (optional, for converter)
            <div className="flex gap-2">
              <input
                type="number"
                className="flex-1 rounded-xl bg-[#1A2744] border border-white/15 px-3 py-2 text-sm text-white"
                value={vialAmount}
                onChange={(e) => setVialAmount(e.target.value)}
              />
              <select
                className="rounded-xl bg-[#1A2744] border border-white/15 px-2 text-sm text-white"
                value={vialUnit}
                onChange={(e) => setVialUnit(e.target.value as 'mg' | 'mcg' | 'IU')}
              >
                <option value="mg">mg</option>
                <option value="mcg">mcg</option>
                <option value="IU" disabled={!selected?.iuEnabled}>
                  IU
                </option>
              </select>
            </div>
          </label>
          <label className="space-y-1">
            Diluent mL (optional)
            <input
              type="number"
              className="w-full rounded-xl bg-[#1A2744] border border-white/15 px-3 py-2 text-sm text-white"
              value={diluentMl}
              onChange={(e) => setDiluentMl(e.target.value)}
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            Frequency as written on your Rx (optional)
            <input
              className="w-full rounded-xl bg-[#1A2744] border border-white/15 px-3 py-2 text-sm text-white"
              value={frequencyText}
              onChange={(e) => setFrequencyText(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={!peptideId || doseAmount.trim() === ''}
            className="md:col-span-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#2DA5A0] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} />
            Save prescribed peptide
          </button>
          {msg ? <p className="md:col-span-2 text-[11px] text-white/50">{msg}</p> : null}
        </div>
      )}

      <ul className="space-y-2">
        {items.length === 0 ? (
          <li className="text-sm text-white/45 rounded-xl border border-white/10 bg-[#1E3054]/40 p-4">
            No prescribed peptides saved yet.
          </li>
        ) : (
          items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-white/10 bg-[#1E3054]/70 p-3 text-xs text-white/70 flex flex-wrap items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="text-sm text-white">
                  {item.label ? `${item.label} · ` : ''}
                  {item.displayName}
                </div>
                <div>
                  Your Rx dose: {item.dose_amount} {item.dose_unit}
                  {item.frequency_text ? ` · ${item.frequency_text}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={converterHref(item)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#2DA5A0]/40 px-2 py-1 text-[#2DA5A0]"
                >
                  <Calculator className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Convert
                </Link>
                <button
                  type="button"
                  onClick={() => void handleDelete(item.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-white/50"
                  aria-label={`Remove ${item.displayName}`}
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
