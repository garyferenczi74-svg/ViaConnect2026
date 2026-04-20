'use client';

// Prompt #96 Phase 6: Per-label dispensary admin.
//
// Practitioner sets retail price + patient-facing description + publish
// toggle + featured per approved label. Save patches the dispensary
// settings row; first publish auto-generates the dispensary_slug.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  AlertCircle,
  Save,
  ExternalLink,
  Eye,
  EyeOff,
  Star,
} from 'lucide-react';

interface LabelWithSettings {
  id: string;
  display_product_name: string;
  status: string;
  version_number: number;
  product_catalog_id: string;
  product_catalog: { id: string; name: string; sku: string } | null;
  white_label_dispensary_settings?: {
    id: string;
    retail_price_cents: number;
    patient_facing_description: string | null;
    is_published: boolean;
    is_featured: boolean;
    display_order: number;
  };
}

interface DispensaryPayload {
  practitioner: { id: string; practice_name: string; dispensary_slug: string | null };
  labels_with_settings: LabelWithSettings[];
  labels_without_settings: LabelWithSettings[];
}

interface Draft {
  retail_price_cents: number;
  patient_facing_description: string;
  is_published: boolean;
  is_featured: boolean;
}

const fmtUsd = (c: number) => `$${(c / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function DispensaryAdminClient() {
  const [data, setData] = useState<DispensaryPayload | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/practitioner/white-label/dispensary');
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setData(json);
      const next: Record<string, Draft> = {};
      for (const l of [...(json.labels_with_settings ?? []), ...(json.labels_without_settings ?? [])]) {
        const s = l.white_label_dispensary_settings;
        next[l.id] = {
          retail_price_cents: s?.retail_price_cents ?? 0,
          patient_facing_description: s?.patient_facing_description ?? '',
          is_published: s?.is_published ?? false,
          is_featured: s?.is_featured ?? false,
        };
      }
      setDrafts(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, []);

  async function save(labelId: string) {
    const d = drafts[labelId];
    if (!d) return;
    if (d.retail_price_cents <= 0) {
      setError('Retail price must be greater than zero.');
      return;
    }
    setBusyId(labelId);
    setError(null);
    try {
      const r = await fetch('/api/practitioner/white-label/dispensary', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label_design_id: labelId,
          retail_price_cents: d.retail_price_cents,
          patient_facing_description: d.patient_facing_description || undefined,
          is_published: d.is_published,
          is_featured: d.is_featured,
        }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  function update(labelId: string, patch: Partial<Draft>) {
    setDrafts((s) => ({ ...s, [labelId]: { ...s[labelId], ...patch } }));
  }

  const allLabels = useMemo(() => {
    if (!data) return [] as LabelWithSettings[];
    return [...(data.labels_with_settings ?? []), ...(data.labels_without_settings ?? [])];
  }, [data]);

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/practitioner/white-label/enroll" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> White-label
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">My dispensary</h1>
            <p className="text-sm text-gray-400 mt-1">
              Set the retail price your patients see and choose which products to publish.
            </p>
            {data?.practitioner?.dispensary_slug && (
              <Link href={`/dispensary/${data.practitioner.dispensary_slug}`} target="_blank"
                className="text-xs text-copper hover:text-amber-300 inline-flex items-center gap-1 mt-2">
                Open my dispensary <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
              </Link>
            )}
          </div>
          <button onClick={reload} className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10 self-start md:self-auto">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Refresh
          </button>
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

      {!loading && allLabels.length === 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
          No approved labels yet. Submit a label, get it approved, then return here to publish it.
        </div>
      )}

      {!loading && allLabels.length > 0 && (
        <div className="space-y-3">
          {allLabels.map((l) => {
            const d = drafts[l.id];
            if (!d) return null;
            return (
              <article key={l.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <p className="font-semibold">{l.display_product_name}</p>
                    <p className="text-xs text-gray-500">{l.product_catalog?.sku} ; v{l.version_number}</p>
                    {l.white_label_dispensary_settings?.is_published && (
                      <span className="inline-flex items-center gap-1 mt-2 text-xs text-portal-green">
                        <Eye className="w-3 h-3" strokeWidth={1.5} /> Published
                      </span>
                    )}
                  </div>
                  <button
                    disabled={busyId === l.id}
                    onClick={() => save(l.id)}
                    className="text-sm px-3 py-2 rounded bg-copper hover:bg-amber-600 inline-flex items-center gap-1 disabled:opacity-40 self-start"
                  >
                    {busyId === l.id ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <Save className="w-3.5 h-3.5" strokeWidth={1.5} />}
                    Save
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="text-xs text-gray-400">
                    Retail price (USD)
                    <input type="number" min={0}
                      value={(d.retail_price_cents / 100).toFixed(2)}
                      onChange={(e) => update(l.id, { retail_price_cents: Math.max(0, Math.round(Number(e.target.value) * 100)) })}
                      className="w-full mt-1 bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm text-white" />
                    <p className="text-xs text-gray-500 mt-1">Stored {fmtUsd(d.retail_price_cents)}</p>
                  </label>
                  <div className="flex flex-col gap-2 text-sm">
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={d.is_published}
                        onChange={(e) => update(l.id, { is_published: e.target.checked })} />
                      {d.is_published ? <Eye className="w-4 h-4 text-portal-green" strokeWidth={1.5} /> : <EyeOff className="w-4 h-4 text-gray-500" strokeWidth={1.5} />}
                      Publish to patients
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={d.is_featured}
                        onChange={(e) => update(l.id, { is_featured: e.target.checked })} />
                      <Star className="w-4 h-4 text-amber-300" strokeWidth={1.5} />
                      Featured
                    </label>
                  </div>
                </div>

                <label className="block mt-3 text-xs text-gray-400">
                  Patient-facing description
                  <textarea rows={3} maxLength={1000}
                    value={d.patient_facing_description}
                    onChange={(e) => update(l.id, { patient_facing_description: e.target.value })}
                    placeholder="What you want your patients to know about this product."
                    className="w-full mt-1 bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm text-white" />
                </label>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
