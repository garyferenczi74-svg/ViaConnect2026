'use client';

// usePremiumEntitlement  TanStack Query hook that reads
// /api/body-tracker/entitlement (Prompt #169a, spec section 3.1).
//
// The client data path for the three body-scan guard points. Mirrors the
// useBOSCurrent adapter (the project already depends on @tanstack/react-query):
// the API route is the single source of truth, so this hook does no Supabase
// reads, no client-side membership compute, and no localStorage cache.
//
// The route reuses the server entitlement resolver (web membership system) for
// `premium` and reads profiles.free_body_scan_used for `freeTeaserUsed`. The
// AUTHORITATIVE gate remains the server finalize in body-scan-analyze; this hook
// only powers the UX (teaser banner vs. paywall vs. normal entry).

import { useQuery } from '@tanstack/react-query';
import type { BodyScanEntitlementResponse } from '@/app/api/body-tracker/entitlement/route';

export const PREMIUM_ENTITLEMENT_QUERY_KEY = ['body-scan', 'entitlement'] as const;

async function fetchPremiumEntitlement(): Promise<BodyScanEntitlementResponse> {
  const res = await fetch('/api/body-tracker/entitlement', { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`Entitlement read failed: ${res.status}`);
  }
  return (await res.json()) as BodyScanEntitlementResponse;
}

export interface UsePremiumEntitlementResult {
  premium: boolean;
  freeTeaserUsed: boolean;
  isLoading: boolean;
}

export function usePremiumEntitlement(): UsePremiumEntitlementResult {
  const query = useQuery<BodyScanEntitlementResponse, Error>({
    queryKey: PREMIUM_ENTITLEMENT_QUERY_KEY,
    queryFn: fetchPremiumEntitlement,
    // Entitlement changes only on membership / teaser-claim events; keep it
    // fresh on focus + reconnect so a just-completed upgrade or first scan is
    // reflected without a hard reload.
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 30_000,
    retry: 2,
  });

  // Fail-safe default while loading or on error: treat as non-premium with the
  // teaser unused, so the UX defaults to inviting the free first scan rather
  // than flashing a paywall. The server still enforces the real gate.
  return {
    premium: query.data?.premium ?? false,
    freeTeaserUsed: query.data?.freeTeaserUsed ?? false,
    isLoading: query.isLoading,
  };
}

export { fetchPremiumEntitlement as __fetchPremiumEntitlementForTest };
