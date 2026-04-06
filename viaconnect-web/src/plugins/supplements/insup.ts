import { SupplementPlugin } from '../types';

// InSup — Supplement Scanner by AIBY
// Status: No public API yet. Stub ready for when they release one.
// Website: https://apps.apple.com/us/app/supplement-scanner-insup/id6752767712

export const insupPlugin: SupplementPlugin = {
  id: 'insup',
  name: 'InSup Supplement Scanner',
  description: 'Safety, Effectiveness, and Trust scores for supplements. Awaiting public API.',
  icon: 'Shield',
  category: 'supplements',
  enabled: false,
  requiresApiKey: true,
  apiKeyEnvVar: 'INSUP_API_KEY',
  portals: ['consumer', 'practitioner', 'naturopath'],
  supportsBarcodeLookup: true,
  supportsTextSearch: true,
  supportsPhotoScan: true,
  supportsInteractionCheck: false,
  async lookupBarcode() { return null; },
  async searchProduct() { return []; },
  async checkAvailability() { return false; },
};
