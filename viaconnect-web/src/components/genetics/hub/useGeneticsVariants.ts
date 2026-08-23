'use client';

// Prompt 204b (2026-06-17): the client data hook backing the Your Variants card.
//
// Fetches GET /api/genetics/variants and exposes the member's real interpreted
// variants grouped by panel, observed non-SNP counts, the set of branded panels,
// and a loadStatus that keeps 401 / error distinct from honest empty.
//
// Gary 2026-08-23: fail-open-as-0 is not allowed. A 401 or parse / network
// failure sets loadStatus to unauthorized / error and observed counts to
// UNKNOWN (null). Honest empty is loadStatus=ok with count 0.
//
// Freshness: the hook fetches once on mount and ALSO re-fetches whenever the
// window regains focus or the tab becomes visible again.
//
// Standing rules honored: tokens only (no UI here), no emojis, no em or en
// dashes, TypeScript strict (no any).

import { useCallback, useEffect, useState } from 'react';
import type { PanelKey } from '@/lib/genetics/panelLabels';
import type { SeverityTier } from '@/lib/genetics/severity';
import {
  emptyObservedByPanel,
  unknownObservedByPanel,
  type ObservedByPanel,
  type ObservedLoadStatus,
  type ObservedPanelCount,
} from '@/lib/genetics/observedPanelCounts';
import { normalizeObservedPanelKey } from '@/lib/genetics/panelKeyAliases';
import type { HubHormoneMarker } from '@/lib/genetics/hormoneObservedCount';
import type { HubEpigeneticMarker } from '@/lib/genetics/hubVariantsPayload';

export interface VariantRecord {
  panel_key: PanelKey;
  rsid: string;
  gene: string | null;
  genotype: string | null;
  status: string | null;
  clinical_significance: string | null;
  severity: SeverityTier | null;
  is_sample: boolean;
}

export interface GeneticsVariantsData {
  variantsByPanel: Partial<Record<PanelKey, VariantRecord[]>>;
  brandedPanels: PanelKey[];
  /** Sum of known observed counts. Null when every panel is UNKNOWN. */
  totalVariants: number | null;
  observedByPanel: ObservedByPanel;
  loadStatus: ObservedLoadStatus;
  hormoneMarkers: HubHormoneMarker[];
  epigeneticMarkers: HubEpigeneticMarker[];
}

export const EMPTY_OK_DATA: GeneticsVariantsData = {
  variantsByPanel: {},
  brandedPanels: [],
  totalVariants: 0,
  observedByPanel: emptyObservedByPanel(),
  loadStatus: 'ok',
  hormoneMarkers: [],
  epigeneticMarkers: [],
};

export const ERROR_DATA: GeneticsVariantsData = {
  variantsByPanel: {},
  brandedPanels: [],
  totalVariants: null,
  observedByPanel: unknownObservedByPanel(),
  loadStatus: 'error',
  hormoneMarkers: [],
  epigeneticMarkers: [],
};

export const UNAUTHORIZED_DATA: GeneticsVariantsData = {
  ...ERROR_DATA,
  loadStatus: 'unauthorized',
};

/** @deprecated Use EMPTY_OK_DATA. Kept so overlay helpers can keep a named empty. */
export const EMPTY_DATA = EMPTY_OK_DATA;

interface UseGeneticsVariantsResult {
  data: GeneticsVariantsData;
  isLoading: boolean;
}

export function useGeneticsVariants(): UseGeneticsVariantsResult {
  const [data, setData] = useState<GeneticsVariantsData>(EMPTY_OK_DATA);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/genetics/variants', { cache: 'no-store' });
      if (res.status === 401) {
        setData(UNAUTHORIZED_DATA);
        return;
      }
      if (!res.ok) {
        setData(ERROR_DATA);
        return;
      }
      const json: unknown = await res.json();
      setData(normalize(json));
    } catch {
      setData(ERROR_DATA);
    } finally {
      setIsLoading(false);
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

  return { data, isLoading };
}

function asObservedRow(key: PanelKey, raw: unknown): ObservedPanelCount {
  const fallback = unknownObservedByPanel()[key];
  if (typeof raw !== 'object' || raw === null) return fallback;
  const row = raw as Record<string, unknown>;
  const status = row.status === 'ok' ? 'ok' : 'unknown';
  const count =
    status === 'ok' && typeof row.count === 'number' && Number.isFinite(row.count)
      ? row.count
      : null;
  const unit =
    row.unit === 'SNPs' || row.unit === 'markers' || row.unit === 'clocks' || row.unit === 'genes'
      ? row.unit
      : fallback.unit;
  const source =
    row.source === 'user_variants' ||
    row.source === 'hormone_markers' ||
    row.source === 'epigenetic_markers'
      ? row.source
      : 'unknown';
  return { panel_key: key, count, unit, status, source };
}

export function normalizeGeneticsVariantsPayload(json: unknown): GeneticsVariantsData {
  return normalize(json);
}

function normalize(json: unknown): GeneticsVariantsData {
  if (typeof json !== 'object' || json === null) return ERROR_DATA;
  const obj = json as Record<string, unknown>;

  if (obj.loadStatus === 'unauthorized') return UNAUTHORIZED_DATA;
  if (obj.loadStatus === 'error') return ERROR_DATA;

  const variantsByPanel: Partial<Record<PanelKey, VariantRecord[]>> = {};
  const rawByPanel = obj.variantsByPanel;
  if (typeof rawByPanel === 'object' && rawByPanel !== null) {
    for (const [key, value] of Object.entries(rawByPanel as Record<string, unknown>)) {
      const panelKey = normalizeObservedPanelKey(key);
      if (!panelKey || !Array.isArray(value)) continue;
      const rows: VariantRecord[] = [];
      for (const entry of value) {
        if (typeof entry !== 'object' || entry === null) continue;
        const row = entry as Record<string, unknown>;
        const rowKey = normalizeObservedPanelKey(
          typeof row.panel_key === 'string' ? row.panel_key : panelKey,
        );
        if (!rowKey) continue;
        rows.push({
          panel_key: rowKey,
          rsid: typeof row.rsid === 'string' ? row.rsid : '',
          gene: typeof row.gene === 'string' ? row.gene : null,
          genotype: typeof row.genotype === 'string' ? row.genotype : null,
          status: typeof row.status === 'string' ? row.status : null,
          clinical_significance:
            typeof row.clinical_significance === 'string' ? row.clinical_significance : null,
          severity:
            row.severity === 'high' || row.severity === 'moderate' || row.severity === 'low'
              ? row.severity
              : null,
          is_sample: row.is_sample === true,
        });
      }
      variantsByPanel[panelKey] = [...(variantsByPanel[panelKey] ?? []), ...rows];
    }
  }

  const brandedPanels: PanelKey[] = Array.isArray(obj.brandedPanels)
    ? obj.brandedPanels
        .map((p) => (typeof p === 'string' ? normalizeObservedPanelKey(p) : null))
        .filter((p): p is PanelKey => p !== null)
    : [];

  const observedByPanel = emptyObservedByPanel();
  if (typeof obj.observedByPanel === 'object' && obj.observedByPanel !== null) {
    for (const [key, value] of Object.entries(obj.observedByPanel as Record<string, unknown>)) {
      const panelKey = normalizeObservedPanelKey(key);
      if (!panelKey) continue;
      observedByPanel[panelKey] = asObservedRow(panelKey, value);
    }
  } else {
    // Legacy payload without observedByPanel: SNP panels from grouped rows,
    // hormone / epigenetic stay UNKNOWN (never invent a 0 from missing sources).
    for (const key of Object.keys(observedByPanel) as PanelKey[]) {
      if (key === 'hormone' || key === 'epigenetic') {
        observedByPanel[key] = asObservedRow(key, { status: 'unknown', count: null });
      } else {
        const count = (variantsByPanel[key] ?? []).length;
        observedByPanel[key] = asObservedRow(key, {
          status: 'ok',
          count,
          unit: observedByPanel[key].unit,
          source: 'user_variants',
        });
      }
    }
  }

  const hormoneMarkers: HubHormoneMarker[] = Array.isArray(obj.hormoneMarkers)
    ? obj.hormoneMarkers.flatMap((entry) => {
        if (typeof entry !== 'object' || entry === null) return [];
        const row = entry as Record<string, unknown>;
        if (typeof row.name !== 'string' || !row.name.trim()) return [];
        return [{
          name: row.name,
          value: typeof row.value === 'number' ? row.value : null,
          unit: typeof row.unit === 'string' ? row.unit : null,
          measured_at: typeof row.measured_at === 'string' ? row.measured_at : null,
        }];
      })
    : [];

  const epigeneticMarkers: HubEpigeneticMarker[] = Array.isArray(obj.epigeneticMarkers)
    ? obj.epigeneticMarkers.flatMap((entry) => {
        if (typeof entry !== 'object' || entry === null) return [];
        const row = entry as Record<string, unknown>;
        if (typeof row.markerKey !== 'string' || !row.markerKey.trim()) return [];
        return [{
          markerKey: row.markerKey,
          valueNum: typeof row.valueNum === 'number' ? row.valueNum : null,
          valueText: typeof row.valueText === 'string' ? row.valueText : null,
          unit: typeof row.unit === 'string' ? row.unit : null,
        }];
      })
    : [];

  const totalVariants =
    typeof obj.totalVariants === 'number' && Number.isFinite(obj.totalVariants)
      ? obj.totalVariants
      : obj.totalVariants === null
        ? null
        : null;

  return {
    variantsByPanel,
    brandedPanels,
    totalVariants,
    observedByPanel,
    loadStatus: 'ok',
    hormoneMarkers,
    epigeneticMarkers,
  };
}
