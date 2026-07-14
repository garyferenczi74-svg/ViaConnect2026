'use client';

// Task 211b-W3c - Personal precision read hook: wires the already-committed
// W3b personalFusionService to the real Supabase client via the narrow
// accessors in personalPrecisionDb.ts.
//
// Fail-open per CLAUDE.md resilience: the whole runPersonalFusion call is
// wrapped in withTimeout + try/catch + safeLog here, on top of the fail-open
// reads runPersonalFusion already performs internally (readAnchorsFailOpen,
// which itself applies withTimeout + a shared circuit breaker + safeLog per
// read, in personalFusionService's own W3b module). Any failure at either
// layer resolves to result: null -- an honest-empty state, never a
// fabricated fusion result.
//
// This hook performs NO re-derivation: it hands the four readers to
// runPersonalFusion unmodified and returns exactly what it returns.

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import {
  runPersonalFusion,
  type PersonalFusionResult,
  type PersonalFusionReaders,
} from '@/lib/arnold/scanning/accuracy/fusion/personalFusionService';
import {
  readScaleWeightRows,
  readTapeDexaAnchorRows,
  readScanCircumferenceRows,
  readConsentLedgerRows,
} from '@/lib/formavision/personalPrecision/personalPrecisionDb';

const SCOPE = 'body-tracker.personal-precision';
const TIMEOUT_MS = 6000;

export interface UsePersonalPrecisionResult {
  result: PersonalFusionResult | null;
  loading: boolean;
  refresh: () => void;
}

export function usePersonalPrecision(userId: string | null): UsePersonalPrecisionResult {
  const [result, setResult] = useState<PersonalFusionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!userId) {
      setResult(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const supabase = createClient();
        const readers: PersonalFusionReaders = {
          fetchScaleWeightRows: (uid) => readScaleWeightRows(supabase, uid),
          fetchTapeDexaAnchorRows: (uid) => readTapeDexaAnchorRows(supabase, uid),
          fetchScanCircumferenceRows: (uid) => readScanCircumferenceRows(supabase, uid),
          fetchConsentLedger: (uid) => readConsentLedgerRows(supabase, uid),
        };
        const fusion = await withTimeout(runPersonalFusion(userId, readers), TIMEOUT_MS, SCOPE);
        if (cancelled) return;
        setResult(fusion);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        safeLog.warn(SCOPE, 'personal fusion read failed (fail-open)', { error: e, userId });
        setResult(null);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  return { result, loading, refresh };
}
