/**
 * Prompt 218: apps-only plugin registry contracts.
 * Wearable devices are NOT listed here (Wearables Data / body-tracker connections).
 * No em/en dashes.
 */

export type PluginAppCategory =
  | 'Health Platforms'
  | 'Nutrition'
  | 'Fitness'
  | 'Mindfulness'
  | 'Data Import'
  | 'Other';

export type PluginAppStatus = 'live' | 'coming_soon';
export type PluginConnectionType = 'oauth2' | 'file_import' | 'polling' | 'none';
export type PluginStateSource =
  | 'body_tracker_connections'
  | 'data_source_connections'
  | 'none';

export interface PluginAppRegistryRow {
  slug: string;
  displayName: string;
  category: PluginAppCategory;
  description: string;
  iconKey: string;
  status: PluginAppStatus;
  connectionType: PluginConnectionType;
  stateSource: PluginStateSource;
  connectPath: string | null;
  disconnectPath: string | null;
  wearablesCrossLink: string | null;
  sortOrder: number;
}

/** Fallback seed if DB registry is empty or unavailable (matches migration seed). */
export const PLUGIN_APP_REGISTRY_FALLBACK: PluginAppRegistryRow[] = [
  {
    slug: 'google_health',
    displayName: 'Google Health',
    category: 'Health Platforms',
    description:
      'Connect Fitbit, Pixel Watch, and other devices through Google. Weight, sleep, and activity feed Bio Optimization.',
    iconKey: 'HeartPulse',
    status: 'live',
    connectionType: 'oauth2',
    stateSource: 'body_tracker_connections',
    connectPath: '/api/integrations/google-health/start?return_to=/plugins',
    disconnectPath: '/api/integrations/google-health/disconnect',
    wearablesCrossLink: '/body-tracker/connections',
    sortOrder: 10,
  },
  {
    slug: 'myfitnesspal',
    displayName: 'MyFitnessPal',
    category: 'Nutrition',
    description: 'Import meals, macros, and water when OAuth credentials are configured.',
    iconKey: 'Apple',
    status: 'coming_soon',
    connectionType: 'oauth2',
    stateSource: 'data_source_connections',
    connectPath: null,
    disconnectPath: null,
    wearablesCrossLink: null,
    sortOrder: 20,
  },
  {
    slug: 'cronometer',
    displayName: 'Cronometer',
    category: 'Nutrition',
    description: 'Micronutrient-dense food diary import (coming soon).',
    iconKey: 'Apple',
    status: 'coming_soon',
    connectionType: 'oauth2',
    stateSource: 'data_source_connections',
    connectPath: null,
    disconnectPath: null,
    wearablesCrossLink: null,
    sortOrder: 30,
  },
  {
    slug: 'strava',
    displayName: 'Strava',
    category: 'Fitness',
    description: 'Workouts and activity history (coming soon).',
    iconKey: 'Activity',
    status: 'coming_soon',
    connectionType: 'oauth2',
    stateSource: 'data_source_connections',
    connectPath: null,
    disconnectPath: null,
    wearablesCrossLink: null,
    sortOrder: 40,
  },
  {
    slug: 'peloton',
    displayName: 'Peloton',
    category: 'Fitness',
    description: 'Indoor cycling and class history (coming soon).',
    iconKey: 'Activity',
    status: 'coming_soon',
    connectionType: 'oauth2',
    stateSource: 'data_source_connections',
    connectPath: null,
    disconnectPath: null,
    wearablesCrossLink: null,
    sortOrder: 50,
  },
  {
    slug: 'headspace',
    displayName: 'Headspace',
    category: 'Mindfulness',
    description: 'Meditation session minutes (coming soon).',
    iconKey: 'Brain',
    status: 'coming_soon',
    connectionType: 'oauth2',
    stateSource: 'data_source_connections',
    connectPath: null,
    disconnectPath: null,
    wearablesCrossLink: null,
    sortOrder: 60,
  },
  {
    slug: 'calm',
    displayName: 'Calm',
    category: 'Mindfulness',
    description: 'Meditation and sleep stories (coming soon).',
    iconKey: 'Brain',
    status: 'coming_soon',
    connectionType: 'oauth2',
    stateSource: 'data_source_connections',
    connectPath: null,
    disconnectPath: null,
    wearablesCrossLink: null,
    sortOrder: 70,
  },
  {
    slug: 'genetics_file_import',
    displayName: 'Genetics file import',
    category: 'Data Import',
    description: 'Upload raw DNA or methylation reports in Genetics.',
    iconKey: 'Dna',
    status: 'live',
    connectionType: 'file_import',
    stateSource: 'none',
    connectPath: '/genetics/upload',
    disconnectPath: null,
    wearablesCrossLink: null,
    sortOrder: 80,
  },
];

export const PLUGIN_PAGE_SUBTITLE = 'Connect your apps';

export const PLUGIN_STATE_COPY = {
  connected: 'Connected',
  available: 'Available',
  comingSoon: 'Coming soon',
  unavailable: 'State unavailable. Retry.',
  connectedSince: (iso: string) => {
    try {
      return `Connected since ${new Date(iso).toLocaleDateString()}`;
    } catch {
      return 'Connected';
    }
  },
  lastSync: (iso: string | null) => {
    if (!iso) return 'Not synced yet';
    try {
      return `Last sync ${new Date(iso).toLocaleString()}`;
    } catch {
      return 'Last sync unknown';
    }
  },
  wearablesLink: 'Manage devices in Wearables Data',
  disconnect: 'Disconnect',
  connect: 'Connect',
  open: 'Open',
  retry: 'Retry',
} as const;
