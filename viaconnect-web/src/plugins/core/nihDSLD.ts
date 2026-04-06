import { SupplementPlugin, PluginProductResult, PluginIngredient } from '../types';

// NIH DSLD API: https://dsld.od.nih.gov/api-guide
// FREE, no API key, US government database of 200K+ supplement labels

const DSLD_BASE = 'https://api.ods.od.nih.gov/dsld/v9';

export const nihDSLDPlugin: SupplementPlugin = {
  id: 'nih-dsld',
  name: 'NIH Supplement Label Database',
  description: 'US Government database of 200K+ dietary supplement labels with full ingredient data. Free, no API key.',
  icon: 'ShieldCheck',
  category: 'core',
  enabled: true,
  requiresApiKey: false,
  portals: ['consumer', 'practitioner', 'naturopath'],
  supportsBarcodeLookup: true,
  supportsTextSearch: true,
  supportsPhotoScan: false,
  supportsInteractionCheck: false,

  async lookupBarcode(upc: string): Promise<PluginProductResult | null> {
    try {
      const res = await fetch(`${DSLD_BASE}/label?upc=${encodeURIComponent(upc)}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || !data.hits || data.hits.length === 0) return null;

      const product = data.hits[0];
      const ingredients: PluginIngredient[] = (product.ingredients || []).map((ing: any) => ({
        name: ing.ingredientName || ing.name || '',
        form: ing.ingredientForm || null,
        amount: ing.amount ? parseFloat(ing.amount) : null,
        unit: ing.unit || null,
        isProprietaryBlend: ing.isBlend || false,
      }));

      return {
        brand: product.brandName || product.manufacturer || null,
        productName: product.productName || null,
        servingSize: product.servingSize || null,
        totalCount: product.netContents ? parseInt(product.netContents) : null,
        ingredients,
        confidence: 0.90,
        source: 'NIH DSLD',
        sourceUrl: `https://dsld.od.nih.gov/label/${product.dsldId}`,
        isPeptide: false,
      };
    } catch (err) {
      console.warn('[nih-dsld] Lookup failed:', err);
      return null;
    }
  },

  async searchProduct(query: string): Promise<PluginProductResult[]> {
    try {
      const res = await fetch(`${DSLD_BASE}/browse-products?query=${encodeURIComponent(query)}&rows=5`);
      if (!res.ok) return [];
      const data = await res.json();

      return (data.hits || []).map((product: any) => ({
        brand: product.brandName || null,
        productName: product.productName || null,
        servingSize: product.servingSize || null,
        totalCount: null,
        ingredients: (product.ingredients || []).map((ing: any) => ({
          name: ing.ingredientName || '',
          form: ing.ingredientForm || null,
          amount: ing.amount ? parseFloat(ing.amount) : null,
          unit: ing.unit || null,
          isProprietaryBlend: false,
        })),
        confidence: 0.85,
        source: 'NIH DSLD',
        isPeptide: false,
      }));
    } catch (err) {
      console.warn('[nih-dsld] Search failed:', err);
      return [];
    }
  },

  async checkAvailability() {
    try {
      const res = await fetch(`${DSLD_BASE}/browse-products?query=magnesium&rows=1`);
      return res.ok;
    } catch {
      return false;
    }
  },
};
