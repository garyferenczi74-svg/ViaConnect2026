'use client';

// Prompt #103 Phase 5: Sub-brand + category opt-in client.
//
// Default-enabled categories (Base, Advanced, Women's) are checked
// and locked. Opt-in categories (SNP, Mushrooms, GeneX360, Sproutables
// Children's) require a checkbox plus acknowledgment text for the
// categories that carry one.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import {
  DEFAULT_ENABLED_CATEGORY_SLUGS,
  CATEGORY_OPT_IN_REQUIREMENTS,
} from '@/lib/categories/opt-in-rules';

interface CategoryRow {
  product_category_id: string;
  category_slug: string;
  display_name: string;
  brand_display_name: string;
  tagline_primary: string;
}

interface OptIn {
  product_category_id: string;
  category_slug: string;
  acknowledged_rules: boolean;
}

export default function SelectorClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      setError(null);
      try {
        const [listRes, optInsRes] = await Promise.all([
          fetch('/api/public/brand-storefront/viacura'),
          fetch('/api/practitioner/category-opt-ins'),
        ]);
        const listJson = await listRes.json();
        const optInsJson = await optInsRes.json();
        if (!listRes.ok) throw new Error(listJson.error ?? `HTTP ${listRes.status}`);
        if (!optInsRes.ok) throw new Error(optInsJson.error ?? `HTTP ${optInsRes.status}`);

        const [spRes, snpRes] = await Promise.all([
          fetch('/api/public/brand-storefront/sproutables'),
          fetch('/api/public/brand-storefront/viacura-snp'),
        ]);
        const spJson = await spRes.json();
        const snpJson = await snpRes.json();

        interface RawCategory {
          product_category_id: string;
          category_slug: string;
          display_name: string;
          tagline_primary: string;
        }
        const toCategoryRow = (fallbackBrand: string, brandDisplayName: string | undefined) =>
          (c: RawCategory): CategoryRow => ({
            product_category_id: c.product_category_id,
            category_slug: c.category_slug,
            display_name: c.display_name,
            brand_display_name: brandDisplayName ?? fallbackBrand,
            tagline_primary: c.tagline_primary,
          });
        const merged: CategoryRow[] = [
          ...((listJson.categories ?? []) as RawCategory[]).map(toCategoryRow('ViaCura', listJson.brand?.display_name)),
          ...((spJson.categories ?? []) as RawCategory[]).map(toCategoryRow('Sproutables', spJson.brand?.display_name)),
          ...((snpJson.categories ?? []) as RawCategory[]).map(toCategoryRow('ViaCura SNP Line', snpJson.brand?.display_name)),
        ];

        // De-dupe by product_category_id (master /shop feed may include SNP already)
        const byId = new Map<string, CategoryRow>();
        for (const c of merged) byId.set(c.product_category_id, c);

        setCategories(Array.from(byId.values()));

        const initial = new Set<string>();
        const ack: Record<string, boolean> = {};
        for (const c of byId.values()) {
          if (DEFAULT_ENABLED_CATEGORY_SLUGS.includes(c.category_slug as any)) {
            initial.add(c.product_category_id);
          }
        }
        for (const o of (optInsJson.opt_ins ?? []) as OptIn[]) {
          initial.add(o.product_category_id);
          if (o.acknowledged_rules) ack[o.product_category_id] = true;
        }
        setSelected(initial);
        setAcknowledged(ack);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const byBrand = useMemo(() => {
    const groups: Record<string, CategoryRow[]> = {};
    for (const c of categories) {
      if (!groups[c.brand_display_name]) groups[c.brand_display_name] = [];
      groups[c.brand_display_name].push(c);
    }
    return groups;
  }, [categories]);

  const canSubmit = useMemo(() => {
    for (const c of categories) {
      const required = CATEGORY_OPT_IN_REQUIREMENTS[c.category_slug as keyof typeof CATEGORY_OPT_IN_REQUIREMENTS];
      if (selected.has(c.product_category_id) && required?.acknowledgment_text && !acknowledged[c.product_category_id]) {
        return false;
      }
    }
    return true;
  }, [categories, selected, acknowledged]);

  function toggle(id: string, slug: string) {
    if (DEFAULT_ENABLED_CATEGORY_SLUGS.includes(slug as any)) return; // default-enabled are locked on
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = Array.from(selected).map((product_category_id) => ({
        product_category_id,
        acknowledged_rules: acknowledged[product_category_id] ?? false,
      }));
      const r = await fetch('/api/practitioner/category-opt-ins', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opt_ins: payload }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      router.push('/practitioner/dashboard');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/practitioner/dashboard" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Dashboard
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold mt-2">Select your sub-brands and categories</h1>
        <p className="text-sm text-gray-400 mt-1">
          Choose which categories your practice will carry. Base Formulas, Advanced Formulas, and Women's Health are default on; opt-in categories carry additional practice-of-scope acknowledgments.
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
        <div className="space-y-8 max-w-3xl">
          {Object.entries(byBrand).map(([brandName, rows]) => (
            <section key={brandName}>
              <h2 className="text-lg font-semibold mb-3">{brandName}</h2>
              <div className="space-y-3">
                {rows.map((c) => {
                  const locked = DEFAULT_ENABLED_CATEGORY_SLUGS.includes(c.category_slug as any);
                  const req = CATEGORY_OPT_IN_REQUIREMENTS[c.category_slug as keyof typeof CATEGORY_OPT_IN_REQUIREMENTS];
                  const checked = selected.has(c.product_category_id);
                  return (
                    <div
                      key={c.product_category_id}
                      className={`rounded-xl border px-4 py-3 ${checked ? 'border-copper bg-copper/5' : 'border-white/10 bg-white/[0.02]'}`}
                    >
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={locked}
                          onChange={() => toggle(c.product_category_id, c.category_slug)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="font-medium inline-flex items-center gap-2">
                            {c.display_name}
                            {locked && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/30 text-emerald-300 inline-flex items-center gap-0.5">
                                <CheckCircle className="w-3 h-3" strokeWidth={1.5} /> default on
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">{c.tagline_primary}</div>
                          {checked && req?.acknowledgment_text && (
                            <label className="flex items-start gap-2 mt-3 text-xs text-gray-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={acknowledged[c.product_category_id] ?? false}
                                onChange={(e) => setAcknowledged((a) => ({ ...a, [c.product_category_id]: e.target.checked }))}
                                className="mt-0.5"
                              />
                              <span>{req.acknowledgment_text}</span>
                            </label>
                          )}
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <div className="pt-4">
            <button
              disabled={!canSubmit || saving}
              onClick={save}
              className="text-sm px-4 py-2 rounded border border-copper text-copper hover:bg-copper/10 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : null}
              Save and continue
            </button>
            {!canSubmit && (
              <div className="mt-2 text-xs text-amber-300">
                Acknowledgment required for one or more opt-in categories.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
