'use client';

// useGrantPlatinumTrial  the practitioner-granted Platinum trial path (Prompt
// #169f Option D). An ACTIVE practitioner grants their patient a 7, 14, or 30 day
// Platinum trial, one-time per practitioner-patient pair.
//
// AUTHORITY: this hook does NOT duplicate the eligibility rules. It invokes the
// SECURITY DEFINER function
// public.fn_grant_practitioner_platinum_trial(p_patient_user_id, p_duration_days),
// in which the granting practitioner is auth.uid() (the caller can only grant AS
// THEMSELVES; the only passed-in id is the patient). The function enforces, in
// database, the active-practitioner requirement, the active practitioner-patient
// relationship, the one-time-per-pair rule, the no-active-trial rule, and the
// 7/14/30 duration whitelist. This hook only RELAYS the function's result (the
// new trial uuid) or its raised error message (e.g. "only an active practitioner
// may grant a Platinum trial", "no active practitioner-patient relationship", "a
// trial was already granted to this patient by this practitioner", "an active
// trial already exists for this patient", "duration_days must be 7, 14, or 30").
// Mirrors the accept_practitioner_invitation .rpc(...) convention used elsewhere
// in the app: the browser Supabase client carries the practitioner's session, so
// auth.uid() inside the function is the signed-in practitioner.

import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// The trial durations the function accepts (169f Option D). Kept here only as the
// UI's selectable set; the function re-validates this whitelist authoritatively.
export type PlatinumTrialDurationDays = 7 | 14 | 30;

export interface GrantPlatinumTrialArgs {
  // The patient's auth user id (platinum_trials.user_id). The granting
  // practitioner is auth.uid() inside the function, never passed in.
  patientUserId: string;
  durationDays: PlatinumTrialDurationDays;
}

export interface GrantPlatinumTrialResult {
  ok: boolean;
  trialId: string | null;
  error: string | null;
}

export interface UseGrantPlatinumTrialResult {
  // Invoke the grant. Resolves with ok + trialId on success, or ok=false + the
  // function's error message on failure.
  grant: (args: GrantPlatinumTrialArgs) => Promise<GrantPlatinumTrialResult>;
  // True while the grant RPC is in flight.
  isGranting: boolean;
  // The last error message surfaced by a grant attempt, or null.
  error: string | null;
}

export function useGrantPlatinumTrial(): UseGrantPlatinumTrialResult {
  const [isGranting, setIsGranting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grant = useCallback(
    async (args: GrantPlatinumTrialArgs): Promise<GrantPlatinumTrialResult> => {
      setIsGranting(true);
      setError(null);
      try {
        const supabase = createClient();
        // SECURITY DEFINER grant. The function returns the new trial uuid and is
        // the sole authority on the relationship + one-time + duration rules; we
        // relay its result/error and never re-derive them here. Same loose-cast
        // .rpc pattern as accept_practitioner_invitation.
        const { data, error: rpcErr } = await (supabase as unknown as {
          rpc: (
            fn: string,
            params: { p_patient_user_id: string; p_duration_days: number },
          ) => Promise<{ data: string | null; error: { message: string } | null }>;
        }).rpc('fn_grant_practitioner_platinum_trial', {
          p_patient_user_id: args.patientUserId,
          p_duration_days: args.durationDays,
        });

        if (rpcErr) {
          setError(rpcErr.message);
          return { ok: false, trialId: null, error: rpcErr.message };
        }
        const trialId = typeof data === 'string' ? data : null;
        return { ok: true, trialId, error: null };
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Could not grant the Platinum trial.';
        setError(message);
        return { ok: false, trialId: null, error: message };
      } finally {
        setIsGranting(false);
      }
    },
    [],
  );

  return { grant, isGranting, error };
}
