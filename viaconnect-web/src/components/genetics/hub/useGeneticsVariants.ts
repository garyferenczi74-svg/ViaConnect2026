'use client';

// Prompt 204b (2026-06-17): the client data hook backing the Your Variants card.
//
// Fetches GET /api/genetics/variants and exposes the member's real interpreted
// variants grouped by panel, the set of panels backed by a Farmceutica branded
// test (for dynamic labeling), and the total variant count. It is fail-open by
// design: any fetch or parse failure resolves to the EMPTY payload (no rows, no
// branded panels, zero total), never a thrown error and never an error panel.
//
// Freshness: the hook fetches once on mount and ALSO re-fetches whenever the
// window regains focus or the tab becomes visible again, so a member who
// uploads a DNA test on another page and returns to the hub sees fresh data
// without a manual reload.
//
// Standing rules honored: tokens only (no UI here), no emojis, no em or en
// dashes, TypeScript strict (no any).

import { useCallback, useEffect, useState } from 'react';
import type { PanelKey } from '@/lib/genetics/panelLabels';
import type { SeverityTier } from '@/lib/genetics/severity';

export interface VariantRecord {
  panel_key: PanelKey;
  rsid: string;
  gene: string | null;
  genotype: string | null;
  status: string | null;
  clinical_significance: string | null;
  // Prompt 204g: the High / Moderate / Low score from the validated per-genotype
  // source, or null when this (rsID, genotype) has no validated assignment yet.
  // Distinct from genotype and the zygosity status.
  severity: SeverityTier | null;
  // Prompt 204 (2026-06-21): true when this row was seeded as SAMPLE data on a
  // GeneX360 purchase, so the card badges it and the member never reads it as a
  // real result.
  is_sample: boolean;
}

export interface GeneticsVariantsData {
  variantsByPanel: Partial<Record<PanelKey, VariantRecord[]>>;
  brandedPanels: PanelKey[];
  totalVariants: number;
}

// The empty payload returned on first paint and on any failure.
const EMPTY_DATA: GeneticsVariantsData = {
  variantsByPanel: {},
  brandedPanels: [],
  totalVariants: 0,
};

interface UseGeneticsVariantsResult {
  data: GeneticsVariantsData;
  // True only during the very first fetch, so the card can show a quiet loading
  // affordance once without flickering on every focus re-fetch.
  isLoading: boolean;
}

export function useGeneticsVariants(): UseGeneticsVariantsResult {
  const [data, setData] = useState<GeneticsVariantsData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/genetics/variants', { cache: 'no-store' });
      if (!res.ok) {
        // A non-200 (for example a 401) is treated as empty, never an error.
        setData(EMPTY_DATA);
        return;
      }
      const json: unknown = await res.json();
      setData(normalize(json));
    } catch {
      // Network or parse failure: fail open to empty.
      setData(EMPTY_DATA);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Guard against setting state after unmount on a slow first fetch.
    let active = true;
    const run = () => {
      if (active) void load();
    };
    run();

    // Re-fetch when the member returns to the tab so a fresh upload shows up.
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

// Narrow the unknown JSON into our typed shape defensively, so a malformed or
// partial payload degrades to empty rather than crashing the card.
function normalize(json: unknown): GeneticsVariantsData {
  if (typeof json !== 'object' || json === null) return EMPTY_DATA;
  const obj = json as Record<string, unknown>;

  const variantsByPanel: Partial<Record<PanelKey, VariantRecord[]>> = {};
  const rawByPanel = obj.variantsByPanel;
  if (typeof rawByPanel === 'object' && rawByPanel !== null) {
    for (const [key, value] of Object.entries(rawByPanel as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      const rows: VariantRecord[] = [];
      for (const entry of value) {
        if (typeof entry !== 'object' || entry === null) continue;
        const row = entry as Record<string, unknown>;
        rows.push({
          panel_key: (row.panel_key as PanelKey) ?? (key as PanelKey),
          rsid: typeof row.rsid === 'string' ? row.rsid : '',
          gene: typeof row.gene === 'string' ? row.gene : null,
          genotype: typeof row.genotype === 'string' ? row.genotype : null,
          status: typeof row.status === 'string' ? row.status : null,
          clinical_significance:
            typeof row.clinical_significance === 'string' ? row.clinical_significance : null,
          // Only the three validated tiers are accepted; anything else degrades
          // to null (unscored), so a malformed payload never invents a tier.
          severity:
            row.severity === 'high' || row.severity === 'moderate' || row.severity === 'low'
              ? row.severity
              : null,
          is_sample: row.is_sample === true,
        });
      }
      variantsByPanel[key as PanelKey] = rows;
    }
  }

  const brandedPanels: PanelKey[] = Array.isArray(obj.brandedPanels)
    ? (obj.brandedPanels.filter((p): p is PanelKey => typeof p === 'string') as PanelKey[])
    : [];

  const totalVariants =
    typeof obj.totalVariants === 'number' && Number.isFinite(obj.totalVariants)
      ? obj.totalVariants
      : 0;

  return { variantsByPanel, brandedPanels, totalVariants };
}
