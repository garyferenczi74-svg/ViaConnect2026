// Prompt #124 P2: Vision config loader.
//
// Reads marshall_vision_config into a strongly-typed snapshot. The snapshot
// is the single source of truth for every kill-switch check:
//   - Is the pipeline ON at all? (mode)
//   - Is the specific source enabled? (source.hounddog_marketplace, etc.)
//   - Is the specific takedown platform enabled? (takedown.amazon_brand_registry, etc.)
//   - What are the rate-limit ceilings?
//
// Defaults are returned when the DB is unavailable — fail-safe to SHADOW
// mode with all external sources off, so a transient Supabase outage can
// never accidentally leak determinations into findings.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  EvaluationSource,
  TakedownMechanism,
  VisionConfigSnapshot,
  VisionMode,
} from './types';
import { SOURCES, TAKEDOWN_MECHANISMS } from './types';

type ConfigRow = { key: string; value: unknown };

const DEFAULT_SNAPSHOT: VisionConfigSnapshot = {
  mode: 'shadow',
  sourceEnabled: Object.fromEntries(
    SOURCES.map((s) => [s, false]),
  ) as Record<EvaluationSource, boolean>,
  takedownEnabled: Object.fromEntries(
    TAKEDOWN_MECHANISMS.map((m) => [m, false]),
  ) as Record<TakedownMechanism, boolean>,
  rateLimitDailyCapPerSource: 1000,
  rateLimitPerPractitionerDaily: 25,
  rateLimitPerConsumerDaily: 5,
};

export async function loadVisionConfig(supabase: SupabaseClient): Promise<VisionConfigSnapshot> {
  const { data, error } = await supabase
    .from('marshall_vision_config')
    .select('key, value');
  if (error) {
    // eslint-disable-next-line no-console
    console.error('marshall vision config: load failed, returning fail-safe shadow default', error);
    return { ...DEFAULT_SNAPSHOT };
  }
  return applyRows(DEFAULT_SNAPSHOT, (data ?? []) as ConfigRow[]);
}

/**
 * Apply an array of DB rows onto a base snapshot. Exposed for unit tests so
 * we don't need a live Supabase client to exercise the parsing logic.
 */
export function applyRows(base: VisionConfigSnapshot, rows: ConfigRow[]): VisionConfigSnapshot {
  const snap: VisionConfigSnapshot = {
    ...base,
    sourceEnabled: { ...base.sourceEnabled },
    takedownEnabled: { ...base.takedownEnabled },
  };
  for (const row of rows) {
    applyRow(snap, row);
  }
  return snap;
}

function applyRow(snap: VisionConfigSnapshot, row: ConfigRow): void {
  const key = row.key;
  const value = row.value;
  if (key === 'mode') {
    const v = asString(value);
    if (v === 'active' || v === 'shadow' || v === 'off') {
      snap.mode = v as VisionMode;
    }
    return;
  }
  if (key.startsWith('source.')) {
    const source = key.slice('source.'.length) as EvaluationSource;
    if ((SOURCES as readonly string[]).includes(source)) {
      snap.sourceEnabled[source] = asBool(value);
    }
    return;
  }
  if (key.startsWith('takedown.')) {
    const mech = key.slice('takedown.'.length) as TakedownMechanism;
    if ((TAKEDOWN_MECHANISMS as readonly string[]).includes(mech)) {
      snap.takedownEnabled[mech] = asBool(value);
    }
    return;
  }
  if (key === 'rate_limit.daily_cap_per_source') {
    snap.rateLimitDailyCapPerSource = asNumber(value, snap.rateLimitDailyCapPerSource);
    return;
  }
  if (key === 'rate_limit.per_practitioner_daily') {
    snap.rateLimitPerPractitionerDaily = asNumber(value, snap.rateLimitPerPractitionerDaily);
    return;
  }
  if (key === 'rate_limit.per_consumer_daily') {
    snap.rateLimitPerConsumerDaily = asNumber(value, snap.rateLimitPerConsumerDaily);
    return;
  }
}

/** True when the pipeline should produce findings (mode=active + source on). */
export function canProduceFindings(snap: VisionConfigSnapshot, source: EvaluationSource): boolean {
  return snap.mode === 'active' && snap.sourceEnabled[source] === true;
}

/** True when the pipeline should still RUN the evaluation even if not producing findings (shadow mode). */
export function canEvaluate(snap: VisionConfigSnapshot, source: EvaluationSource): boolean {
  if (snap.mode === 'off') return false;
  return snap.sourceEnabled[source] === true;
}

/** True when a given takedown mechanism is enabled. */
export function canDraftTakedown(snap: VisionConfigSnapshot, mech: TakedownMechanism): boolean {
  return snap.takedownEnabled[mech] === true;
}

function asBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v === 'true' || v === '1';
  return false;
}

function asNumber(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function asString(v: unknown): string | null {
  if (typeof v === 'string') return v;
  return null;
}
