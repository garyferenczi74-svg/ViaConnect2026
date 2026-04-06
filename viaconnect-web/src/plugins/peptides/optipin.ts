import { SupplementPlugin } from '../types';

// OptiPin — TRT/peptide tracker
// Status: No public API yet. Stub ready for when they release one.

export const optipinPlugin: SupplementPlugin = {
  id: 'optipin',
  name: 'OptiPin TRT/Peptide Tracker',
  description: 'TRT and peptide dosing tracker with protocol optimization. Awaiting public API.',
  icon: 'Syringe',
  category: 'peptides',
  enabled: false,
  requiresApiKey: true,
  apiKeyEnvVar: 'OPTIPIN_API_KEY',
  portals: ['practitioner', 'naturopath'],
  supportsBarcodeLookup: false,
  supportsTextSearch: true,
  supportsPhotoScan: false,
  supportsInteractionCheck: true,
  async lookupBarcode() { return null; },
  async searchProduct() { return []; },
  async checkAvailability() { return false; },
};
