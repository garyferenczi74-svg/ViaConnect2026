'use client';

// usePremiumEntitlement  TanStack Query hook that reads
// /api/body-tracker/entitlement (Prompt #169a, realigned to the #169f TIER
// MODEL).
//
// The client data path for the body-scan guard points. Mirrors the
// useBOSCurrent adapter (the project already depends on @tanstack/react-query):
// the API route is the single source of truth, so this hook does no Supabase
// reads, no client-side membership compute, and no localStorage cache.
//
// Under #169f, Body Scan is Platinum-and-above only and the free teaser is
// RETIRED, so the route returns a single `entitled` boolean (the TS mirror of
// the SQL resolver fn_resolve_body_scan_tier_status). This hook is
// defense-in-depth / UX only (normal entry vs. Platinum upgrade prompt). The
// AUTHORITATIVE gate is the body_photo_sessions finalize trigger (migration
// 20260516000150), which enforces entitlement when scan_status transitions to
// 'complete' regardless of code path; the primary path (runScanAnalysis)
// finalizes via a direct DB write and never calls the body-scan-analyze edge
// function.

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
  entitled: boolean;
  isLoading: boolean;
}

export function usePremiumEntitlement(): UsePremiumEntitlementResult {
  const query = useQuery<BodyScanEntitlementResponse, Error>({
    queryKey: PREMIUM_ENTITLEMENT_QUERY_KEY,
    queryFn: fetchPremiumEntitlement,
    // Entitlement changes only on membership events; keep it fresh on focus +
    // reconnect so a just-completed upgrade is reflected without a hard reload.
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 30_000,
    retry: 2,
  });

  // Fail-safe default while loading or on error: treat as non-entitled, so the
  // UX defaults to the Platinum upgrade prompt rather than flashing the unlocked
  // scan. The server still enforces the real gate at finalize.
  return {
    entitled: query.data?.entitled ?? false,
    isLoading: query.isLoading,
  };
}

export { fetchPremiumEntitlement as __fetchPremiumEntitlementForTest };
