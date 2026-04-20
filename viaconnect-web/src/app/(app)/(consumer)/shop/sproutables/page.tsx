'use client';

// Prompt #103 Phase 4: Sproutables sub-brand storefront.
//
// HARD RULES (red-flag abort conditions in spec §13):
//   - VIACURA wordmark MUST NOT appear anywhere on this page
//   - Tagline is "Peak Growth and Wellness" (not the ViaCura master)
//   - Palette: silver + dark/bright green, NOT ViaCura copper/green

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Leaf, AlertCircle } from 'lucide-react';
import { MethylatedFormulaBadge } from '@/components/shop/identity-marks/MethylatedFormulaBadge';

interface Product {
  id: string;
  name: string;
  product_category_id: string;
  serving_count: number | null;
  serving_unit: string | null;
  dose_per_serving_text: string | null;
}

interface Category {
  product_category_id: string;
  category_slug: string;
  display_name: string;
  identity_mark_type: 'methylated_formula' | 'dual_delivery_technology' | 'none';
  bottle_color_primary_hex: string | null;
  typography_primary_hex: string | null;
  accent_color_hex: string | null;
}

export default function SproutablesStorefrontPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brandTagline, setBrandTagline] = useState<string>('Peak Growth and Wellness');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/public/brand-storefront/sproutables');
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
        setBrandTagline(json.brand?.master_tagline ?? 'Peak Growth and Wellness');
        setCategories(json.categories ?? []);
        setProducts(json.products ?? []);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const categoryById = new Map(categories.map((c) => [c.product_category_id, c]));

  return (
    <div className="min-h-screen" style={{ background: '#0F2616', color: '#E8F5E8' }}>
      <header className="px-4 md:px-10 py-10 md:py-16 text-center border-b" style={{ borderColor: 'rgba(106,191,75,0.25)' }}>
        <div className="inline-flex items-center gap-2 mb-3" style={{ color: '#6ABF4B' }}>
          <Leaf className="w-8 h-8" strokeWidth={1.5} />
          <span className="text-3xl md:text-5xl font-bold tracking-tight" style={{ color: '#C0C0C0' }}>
            Sproutables
          </span>
        </div>
        <p className="text-sm md:text-base italic" style={{ color: '#6ABF4B' }}>
          {brandTagline}
        </p>
        <div className="mt-6 text-xs" style={{ color: 'rgba(232,245,232,0.6)' }}>
          <Link href="/shop/sproutables/about" className="underline hover:no-underline">About Sproutables</Link>
        </div>
      </header>

      <main className="px-4 md:px-10 py-8 md:py-12 max-w-5xl mx-auto">
        {error && (
          <div className="mb-4 rounded-lg border p-3 text-sm inline-flex items-center gap-2" style={{ borderColor: 'rgba(244,63,94,0.4)', background: 'rgba(244,63,94,0.1)', color: '#fecaca' }}>
            <AlertCircle className="w-4 h-4" strokeWidth={1.5} /> {error}
          </div>
        )}
        {loading && (
          <div className="inline-flex items-center gap-2 text-sm" style={{ color: 'rgba(232,245,232,0.7)' }}>
            <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Loading
          </div>
        )}
        {!loading && products.length === 0 && (
          <div className="text-center py-12">
            <div className="text-sm" style={{ color: 'rgba(232,245,232,0.7)' }}>
              Sproutables storefront is coming soon. Check back as we finalize packaging proofs.
            </div>
          </div>
        )}
        {!loading && products.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => {
              const cat = categoryById.get(p.product_category_id);
              return (
                <Link
                  key={p.id}
                  href={`/shop/sproutables/${p.id}`}
                  className="block rounded-xl p-4 border hover:opacity-90 transition"
                  style={{ borderColor: 'rgba(106,191,75,0.3)', background: 'rgba(106,191,75,0.05)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      {cat && <div className="text-xs mt-0.5" style={{ color: 'rgba(232,245,232,0.6)' }}>{cat.display_name}</div>}
                    </div>
                    {cat?.identity_mark_type === 'methylated_formula' && (
                      <MethylatedFormulaBadge fillHex={cat.accent_color_hex ?? '#6ABF4B'} size={36} />
                    )}
                  </div>
                  <div className="text-xs mt-2" style={{ color: 'rgba(232,245,232,0.7)' }}>
                    {p.serving_count} {p.serving_unit} {p.dose_per_serving_text ? `, ${p.dose_per_serving_text}` : ''}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
