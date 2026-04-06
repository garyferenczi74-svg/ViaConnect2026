import { SupplementPlugin, PluginProductResult } from '../types';
import { createClient } from '@/lib/supabase/client';

export const farmceuticaCachePlugin: SupplementPlugin = {
  id: 'farmceutica-cache',
  name: 'FarmCeutica Product Cache',
  description: 'Internal database of 110+ brands and seeded products. Instant lookup.',
  icon: 'Database',
  category: 'core',
  enabled: true,
  requiresApiKey: false,
  portals: ['consumer', 'practitioner', 'naturopath'],
  supportsBarcodeLookup: true,
  supportsTextSearch: true,
  supportsPhotoScan: false,
  supportsInteractionCheck: false,

  async lookupBarcode(upc: string): Promise<PluginProductResult | null> {
    const supabase = createClient();
    const { data } = await supabase
      .from('supplement_product_cache')
      .select('*')
      .eq('upc_code', upc)
      .limit(1)
      .single();

    if (!data) return null;

    return {
      brand: data.brand,
      productName: data.product_name,
      servingSize: (data.product_data as any)?.serving_size || null,
      totalCount: (data.product_data as any)?.total_count || null,
      ingredients: ((data.ingredient_breakdown as any[]) || []).map((ing: any) => ({
        name: ing.name || ing.ingredient_name || '',
        form: ing.form || null,
        amount: ing.amount != null ? parseFloat(ing.amount) : null,
        unit: ing.unit || null,
        isProprietaryBlend: ing.isProprietaryBlend || false,
      })),
      confidence: 0.95,
      source: 'FarmCeutica Cache',
      isPeptide: false,
    };
  },

  async searchProduct(query: string): Promise<PluginProductResult[]> {
    const supabase = createClient();
    const { data } = await supabase.rpc('search_supplements', {
      search_query: query.toLowerCase(),
      result_limit: 5,
    });
    return (data || []).map((r: any) => ({
      brand: r.brand_name,
      productName: r.product_name,
      servingSize: null,
      totalCount: null,
      ingredients: (r.ingredient_breakdown || []).map((ing: any) => ({
        name: ing.name || ing.ingredient_name || '',
        form: ing.form || null,
        amount: ing.amount != null ? parseFloat(ing.amount) : null,
        unit: ing.unit || null,
        isProprietaryBlend: false,
      })),
      confidence: (r.match_score || 50) / 100,
      source: 'FarmCeutica Cache',
      isPeptide: false,
    }));
  },

  async checkAvailability() {
    return true;
  },
};
