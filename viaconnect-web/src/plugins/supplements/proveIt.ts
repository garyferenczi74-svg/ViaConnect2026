import { SupplementPlugin } from '../types';

// Prove It — Supplement review and evidence platform
// Status: No public API yet. Stub ready for when they release one.

export const proveItPlugin: SupplementPlugin = {
  id: 'prove-it',
  name: 'Prove It Reviews',
  description: 'Evidence-based supplement reviews and ratings. Awaiting public API.',
  icon: 'BadgeCheck',
  category: 'supplements',
  enabled: false,
  requiresApiKey: true,
  apiKeyEnvVar: 'PROVEIT_API_KEY',
  portals: ['consumer', 'practitioner', 'naturopath'],
  supportsBarcodeLookup: true,
  supportsTextSearch: true,
  supportsPhotoScan: false,
  supportsInteractionCheck: false,
  async lookupBarcode() { return null; },
  async searchProduct() { return []; },
  async checkAvailability() { return false; },
};
