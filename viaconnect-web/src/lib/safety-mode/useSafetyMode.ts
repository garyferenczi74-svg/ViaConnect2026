'use client';

// Prompt 172 Phase 0 (170c primitive): useSafetyMode client hook.
//
// 170c §8.6 promises every downstream surface consumes a single
// useSafetyMode() React hook. Phase 0 ships the hook so 172 MealCard can
// import it now and 170h, 170q, 170r, 170s can compose against it as they
// land.
//
// Fetches the user's safety mode preference from /api/safety-mode/status on
// mount. Caches in plain useState; the endpoint is read every mount per
// 170c §8.4 (UI never indicates the mode is active, so a stale cache that
// flickers ratios vs absolutes briefly is acceptable). 170c §8.13 master
// kill switch short circuits the fetch: when off, the hook always returns
// enabled false. Fetch failure also returns enabled false per §23.1 fail
// closed posture.

import { useEffect, useState } from 'react';
import { isKillSwitchEnabled } from '@/lib/compliance/kill-switches';

export interface SafetyModeState {
  enabled: boolean;
  loading: boolean;
}

interface StatusResponse {
  enabled: boolean;
}

export function useSafetyMode(): SafetyModeState {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // 170c §8.13 master kill switch. When off, the hook keeps the safe
    // default (enabled false) and resolves loading immediately so consumers
    // can render without waiting for a fetch that would not change the
    // answer.
    if (!isKillSwitchEnabled('EATING_DISORDER_SAFETY_MODE_ENABLED')) {
      setEnabled(false);
      setLoading(false);
      return;
    }

    async function run() {
      try {
        const res = await fetch('/api/safety-mode/status', {
          method: 'GET',
          headers: { 'content-type': 'application/json' },
        });
        if (!res.ok) {
          if (!cancelled) {
            setEnabled(false);
            setLoading(false);
          }
          return;
        }
        const json: StatusResponse = await res.json();
        if (!cancelled) {
          setEnabled(json.enabled === true);
          setLoading(false);
        }
      } catch {
        // Network or parse failure. 170c §23.1 fail closed: assume the user
        // has not opted in. Cheaper to occasionally show absolutes to a user
        // who wanted ratios (visible, they can disable) than to silently
        // hide absolutes from a user who never opted in (confusing).
        if (!cancelled) {
          setEnabled(false);
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  return { enabled, loading };
}
