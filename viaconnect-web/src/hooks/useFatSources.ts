'use client';

// Prompt 184b: client hook for the curated fat_sources reference table.
// fat_sources carries an authenticated SELECT RLS policy, so the browser
// client reads it directly. Mirrors useUserMeals (TanStack Query, already in
// the project); the resilient loader (4s timeout, fail-open, safeLog) lives in
// loadActiveFatSources, so this hook stays thin.

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { loadActiveFatSources, type FatSourceProfile } from '@/lib/nutrition/fat-sources';

export interface UseFatSourcesResult {
  readonly fatSources: FatSourceProfile[];
  readonly loading: boolean;
}

export function useFatSources(): UseFatSourcesResult {
  const query = useQuery<FatSourceProfile[], Error>({
    queryKey: ['fat-sources'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;
      return loadActiveFatSources(supabase);
    },
    // Reference data changes rarely; cache for an hour.
    staleTime: 60 * 60 * 1000,
  });
  return { fatSources: query.data ?? [], loading: query.isLoading };
}
