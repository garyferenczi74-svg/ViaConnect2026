// Prompt #96 Phase 6: Patient-facing dispensary.
//
// /dispensary/[slug]
// Renders the practitioner's brand header + their published white-label
// products with patient-facing names (NOT ViaCura names) and the
// retail prices the practitioner set. Add-to-cart is wired through the
// existing patient shop_orders flow; this page just shows the catalog.

import { createClient } from '@/lib/supabase/server';
import { isLaunchPhaseActive } from '@/lib/launch-phases/is-active';
import { notFound } from 'next/navigation';
import { Hourglass, Star, Package } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface DispensaryItem {
  id: string;
  retail_price_cents: number;
  patient_facing_description: string | null;
  is_featured: boolean;
  display_order: number;
  white_label_label_designs: {
    id: string;
    display_product_name: string;
    short_description: string | null;
    long_description: string | null;
  } | null;
}

const fmtUsd = (c: number) => `$${(c / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default async function PatientDispensaryPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const active = await isLaunchPhaseActive('white_label_products_2028', supabase);
  if (!active) {
    return (
      <div className="min-h-screen bg-white text-gray-900 px-4 py-10">
        <div className="max-w-2xl mx-auto rounded-xl border border-gray-200 p-8 text-center">
          <Hourglass className="w-10 h-10 text-amber-600 mx-auto mb-4" strokeWidth={1.5} />
          <h1 className="text-2xl font-bold mb-2">Dispensary not yet available</h1>
          <p className="text-sm text-gray-600">This practitioner dispensary opens when the program launches in Q3 to Q4 2028.</p>
        </div>
      </div>
    );
  }

  const sb = supabase as any;
  const { data: practitioner } = await sb
    .from('practitioners')
    .select('id, dispensary_slug, practice_name, practitioner_brand_configurations:practitioner_brand_configurations!inner(*)')
    .eq('dispensary_slug', params.slug)
    .maybeSingle();

  if (!practitioner) notFound();

  const brand = practitioner.practitioner_brand_configurations;

  const { data: items } = await sb
    .from('white_label_dispensary_settings')
    .select(`
      id, retail_price_cents, patient_facing_description, is_featured, display_order,
      white_label_label_designs (id, display_product_name, short_description, long_description)
    `)
    .eq('practitioner_id', practitioner.id)
    .eq('is_published', true)
    .order('is_featured', { ascending: false })
    .order('display_order', { ascending: true });

  const list = (items ?? []) as DispensaryItem[];

  const bg = brand?.background_color_hex ?? '#FFFFFF';
  const fg = brand?.text_color_hex ?? '#000000';
  const primary = brand?.primary_color_hex ?? '#1a3b6e';

  return (
    <div className="min-h-screen" style={{ backgroundColor: bg, color: fg }}>
      <header className="border-b" style={{ borderColor: `${primary}33` }}>
        <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
          <p className="text-xs uppercase tracking-wider" style={{ color: primary }}>
            Dispensary
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1" style={{ color: primary }}>
            {brand?.brand_name ?? practitioner.practice_name}
          </h1>
          {brand?.brand_tagline && (
            <p className="text-sm mt-2 opacity-80">{brand.brand_tagline}</p>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {list.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 opacity-30 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-sm opacity-70">No products published yet.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((item) => {
            const ld = item.white_label_label_designs;
            return (
              <article
                key={item.id}
                className="rounded-xl border p-5 hover:shadow-md transition"
                style={{ borderColor: `${primary}40`, backgroundColor: bg }}
              >
                {item.is_featured && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded mb-2"
                    style={{ backgroundColor: `${primary}10`, color: primary }}>
                    <Star className="w-3 h-3" strokeWidth={1.5} /> Featured
                  </span>
                )}
                <h2 className="text-lg font-semibold" style={{ color: primary }}>
                  {ld?.display_product_name ?? 'Product'}
                </h2>
                {ld?.short_description && (
                  <p className="text-sm mt-1 opacity-80">{ld.short_description}</p>
                )}
                {item.patient_facing_description && (
                  <p className="text-sm mt-3 opacity-90">{item.patient_facing_description}</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-2xl font-bold" style={{ color: primary }}>
                    {fmtUsd(item.retail_price_cents)}
                  </span>
                  <button
                    className="px-3 py-1.5 rounded text-sm font-medium text-white"
                    style={{ backgroundColor: primary }}
                  >
                    Add to cart
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <footer className="mt-12 pt-6 border-t text-xs opacity-60" style={{ borderColor: `${primary}20` }}>
          Recommended by {brand?.practice_legal_name ?? practitioner.practice_name}.
        </footer>
      </main>
    </div>
  );
}
