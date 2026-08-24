'use client';

// Prompt 211a Workstream 4 (Part 2): scan fingerprint + cadence history read.
//
// Reads the user's OWN body_photo_sessions rows (own-row; body_photo_sessions
// carries own-row RLS) and assembles, via the W4-1 pure logic:
//   * scanHistory       : ScanHistoryEntry[] for recommendCadence (opt-in default time)
//   * fingerprints      : ScanConditionFingerprint[] for the tip + flag
//   * flagDecision      : the outlier flag for the LATEST scan vs the prior ones
//   * consistencyTip    : the user's own best-conditions tip (null when thin)
//
// Fail-open: any error yields empty history + no flag + null tip (the surfaces
// render nothing), never throws. UNKNOWN quality columns map to a neutral 0.5 so
// a missing quality never fabricates a confident verdict.

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import type { ScanHistoryEntry } from '@/lib/formavision/cadence/recommend';
import type {
  ScanConditionFingerprint,
  LightingGrade,
} from '@/lib/formavision/cadence/fingerprint';
import { buildConsistencyTip } from '@/lib/formavision/cadence/fingerprint';
import { decideFingerprintFlag, type FingerprintFlagDecision } from '@/lib/formavision/cadence/fingerprintFlag';
import { timeOfDayFromTimestamp } from '@/lib/formavision/cadence/timeOfDay';

const TIMEOUT_MS = 4000;
const SCOPE = 'body-tracker.scan-fingerprints';
const MAX_SESSIONS = 60;

export interface UseScanFingerprintsResult {
  scanHistory: ScanHistoryEntry[];
  fingerprints: ScanConditionFingerprint[];
  /** Outlier flag for the latest scan vs the prior ones, or null when none/thin. */
  flagDecision: FingerprintFlagDecision | null;
  /** The user's own best-conditions tip, or null on thin history. */
  consistencyTip: string | null;
  loading: boolean;
  error: boolean;
  refresh: () => void;
}

interface SessionRow {
  session_date: string;
  created_at: string;
  lighting_condition: string | null;
  scan_quality_score: number | null;
  arnold_confidence: number | null;
}

function toLightingGrade(raw: string | null): LightingGrade {
  if (raw === 'natural' || raw === 'indoor_bright' || raw === 'indoor_dim') return raw;
  return 'unknown';
}

function clamp01(value: number | null): number {
  // UNKNOWN quality maps to a neutral 0.5 (never a fabricated confident 0 or 1).
  if (value === null || !Number.isFinite(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}

function toFingerprint(row: SessionRow): ScanConditionFingerprint {
  return {
    timeOfDay: timeOfDayFromTimestamp(row.created_at ?? row.session_date),
    lightingGrade: toLightingGrade(row.lighting_condition),
    // Pose quality proxy: arnold_confidence; scan quality: scan_quality_score.
    poseQuality: clamp01(row.arnold_confidence),
    scanQualityScore: clamp01(row.scan_quality_score),
  };
}

export function useScanFingerprints(userId: string | null): UseScanFingerprintsResult {
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
  const [fingerprints, setFingerprints] = useState<ScanConditionFingerprint[]>([]);
  const [flagDecision, setFlagDecision] = useState<FingerprintFlagDecision | null>(null);
  const [consistencyTip, setConsistencyTip] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!userId) {
      setScanHistory([]);
      setFingerprints([]);
      setFlagDecision(null);
      setConsistencyTip(null);
      setLoading(false);
      setError(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(false);

    void (async () => {
      try {
        const supabase = createClient();
        const result = await withTimeout(
          supabase
            .from('body_photo_sessions')
            .select('session_date, created_at, lighting_condition, scan_quality_score, arnold_confidence')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .limit(MAX_SESSIONS) as unknown as Promise<{ data: SessionRow[] | null; error: unknown }>,
          TIMEOUT_MS,
          `${SCOPE}.read`,
        );
        if (!active) return;

        if (result.error) {
          setError(true);
          setLoading(false);
          return;
        }

        const rows = result.data ?? [];
        const history: ScanHistoryEntry[] = rows.map((r) => ({
          scanDate: r.session_date,
          timeOfDay: timeOfDayFromTimestamp(r.created_at ?? r.session_date),
        }));
        const fps = rows.map(toFingerprint);

        // Flag the LATEST scan against the PRIOR ones (excludes itself), so the
        // flag appears before that scan is read into the trend.
        let decision: FingerprintFlagDecision | null = null;
        if (fps.length >= 1) {
          const latest = fps[fps.length - 1];
          const prior = fps.slice(0, fps.length - 1);
          decision = decideFingerprintFlag(latest, prior);
        }

        // Tip from the full history (its own thin-history guard returns null).
        const tip = buildConsistencyTip(fps);

        setScanHistory(history);
        setFingerprints(fps);
        setFlagDecision(decision);
        setConsistencyTip(tip);
        setLoading(false);
      } catch (err) {
        if (!active) return;
        safeLog.warn(SCOPE, 'fingerprint read failed, failing open', {
          error: err instanceof Error ? err.message : String(err),
        });
        setScanHistory([]);
        setFingerprints([]);
        setFlagDecision(null);
        setConsistencyTip(null);
        setError(true);
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [userId, tick]);

  return { scanHistory, fingerprints, flagDecision, consistencyTip, loading, error, refresh };
}
