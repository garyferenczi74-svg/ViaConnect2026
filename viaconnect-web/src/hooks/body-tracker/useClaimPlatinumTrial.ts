'use client';

// useClaimPlatinumTrial  the self-initiated Platinum trial claim path (Prompt
// #169f Option C). A Gold member starts a one-time-per-LIFETIME 7-day Platinum
// trial.
//
// AUTHORITY: this hook does NOT duplicate the eligibility rules. It invokes the
// SECURITY DEFINER function public.fn_claim_self_initiated_platinum_trial(),
// which acts on auth.uid() (the caller can only ever start a trial for
// THEMSELVES) and enforces, in-database, the Gold-membership requirement, the
// one-time-per-lifetime rule, and the no-active-trial rule. This hook only
// RELAYS the function's result (the new trial uuid on success) or its raised
// error message (e.g. "a self-initiated Platinum trial requires an active Gold
// membership", "self-initiated Platinum trial already used", "an active trial
// already exists") to the caller. Mirrors the accept_practitioner_invitation
// .rpc(...) convention used elsewhere in the app (src/app/patients/invited and
// src/lib/practitioner/invitations.ts): the browser Supabase client carries the
// user's session, so auth.uid() inside the function is the signed-in user.

import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface ClaimPlatinumTrialResult {
  // True when the trial was created. trialId is the new platinum_trials.id.
  ok: boolean;
  trialId: string | null;
  // The function's raised error message on failure (surfaced verbatim so the UI
  // can show the specific reason), or null on success.
  error: string | null;
}

export interface UseClaimPlatinumTrialResult {
  // Invoke the claim. Resolves with ok + trialId on success, or ok=false + the
  // function's error message on failure. Never throws for an expected DB
  // rejection; only an unexpected client error sets a generic message.
  claim: () => Promise<ClaimPlatinumTrialResult>;
  // True while the claim RPC is in flight.
  isClaiming: boolean;
  // The last error message surfaced by a claim attempt, or null. Cleared when a
  // new claim starts.
  error: string | null;
}

export function useClaimPlatinumTrial(): UseClaimPlatinumTrialResult {
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claim = useCallback(async (): Promise<ClaimPlatinumTrialResult> => {
    setIsClaiming(true);
    setError(null);
    try {
      const supabase = createClient();
      // SECURITY DEFINER claim. The function returns the new trial uuid and is the
      // sole authority on eligibility; we relay its result/error and never
      // re-derive Gold/one-time/active-trial here. Same loose-cast .rpc pattern as
      // accept_practitioner_invitation (the function is not in the generated types).
      const { data, error: rpcErr } = await (supabase as unknown as {
        rpc: (
          fn: string,
        ) => Promise<{ data: string | null; error: { message: string } | null }>;
      }).rpc('fn_claim_self_initiated_platinum_trial');

      if (rpcErr) {
        setError(rpcErr.message);
        return { ok: false, trialId: null, error: rpcErr.message };
      }
      // The function RETURNS uuid; supabase-js returns it as the scalar data.
      const trialId = typeof data === 'string' ? data : null;
      return { ok: true, trialId, error: null };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not start the Platinum trial.';
      setError(message);
      return { ok: false, trialId: null, error: message };
    } finally {
      setIsClaiming(false);
    }
  }, []);

  return { claim, isClaiming, error };
}
