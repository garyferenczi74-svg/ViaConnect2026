import { SupplementPlugin } from '../types';

// NIH Office of Dietary Supplements — interaction fact sheets
// Status: Stub for structured interaction queries

export const nihODSPlugin: SupplementPlugin = {
  id: 'nih-ods',
  name: 'NIH Office of Dietary Supplements',
  description: 'NIH fact sheets on supplement safety and interactions. Free government resource.',
  icon: 'BookOpen',
  category: 'interactions',
  enabled: false,
  requiresApiKey: false,
  portals: ['practitioner', 'naturopath'],
  supportsBarcodeLookup: false,
  supportsTextSearch: true,
  supportsPhotoScan: false,
  supportsInteractionCheck: true,
  async lookupBarcode() { return null; },
  async searchProduct() { return []; },
  async checkAvailability() { return false; },
};
