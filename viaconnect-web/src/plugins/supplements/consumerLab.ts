import { SupplementPlugin } from '../types';

// ConsumerLab — Third-party supplement testing and reviews
// Status: No public API yet. Stub ready for when they release one.

export const consumerLabPlugin: SupplementPlugin = {
  id: 'consumer-lab',
  name: 'ConsumerLab Testing',
  description: 'Independent third-party testing results for supplements. Awaiting public API.',
  icon: 'FlaskConical',
  category: 'supplements',
  enabled: false,
  requiresApiKey: true,
  apiKeyEnvVar: 'CONSUMERLAB_API_KEY',
  portals: ['practitioner', 'naturopath'],
  supportsBarcodeLookup: false,
  supportsTextSearch: true,
  supportsPhotoScan: false,
  supportsInteractionCheck: false,
  async lookupBarcode() { return null; },
  async searchProduct() { return []; },
  async checkAvailability() { return false; },
};
