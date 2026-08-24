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
import { resolveArnoldTrust, vendorFromIngest } from './arnold-trust';
import {
  buildDimensionSourceRows,
  type DimensionSourceRow,
  type SourceValue,
} from './source-disagreement';
import { formatSyncedRelative } from '@/lib/body-tracker/last-sync-state';

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
  manualMetabolicValue?: number | null;
  trustOverrides?: Record<string, number> | null;
  now?: number;
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
    googleHealthConfigured: false,
    garminConfigured: false,
    platform: input.platform,
    now: input.now,
  };
}

function sourceForIngest(
  provider: string,
  sourceApp: string | null | undefined,
  hume: boolean,
  overrides?: Record<string, number> | null,
): { vendor: string; shortLabel: string; trust: number } {
  const meta = vendorFromIngest({ provider, sourceApp, hume });
  return {
    vendor: meta.vendor,
    shortLabel: meta.shortLabel,
    trust: resolveArnoldTrust(meta.arnoldSource, overrides),
  };
}

function latestByVendor<T>(
  rows: T[],
  vendorOf: (row: T) => string,
  timeOf: (row: T) => string | null | undefined,
): T[] {
  const map = new Map<string, T>();
  for (const row of rows) {
    const vendor = vendorOf(row);
    const prev = map.get(vendor);
    if (!prev || (timeOf(row) ?? '') > (timeOf(prev) ?? '')) map.set(vendor, row);
  }
  return [...map.values()];
}

function sleepLabel(vendor: string): string {
  if (vendor === 'whoop') return 'Whoop Sleep';
  if (vendor === 'oura') return 'Oura Sleep';
  if (vendor === 'apple_watch') return 'Apple Watch Sleep';
  return 'Apple Health Sleep';
}

function recoveryLabel(vendor: string): string {
  if (vendor === 'whoop') return 'Whoop Recovery';
  return 'Oura Readiness';
}

function metabolicPair(input: WearableSnapshotInput): SourceValue[] {
  const overrides = input.trustOverrides;
  const humeBody = input.bodyRows.filter((r) => matchesHume(r.source_app));
  const appleBody = input.bodyRows.filter((r) => !matchesHume(r.source_app));
  const humeWeight = finiteOrNull(humeBody[0]?.weight_kg);
  const appleWeight = finiteOrNull(appleBody[0]?.weight_kg);
  const humeBf = finiteOrNull(humeBody[0]?.body_fat_pct);
  const appleBf = finiteOrNull(appleBody[0]?.body_fat_pct);
  const humeTrust = resolveArnoldTrust('wearable:hume_body_pod', overrides);
  const appleMeta = vendorFromIngest({
    provider: 'health_kit',
    sourceApp: appleBody[0]?.source_app,
  });
  const appleTrust = resolveArnoldTrust(appleMeta.arnoldSource, overrides);

  const sources: SourceValue[] = [];
  if (humeWeight !== null && appleWeight !== null) {
    sources.push({
      source: 'hume',
      label: 'Hume Weight',
      shortLabel: 'Hume',
      value: humeWeight,
      trust: humeTrust,
      metricKey: 'weight',
    });
    sources.push({
      source: appleMeta.vendor,
      label: `${appleMeta.shortLabel} Weight`,
      shortLabel: appleMeta.shortLabel,
      value: appleWeight,
      trust: appleTrust,
      metricKey: 'weight',
    });
  } else if (humeBf !== null && appleBf !== null) {
    sources.push({
      source: 'hume',
      label: 'Hume Body Fat',
      shortLabel: 'Hume',
      value: humeBf,
      trust: humeTrust,
      metricKey: 'body_fat',
    });
    sources.push({
      source: appleMeta.vendor,
      label: `${appleMeta.shortLabel} Body Fat`,
      shortLabel: appleMeta.shortLabel,
      value: appleBf,
      trust: appleTrust,
      metricKey: 'body_fat',
    });
  } else {
    if (humeBf !== null) {
      sources.push({
        source: 'hume',
        label: 'Hume Body Fat',
        shortLabel: 'Hume',
        value: humeBf,
        trust: humeTrust,
        metricKey: 'body_fat',
      });
    } else if (humeWeight !== null) {
      sources.push({
        source: 'hume',
        label: 'Hume Weight',
        shortLabel: 'Hume',
        value: humeWeight,
        trust: humeTrust,
        metricKey: 'weight',
      });
    }
    if (appleWeight !== null) {
      sources.push({
        source: appleMeta.vendor,
        label: `${appleMeta.shortLabel} Weight`,
        shortLabel: appleMeta.shortLabel,
        value: appleWeight,
        trust: appleTrust,
        metricKey: 'weight',
      });
    } else if (appleBf !== null) {
      sources.push({
        source: appleMeta.vendor,
        label: `${appleMeta.shortLabel} Body Fat`,
        shortLabel: appleMeta.shortLabel,
        value: appleBf,
        trust: appleTrust,
        metricKey: 'body_fat',
      });
    }
  }
  if (input.metabolicManual && input.manualMetabolicValue != null) {
    sources.push({
      source: 'manual',
      label: 'Manual',
      shortLabel: 'Manual',
      value: finiteOrNull(input.manualMetabolicValue),
      trust: resolveArnoldTrust('manual', overrides),
      manual: true,
    });
  }
  return sources;
}

export function scoreDetailFromSnapshot(input: WearableSnapshotInput): DimensionSourceRow[] {
  const overrides = input.trustOverrides;

  const sleepLatest = latestByVendor(
    input.sleepRows.filter((r) => !matchesHume(r.source_app)),
    (row) => vendorFromIngest({ provider: row.source_provider, sourceApp: row.source_app }).vendor,
    (row) => row.end_at,
  );
  const sleepSources: SourceValue[] = sleepLatest.map((row) => {
    const meta = sourceForIngest(row.source_provider, row.source_app, false, overrides);
    return {
      source: meta.vendor,
      label: sleepLabel(meta.vendor),
      shortLabel: meta.shortLabel,
      value: finiteOrNull(row.sleep_efficiency_pct),
      trust: meta.trust,
    };
  });

  const recoveryLatest = latestByVendor(
    input.recoveryRows.filter((r) => r.source_provider === 'whoop' || r.source_provider === 'oura'),
    (row) => row.source_provider,
    (row) => row.cycle_date,
  );
  const recoverySources: SourceValue[] = recoveryLatest.map((row) => {
    const meta = sourceForIngest(row.source_provider, null, false, overrides);
    return {
      source: meta.vendor,
      label: recoveryLabel(meta.vendor),
      shortLabel: meta.shortLabel,
      value: finiteOrNull(row.recovery_score),
      trust: meta.trust,
    };
  });

  const strainSources: SourceValue[] = [];
  const whoopWorkouts = latestByVendor(
    input.workoutRows.filter((row) => row.source_provider === 'whoop'),
    () => 'whoop',
    (row) => row.start_at,
  );
  for (const row of whoopWorkouts) {
    // Strain is Whoop native only. Arnold has no activity→strain map.
    const meta = sourceForIngest('whoop', null, false, overrides);
    strainSources.push({
      source: 'whoop',
      label: 'Whoop Strain',
      shortLabel: meta.shortLabel,
      value: finiteOrNull(row.strain),
      trust: meta.trust,
    });
  }

  return buildDimensionSourceRows(SCORE_DETAIL_DIMENSIONS, [
    { dimension: 'sleep', sources: sleepSources },
    { dimension: 'recovery', sources: recoverySources },
    { dimension: 'strain', sources: strainSources },
    { dimension: 'metabolic', sources: metabolicPair(input), manual: input.metabolicManual },
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
  _kind: 'oauth_sync' | 'xml_upload' | null,
  now = Date.now(),
): string | null {
  if (!lastSyncAt) return null;
  return formatSyncedRelative(lastSyncAt, now);
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
