'use client';

// Prompt #93 Phase 3: client-side flag access hook.
//
// First render fetches the current flag state from /api/flags/evaluate.
// Afterwards the hook subscribes to Supabase realtime on the features row
// so any admin change (kill switch engaged, rollout percentage bumped, phase
// advanced) triggers a re-fetch within ~1s.

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { FlagEvaluationResult } from '@/types/flags';

export interface UseFeatureFlagState {
  loading: boolean;
  result: FlagEvaluationResult | null;
  error: Error | null;
}

export function useFeatureFlag(featureId: string): UseFeatureFlagState {
  const [state, setState] = useState<UseFeatureFlagState>({
    loading: true,
    result: null,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    async function fetchFlag() {
      try {
        const response = await fetch(`/api/flags/evaluate?feature=${encodeURIComponent(featureId)}`, {
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error(`Flag evaluation failed: ${response.status} ${response.statusText}`);
        }
        const data = (await response.json()) as FlagEvaluationResult;
        if (mounted) setState({ loading: false, result: data, error: null });
      } catch (err) {
        if (mounted) setState({ loading: false, result: null, error: err as Error });
      }
    }

    fetchFlag();

    const supabase = createClient();
    const channel = supabase
      .channel(`feature-flag-${featureId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'features',
          filter: `id=eq.${featureId}`,
        },
        () => {
          fetchFlag();
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [featureId]);

  return state;
}
