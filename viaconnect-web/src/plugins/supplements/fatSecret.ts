import { SupplementPlugin } from '../types';

// FatSecret — 2.3M products, free tier with 90% barcode coverage
// Status: Free tier available. API key required.
// Docs: https://platform.fatsecret.com/api/

export const fatSecretPlugin: SupplementPlugin = {
  id: 'fat-secret',
  name: 'FatSecret Nutrition',
  description: '2.3M products with nutrition data. Free tier, API key required.',
  icon: 'Utensils',
  category: 'supplements',
  enabled: false,
  requiresApiKey: true,
  apiKeyEnvVar: 'FATSECRET_API_KEY',
  portals: ['consumer', 'practitioner', 'naturopath'],
  supportsBarcodeLookup: true,
  supportsTextSearch: true,
  supportsPhotoScan: false,
  supportsInteractionCheck: false,
  async lookupBarcode() { return null; },
  async searchProduct() { return []; },
  async checkAvailability() { return false; },
};
