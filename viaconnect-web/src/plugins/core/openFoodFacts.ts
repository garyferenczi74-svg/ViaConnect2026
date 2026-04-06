import { SupplementPlugin, PluginProductResult, PluginIngredient } from '../types';

// Open Food Facts: https://world.openfoodfacts.org/
// FREE, open-source, 3M+ products, no API key needed

export const openFoodFactsPlugin: SupplementPlugin = {
  id: 'open-food-facts',
  name: 'Open Food Facts',
  description: 'Open-source database of 3M+ products worldwide. Free, no API key. Community-contributed data.',
  icon: 'Globe',
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
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${upc}.json`,
        { headers: { 'User-Agent': 'ViaConnect/1.0 (contact@farmceutica.com)' } }
      );
      if (!res.ok) return null;
      const data = await res.json();

      if (data.status !== 1 || !data.product) return null;
      const p = data.product;

      const ingredients: PluginIngredient[] = [];

      // Extract from nutriments (nutritional values per serving)
      if (p.nutriments) {
        const nutrientMap: Record<string, string> = {
          'vitamin-a': 'Vitamin A', 'vitamin-c': 'Vitamin C', 'vitamin-d': 'Vitamin D',
          'vitamin-e': 'Vitamin E', 'vitamin-b1': 'Vitamin B1', 'vitamin-b2': 'Vitamin B2',
          'vitamin-b6': 'Vitamin B6', 'vitamin-b12': 'Vitamin B12',
          'calcium': 'Calcium', 'iron': 'Iron', 'magnesium': 'Magnesium',
          'zinc': 'Zinc', 'selenium': 'Selenium', 'potassium': 'Potassium',
          'sodium': 'Sodium', 'fiber': 'Fiber', 'proteins': 'Protein',
        };
        for (const [key, name] of Object.entries(nutrientMap)) {
          const val = p.nutriments[`${key}_serving`] || p.nutriments[key];
          const unit = p.nutriments[`${key}_unit`] || 'mg';
          if (val && parseFloat(val) > 0) {
            ingredients.push({ name, form: null, amount: parseFloat(val), unit, isProprietaryBlend: false });
          }
        }
      }

      // Fallback: parse ingredients_text
      if (p.ingredients_text && ingredients.length === 0) {
        const parts = p.ingredients_text.split(/[,;]/);
        parts.forEach((part: string) => {
          const trimmed = part.trim();
          if (trimmed.length > 2 && trimmed.length < 80) {
            ingredients.push({ name: trimmed, form: null, amount: null, unit: null, isProprietaryBlend: false });
          }
        });
      }

      return {
        brand: p.brands || null,
        productName: p.product_name || p.generic_name || null,
        servingSize: p.serving_size || null,
        totalCount: p.product_quantity ? parseInt(p.product_quantity) : null,
        ingredients,
        confidence: ingredients.some(i => i.amount !== null) ? 0.80 : 0.50,
        source: 'Open Food Facts',
        sourceUrl: `https://world.openfoodfacts.org/product/${upc}`,
        isPeptide: false,
        rawData: { categories: p.categories, labels: p.labels },
      };
    } catch (err) {
      console.warn('[open-food-facts] Lookup failed:', err);
      return null;
    }
  },

  async searchProduct(query: string): Promise<PluginProductResult[]> {
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=5`,
        { headers: { 'User-Agent': 'ViaConnect/1.0' } }
      );
      if (!res.ok) return [];
      const data = await res.json();

      return (data.products || []).slice(0, 5).map((p: any) => ({
        brand: p.brands || null,
        productName: p.product_name || null,
        servingSize: p.serving_size || null,
        totalCount: null,
        ingredients: [],
        confidence: 0.60,
        source: 'Open Food Facts',
        isPeptide: false,
      }));
    } catch {
      return [];
    }
  },

  async checkAvailability() {
    try {
      const res = await fetch('https://world.openfoodfacts.org/api/v2/product/3017620422003.json');
      return res.ok;
    } catch {
      return false;
    }
  },
};
