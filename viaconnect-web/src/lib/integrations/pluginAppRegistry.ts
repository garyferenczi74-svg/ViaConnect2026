/**
 * Apps-only plugin registry contracts (Picasso /plugins IA).
 * Wearable devices are not listed here. They live under Wearables Data
 * at /body-tracker/connections. No em/en dashes.
 */

export type PluginAppCategory =
  | 'Health Platforms'
  | 'Nutrition'
  | 'Fitness'
  | 'Mindfulness'
  | 'Data Import'
  | 'Other';

export type PluginSectionId = 'Health platforms' | 'Nutrition' | 'Fitness' | 'other';

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

/** Device wearables and non-app surfaces stay off /plugins. */
export const PLUGIN_PAGE_EXCLUDED_SLUGS = [
  'whoop',
  'oura',
  'hume',
  'hume_body_pod',
  'apple_health',
  'apple_watch',
  'apple',
  'viacura',
  'helix',
  'genetics_file_import',
] as const;

export const PLUGIN_SECTION_ORDER: readonly PluginSectionId[] = [
  'Health platforms',
  'Nutrition',
  'Fitness',
  'other',
];

/** Fallback seed if DB registry is empty or unavailable (matches migration seed). */
export const PLUGIN_APP_REGISTRY_FALLBACK: PluginAppRegistryRow[] = [
  {
    slug: 'google_health',
    displayName: 'Google Health',
    category: 'Health Platforms',
    description: 'Weight, sleep, and activity feed Bio Optimization.',
    iconKey: 'HeartPulse',
    status: 'coming_soon',
    connectionType: 'oauth2',
    stateSource: 'body_tracker_connections',
    connectPath: null,
    disconnectPath: null,
    wearablesCrossLink: null,
    sortOrder: 10,
  },
  {
    slug: 'myfitnesspal',
    displayName: 'MyFitnessPal',
    category: 'Nutrition',
    description: 'Meals, macros, and water.',
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
    description: 'Food diary and micronutrients.',
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
    description: 'Workouts and activity history.',
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
    description: 'Indoor cycling and class history.',
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
    description: 'Meditation session minutes.',
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
    description: 'Meditation and sleep stories.',
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
    description: 'Raw DNA or methylation reports.',
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

export const PLUGIN_PAGE_SCOPE_LINE =
  'App integrations only. Device wearables under Wearables Data (/body-tracker/connections).';

export const PLUGIN_COMING_SOON_ACTION =
  'No action yet. We enable Connect when the flow ships.';

export function pluginSectionFor(category: PluginAppCategory): PluginSectionId {
  if (category === 'Health Platforms') return 'Health platforms';
  if (category === 'Nutrition') return 'Nutrition';
  if (category === 'Fitness') return 'Fitness';
  return 'other';
}

export function isExcludedPluginSlug(slug: string): boolean {
  return (PLUGIN_PAGE_EXCLUDED_SLUGS as readonly string[]).includes(slug);
}

/** Connect only when a real OAuth or ingest path is already wired. */
export function isPluginConnectWired(app: PluginAppRegistryRow): boolean {
  if (app.status !== 'live') return false;
  if (!app.connectPath) return false;
  if (isExcludedPluginSlug(app.slug)) return false;
  return (
    app.connectionType === 'oauth2' ||
    app.connectionType === 'polling' ||
    app.connectionType === 'file_import'
  );
}

export function isPluginPageApp(app: PluginAppRegistryRow): boolean {
  if (isExcludedPluginSlug(app.slug)) return false;
  if (app.connectionType === 'file_import') return false;
  return true;
}

/**
 * Connections lists Whoop, Hume Body Pod, Apple Health, Oura only.
 * Google has no tile there. Coming soon is the honest CTA.
 */
export function honestPluginAppRow(app: PluginAppRegistryRow): PluginAppRegistryRow {
  if (app.slug !== 'google_health') return app;
  return {
    ...app,
    status: 'coming_soon',
    wearablesCrossLink: null,
  };
}

/** Manage must not claim Connections will show Google. */
export function isTruthfulWearablesManage(app: {
  slug: string;
  wearablesCrossLink: string | null;
}): boolean {
  if (!app.wearablesCrossLink) return false;
  if (app.slug === 'google_health') return false;
  return true;
}

export const PLUGIN_STATE_COPY = {
  notConnected: 'Not connected',
  connected: 'Connected',
  comingSoon: 'Coming soon',
  needsReconnect: 'Needs reconnect',
  stateUnavailable: 'State unavailable. Retry.',
  connectedSince: (iso: string) => {
    const ms = new Date(iso).getTime();
    if (!Number.isFinite(ms)) return 'Connected';
    return `Connected since ${new Date(iso).toLocaleDateString()}`;
  },
  lastSync: (relative: string) => `Last sync ${relative}`,
  manage: 'Manage in Wearables Data',
  disconnect: 'Disconnect',
  connect: 'Connect',
  retry: 'Retry',
  noActionYet: 'No action yet.',
} as const;
