'use client';

// useBOSCurrent  TanStack Query hook that reads /api/bos/current.
//
// Adapter chosen at #162 pre-flight (§8.1) because the project already
// depends on @tanstack/react-query and does not bundle SWR. The
// /api/bos/current endpoint is the SSOT for the BOS card; no Supabase
// imports, no client-side compute, no localStorage cache.
//
// Refresh policy:
//   refetchInterval     60_000  (60 second background revalidation)
//   refetchOnWindowFocus true
//   refetchOnReconnect  true
//   staleTime           5_000   (avoid double-fetch on rapid remounts)
//   retry               2
//
// The hook exposes the raw useQuery result so consumers can branch on
// data, error, isLoading, and refetch.

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { BOSCurrentResponse } from '@/lib/scoring/types';

export const BOS_CURRENT_QUERY_KEY = ['bos', 'current'] as const;

async function fetchBOSCurrent(): Promise<BOSCurrentResponse> {
  const res = await fetch('/api/bos/current', { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`BOS read failed: ${res.status}`);
  }
  return (await res.json()) as BOSCurrentResponse;
}

export function useBOSCurrent(): UseQueryResult<BOSCurrentResponse, Error> {
  return useQuery<BOSCurrentResponse, Error>({
    queryKey: BOS_CURRENT_QUERY_KEY,
    queryFn: fetchBOSCurrent,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 5_000,
    retry: 2,
  });
}

export { fetchBOSCurrent as __fetchBOSCurrentForTest };
