import { SupplementPlugin } from '../types';

// Natural Medicines — Comprehensive interaction checker
// Status: No public API yet. Stub ready for when they release one.

export const naturalMedicinesPlugin: SupplementPlugin = {
  id: 'natural-medicines',
  name: 'Natural Medicines Interactions',
  description: 'Comprehensive natural medicine interaction checker. Awaiting public API.',
  icon: 'Leaf',
  category: 'interactions',
  enabled: false,
  requiresApiKey: true,
  apiKeyEnvVar: 'NATURALMEDICINES_API_KEY',
  portals: ['practitioner', 'naturopath'],
  supportsBarcodeLookup: false,
  supportsTextSearch: true,
  supportsPhotoScan: false,
  supportsInteractionCheck: true,
  async lookupBarcode() { return null; },
  async searchProduct() { return []; },
  async checkAvailability() { return false; },
};
