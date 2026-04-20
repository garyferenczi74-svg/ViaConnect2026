'use client';

// Prompt #103 Phase 4: ViaCura SNP Line storefront.
//
// Dark theme (matte black + gold). Tagline: "Your Genetics | Your Protocol".
// Distinct from master ViaCura /shop (which uses brand palette for each
// category). VIACURA wordmark is rendered here in monochrome gold.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, AlertCircle } from 'lucide-react';
import { DualDeliveryMark } from '@/components/shop/identity-marks/DualDeliveryMark';

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
  dual_delivery_mark_primary_hex: string | null;
  dual_delivery_mark_outline_hex: string | null;
}

export default function SnpStorefrontPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tagline, setTagline] = useState<string>('Your Genetics | Your Protocol');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/public/brand-storefront/viacura-snp');
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
        setTagline(json.brand?.master_tagline ?? 'Your Genetics | Your Protocol');
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
    <div className="min-h-screen" style={{ background: '#0A0A0A', color: '#F1E4B4' }}>
      <header className="px-4 md:px-10 py-10 md:py-16 text-center border-b" style={{ borderColor: 'rgba(212,160,32,0.25)' }}>
        <div className="inline-block">
          <div className="font-black tracking-[0.25em] text-2xl md:text-4xl" style={{ color: '#D4A020' }}>
            VIACURA
          </div>
          <div className="text-xs md:text-sm mt-1 tracking-[0.3em]" style={{ color: 'rgba(212,160,32,0.75)' }}>
            SNP LINE
          </div>
        </div>
        <p className="text-sm md:text-base italic mt-4" style={{ color: '#D4A020' }}>
          {tagline}
        </p>
        <p className="text-xs mt-4 max-w-xl mx-auto" style={{ color: 'rgba(241,228,180,0.6)' }}>
          Precision formulations for specific genetic variants. Pairs with the GeneX360 testing suite for personalized protocol guidance.
        </p>
      </header>

      <main className="px-4 md:px-10 py-8 md:py-12 max-w-5xl mx-auto">
        {error && (
          <div className="mb-4 rounded-lg border p-3 text-sm inline-flex items-center gap-2" style={{ borderColor: 'rgba(244,63,94,0.4)', background: 'rgba(244,63,94,0.1)', color: '#fecaca' }}>
            <AlertCircle className="w-4 h-4" strokeWidth={1.5} /> {error}
          </div>
        )}
        {loading && (
          <div className="inline-flex items-center gap-2 text-sm" style={{ color: 'rgba(241,228,180,0.7)' }}>
            <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Loading
          </div>
        )}
        {!loading && products.length === 0 && (
          <div className="text-center py-12 text-sm" style={{ color: 'rgba(241,228,180,0.7)' }}>
            SNP Line storefront activates as packaging proofs clear compliance review.
          </div>
        )}
        {!loading && products.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => {
              const cat = categoryById.get(p.product_category_id);
              return (
                <Link
                  key={p.id}
                  href={`/shop/snp/${p.id}`}
                  className="block rounded-xl p-4 border hover:opacity-90 transition"
                  style={{ borderColor: 'rgba(212,160,32,0.3)', background: 'rgba(212,160,32,0.04)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      {cat && <div className="text-xs mt-0.5" style={{ color: 'rgba(241,228,180,0.6)' }}>{cat.display_name}</div>}
                    </div>
                    {cat?.identity_mark_type === 'dual_delivery_technology' && (
                      <DualDeliveryMark
                        primaryHex={cat.dual_delivery_mark_primary_hex ?? '#D4A020'}
                        outlineHex={cat.dual_delivery_mark_outline_hex ?? '#D4A020'}
                        size={36}
                      />
                    )}
                  </div>
                  <div className="text-xs mt-2" style={{ color: 'rgba(241,228,180,0.75)' }}>
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
