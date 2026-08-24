'use client';

/**
 * src/components/formavision/CadenceReminderOptIn.tsx
 *
 * Prompt 211a Workstream 4 (Part 2): the cadence reminder OPT-IN control.
 *
 * OPT-IN, REVOCABLE, DEFAULTS TO THE USER'S HISTORICAL SCAN TIME:
 *   The control is OFF by default (never nag). Turning it on writes an opt-in
 *   row to scan_cadence_reminders with reminder_time_of_day defaulting to the
 *   user's dominant historical scan time from recommendCadence. Turning it off
 *   flips opt_in back to false (revocable). scan_cadence_reminders carries
 *   own-row RLS, so a user can only ever read / write their own preference.
 *
 * The cadence nudge cron reads opt_in = true rows only; this control is the sole
 * way a user enters that set, and toggling off removes them.
 *
 * Honest: when history is too thin for a recommendation (recommendCadence is
 *   null) the control shows a gentle "keep scanning" note instead of a toggle,
 *   because there is no honest cadence to remind against yet.
 *
 * Telemetry: fires formavision.reminder_opt_in on each toggle (coarse: optedIn
 *   boolean + the time bucket, PII-clean).
 *
 * Standing rules: Lucide strokeWidth 1.5, no emojis, no em/en dashes, tokens
 *   only (Teal #2DA5A0 / Navy #1E3054), Instrument Sans. Desktop AND mobile
 *   responsive, w-full on mobile, 44px min touch target on the toggle.
 */

import { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { recommendCadence, type ScanHistoryEntry } from '@/lib/formavision/cadence/recommend';
import type { TimeOfDayBucket } from '@/lib/formavision/cadence/fingerprint';
import { emitCadenceEvent } from '@/lib/formavision/cadence/cadenceTelemetry';
import {
  readOwnCadenceReminder,
  upsertOwnCadenceReminder,
} from '@/lib/formavision/cadence/cadenceDb';

// ---------------------------------------------------------------------------
// Pure content renderer (exported for renderToStaticMarkup tests, no hooks).
// ---------------------------------------------------------------------------

export interface CadenceReminderOptInContentProps {
  /** null when history is too thin for an honest cadence (no toggle shown). */
  reminderTimeOfDay: TimeOfDayBucket | null;
  /** The dash-free reason line from recommendCadence, or null. */
  reason: string | null;
  optedIn: boolean;
  saving: boolean;
  onToggle: (next: boolean) => void;
}

export function CadenceReminderOptInContent({
  reminderTimeOfDay,
  reason,
  optedIn,
  saving,
  onToggle,
}: CadenceReminderOptInContentProps) {
  // No honest cadence yet: a gentle keep-scanning note, never a fake toggle.
  if (reminderTimeOfDay === null) {
    return (
      <div
        data-testid="cadence-optin-thin"
        className="w-full rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-4 text-xs leading-relaxed text-white/60 backdrop-blur-md sm:p-5"
      >
        A few more scans and I can offer a gentle reminder around the time you
        usually scan. No pressure at all.
      </div>
    );
  }

  return (
    <div
      data-testid="cadence-optin"
      className="w-full rounded-2xl border border-[#2DA5A0]/25 bg-[#1E3054]/40 p-4 backdrop-blur-md sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            {optedIn ? (
              <Bell size={16} strokeWidth={1.5} className="flex-none text-[#2DA5A0]" aria-hidden="true" />
            ) : (
              <BellOff size={16} strokeWidth={1.5} className="flex-none text-white/50" aria-hidden="true" />
            )}
            Gentle scan reminder
          </h3>
          <p data-testid="cadence-optin-reason" className="mt-1 text-xs leading-relaxed text-white/60">
            {reason ?? `A quiet nudge around your usual ${reminderTimeOfDay} scan time, only if you want it.`}
          </p>
        </div>

        {/* Toggle: 44px min touch target, w-full on mobile. */}
        <button
          type="button"
          role="switch"
          aria-checked={optedIn}
          aria-label={optedIn ? 'Turn off gentle scan reminders' : 'Turn on gentle scan reminders'}
          data-testid="cadence-optin-toggle"
          disabled={saving}
          onClick={() => onToggle(!optedIn)}
          className={`inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-60 sm:w-auto ${
            optedIn
              ? 'border-[#2DA5A0]/60 bg-[#2DA5A0]/15 text-[#2DA5A0]'
              : 'border-white/20 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]'
          }`}
        >
          {optedIn ? (
            <>
              <Check size={14} strokeWidth={1.5} aria-hidden="true" />
              Reminders on
            </>
          ) : (
            'Remind me'
          )}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client wrapper (surface mount point). Reads + writes scan_cadence_reminders
// own-row. Fail-open reads; write errors surface a quiet inline note.
// ---------------------------------------------------------------------------

export interface CadenceReminderOptInProps {
  /**
   * The user's scan history (date + time bucket per scan) used to compute the
   * default reminder time via recommendCadence. Passed in by the surface, which
   * already reads history for the trend displays.
   */
  scanHistory: ScanHistoryEntry[];
}

export function CadenceReminderOptIn({ scanHistory }: CadenceReminderOptInProps) {
  const [optedIn, setOptedIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  // Recommendation is computed from the user's own history. null when too thin.
  // nowMs is Date.now here (the RECOMMENDATION is anchored to the last scan, not
  // now; the OVERDUE math that reads the clock lives server-side in the cron).
  const recommendation = recommendCadence(scanHistory, Date.now());
  const reminderTimeOfDay = recommendation ? recommendation.defaultReminderTimeOfDay : null;

  // Load the persisted opt-in on mount (own-row). Fail-open to off.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const supabase = createClient();
        const authResult = await withTimeout(supabase.auth.getUser(), 4000, 'CadenceReminderOptIn.auth');
        const userId = authResult.data?.user?.id;
        if (!userId) return;
        userIdRef.current = userId;

        const result = await withTimeout(
          readOwnCadenceReminder(supabase, userId),
          4000,
          'CadenceReminderOptIn.read',
        );
        if (!active) return;
        if (result.data) setOptedIn(result.data.opt_in === true);
      } catch (err) {
        safeLog.warn('CadenceReminderOptIn', 'opt-in read failed, failing open', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleToggle = async (next: boolean) => {
    const userId = userIdRef.current;
    if (!userId || reminderTimeOfDay === null) return;
    setSaving(true);
    setError(null);
    // Optimistic flip; revert on failure.
    setOptedIn(next);
    try {
      const supabase = createClient();
      const { error: upsertError } = await withTimeout(
        upsertOwnCadenceReminder(supabase, {
          user_id: userId,
          opt_in: next,
          reminder_time_of_day: reminderTimeOfDay,
          opted_in_at: next ? new Date().toISOString() : null,
        }),
        4000,
        'CadenceReminderOptIn.upsert',
      );
      if (upsertError) {
        throw new Error(upsertError.message);
      }
      // Coarse, PII-clean telemetry: the boolean + the time bucket only.
      void emitCadenceEvent(userId, 'formavision.reminder_opt_in', {
        optedIn: next,
        timeOfDay: reminderTimeOfDay,
      });
    } catch (err) {
      setOptedIn(!next); // revert
      setError('Could not save that just now. Please try again.');
      safeLog.warn('CadenceReminderOptIn', 'opt-in write failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-1.5">
      <CadenceReminderOptInContent
        reminderTimeOfDay={reminderTimeOfDay}
        reason={recommendation ? recommendation.reason : null}
        optedIn={optedIn}
        saving={saving}
        onToggle={(next) => void handleToggle(next)}
      />
      {error && (
        <p data-testid="cadence-optin-error" className="px-1 text-xs text-[#FCA5A5]">
          {error}
        </p>
      )}
    </div>
  );
}
