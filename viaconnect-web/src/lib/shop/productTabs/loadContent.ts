/**
 * Prompt 215: load product tab content (DB first, seed fallback).
 */

import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { getSeededTabsForSlug } from './contentSeed';
import type { ProductTabContent, ProductTabKey } from './types';
import { PRODUCT_TAB_KEYS } from './types';

export async function loadProductTabContent(slug: string): Promise<ProductTabContent[]> {
  const seeded = getSeededTabsForSlug(slug);

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('product_content')
      .select('product_slug, tab_key, body_md, gate_status, last_verified_at, provenance')
      .eq('product_slug', slug);

    if (!error && Array.isArray(data) && data.length > 0) {
      const rows: ProductTabContent[] = data.map((r) => {
        const row = r as {
          product_slug?: string;
          tab_key?: string;
          body_md?: string;
          gate_status?: string;
          last_verified_at?: string | null;
          provenance?: unknown[];
        };
        return {
          productSlug: row.product_slug ?? slug,
          tabKey: (row.tab_key ?? 'full_description') as ProductTabKey,
          bodyMd: row.body_md ?? '',
          gateStatus: (row.gate_status as ProductTabContent['gateStatus']) ?? 'pending',
          lastVerifiedAt: row.last_verified_at ?? null,
          provenance: Array.isArray(row.provenance) ? row.provenance : [],
        };
      });
      // Ensure all five tabs exist (merge seed for missing keys)
      const have = new Set(rows.map((r) => r.tabKey));
      for (const k of PRODUCT_TAB_KEYS) {
        if (!have.has(k)) {
          const seed = seeded.find((s) => s.tabKey === k);
          if (seed) rows.push(seed);
        }
      }
      return PRODUCT_TAB_KEYS.map(
        (k) => rows.find((r) => r.tabKey === k) ?? seeded.find((s) => s.tabKey === k)!,
      ).filter(Boolean);
    }
  } catch (err) {
    safeLog.warn('productTabs.load', 'db fail-open to seed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return seeded;
}
