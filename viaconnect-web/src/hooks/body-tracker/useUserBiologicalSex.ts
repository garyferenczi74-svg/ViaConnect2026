'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type BiologicalSex = 'male' | 'female';

export type BiologicalSexSource = 'override' | 'caq' | 'caq_other' | 'default';

export interface UseUserBiologicalSexResult {
  sex: BiologicalSex;
  source: BiologicalSexSource;
  loading: boolean;
  setOverride: (sex: BiologicalSex | null) => Promise<void>;
}

// Resolves a user's avatar gender in priority order:
//   1. body_tracker_user_state.avatar_gender_override (manual user choice)
//   2. clinical_assessments.biological_sex (CAQ Phase 1 demographics)
//   3. 'male' fallback
interface InternalState {
  sex: BiologicalSex;
  source: BiologicalSexSource;
  loading: boolean;
}

export function useUserBiologicalSex(userId: string | null): UseUserBiologicalSexResult {
  const [state, setState] = useState<InternalState>({
    sex: 'male',
    source: 'default',
    loading: true,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userId) {
      setState({ sex: 'male', source: 'default', loading: false });
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));

    (async () => {
      try {
        const supabase = createClient();

        type LooseQuery = {
          from: (t: string) => {
            select: (cols: string) => {
              eq: (col: string, val: string) => {
                maybeSingle: () => Promise<{ data: { avatar_gender_override?: string | null } | null; error: { message: string } | null }>;
                order: (col: string, opts: { ascending: boolean }) => {
                  limit: (n: number) => {
                    maybeSingle: () => Promise<{ data: { biological_sex?: string | null } | null; error: { message: string } | null }>;
                  };
                };
              };
            };
          };
        };
        const sb = supabase as unknown as LooseQuery;

        // 1. override
        const overrideRes = await sb.from('body_tracker_user_state')
          .select('avatar_gender_override')
          .eq('user_id', userId)
          .maybeSingle();
        if (cancelled) return;
        const override = overrideRes.data?.avatar_gender_override?.toLowerCase();
        if (override === 'female' || override === 'male') {
          setState({ sex: override, source: 'override', loading: false });
          return;
        }

        // 2. CAQ biological_sex (latest assessment by created_at)
        const caqRes = await sb.from('clinical_assessments')
          .select('biological_sex')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        const caq = caqRes.data?.biological_sex?.toLowerCase();
        if (caq === 'female') {
          setState({ sex: 'female', source: 'caq', loading: false });
          return;
        }
        if (caq === 'male') {
          setState({ sex: 'male', source: 'caq', loading: false });
          return;
        }
        if (caq && caq.length > 0) {
          // CAQ recorded a non-binary value; visualization defaults to 'male'
          // but caller can detect via source and offer a custom choice.
          setState({ sex: 'male', source: 'caq_other', loading: false });
          return;
        }

        // 3. default
        setState({ sex: 'male', source: 'default', loading: false });
      } catch {
        if (cancelled) return;
        setState({ sex: 'male', source: 'default', loading: false });
      }
    })();

    return () => { cancelled = true; };
  }, [userId, tick]);

  const setOverride = useCallback(
    async (sex: BiologicalSex | null) => {
      if (!userId) return;
      const supabase = createClient();
      type Loose = {
        from: (t: string) => {
          upsert: (p: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
        };
      };
      const sb = supabase as unknown as Loose;
      await sb.from('body_tracker_user_state').upsert({
        user_id: userId,
        avatar_gender_override: sex,
        updated_at: new Date().toISOString(),
      });
      setTick((t) => t + 1);
    },
    [userId],
  );

  return { ...state, setOverride };
}
