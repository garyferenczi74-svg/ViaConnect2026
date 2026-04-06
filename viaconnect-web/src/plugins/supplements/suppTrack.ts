import { SupplementPlugin } from '../types';

// SuppTrack — 189K+ supplement database
// Status: No public API yet. Stub ready for when they release one.

export const suppTrackPlugin: SupplementPlugin = {
  id: 'supp-track',
  name: 'SuppTrack Database',
  description: '189K+ supplement products with ingredient data. Awaiting public API.',
  icon: 'ListChecks',
  category: 'supplements',
  enabled: false,
  requiresApiKey: true,
  apiKeyEnvVar: 'SUPPTRACK_API_KEY',
  portals: ['consumer', 'practitioner', 'naturopath'],
  supportsBarcodeLookup: true,
  supportsTextSearch: true,
  supportsPhotoScan: false,
  supportsInteractionCheck: false,
  async lookupBarcode() { return null; },
  async searchProduct() { return []; },
  async checkAvailability() { return false; },
};
