// Assemble first-class tiles + score-detail rows from persisted ingest.
// Never invent last-sync or numeric zeros.

import {
  buildWearableTiles,
  SCORE_DETAIL_DIMENSIONS,
  type FirstClassTileId,
  type OAuthConnectionRow,
  type WearableDimension,
  type WearableTileInput,
  type WearableTileView,
} from './wearable-tiles';
import { matchesHume } from './connected-sources/registry';
import {
  buildDimensionSourceRows,
  type DimensionSourceRow,
  type SourceValue,
} from './source-disagreement';

export const SOURCE_TRUST = {
  whoop: 0.85,
  oura: 0.85,
  hume: 0.8,
  apple_health: 0.75,
  manual: 1,
} as const;

export interface ConnectedSourceRow {
  provider: string;
  status: string;
  last_sync_at: string | null;
}

export interface TokenPresenceRow {
  provider: string;
}

export interface AppleImportRow {
  records_ingested: number | null;
  created_at: string | null;
  updated_at?: string | null;
}

export interface HumeBodyRow {
  measured_at: string | null;
  updated_at: string | null;
  source_app: string | null;
  weight_kg: number | string | null;
  body_fat_pct: number | string | null;
}

export interface SleepIngestRow {
  source_provider: string;
  sleep_efficiency_pct: number | string | null;
  total_sleep_min: number | string | null;
  end_at: string | null;
  source_app?: string | null;
}

export interface RecoveryIngestRow {
  source_provider: string;
  recovery_score: number | string | null;
  cycle_date: string | null;
}

export interface WorkoutIngestRow {
  source_provider: string;
  strain: number | string | null;
  start_at: string | null;
}

export interface WearableSnapshotInput {
  connected: ConnectedSourceRow[];
  tokenProviders: string[];
  appleImports: AppleImportRow[];
  bodyRows: HumeBodyRow[];
  sleepRows: SleepIngestRow[];
  recoveryRows: RecoveryIngestRow[];
  workoutRows: WorkoutIngestRow[];
  healthKitPersisted: boolean;
  healthKitLastPersistAt: string | null;
  whoopConfigured: boolean;
  ouraConfigured: boolean;
  platform: 'web' | 'ios' | 'android';
  metabolicManual: boolean;
}

export interface WearableSnapshot {
  tiles: WearableTileView[];
  scoreDetail: DimensionSourceRow[];
  lastUpdatedAt: string | null;
}

function finiteOrNull(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function latestIso(values: Array<string | null | undefined>): string | null {
  const dates = values.filter((v): v is string => typeof v === 'string' && v.length > 0);
  if (!dates.length) return null;
  return dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
}

export function oauthRowsFromConnected(
  connected: ConnectedSourceRow[],
  tokenProviders: string[],
): OAuthConnectionRow[] {
  const tokenSet = new Set(tokenProviders);
  return connected
    .filter((r) => r.provider === 'whoop' || r.provider === 'oura')
    .map((r) => ({
      provider: r.provider,
      status: r.status,
      last_sync_at: r.last_sync_at,
      has_tokens: tokenSet.has(r.provider),
    }));
}

export function tileInputFromSnapshot(input: WearableSnapshotInput): WearableTileInput {
  const humeRows = input.bodyRows.filter((r) => matchesHume(r.source_app));
  const appleXml = input.appleImports.filter((r) => (r.records_ingested ?? 0) > 0);
  const dimensionsFed: Partial<Record<FirstClassTileId, WearableDimension[]>> = {};

  const whoopSleep = input.sleepRows.some((r) => r.source_provider === 'whoop');
  const whoopRec = input.recoveryRows.some((r) => r.source_provider === 'whoop' && finiteOrNull(r.recovery_score) !== null);
  const whoopStrain = input.workoutRows.some((r) => r.source_provider === 'whoop' && finiteOrNull(r.strain) !== null);
  const whoopDims: WearableDimension[] = [];
  if (whoopRec) whoopDims.push('recovery');
  if (whoopSleep) whoopDims.push('sleep');
  if (whoopStrain) whoopDims.push('strain');
  if (whoopDims.length) dimensionsFed.whoop = whoopDims;

  const ouraSleep = input.sleepRows.some((r) => r.source_provider === 'oura');
  const ouraRec = input.recoveryRows.some((r) => r.source_provider === 'oura' && finiteOrNull(r.recovery_score) !== null);
  const ouraDims: WearableDimension[] = [];
  if (ouraRec) ouraDims.push('recovery');
  if (ouraSleep) ouraDims.push('sleep');
  if (ouraDims.length) dimensionsFed.oura = ouraDims;

  if (humeRows.length) dimensionsFed.hume = ['metabolic'];

  const appleSleep = input.sleepRows.some(
    (r) => r.source_provider === 'health_kit' && !matchesHume(r.source_app),
  );
  const appleBody = input.bodyRows.some((r) => !matchesHume(r.source_app) && finiteOrNull(r.weight_kg) !== null);
  const appleDims: WearableDimension[] = [];
  if (appleSleep) appleDims.push('sleep');
  if (appleBody || appleXml.length) appleDims.push('metabolic');
  if (appleDims.length) dimensionsFed.apple_health = appleDims;

  return {
    oauth: oauthRowsFromConnected(input.connected, input.tokenProviders),
    humeIngestCount: humeRows.length,
    humeLastPersistAt: latestIso(humeRows.map((r) => r.updated_at ?? r.measured_at)),
    appleXmlIngested: appleXml.reduce((n, r) => n + (r.records_ingested ?? 0), 0),
    appleXmlLastPersistAt: latestIso(appleXml.map((r) => r.updated_at ?? r.created_at)),
    healthKitPersisted: input.healthKitPersisted,
    healthKitLastPersistAt: input.healthKitLastPersistAt,
    dimensionsFed,
    whoopConfigured: input.whoopConfigured,
    ouraConfigured: input.ouraConfigured,
    platform: input.platform,
  };
}

function sourceForProvider(provider: string, hume: boolean): { source: string; label: string; trust: number } {
  if (hume) return { source: 'hume', label: 'Hume', trust: SOURCE_TRUST.hume };
  if (provider === 'whoop') return { source: 'whoop', label: 'Whoop', trust: SOURCE_TRUST.whoop };
  if (provider === 'oura') return { source: 'oura', label: 'Oura', trust: SOURCE_TRUST.oura };
  return { source: 'apple_health', label: 'Apple Health', trust: SOURCE_TRUST.apple_health };
}

export function scoreDetailFromSnapshot(input: WearableSnapshotInput): DimensionSourceRow[] {
  const sleepSources: SourceValue[] = [];
  for (const row of input.sleepRows) {
    const meta = sourceForProvider(row.source_provider, matchesHume(row.source_app));
    const score = finiteOrNull(row.sleep_efficiency_pct);
    sleepSources.push({
      source: meta.source,
      label: meta.source === 'whoop' ? 'Whoop Sleep' : meta.source === 'oura' ? 'Oura Sleep' : 'Apple Health Sleep',
      value: score,
      trust: meta.trust,
    });
  }

  const recoverySources: SourceValue[] = [];
  for (const row of input.recoveryRows) {
    const meta = sourceForProvider(row.source_provider, false);
    recoverySources.push({
      source: meta.source,
      label: meta.source === 'whoop' ? 'Whoop Recovery' : 'Oura Recovery',
      value: finiteOrNull(row.recovery_score),
      trust: meta.trust,
    });
  }

  const strainSources: SourceValue[] = [];
  for (const row of input.workoutRows) {
    if (row.source_provider !== 'whoop') continue;
    strainSources.push({
      source: 'whoop',
      label: 'Whoop Strain',
      value: finiteOrNull(row.strain),
      trust: SOURCE_TRUST.whoop,
    });
  }

  const humeBody = input.bodyRows.filter((r) => matchesHume(r.source_app));
  const appleBody = input.bodyRows.filter((r) => !matchesHume(r.source_app));
  const metabolicSources: SourceValue[] = [
    {
      source: 'hume',
      label: 'Hume Metabolic Score',
      value: finiteOrNull(humeBody[0]?.body_fat_pct),
      trust: SOURCE_TRUST.hume,
    },
    {
      source: 'apple_health',
      label: 'Apple Health Body/Weight',
      value: finiteOrNull(appleBody[0]?.weight_kg),
      trust: SOURCE_TRUST.apple_health,
    },
  ];

  return buildDimensionSourceRows(SCORE_DETAIL_DIMENSIONS, [
    { dimension: 'sleep', sources: sleepSources },
    { dimension: 'recovery', sources: recoverySources },
    { dimension: 'strain', sources: strainSources },
    { dimension: 'metabolic', sources: metabolicSources, manual: input.metabolicManual },
  ]);
}

export function assembleWearableSnapshot(input: WearableSnapshotInput): WearableSnapshot {
  const tiles = buildWearableTiles(tileInputFromSnapshot(input));
  const scoreDetail = scoreDetailFromSnapshot(input);
  const lastUpdatedAt = latestIso([
    ...input.bodyRows.map((r) => r.updated_at ?? r.measured_at),
    ...input.sleepRows.map((r) => r.end_at),
    ...input.recoveryRows.map((r) => (r.cycle_date ? `${r.cycle_date}T00:00:00.000Z` : null)),
    ...input.workoutRows.map((r) => r.start_at),
    ...input.appleImports.map((r) => r.updated_at ?? r.created_at),
    ...input.connected.map((r) => r.last_sync_at),
  ]);
  return { tiles, scoreDetail, lastUpdatedAt };
}

export function formatTileLastSync(
  lastSyncAt: string | null,
  kind: 'oauth_sync' | 'xml_upload' | null,
  now = Date.now(),
): string | null {
  if (!lastSyncAt) return null;
  const then = new Date(lastSyncAt).getTime();
  if (!Number.isFinite(then)) return null;
  const deltaMs = Math.max(0, now - then);
  const minutes = Math.floor(deltaMs / 60000);
  const prefix = kind === 'xml_upload' ? 'Last upload' : 'Last sync';
  if (minutes < 60) return `${prefix} ${Math.max(1, minutes)}m ago`;
  const day = new Date(lastSyncAt);
  const sameDay = new Date(now).toDateString() === day.toDateString();
  const time = day.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase().replace(' ', '');
  if (sameDay) return `${prefix} today ${time}`;
  return `${prefix} ${day.toLocaleDateString()} ${time}`;
}

export function formatScoreDetailFooter(lastUpdatedAt: string | null, now = Date.now()): string {
  if (!lastUpdatedAt) return 'Scores update daily';
  const d = new Date(lastUpdatedAt);
  if (!Number.isFinite(d.getTime())) return 'Scores update daily';
  const sameDay = new Date(now).toDateString() === d.toDateString();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return sameDay
    ? `Scores update daily • Last updated today, ${time}`
    : `Scores update daily • Last updated ${d.toLocaleDateString()}, ${time}`;
}
