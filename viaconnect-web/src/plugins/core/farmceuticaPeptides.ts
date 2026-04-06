import { SupplementPlugin, PluginProductResult } from '../types';
import { createClient } from '@/lib/supabase/client';

export const farmceuticaPeptidesPlugin: SupplementPlugin = {
  id: 'farmceutica-peptides',
  name: 'FarmCeutica Peptide Registry',
  description: '29 peptides across 8 categories with full clinical profiles, 4 delivery forms each (113 SKUs).',
  icon: 'Dna',
  category: 'peptides',
  enabled: true,
  requiresApiKey: false,
  portals: ['consumer', 'practitioner', 'naturopath'],
  supportsBarcodeLookup: false,
  supportsTextSearch: true,
  supportsPhotoScan: false,
  supportsInteractionCheck: true,

  async lookupBarcode(): Promise<null> {
    return null; // Peptides don't have UPC barcodes
  },

  async searchProduct(query: string): Promise<PluginProductResult[]> {
    const supabase = createClient();
    const { data } = await supabase.rpc('search_peptides', {
      search_query: query.toLowerCase(),
      result_limit: 5,
    });

    return (data || []).map((p: any) => ({
      brand: 'FarmCeutica',
      productName: p.product_name,
      servingSize: null,
      totalCount: null,
      ingredients: [{
        name: p.product_name,
        form: p.peptide_type || null,
        amount: null,
        unit: null,
        isProprietaryBlend: false,
      }],
      confidence: (p.match_score || 50) / 100,
      source: 'FarmCeutica Peptides',
      isPeptide: true,
      rawData: {
        peptideId: p.peptide_id,
        categoryId: p.category_id,
        categoryName: p.category_name,
        evidenceLevel: p.evidence_level,
        genexSynergy: p.genex_synergy_description,
        isInvestigational: p.is_investigational,
      },
    }));
  },

  async checkAvailability() {
    return true;
  },
};
