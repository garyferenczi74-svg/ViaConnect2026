import { SupplementPlugin } from '../types';

// DrugBank — Drug/supplement/peptide interaction database
// Status: API available with license. Stub ready.
// Docs: https://docs.drugbank.com/

export const drugBankPlugin: SupplementPlugin = {
  id: 'drugbank',
  name: 'DrugBank Interactions',
  description: 'Comprehensive drug-supplement-peptide interaction database. Requires API license.',
  icon: 'AlertTriangle',
  category: 'interactions',
  enabled: false,
  requiresApiKey: true,
  apiKeyEnvVar: 'DRUGBANK_API_KEY',
  portals: ['practitioner', 'naturopath'],
  supportsBarcodeLookup: false,
  supportsTextSearch: true,
  supportsPhotoScan: false,
  supportsInteractionCheck: true,
  async lookupBarcode() { return null; },
  async searchProduct() { return []; },
  async checkAvailability() { return false; },
};
