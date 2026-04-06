export interface PluginProductResult {
  brand: string | null;
  productName: string | null;
  servingSize: string | null;
  totalCount: number | null;
  ingredients: PluginIngredient[];
  confidence: number; // 0.0 to 1.0
  source: string; // plugin name
  sourceUrl?: string;
  isPeptide: boolean;
  rawData?: any; // original API response for debugging
}

export interface PluginIngredient {
  name: string;
  form: string | null;
  amount: number | null;
  unit: string | null;
  isProprietaryBlend: boolean;
  blendName?: string;
}

export interface SupplementPlugin {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  category: 'core' | 'supplements' | 'peptides' | 'interactions';
  enabled: boolean;
  requiresApiKey: boolean;
  apiKeyEnvVar?: string;
  portals: ('consumer' | 'practitioner' | 'naturopath')[];

  // Capabilities
  supportsBarcodeLookup: boolean;
  supportsTextSearch: boolean;
  supportsPhotoScan: boolean;
  supportsInteractionCheck: boolean;

  // Methods
  lookupBarcode: (upc: string) => Promise<PluginProductResult | null>;
  searchProduct: (query: string) => Promise<PluginProductResult[]>;
  checkAvailability: () => Promise<boolean>;
}

export interface PluginRegistry {
  plugins: SupplementPlugin[];
  getEnabled: (portal: string) => SupplementPlugin[];
  getByCapability: (capability: string) => SupplementPlugin[];
  lookupBarcode: (upc: string) => Promise<PluginProductResult | null>;
  searchProduct: (query: string) => Promise<PluginProductResult[]>;
}
