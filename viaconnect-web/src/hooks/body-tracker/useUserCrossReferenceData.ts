'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  calculateConfidenceTier,
  type ConfidenceTier,
  type CrossReferenceAvailability,
  type CrossReferenceSnapshot,
  type CAQSummary,
  type GeneticsSummary,
  type SupplementProtocolSummary,
  type WearableSummary,
  type AppSummary,
} from '@/lib/body-tracker/cross-reference';

export interface UseUserCrossReferenceDataResult {
  snapshot: CrossReferenceSnapshot;
  tier: ConfidenceTier;
  loading: boolean;
  error: string | null;
}

const EMPTY_AVAILABILITY: CrossReferenceAvailability = {
  bodyTracker: true, // current user is on the Body Tracker, so this is always true
  supplements: false,
  wearable: false,
  app: false,
  caq: false,
  genetics: false,
};

const EMPTY_SNAPSHOT: CrossReferenceSnapshot = {
  availability: EMPTY_AVAILABILITY,
  supplements: null,
  wearable: null,
  app: null,
  caq: null,
  genetics: null,
};

// Prompt #85l: source_id catalog mirrors the registries in
// /body-tracker/connections so the hook can identify wearables vs. apps
// from a single body_tracker_connections fetch and surface the display name.
const WEARABLE_SOURCE_NAMES: Record<string, string> = {
  apple_watch:    'Apple Watch',
  whoop:          'WHOOP',
  oura:           'Oura Ring',
  garmin:         'Garmin',
  fitbit:         'Fitbit',
  hume_body_pod:  'Hume Body Pod',
  withings:       'Withings Body+',
};

const APP_SOURCE_NAMES: Record<string, string> = {
  apple_health:   'Apple Health',
  google_fit:     'Google Fit',
  myfitnesspal:   'MyFitnessPal',
  cronometer:     'Cronometer',
  strava:         'Strava',
};

interface ConnectionRow {
  source_id: string | null;
  status: string | null;
}

function pickFirstConnected(
  rows: ConnectionRow[],
  catalog: Record<string, string>,
): { sourceId: string; sourceName: string } | null {
  for (const r of rows) {
    if (!r.source_id || r.status !== 'connected') continue;
    const name = catalog[r.source_id];
    if (name) return { sourceId: r.source_id, sourceName: name };
  }
  return null;
}

interface SupplementRow {
  category: string | null;
  is_current: boolean | null;
}
interface CAQRow {
  primary_goals: unknown;
  current_medications: unknown;
  current_conditions: unknown;
  completed: boolean | null;
}
interface GeneticsRow {
  mthfr_status: string | null;
  comt_status: string | null;
  cyp2d6_status: string | null;
  report_date: string | null;
}

function summarizeSupplements(rows: SupplementRow[]): SupplementProtocolSummary {
  const active = rows.filter((r) => r.is_current !== false);
  const counts = new Map<string, number>();
  for (const r of active) {
    if (!r.category) continue;
    counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
  }
  const topCategories = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);
  return { count: active.length, topCategories };
}

function nonEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'object') return Object.keys(value as object).length > 0;
  return Boolean(value);
}

function summarizeCAQ(row: CAQRow): CAQSummary {
  return {
    hasGoals: nonEmpty(row.primary_goals),
    hasMedications: nonEmpty(row.current_medications),
    hasConditions: nonEmpty(row.current_conditions),
    completed: row.completed === true,
  };
}

function summarizeGenetics(row: GeneticsRow): GeneticsSummary {
  return {
    hasMthfr: nonEmpty(row.mthfr_status),
    hasComt: nonEmpty(row.comt_status),
    hasCyp2d6: nonEmpty(row.cyp2d6_status),
    reportDate: row.report_date ?? null,
  };
}

export function useUserCrossReferenceData(userId: string | null): UseUserCrossReferenceDataResult {
  const [snapshot, setSnapshot] = useState<CrossReferenceSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setSnapshot(EMPTY_SNAPSHOT);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const supabase = createClient();

        type Loose = {
          from: (t: string) => {
            select: (cols: string) => {
              eq: (col: string, val: string) => {
                limit: (n: number) => Promise<{ data: unknown; error: { message: string } | null }>;
                order: (col: string, opts: { ascending: boolean }) => {
                  limit: (n: number) => {
                    maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
                  };
                };
              };
            };
          };
        };
        const sb = supabase as unknown as Loose;

        const [suppsRes, caqRes, genRes, connRes] = await Promise.all([
          sb.from('user_current_supplements')
            .select('category, is_current')
            .eq('user_id', userId)
            .limit(50),
          sb.from('clinical_assessments')
            .select('primary_goals, current_medications, current_conditions, completed')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          sb.from('genetic_profiles')
            .select('mthfr_status, comt_status, cyp2d6_status, report_date')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          sb.from('body_tracker_connections')
            .select('source_id, status')
            .eq('user_id', userId)
            .limit(50),
        ]);

        if (cancelled) return;

        const suppRows = (suppsRes.data as SupplementRow[] | null) ?? [];
        const caqRow = caqRes.data as CAQRow | null;
        const genRow = genRes.data as GeneticsRow | null;
        const connRows = (connRes.data as ConnectionRow[] | null) ?? [];

        const supplementsSummary = suppRows.length > 0 ? summarizeSupplements(suppRows) : null;
        const caqSummary = caqRow ? summarizeCAQ(caqRow) : null;
        const geneticsSummary = genRow ? summarizeGenetics(genRow) : null;
        const wearableSummary: WearableSummary | null = pickFirstConnected(connRows, WEARABLE_SOURCE_NAMES);
        const appSummary: AppSummary | null = pickFirstConnected(connRows, APP_SOURCE_NAMES);

        const availability: CrossReferenceAvailability = {
          bodyTracker: true,
          supplements: supplementsSummary !== null && supplementsSummary.count > 0,
          wearable: wearableSummary !== null,
          app: appSummary !== null,
          caq: caqSummary !== null && (caqSummary.completed || caqSummary.hasGoals),
          genetics:
            geneticsSummary !== null &&
            (geneticsSummary.hasMthfr || geneticsSummary.hasComt || geneticsSummary.hasCyp2d6),
        };

        setSnapshot({
          availability,
          supplements: supplementsSummary,
          wearable: wearableSummary,
          app: appSummary,
          caq: caqSummary,
          genetics: geneticsSummary,
        });
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setSnapshot(EMPTY_SNAPSHOT);
        setError(e instanceof Error ? e.message : 'Failed to load cross-reference data');
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const tier = calculateConfidenceTier(snapshot.availability);

  return { snapshot, tier, loading, error };
}
