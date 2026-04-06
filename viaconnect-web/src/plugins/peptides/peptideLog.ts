import { SupplementPlugin } from '../types';

// Peptide Log — Peptide logging and tracking app
// Status: No public API yet. Stub ready for when they release one.

export const peptideLogPlugin: SupplementPlugin = {
  id: 'peptide-log',
  name: 'Peptide Log',
  description: 'Peptide logging and progress tracking. Awaiting public API.',
  icon: 'ClipboardList',
  category: 'peptides',
  enabled: false,
  requiresApiKey: true,
  apiKeyEnvVar: 'PEPTIDELOG_API_KEY',
  portals: ['practitioner', 'naturopath'],
  supportsBarcodeLookup: false,
  supportsTextSearch: true,
  supportsPhotoScan: false,
  supportsInteractionCheck: false,
  async lookupBarcode() { return null; },
  async searchProduct() { return []; },
  async checkAvailability() { return false; },
};
