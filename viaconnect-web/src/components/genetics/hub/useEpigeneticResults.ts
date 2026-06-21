'use client';

// Prompt 204 (2026-06-21): the client hook backing the EpigenHQ member results.
// Fetches GET /api/genetics/epigenetic and exposes the member's epigenetic
// readouts keyed by marker_key. Fail-open by design: any fetch or parse failure
// resolves to an empty map, never a thrown error, so the EpigenHQ panel renders
// its interpretations with no member value rather than an error. Re-fetches on
// focus / visibility so a fresh upload shows up without a manual reload, the same
// pattern as useGeneticsVariants.
//
// Standing rules honored: no em or en dashes, TypeScript strict (no any).

import { useCallback, useEffect, useState } from 'react';
import type { EpigeneticResult } from '@/lib/genetics/loadEpigeneticResults';
import type { EpigenDirection } from '@/lib/genetics/epigenResultStore';

export type EpigeneticResultsByKey = ReadonlyMap<string, EpigeneticResult>;

const EMPTY: EpigeneticResultsByKey = new Map();

function isDirection(v: unknown): v is EpigenDirection {
  return v === 'higher' || v === 'lower' || v === 'typical';
}

// Narrow the unknown JSON defensively so a malformed payload degrades to empty.
function normalize(json: unknown): EpigeneticResultsByKey {
  if (typeof json !== 'object' || json === null) return EMPTY;
  const raw = (json as Record<string, unknown>).results;
  if (!Array.isArray(raw)) return EMPTY;
  const map = new Map<string, EpigeneticResult>();
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const r = entry as Record<string, unknown>;
    if (typeof r.markerKey !== 'string' || !r.markerKey) continue;
    map.set(r.markerKey, {
      markerKey: r.markerKey,
      valueNum: typeof r.valueNum === 'number' ? r.valueNum : null,
      valueText: typeof r.valueText === 'string' ? r.valueText : null,
      unit: typeof r.unit === 'string' ? r.unit : null,
      direction: isDirection(r.direction) ? r.direction : null,
      confidence: typeof r.confidence === 'string' ? r.confidence : null,
      measuredOn: typeof r.measuredOn === 'string' ? r.measuredOn : null,
      trend: Array.isArray(r.trend) ? (r.trend as EpigeneticResult['trend']) : null,
    });
  }
  return map;
}

export function useEpigeneticResults(): { resultsByKey: EpigeneticResultsByKey } {
  const [resultsByKey, setResultsByKey] = useState<EpigeneticResultsByKey>(EMPTY);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/genetics/epigenetic', { cache: 'no-store' });
      if (!res.ok) {
        setResultsByKey(EMPTY);
        return;
      }
      const json: unknown = await res.json();
      setResultsByKey(normalize(json));
    } catch {
      setResultsByKey(EMPTY);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const run = () => {
      if (active) void load();
    };
    run();
    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };
    window.addEventListener('focus', run);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      window.removeEventListener('focus', run);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  return { resultsByKey };
}
