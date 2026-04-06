import { SupplementPlugin } from '../types';

// Dose — Peptide tracker app
// Status: No public API yet. Stub ready for when they release one.

export const dosePlugin: SupplementPlugin = {
  id: 'dose',
  name: 'Dose Peptide Tracker',
  description: 'Peptide dosing and scheduling tracker. Awaiting public API.',
  icon: 'Clock',
  category: 'peptides',
  enabled: false,
  requiresApiKey: true,
  apiKeyEnvVar: 'DOSE_API_KEY',
  portals: ['practitioner', 'naturopath'],
  supportsBarcodeLookup: false,
  supportsTextSearch: true,
  supportsPhotoScan: false,
  supportsInteractionCheck: false,
  async lookupBarcode() { return null; },
  async searchProduct() { return []; },
  async checkAvailability() { return false; },
};
