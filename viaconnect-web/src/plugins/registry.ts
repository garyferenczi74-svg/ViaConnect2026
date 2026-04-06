import { SupplementPlugin, PluginProductResult, PluginRegistry } from './types';
import { farmceuticaCachePlugin } from './core/farmceuticaCache';
import { nihDSLDPlugin } from './core/nihDSLD';
import { openFoodFactsPlugin } from './core/openFoodFacts';
import { farmceuticaPeptidesPlugin } from './core/farmceuticaPeptides';

// All registered plugins — core + future
const ALL_PLUGINS: SupplementPlugin[] = [
  farmceuticaCachePlugin,
  nihDSLDPlugin,
  openFoodFactsPlugin,
  farmceuticaPeptidesPlugin,
  // Future plugins go here:
  // insupPlugin,
  // proveItPlugin,
  // optipinPlugin,
  // dosePlugin,
  // drugBankPlugin,
  // fatSecretPlugin,
  // suppTrackPlugin,
  // consumerLabPlugin,
  // naturalMedicinesPlugin,
];

export function createPluginRegistry(): PluginRegistry {
  return {
    plugins: ALL_PLUGINS,

    getEnabled(portal: string) {
      return ALL_PLUGINS.filter(p => p.enabled && p.portals.includes(portal as any));
    },

    getByCapability(capability: string) {
      return ALL_PLUGINS.filter(p => {
        if (capability === 'barcode') return p.enabled && p.supportsBarcodeLookup;
        if (capability === 'search') return p.enabled && p.supportsTextSearch;
        if (capability === 'photo') return p.enabled && p.supportsPhotoScan;
        if (capability === 'interactions') return p.enabled && p.supportsInteractionCheck;
        return false;
      });
    },

    // CASCADE LOOKUP: try each plugin in priority order until one returns data
    async lookupBarcode(upc: string): Promise<PluginProductResult | null> {
      const barcodePlugins = ALL_PLUGINS.filter(p => p.enabled && p.supportsBarcodeLookup);

      for (const plugin of barcodePlugins) {
        try {
          const result = await plugin.lookupBarcode(upc);
          if (result && result.brand) {
            console.log(`[plugin-registry] Barcode ${upc} found via ${plugin.name}`);
            return result;
          }
        } catch (err) {
          console.warn(`[plugin-registry] ${plugin.name} failed for barcode ${upc}:`, err);
        }
      }

      console.log(`[plugin-registry] Barcode ${upc} not found in any plugin`);
      return null;
    },

    // UNIFIED SEARCH: query all enabled text-search plugins, merge + deduplicate results
    async searchProduct(query: string): Promise<PluginProductResult[]> {
      const searchPlugins = ALL_PLUGINS.filter(p => p.enabled && p.supportsTextSearch);

      const allResults = await Promise.allSettled(
        searchPlugins.map(p => p.searchProduct(query))
      );

      const merged: PluginProductResult[] = [];
      for (const result of allResults) {
        if (result.status === 'fulfilled') {
          merged.push(...result.value);
        }
      }

      // Sort by confidence (highest first), deduplicate by product name
      merged.sort((a, b) => b.confidence - a.confidence);
      const seen = new Set<string>();
      return merged.filter(r => {
        const key = `${r.brand}-${r.productName}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
  };
}

export const pluginRegistry = createPluginRegistry();
