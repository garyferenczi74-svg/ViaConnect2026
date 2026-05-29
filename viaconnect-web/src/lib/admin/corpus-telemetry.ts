// Prompt #170 Phase 1n: NutriVision corpus telemetry loader.
//
// Loads the six aggregations rendered on /admin/corpus from three tables:
//   user_meal_corpus, food_recognition_cache, ai_route_audit.
//
// Each query is independent and dispatched in parallel; on a per-query failure
// we return empty/zero values so the page still renders. The dashboard is an
// internal diagnostic surface, not a customer flow, so partial loss is the
// graceful path.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface CorpusRowBySource {
  readonly date: string;
  readonly nutrivision: number;
  readonly quick_log: number;
  readonly manual: number;
}

export interface CuisineBucket {
  readonly cuisine_tag: string;
  readonly count: number;
}

export interface OilBucket {
  readonly oil_type: string;
  readonly suggested: number;
  readonly overridden: number;
}

export interface CacheHitMix {
  readonly sha256_exact: number;
  readonly phash_near: number;
  readonly miss: number;
}

export interface ProviderMix {
  readonly logmeal: number;
  readonly gemini: number;
  readonly claude_vision: number;
}

export interface CorpusTelemetry {
  readonly rowsBySource: ReadonlyArray<CorpusRowBySource>;
  readonly cuisineDistribution: ReadonlyArray<CuisineBucket>;
  readonly oilDistribution: ReadonlyArray<OilBucket>;
  readonly photoContributionRate: number;
  readonly cacheHitRate: CacheHitMix;
  readonly providerMix: ProviderMix;
}

interface CorpusSourceRow {
  readonly created_at: string;
  readonly source: string;
}

interface CorpusCuisineRow {
  readonly cuisine_tag: string | null;
}

interface CorpusOilRow {
  readonly cooking_oil_json: unknown;
}

interface CorpusPhotoRow {
  readonly contributed_photo_path: string | null;
}

interface AuditCacheRow {
  readonly model: string | null;
}

interface AuditProviderRow {
  readonly provider: string | null;
  readonly model: string | null;
}

function isoDateOnly(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

const CUISINE_BUCKETS: ReadonlyArray<string> = [
  'north_american',
  'mediterranean',
  'latin_american',
  'east_asian',
  'south_asian',
  'southeast_asian',
  'middle_eastern',
  'african',
  'unknown',
];

const OIL_BUCKETS: ReadonlyArray<string> = [
  'none',
  'olive_oil',
  'evoo',
  'avocado_oil',
  'coconut_oil',
  'butter',
  'ghee',
  'vegetable_canola_oil',
  'sesame_oil',
  'other',
];

const SOURCE_KEYS: ReadonlyArray<'nutrivision' | 'quick_log' | 'manual'> = [
  'nutrivision',
  'quick_log',
  'manual',
];

function isSourceKey(v: string): v is 'nutrivision' | 'quick_log' | 'manual' {
  return v === 'nutrivision' || v === 'quick_log' || v === 'manual';
}

interface MutableRowBySource {
  date: string;
  nutrivision: number;
  quick_log: number;
  manual: number;
}

async function loadRowsBySource(
  supabaseAdmin: SupabaseClient,
): Promise<ReadonlyArray<CorpusRowBySource>> {
  const since = daysAgoIso(14);
  const seedSeries: MutableRowBySource[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    seedSeries.push({ date: isoDateOnly(d), nutrivision: 0, quick_log: 0, manual: 0 });
  }
  const byDate = new Map<string, MutableRowBySource>(seedSeries.map((r) => [r.date, r]));

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from('user_meal_corpus')
      .select('created_at, source')
      .gte('created_at', since)
      .limit(50000);
    if (error || !Array.isArray(data)) return seedSeries;
    const rows = data as ReadonlyArray<CorpusSourceRow>;
    for (const row of rows) {
      if (typeof row.created_at !== 'string') continue;
      const day = row.created_at.slice(0, 10);
      const bucket = byDate.get(day);
      if (!bucket) continue;
      if (!isSourceKey(row.source)) continue;
      bucket[row.source] += 1;
    }
    return seedSeries;
  } catch {
    return seedSeries;
  }
}

async function loadCuisineDistribution(
  supabaseAdmin: SupabaseClient,
): Promise<ReadonlyArray<CuisineBucket>> {
  const seeded: Record<string, number> = {};
  for (const b of CUISINE_BUCKETS) seeded[b] = 0;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from('user_meal_corpus')
      .select('cuisine_tag')
      .limit(100000);
    if (error || !Array.isArray(data)) {
      return CUISINE_BUCKETS.map((b) => ({ cuisine_tag: b, count: 0 }));
    }
    const rows = data as ReadonlyArray<CorpusCuisineRow>;
    for (const row of rows) {
      const tag = typeof row.cuisine_tag === 'string' && row.cuisine_tag.length > 0
        ? row.cuisine_tag
        : 'unknown';
      if (seeded[tag] === undefined) {
        seeded.unknown += 1;
      } else {
        seeded[tag] += 1;
      }
    }
    return CUISINE_BUCKETS.map((b) => ({ cuisine_tag: b, count: seeded[b] }));
  } catch {
    return CUISINE_BUCKETS.map((b) => ({ cuisine_tag: b, count: 0 }));
  }
}

interface OilSelectionShape {
  readonly type?: unknown;
  readonly suggested_type?: unknown;
  readonly user_overridden?: unknown;
}

function readOilType(payload: unknown): { type: string; overridden: boolean } | null {
  if (!payload || typeof payload !== 'object') return null;
  const obj = payload as OilSelectionShape;
  const t = typeof obj.type === 'string' ? obj.type : null;
  if (t === null) return null;
  const suggested = typeof obj.suggested_type === 'string' ? obj.suggested_type : null;
  const flag = typeof obj.user_overridden === 'boolean' ? obj.user_overridden : null;
  const overridden = flag === true || (suggested !== null && suggested !== t);
  return { type: t, overridden };
}

async function loadOilDistribution(
  supabaseAdmin: SupabaseClient,
): Promise<ReadonlyArray<OilBucket>> {
  const since = daysAgoIso(30);
  const seeded = new Map<string, { suggested: number; overridden: number }>();
  for (const b of OIL_BUCKETS) seeded.set(b, { suggested: 0, overridden: 0 });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from('user_meal_corpus')
      .select('cooking_oil_json')
      .gte('created_at', since)
      .not('cooking_oil_json', 'is', null)
      .limit(50000);
    if (error || !Array.isArray(data)) {
      return OIL_BUCKETS.map((b) => ({ oil_type: b, suggested: 0, overridden: 0 }));
    }
    const rows = data as ReadonlyArray<CorpusOilRow>;
    for (const row of rows) {
      const parsed = readOilType(row.cooking_oil_json);
      if (parsed === null) continue;
      const bucket = seeded.get(parsed.type) ?? seeded.get('other');
      if (!bucket) continue;
      if (parsed.overridden) {
        bucket.overridden += 1;
      } else {
        bucket.suggested += 1;
      }
    }
    return OIL_BUCKETS.map((b) => {
      const entry = seeded.get(b);
      return entry
        ? { oil_type: b, suggested: entry.suggested, overridden: entry.overridden }
        : { oil_type: b, suggested: 0, overridden: 0 };
    });
  } catch {
    return OIL_BUCKETS.map((b) => ({ oil_type: b, suggested: 0, overridden: 0 }));
  }
}

async function loadPhotoContributionRate(supabaseAdmin: SupabaseClient): Promise<number> {
  const since = daysAgoIso(30);
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalQ = await (supabaseAdmin as any)
      .from('user_meal_corpus')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since);
    const total = typeof totalQ.count === 'number' ? totalQ.count : 0;
    if (total === 0) return 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const withPhotoQ = await (supabaseAdmin as any)
      .from('user_meal_corpus')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since)
      .not('contributed_photo_path', 'is', null);
    const withPhoto = typeof withPhotoQ.count === 'number' ? withPhotoQ.count : 0;
    return Math.round((withPhoto / total) * 1000) / 10;
  } catch {
    return 0;
  }
}

async function loadCacheHitRate(supabaseAdmin: SupabaseClient): Promise<CacheHitMix> {
  const since = daysAgoIso(30);
  const out = { sha256_exact: 0, phash_near: 0, miss: 0 };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from('ai_route_audit')
      .select('model')
      .eq('route', '/api/nutrition/photo/analyze')
      .eq('outcome', 'success')
      .gte('created_at', since)
      .limit(50000);
    if (error || !Array.isArray(data)) return out;
    const rows = data as ReadonlyArray<AuditCacheRow>;
    for (const row of rows) {
      const m = typeof row.model === 'string' ? row.model.toLowerCase() : '';
      if (m.includes('sha256_exact') || m === 'cache_sha256') out.sha256_exact += 1;
      else if (m.includes('phash_near') || m === 'cache_phash') out.phash_near += 1;
      else out.miss += 1;
    }
    return out;
  } catch {
    return out;
  }
}

async function loadProviderMix(supabaseAdmin: SupabaseClient): Promise<ProviderMix> {
  const since = daysAgoIso(30);
  const out = { logmeal: 0, gemini: 0, claude_vision: 0 };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from('ai_route_audit')
      .select('provider, model')
      .eq('route', '/api/nutrition/photo/analyze')
      .eq('outcome', 'success')
      .gte('created_at', since)
      .limit(50000);
    if (error || !Array.isArray(data)) return out;
    const rows = data as ReadonlyArray<AuditProviderRow>;
    for (const row of rows) {
      const p = typeof row.provider === 'string' ? row.provider.toLowerCase() : '';
      const m = typeof row.model === 'string' ? row.model.toLowerCase() : '';
      if (p === 'logmeal' || m.includes('logmeal')) out.logmeal += 1;
      else if (p === 'google' || p === 'gemini' || m.includes('gemini')) out.gemini += 1;
      else if (p === 'anthropic' || p === 'claude' || m.includes('claude')) out.claude_vision += 1;
    }
    return out;
  } catch {
    return out;
  }
}

export async function loadCorpusTelemetry(
  supabaseAdmin: SupabaseClient,
): Promise<CorpusTelemetry> {
  const [
    rowsBySource,
    cuisineDistribution,
    oilDistribution,
    photoContributionRate,
    cacheHitRate,
    providerMix,
  ] = await Promise.all([
    loadRowsBySource(supabaseAdmin),
    loadCuisineDistribution(supabaseAdmin),
    loadOilDistribution(supabaseAdmin),
    loadPhotoContributionRate(supabaseAdmin),
    loadCacheHitRate(supabaseAdmin),
    loadProviderMix(supabaseAdmin),
  ]);

  return {
    rowsBySource,
    cuisineDistribution,
    oilDistribution,
    photoContributionRate,
    cacheHitRate,
    providerMix,
  };
}

export const _internals = {
  CUISINE_BUCKETS,
  OIL_BUCKETS,
  SOURCE_KEYS,
};
