'use client';

// useTrialState  the READ-ONLY Platinum trial signal the body-scan UI consumes
// (Prompt #169f). Surfaces the user's current ACTIVE trial (source, expiresAt,
// daysRemaining) and whether they are ELIGIBLE to start a self-trial (active
// Gold + no prior self-trial + no active trial).
//
// This is a UX signal ONLY. The SECURITY DEFINER functions
// fn_claim_self_initiated_platinum_trial / fn_grant_practitioner_platinum_trial
// remain the AUTHORITY at claim/grant time, so a stale eligibility read here can
// never bypass the in-database one-time / Gold / no-active-trial rules.
//
// READS (browser client, narrow loose-cast matching the body-tracker hooks since
// platinum_trials is not in the generated supabase types):
//   1. platinum_trials rows for the user (owner SELECT RLS:
//      platinum_trials_owner_select, auth.uid() = user_id) -> active trial +
//      prior self-trial.
//   2. memberships joined to membership_tiers(tier_level) -> active Gold (level 1)
//      for the self-trial CTA eligibility, the same membership shape the
//      entitlement resolver reads.
//
// The DECISION (active predicate, daysRemaining, eligibility) is the pure,
// unit-tested module src/lib/body-tracker/trial-state.ts; this hook is only I/O +
// React state, matching the useBiometricConsent / useBodyScanAgeGate pattern.

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  deriveTrialState,
  type TrialRow,
  type TrialState,
} from '@/lib/body-tracker/trial-state';

// The active-membership statuses that count, mirroring the entitlement resolver
// and the claim function's Gold check (status IN ('active','trialing','gift_active')).
const ACTIVE_MEMBERSHIP_STATUSES = new Set(['active', 'trialing', 'gift_active']);
const GOLD_TIER_LEVEL = 1;

export interface UseTrialStateResult extends TrialState {
  isLoading: boolean;
  // Re-read the trial + membership signals (e.g. after a successful claim/grant so
  // the surface reflects the new active trial without a hard reload).
  refresh: () => Promise<void>;
}

// Narrow structural casts for the loose Supabase access (these tables/columns are
// not in the generated types).
type TrialReader = {
  from: (t: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        order: (col: string, opts: { ascending: boolean }) => {
          limit: (n: number) => Promise<{ data: TrialRow[] | null }>;
        };
      };
    };
  };
};

interface MembershipTierRow {
  status: string | null;
  current_period_end: string | null;
  membership_tiers: { tier_level: number | null } | { tier_level: number | null }[] | null;
}

type MembershipReader = {
  from: (t: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        in: (col: string, vals: string[]) => Promise<{ data: MembershipTierRow[] | null }>;
      };
    };
  };
};

// True when the user holds an active, non-lapsed GOLD membership (tier_level 1).
// Mirrors the claim function's Gold check; a NULL current_period_end is
// non-expiring and stays allowed.
function isActiveGold(rows: MembershipTierRow[] | null, asOf: Date): boolean {
  if (!rows) return false;
  return rows.some((r) => {
    if (!r.status || !ACTIVE_MEMBERSHIP_STATUSES.has(r.status)) return false;
    if (r.current_period_end != null) {
      const end = new Date(r.current_period_end).getTime();
      if (!Number.isNaN(end) && end <= asOf.getTime()) return false;
    }
    const mt = Array.isArray(r.membership_tiers) ? r.membership_tiers[0] : r.membership_tiers;
    return (mt?.tier_level ?? -1) === GOLD_TIER_LEVEL;
  });
}

export function useTrialState(): UseTrialStateResult {
  const [state, setState] = useState<TrialState>({
    activeTrial: null,
    hasUsedSelfTrial: false,
    eligibleForSelfTrial: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (): Promise<void> => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setState({ activeTrial: null, hasUsedSelfTrial: false, eligibleForSelfTrial: false });
      return;
    }
    const asOf = new Date();

    // 1. The user's own trial rows (owner SELECT RLS scopes to auth.uid()).
    const trialReader = supabase as unknown as TrialReader;
    const { data: trialRows } = await trialReader
      .from('platinum_trials')
      .select('trial_source, expires_at, converted_at, cancelled_at')
      .eq('user_id', user.id)
      .order('expires_at', { ascending: false })
      .limit(50);

    // 2. Active membership tier (for Gold eligibility).
    const membershipReader = supabase as unknown as MembershipReader;
    const { data: membershipRows } = await membershipReader
      .from('memberships')
      .select('status, current_period_end, membership_tiers(tier_level)')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'gift_active']);

    const isGold = isActiveGold(membershipRows ?? null, asOf);
    setState(deriveTrialState(trialRows ?? [], isGold, asOf));
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      await load();
    } catch {
      // Fail-safe: on a read error, present the non-eligible / no-active-trial
      // baseline so the UI does not show a stale CTA; the claim function still
      // enforces the real rules.
      setState({ activeTrial: null, hasUsedSelfTrial: false, eligibleForSelfTrial: false });
    }
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch {
        if (!cancelled) {
          setState({ activeTrial: null, hasUsedSelfTrial: false, eligibleForSelfTrial: false });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  return { ...state, isLoading, refresh };
}
