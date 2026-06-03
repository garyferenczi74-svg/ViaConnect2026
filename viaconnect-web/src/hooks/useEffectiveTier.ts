'use client';

// useEffectiveTier  TanStack Query hook that reads /api/pricing/tier (Prompt
// #169f section 11.2 tier-branched surfaces).
//
// The single client data path for "what membership tier is this user on right
// now". It mirrors the usePremiumEntitlement adapter exactly (same project
// dependency, @tanstack/react-query): the API route is the source of truth, so
// this hook does no Supabase reads and no client-side membership compute. The
// route resolves the effective tier via getEffectiveTierForUser over the
// memberships + membership_tiers tables, the same resolver the rest of the
// pricing system uses.
//
// This powers tier-branched UI VISIBILITY (which dashboard cards to show, the
// Body Tracker Gold gate surface). It is NOT an authoritative access gate for
// FormaVision: FormaVision access stays with the body_photo_sessions finalize
// entitlement (migration 20260516000150) and usePremiumEntitlement. Body
// Tracker, which had no gate before #169f, uses this effective tier as its Gold
// gate signal.

import { useQuery } from '@tanstack/react-query';
import type { TierId, TierLevel } from '@/types/pricing';

export const EFFECTIVE_TIER_QUERY_KEY = ['pricing', 'effective-tier'] as const;

export interface EffectiveTierResponse {
  tierId: TierId;
  tierLevel: TierLevel;
  authenticated: boolean;
}

async function fetchEffectiveTier(): Promise<EffectiveTierResponse> {
  const res = await fetch('/api/pricing/tier', { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`Tier read failed: ${res.status}`);
  }
  return (await res.json()) as EffectiveTierResponse;
}

export interface UseEffectiveTierResult {
  tierId: TierId;
  tierLevel: TierLevel;
  authenticated: boolean;
  isLoading: boolean;
}

export function useEffectiveTier(): UseEffectiveTierResult {
  const query = useQuery<EffectiveTierResponse, Error>({
    queryKey: EFFECTIVE_TIER_QUERY_KEY,
    queryFn: fetchEffectiveTier,
    // Tier changes only on membership events; keep it fresh on focus + reconnect
    // so a just-completed upgrade is reflected without a hard reload.
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 30_000,
    retry: 2,
  });

  // Fail-safe default while loading or on error: treat as Free (the lowest
  // tier), so the UX defaults to the upgrade surfaces rather than flashing a
  // gated feature unlocked. Any real gated action still passes the server gate.
  return {
    tierId: query.data?.tierId ?? 'free',
    tierLevel: query.data?.tierLevel ?? 0,
    authenticated: query.data?.authenticated ?? false,
    isLoading: query.isLoading,
  };
}

export { fetchEffectiveTier as __fetchEffectiveTierForTest };
