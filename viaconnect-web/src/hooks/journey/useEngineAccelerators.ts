'use client';

/**
 * src/hooks/journey/useEngineAccelerators.ts
 *
 * Prompt 208j Task J-T4. Reads real engine recommendations from:
 *   - recommendations (product_name, reason, category, confidence_level,
 *     confidence_score, priority_rank, user_id)
 *   - ultrathink_recommendations (farmceutica_product, rationale,
 *     health_signals, priority, rank, bioavailability_note, user_id)
 *
 * Merge strategy: take top 4 by rank/priority_rank across both tables.
 * Points (pts) are DERIVED from confidence_score or a priority-to-lift map
 * and are tagged "derived" via the source field on each EngineAccItem.
 *
 * Provenance dots come from ultrathink_recommendations.health_signals mapped
 * to the six Journey hubs. recommendation_audit is read once (latest row) to
 * supply a disclaimer_version tag only; it has no per-rec hub columns.
 *
 * Resilience: withTimeout(4000) + try/catch fail-open + safeLog on all reads.
 * Auth scoped: all queries filtered by user_id (auth.uid() via RLS).
 *
 * Rules: no em-dashes, no emojis, no any.
 * Lucide icons are not imported here (UI layer only); the caller supplies them.
 */

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

// ---------------------------------------------------------------------------
// Hub names (must match HUBS array in YourJourneyCoaching.tsx)
// ---------------------------------------------------------------------------

export const JOURNEY_HUB_KEYS = [
  'CAQ',
  'Genetics',
  'Labs',
  'Biology',
  'Nutrition',
  'Supplements',
] as const;

export type JourneyHubKey = (typeof JOURNEY_HUB_KEYS)[number];

// ---------------------------------------------------------------------------
// AccDot - single provenance dot
// ---------------------------------------------------------------------------

export interface AccDot {
  hub: JourneyHubKey;
  label: string;
  missing?: boolean;
}

// ---------------------------------------------------------------------------
// EngineAccItem - the shape used by AccCard in YourJourneyCoaching
// ---------------------------------------------------------------------------

export interface EngineAccItem {
  /**
   * Stable id for React keys and dedupe. Prefer the DB row id when present;
   * seeded items use their fixed slug.
   */
  id: string;
  /** Display headline */
  headline: string;
  /** Body copy */
  body: string;
  /** Category tag (uppercased by the caller) */
  tag: string;
  /**
   * Estimated lift in Bio Optimization points.
   * Always derived from engine signals (confidence_score or priority map).
   * Tagged via the derivedPts field so the UI can add a derived marker.
   */
  pts: number;
  /** "derived" when the number was computed rather than stored. Always "derived". */
  derivedPts: 'derived';
  /** "high" | "medium" - maps from confidence_level or priority */
  conf: 'high' | 'medium';
  /** Provenance dots for the "Why this, why you" expander */
  dots: AccDot[];
  /** Which engine produced this rec */
  source: 'recommendations' | 'ultrathink_recommendations' | 'seeded';
  /**
   * Normalized insight key for uniqueness (user_id, insight_key).
   * Derived from the product/headline; never a fabricated category pad.
   */
  insightKey: string;
}

// ---------------------------------------------------------------------------
// Appendix A seed items (Prompt 208i I-T2b constants, reused for fallback)
// ---------------------------------------------------------------------------

/**
 * Canonical four seeded accelerators from Appendix A.
 * Tagged source: "seeded" so callers can render them identically to engine recs.
 */
export const APPENDIX_A_SEEDS: EngineAccItem[] = [
  {
    id: 'seed-foundation-stack',
    insightKey: 'activate-foundation-stack',
    headline: 'Activate Foundation Stack',
    body: 'Magnesium Glycinate plus Vitamin D3/K2 to restore the baseline your score needs.',
    tag: 'SUPPLEMENT',
    pts: 10,
    derivedPts: 'derived',
    conf: 'high',
    dots: [
      { hub: 'Genetics', label: 'MTHFR C677T variant' },
      { hub: 'Labs', label: 'Homocysteine trending up' },
      { hub: 'CAQ', label: 'Fatigue you reported' },
    ],
    source: 'seeded',
  },
  {
    id: 'seed-sleep-window',
    insightKey: 'anchor-your-sleep-window',
    headline: 'Anchor Your Sleep Window',
    body: 'Hold a 30 minute sleep/wake window for 7 days. Biggest single lift for Bio Optimization.',
    tag: 'SLEEP',
    pts: 8,
    derivedPts: 'derived',
    conf: 'high',
    dots: [
      { hub: 'Biology', label: 'Recovery below target' },
    ],
    source: 'seeded',
  },
  {
    id: 'seed-omega-3',
    insightKey: 'add-omega-3-elite',
    headline: 'Add Omega 3 Elite',
    body: 'Bioavailable EPA/DHA at 10x to 28x absorption, paired with breakfast.',
    tag: 'SUPPLEMENT',
    pts: 6,
    derivedPts: 'derived',
    conf: 'medium',
    dots: [
      { hub: 'CAQ', label: 'Inflammation markers in CAQ' },
      { hub: 'Labs', label: 'Omega panel not on file yet', missing: true },
    ],
    source: 'seeded',
  },
  {
    id: 'seed-zone-2',
    insightKey: 'zone-2-movement-block',
    headline: 'Zone 2 Movement Block',
    body: 'Three 25 minute easy sessions this week; mitochondrial density payoff shows in 14 days.',
    tag: 'MOVEMENT',
    pts: 5,
    derivedPts: 'derived',
    conf: 'medium',
    dots: [
      { hub: 'Biology', label: 'Recovery supports easy load' },
    ],
    source: 'seeded',
  },
];

// ---------------------------------------------------------------------------
// Pure helpers (exported for TDD)
// ---------------------------------------------------------------------------

/**
 * Derive an estimated lift in Bio Optimization points from a confidence_score
 * (0.0 to 1.0 float from the recommendations table).
 * Tagged as derived: the number is computed, not stored.
 *
 * Scaling: score >= 0.8 -> 10 pts, >= 0.6 -> 8, >= 0.4 -> 6, else 4.
 * Returns an integer 1..10.
 */
export function liftFromConfidenceScore(score: number | null): number {
  if (score === null || !isFinite(score)) return 4;
  if (score >= 0.8) return 10;
  if (score >= 0.6) return 8;
  if (score >= 0.4) return 6;
  return 4;
}

/**
 * Derive an estimated lift from an ultrathink priority string.
 * Tagged as derived: the number is computed, not stored.
 *
 * Map: "critical" | "high" -> 10, "medium" -> 7, "low" -> 4, else 4.
 */
export function liftFromPriority(priority: string | null): number {
  if (!priority) return 4;
  const p = priority.toLowerCase().trim();
  if (p === 'critical' || p === 'high') return 10;
  if (p === 'medium') return 7;
  if (p === 'low') return 4;
  return 4;
}

/**
 * Map a confidence_level string to 'high' | 'medium'.
 * "high" -> "high"; anything else -> "medium".
 */
export function confLevelFromString(level: string | null): 'high' | 'medium' {
  if (level && level.toLowerCase().trim() === 'high') return 'high';
  return 'medium';
}

/**
 * Map an ultrathink priority string to 'high' | 'medium'.
 * "critical" | "high" -> "high"; everything else -> "medium".
 */
export function confLevelFromPriority(priority: string | null): 'high' | 'medium' {
  if (!priority) return 'medium';
  const p = priority.toLowerCase().trim();
  if (p === 'critical' || p === 'high') return 'high';
  return 'medium';
}

// Known health_signal phrases -> Journey hub key
// Maps partial/common substrings (case-insensitive) to hubs.
// Falls back to null (signal is not mapped to a hub).
const SIGNAL_HUB_MAP: Array<{ pattern: RegExp; hub: JourneyHubKey }> = [
  { pattern: /gene|mthfr|comt|genetic|snp|variant|dna/i, hub: 'Genetics' },
  { pattern: /lab|blood|test|panel|marker|result|homocysteine|vitamin d|b12/i, hub: 'Labs' },
  { pattern: /assessment|caq|questionnaire|report|symptom|fatigue|stress|survey/i, hub: 'CAQ' },
  { pattern: /hrv|recovery|heart rate|resting|sleep|biology|biometric|wearable|body/i, hub: 'Biology' },
  { pattern: /nutrition|diet|macro|calorie|meal|protein|carb|fat|intake/i, hub: 'Nutrition' },
  { pattern: /supplement|magnesium|vitamin|omega|d3|k2|zinc|iron|mineral/i, hub: 'Supplements' },
];

/**
 * Map a single health_signal string to a JourneyHubKey, or null when unmapped.
 * Pure, deterministic, never throws.
 */
export function signalToHub(signal: string): JourneyHubKey | null {
  for (const { pattern, hub } of SIGNAL_HUB_MAP) {
    if (pattern.test(signal)) return hub;
  }
  return null;
}

/**
 * Map an array of health_signals to AccDot[].
 * Deduplicated by hub: first signal matching a hub wins.
 * Signals that do not match any hub are discarded.
 * The dots are NOT marked missing (missing=true is only for sources not on file,
 * determined by the caller from recommendation_audit or known data gaps).
 */
export function healthSignalsToDots(signals: string[]): AccDot[] {
  const seen = new Set<JourneyHubKey>();
  const dots: AccDot[] = [];
  for (const sig of signals) {
    const hub = signalToHub(sig);
    if (hub && !seen.has(hub)) {
      seen.add(hub);
      dots.push({ hub, label: sig });
    }
  }
  return dots;
}

/**
 * Count how many distinct hub keys are active in a set of dots.
 * Used for the ConnectionMap narrative line count.
 */
export function activeHubCount(dots: AccDot[]): number {
  const seen = new Set<string>();
  for (const d of dots) seen.add(d.hub);
  return seen.size;
}

/**
 * Convert an active hub count (number) to a spoken ordinal word.
 * 1 -> "one", 2 -> "two", ..., up to "nine". 0 -> "zero". 10+ -> the number.
 */
export function hubCountToWord(count: number): string {
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  if (count >= 0 && count < words.length) return words[count];
  return String(count);
}

// ---------------------------------------------------------------------------
// Row types (avoids any)
// ---------------------------------------------------------------------------

export interface RecommendationsRow {
  id?: string;
  product_name: string;
  reason: string;
  category: string | null;
  confidence_level: string | null;
  confidence_score: number | null;
  priority_rank: number | null;
}

export interface UltrathinkRow {
  id?: string;
  farmceutica_product: string;
  rationale: string;
  health_signals: string[];
  priority: string;
  rank: number;
  bioavailability_note: string | null;
}

// ---------------------------------------------------------------------------
// Internal merger entry - carries rank for sorting
// ---------------------------------------------------------------------------

export interface MergeEntry {
  item: EngineAccItem;
  rank: number;
}

// ---------------------------------------------------------------------------
// Prompt 213: dedupe + hub aggregation + write uniqueness (pure)
// ---------------------------------------------------------------------------

/**
 * Normalize a product headline into a stable insight_key.
 * Collapses case, punctuation, and whitespace so "Replenish NAD+" and
 * "replenish nad+" map to the same key.
 */
export function insightKeyFromHeadline(headline: string): string {
  return headline
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Keep the best-ranked entry per insight_key.
 */
export function dedupeEngineEntries(entries: MergeEntry[]): MergeEntry[] {
  const byKey = new Map<string, MergeEntry>();
  const sorted = [...entries].sort((a, b) => a.rank - b.rank);
  for (const entry of sorted) {
    const key = entry.item.insightKey || insightKeyFromHeadline(entry.item.headline);
    if (!byKey.has(key)) {
      byKey.set(key, entry);
    }
  }
  return Array.from(byKey.values()).sort((a, b) => a.rank - b.rank);
}

/**
 * Select up to `max` DISTINCT engine items. Never pads by cloning a real insight.
 * Empty engine set falls back to Appendix A seeds (distinct templates only).
 * Non-empty short set returns only the real items (UI may show honest placeholders).
 */
export function selectDistinctAccelerators(
  entries: MergeEntry[],
  max = 4,
): EngineAccItem[] {
  const unique = dedupeEngineEntries(entries);
  const engineItems = unique.slice(0, max).map((e) => e.item);
  if (engineItems.length === 0) {
    return APPENDIX_A_SEEDS.slice(0, max);
  }
  return engineItems;
}

/**
 * Union of non-missing hubs across the full insight set (not only the top card).
 */
export function activeHubsFromItems(items: EngineAccItem[]): string[] {
  const hubSet = new Set<string>();
  for (const item of items) {
    for (const d of item.dots) {
      if (d.missing) continue;
      hubSet.add(d.hub);
    }
  }
  return JOURNEY_HUB_KEYS.filter((h) => hubSet.has(h));
}

/**
 * Caption for the connection map. Singular only when exactly one real insight.
 */
export function buildConnectionNarrative(
  items: EngineAccItem[],
  activeHubs: string[],
): string {
  const count = activeHubs.length;
  const hubWord = hubCountToWord(count);
  if (items.length === 0) {
    return 'Connect more hubs to light this map as insights arrive.';
  }
  if (items.length === 1) {
    const name = items[0].headline;
    if (count <= 0) {
      return `The ${name} insight is ready. Source hubs will light as provenance lands.`;
    }
    return `The ${name} insight is drawn from ${hubWord} of your hubs.`;
  }
  if (count <= 0) {
    return `${items.length} distinct insights are ready. Source hubs will light as provenance lands.`;
  }
  return `These ${items.length} insights are drawn from ${hubWord} of your hubs.`;
}

/**
 * Writer guard: reject a second insert when insight_key is already present.
 */
export function canInsertInsightKey(
  existingKeys: ReadonlySet<string> | readonly string[],
  nextKey: string,
): boolean {
  const key = nextKey.trim().toLowerCase();
  if (!key) return false;
  if (existingKeys instanceof Set) return !existingKeys.has(key);
  return !existingKeys.map((k) => k.toLowerCase()).includes(key);
}

// ---------------------------------------------------------------------------
// Honest missing dot injected when an engine item has no real health_signals
// ---------------------------------------------------------------------------

const MISSING_DOT: AccDot = {
  hub: 'CAQ',
  label: 'No data sources on file yet',
  missing: true,
};

/**
 * Finalize the dots array for any engine item.
 * When real dots exist, return them unchanged.
 * When the item has zero real dots (e.g. from the recommendations table which
 * carries no health_signals), inject a single honest missing-marked dot so the
 * "Why this, why you" expander is never blank.
 */
export function finalizeDots(real: AccDot[]): AccDot[] {
  if (real.length > 0) return real;
  return [MISSING_DOT];
}

// ---------------------------------------------------------------------------
// Map recommendations row to EngineAccItem
// ---------------------------------------------------------------------------

export function recRowToItem(row: RecommendationsRow): EngineAccItem {
  const pts = liftFromConfidenceScore(row.confidence_score);
  const conf = confLevelFromString(row.confidence_level);
  const tag = row.category ? row.category.toUpperCase() : 'SUPPLEMENT';
  const insightKey = insightKeyFromHeadline(row.product_name);
  return {
    id: row.id ?? `rec-${insightKey}`,
    insightKey,
    headline: row.product_name,
    body: row.reason,
    tag,
    pts,
    derivedPts: 'derived',
    conf,
    dots: finalizeDots([]),
    source: 'recommendations',
  };
}

// ---------------------------------------------------------------------------
// Map ultrathink_recommendations row to EngineAccItem
// ---------------------------------------------------------------------------

export function ultrathinkRowToItem(row: UltrathinkRow): EngineAccItem {
  const pts = liftFromPriority(row.priority);
  const conf = confLevelFromPriority(row.priority);
  const signals: string[] = Array.isArray(row.health_signals) ? row.health_signals : [];
  const dots = finalizeDots(healthSignalsToDots(signals));
  const insightKey = insightKeyFromHeadline(row.farmceutica_product);
  return {
    id: row.id ?? `ut-${insightKey}`,
    insightKey,
    headline: row.farmceutica_product,
    body: row.rationale,
    tag: 'SUPPLEMENT',
    pts,
    derivedPts: 'derived',
    conf,
    dots,
    source: 'ultrathink_recommendations',
  };
}

// ---------------------------------------------------------------------------
// useEngineAccelerators
// ---------------------------------------------------------------------------

export interface EngineAcceleratorsResult {
  /**
   * Up to 4 DISTINCT insights. Never pads by cloning one real insight.
   * Empty engine set uses Appendix A seeds (distinct templates).
   * Sparse engine set returns only the real items (UI shows honest placeholders).
   */
  items: EngineAccItem[];
  /** True while the reads are in-flight */
  loading: boolean;
  /** Active hubs derived from the full insight set's non-missing dots */
  activeHubs: string[];
  /**
   * Spoken-word count of active hubs ("two", "three", etc.)
   * for use in the ConnectionMap narrative line.
   */
  activeHubCountWord: string;
  /** Connection map caption reflecting singular vs plural insight set */
  narrativeLine: string;
}

const INITIAL: EngineAcceleratorsResult = {
  items: APPENDIX_A_SEEDS.slice(0, 4),
  loading: true,
  activeHubs: activeHubsFromItems(APPENDIX_A_SEEDS.slice(0, 4)),
  activeHubCountWord: hubCountToWord(activeHubsFromItems(APPENDIX_A_SEEDS.slice(0, 4)).length),
  narrativeLine: buildConnectionNarrative(
    APPENDIX_A_SEEDS.slice(0, 4),
    activeHubsFromItems(APPENDIX_A_SEEDS.slice(0, 4)),
  ),
};

/**
 * Reads journey accelerators from the real engine tables
 * (recommendations + ultrathink_recommendations), merges and ranks them,
 * and pads with Appendix A seeds when fewer than 4 engine recs exist.
 *
 * All reads are wrapped in withTimeout(4000ms) + try/catch fail-open + safeLog.
 * Scoped to auth.uid() / RLS - never widened.
 *
 * @param userId - The authenticated user id, or null before auth resolves.
 */
export function useEngineAccelerators(
  userId: string | null,
): EngineAcceleratorsResult {
  const [result, setResult] = useState<EngineAcceleratorsResult>(INITIAL);
  const [refreshTick, setRefreshTick] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleFocus = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setRefreshTick((t) => t + 1);
      }, 500);
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      const seeds = APPENDIX_A_SEEDS.slice(0, 4);
      const hubs = activeHubsFromItems(seeds);
      setResult({
        items: seeds,
        loading: false,
        activeHubs: hubs,
        activeHubCountWord: hubCountToWord(hubs.length),
        narrativeLine: buildConnectionNarrative(seeds, hubs),
      });
      return;
    }

    let active = true;

    (async () => {
      const entries: MergeEntry[] = [];

      // Read from recommendations table
      try {
        const supabase = createClient();
        type RecResult = { data: RecommendationsRow[] | null; error: unknown };
        const { data } = await withTimeout(
          supabase
            .from('recommendations')
            .select('id, product_name, reason, category, confidence_level, confidence_score, priority_rank')
            .eq('user_id', userId)
            .order('priority_rank', { ascending: true })
            .limit(16) as unknown as Promise<RecResult>,
          4000,
          'useEngineAccelerators.recommendations',
        );
        const rows = Array.isArray(data) ? data : [];
        for (const row of rows) {
          const rank =
            typeof row.priority_rank === 'number' && isFinite(row.priority_rank)
              ? row.priority_rank
              : 999;
          entries.push({ item: recRowToItem(row), rank });
        }
      } catch (err) {
        safeLog.warn(
          'useEngineAccelerators',
          'recommendations read failed, failing open',
          { error: err },
        );
      }

      // Read from ultrathink_recommendations table
      try {
        const supabase = createClient();
        type UtResult = { data: UltrathinkRow[] | null; error: unknown };
        const { data } = await withTimeout(
          supabase
            .from('ultrathink_recommendations')
            .select('id, farmceutica_product, rationale, health_signals, priority, rank, bioavailability_note')
            .eq('user_id', userId)
            .order('rank', { ascending: true })
            .limit(16) as unknown as Promise<UtResult>,
          4000,
          'useEngineAccelerators.ultrathink_recommendations',
        );
        const rows = Array.isArray(data) ? data : [];
        for (const row of rows) {
          const rank =
            typeof row.rank === 'number' && isFinite(row.rank) ? row.rank : 999;
          // Offset ultrathink ranks by 0.5 so recommendations win on equal rank.
          entries.push({ item: ultrathinkRowToItem(row), rank: rank + 0.5 });
        }
      } catch (err) {
        safeLog.warn(
          'useEngineAccelerators',
          'ultrathink_recommendations read failed, failing open',
          { error: err },
        );
      }

      // Prompt 213: dedupe by insight_key, never clone one product into four cards.
      const items = selectDistinctAccelerators(entries, 4);

      if (!active) return;

      const activeHubs = activeHubsFromItems(items);
      const count = activeHubs.length;

      safeLog.info('useEngineAccelerators', 'fetch complete', {
        userId,
        entryCount: entries.length,
        distinctCount: items.length,
        activeHubCount: count,
      });

      setResult({
        items,
        loading: false,
        activeHubs,
        activeHubCountWord: hubCountToWord(count),
        narrativeLine: buildConnectionNarrative(items, activeHubs),
      });
    })();

    return () => {
      active = false;
    };
  }, [userId, refreshTick]); // eslint-disable-line react-hooks/exhaustive-deps

  return result;
}
