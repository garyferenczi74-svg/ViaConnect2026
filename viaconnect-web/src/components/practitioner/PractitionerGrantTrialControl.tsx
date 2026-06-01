'use client';

// PractitionerGrantTrialControl  (Prompt #169f, Option D)
//
// The practitioner-facing control to grant a patient a 7, 14, or 30 day Platinum
// trial. It is rendered ONLY in an active practitioner-patient relationship
// context that the patient detail page has already established (the page resolves
// the active relationship row and passes the patient's user id down); this
// component adds NO new access logic.
//
// AUTHORITY: the grant goes through useGrantPlatinumTrial, which calls the
// SECURITY DEFINER fn_grant_practitioner_platinum_trial. That function (acting as
// the signed-in practitioner = auth.uid()) is the sole authority on the
// active-relationship, one-time-per-pair, no-active-trial, and 7/14/30 duration
// rules. This control only RELAYS the function's success (a confirmation) or its
// raised error message verbatim (e.g. already granted, no active relationship,
// patient has an active trial).
//
// Copy is intentionally minimal and functional only ("Grant Platinum trial", the
// "7 days / 14 days / 30 days" options, a short confirmation). The polished trial
// copy (169f sections 9.5 / 12.2 / 12.3) is a separate, gated pass.

import { useState } from 'react';
import { CalendarClock, Check, Loader2 } from 'lucide-react';
import { getDisplayName } from '@/lib/getDisplayName';
import {
  useGrantPlatinumTrial,
  type PlatinumTrialDurationDays,
} from '@/hooks/body-tracker/useGrantPlatinumTrial';

interface Props {
  // The patient's auth user id (platinum_trials.user_id). The granting
  // practitioner is auth.uid() inside the function, never passed in.
  patientUserId: string;
  // The patient's display name, for the control's label. Routed through
  // getDisplayName per the client-facing-identity rule.
  patientName?: string | null;
}

const DURATION_OPTIONS: PlatinumTrialDurationDays[] = [7, 14, 30];

export function PractitionerGrantTrialControl({ patientUserId, patientName }: Props) {
  const { grant, isGranting, error } = useGrantPlatinumTrial();
  const [durationDays, setDurationDays] = useState<PlatinumTrialDurationDays>(7);
  const [granted, setGranted] = useState(false);

  const displayName = getDisplayName(patientName ?? 'Patient');

  const onGrant = async () => {
    setGranted(false);
    const result = await grant({ patientUserId, durationDays });
    if (result.ok) {
      setGranted(true);
    }
    // On failure the hook's `error` holds the function's message; surfaced below.
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <header className="mb-3 flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-portal-green" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold text-white">Platinum trial</h2>
      </header>

      <p className="mb-3 text-sm text-white/55">
        Grant {displayName} a Platinum trial.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="grant-trial-duration" className="sr-only">
          Trial length
        </label>
        <select
          id="grant-trial-duration"
          value={durationDays}
          onChange={(e) => setDurationDays(Number(e.target.value) as PlatinumTrialDurationDays)}
          disabled={isGranting}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white min-h-[40px] disabled:opacity-50"
        >
          {DURATION_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d} days
            </option>
          ))}
        </select>

        <button
          type="button"
          data-testid="grant-platinum-trial"
          onClick={onGrant}
          disabled={isGranting}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-portal-green/40 bg-portal-green/15 px-4 py-2 text-sm font-semibold text-portal-green hover:bg-portal-green/25 min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGranting && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />}
          Grant Platinum trial
        </button>
      </div>

      {granted && !error && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-portal-green" role="status">
          <Check className="h-4 w-4" strokeWidth={1.5} />
          Platinum trial granted.
        </p>
      )}

      {error && (
        <p className="mt-3 text-sm text-[#FCA5A5]" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
