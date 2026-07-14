'use client';

/**
 * src/components/formavision/CycleOptIn.tsx
 *
 * Task 211b-W4b - the cycle-aware opt-in control (consumer-private).
 *
 * OPT-IN, REVOCABLE, DEFAULT OFF:
 *   The control is OFF by default (opt_in: false). A user who never touches
 *   this control writes nothing and JourneyTimeline's phase-context labeling
 *   stays unchanged (applyCyclePhaseAwareness treats optIn: false as a no-op,
 *   per the APPROVED W4a service in cyclePhaseAware.ts). Turning it on writes
 *   an own-row user_cycle_context upsert AND a consent_ledger 'cycle_tracking'
 *   grant row; turning it off writes opt_in: false and a revoke row. Neither
 *   write ever deletes the user's data -- that is a separate, explicit
 *   deletion request, per the privacy copy below.
 *
 * PRIVACY (Prompt 211b W4a data-layer contract):
 *   user_cycle_context carries own-row RLS only, no practitioner policy.
 *   Practitioner visibility requires a SEPARATE explicit consent_ledger row
 *   (consent_type 'cycle_data_practitioner_share'), never granted from this
 *   control. This surface never enters identifiable telemetry.
 *
 * The phase, cycle length, and last period fields are saved together via an
 * explicit Save action (not on every keystroke), so JourneyTimeline only ever
 * receives a CONFIRMED phase, never a mid-edit draft.
 *
 * Standing rules: Lucide strokeWidth 1.5, no emojis, no em/en dashes, tokens
 *   only (Teal #2DA5A0 / Navy #1E3054 / Orange #B75E18), Instrument Sans.
 *   Desktop AND mobile responsive, w-full on mobile, 44px min touch targets.
 */

import { useEffect, useRef, useState } from 'react';
import { Moon, Check, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import type { CyclePhase } from '@/lib/formavision/noise/cyclePhaseAware';
import {
  readOwnCycleContext,
  upsertOwnCycleContext,
  insertCycleConsent,
  CYCLE_TRACKING_CONSENT_VERSION,
} from '@/lib/formavision/cycle/cycleContextDb';

const SCOPE = 'formavision.cycle-opt-in';
const TIMEOUT_MS = 4000;

const PHASE_OPTIONS: Array<{ value: CyclePhase; label: string }> = [
  { value: 'unknown', label: 'Not sure or prefer not to say' },
  { value: 'menstrual', label: 'Menstrual' },
  { value: 'follicular', label: 'Follicular' },
  { value: 'ovulatory', label: 'Ovulatory' },
  { value: 'luteal', label: 'Luteal' },
];

// ---------------------------------------------------------------------------
// Pure content renderer (exported for renderToStaticMarkup tests, no hooks).
// ---------------------------------------------------------------------------

export interface CycleOptInContentProps {
  optedIn: boolean;
  saving: boolean;
  draftPhase: CyclePhase;
  draftCycleLengthDays: string;
  draftLastPeriodStart: string;
  detailsDirty: boolean;
  onToggle: (next: boolean) => void;
  onDraftPhaseChange: (phase: CyclePhase) => void;
  onDraftCycleLengthChange: (value: string) => void;
  onDraftLastPeriodChange: (value: string) => void;
  onSaveDetails: () => void;
}

export function CycleOptInContent({
  optedIn,
  saving,
  draftPhase,
  draftCycleLengthDays,
  draftLastPeriodStart,
  detailsDirty,
  onToggle,
  onDraftPhaseChange,
  onDraftCycleLengthChange,
  onDraftLastPeriodChange,
  onSaveDetails,
}: CycleOptInContentProps) {
  return (
    <div
      data-testid="cycle-optin"
      className="w-full rounded-2xl border border-[#2DA5A0]/25 bg-[#1E3054]/40 p-4 backdrop-blur-md sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Moon
              size={16}
              strokeWidth={1.5}
              className={`flex-none ${optedIn ? 'text-[#2DA5A0]' : 'text-white/50'}`}
              aria-hidden="true"
            />
            Cycle aware trends
          </h3>
          <p data-testid="cycle-optin-why" className="mt-1 text-xs leading-relaxed text-white/60">
            Water retention can systematically move waist and hip measurements at
            certain points in your cycle. Turning this on adds a gentle note next to a
            fluctuation when it lines up with your current phase. It never changes,
            hides, or reframes a measurement, it only adds context alongside it.
          </p>
          <p
            data-testid="cycle-optin-privacy"
            className="mt-1.5 text-[11px] leading-relaxed text-white/40"
          >
            Private to you. Never shown to a practitioner unless you separately share
            it, and never used in any identifiable analytics. You can request deletion
            of this data at any time.
          </p>
        </div>

        {/* Toggle: 44px min touch target, w-full on mobile. */}
        <button
          type="button"
          role="switch"
          aria-checked={optedIn}
          aria-label={optedIn ? 'Turn off cycle aware trends' : 'Turn on cycle aware trends'}
          data-testid="cycle-optin-toggle"
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
              Cycle context on
            </>
          ) : (
            'Turn on cycle context'
          )}
        </button>
      </div>

      {optedIn && (
        <div data-testid="cycle-optin-details" className="mt-4 space-y-3 border-t border-white/[0.08] pt-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cycle-phase-select" className="text-xs font-medium text-white/70">
              Current cycle phase
            </label>
            <select
              id="cycle-phase-select"
              data-testid="cycle-phase-select"
              value={draftPhase}
              onChange={(e) => onDraftPhaseChange(e.target.value as CyclePhase)}
              className="min-h-[44px] w-full rounded-xl border border-white/20 bg-white/[0.04] px-3 text-base text-white sm:w-auto"
            >
              {PHASE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cycle-length-input" className="text-xs font-medium text-white/70">
                Typical cycle length in days (optional)
              </label>
              <input
                id="cycle-length-input"
                data-testid="cycle-length-input"
                type="number"
                inputMode="numeric"
                min={1}
                max={60}
                value={draftCycleLengthDays}
                onChange={(e) => onDraftCycleLengthChange(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-white/20 bg-white/[0.04] px-3 text-base text-white"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="last-period-input" className="text-xs font-medium text-white/70">
                Last period start (optional)
              </label>
              <input
                id="last-period-input"
                data-testid="last-period-input"
                type="date"
                value={draftLastPeriodStart}
                onChange={(e) => onDraftLastPeriodChange(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-white/20 bg-white/[0.04] px-3 text-base text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-white/40">
              <Info size={12} strokeWidth={1.5} className="mt-0.5 flex-none" aria-hidden="true" />
              Only the phase drives trend context today. Cycle length and last period
              are stored for you and are not required.
            </p>
            <button
              type="button"
              data-testid="cycle-optin-save"
              disabled={saving || !detailsDirty}
              onClick={onSaveDetails}
              className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-[#2DA5A0]/50 bg-[#2DA5A0]/15 px-4 py-2 text-sm font-medium text-[#2DA5A0] transition-colors hover:bg-[#2DA5A0]/25 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client wrapper (surface mount point). Reads + writes user_cycle_context
// (own-row) and records consent_ledger 'cycle_tracking' grants/revokes.
// ---------------------------------------------------------------------------

export interface CycleOptInProps {
  /**
   * Lifts the CONFIRMED (saved) opt-in state up to the parent so it can be
   * forwarded to JourneyTimeline's cycleContext prop. Called on initial load
   * (once resolved) and after every successful write. Never called with a
   * mid-edit draft value.
   */
  onCycleContextChange?: (optIn: boolean, phase: CyclePhase | null) => void;
}

export function CycleOptIn({ onCycleContextChange }: CycleOptInProps) {
  const [optedIn, setOptedIn] = useState(false);
  const [confirmedPhase, setConfirmedPhase] = useState<CyclePhase>('unknown');
  const [confirmedCycleLengthDays, setConfirmedCycleLengthDays] = useState<number | null>(null);
  const [confirmedLastPeriodStart, setConfirmedLastPeriodStart] = useState<string | null>(null);

  const [draftPhase, setDraftPhase] = useState<CyclePhase>('unknown');
  const [draftCycleLengthDays, setDraftCycleLengthDays] = useState<string>('');
  const [draftLastPeriodStart, setDraftLastPeriodStart] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  const notifyParent = (optIn: boolean, phase: CyclePhase | null) => {
    onCycleContextChange?.(optIn, phase);
  };

  // Load the persisted opt-in + details on mount (own-row). Fail-open to off.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const supabase = createClient();
        const authResult = await withTimeout(supabase.auth.getUser(), TIMEOUT_MS, `${SCOPE}.auth`);
        const userId = authResult.data?.user?.id;
        if (!userId) return;
        userIdRef.current = userId;

        const result = await withTimeout(
          readOwnCycleContext(supabase, userId),
          TIMEOUT_MS,
          `${SCOPE}.read`,
        );
        if (!active) return;
        if (result.data) {
          const isOptedIn = result.data.opt_in === true;
          const phase = isValidPhase(result.data.current_phase) ? result.data.current_phase : 'unknown';
          setOptedIn(isOptedIn);
          setConfirmedPhase(phase);
          setConfirmedCycleLengthDays(result.data.cycle_length_days);
          setConfirmedLastPeriodStart(result.data.last_period_start);
          setDraftPhase(phase);
          setDraftCycleLengthDays(
            result.data.cycle_length_days !== null ? String(result.data.cycle_length_days) : '',
          );
          setDraftLastPeriodStart(result.data.last_period_start ?? '');
          notifyParent(isOptedIn, isOptedIn ? phase : null);
        }
      } catch (err) {
        safeLog.warn(SCOPE, 'opt-in read failed, failing open', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = async (next: boolean) => {
    const userId = userIdRef.current;
    if (!userId) return;
    setSaving(true);
    setError(null);
    setOptedIn(next); // optimistic
    try {
      const supabase = createClient();
      const nowIso = new Date().toISOString();
      const { error: upsertError } = await withTimeout(
        upsertOwnCycleContext(supabase, {
          user_id: userId,
          opt_in: next,
          opted_in_at: next ? nowIso : null,
          current_phase: confirmedPhase,
          cycle_length_days: confirmedCycleLengthDays,
          last_period_start: confirmedLastPeriodStart,
        }),
        TIMEOUT_MS,
        `${SCOPE}.upsert`,
      );
      if (upsertError) throw new Error(upsertError.message);

      // Consent ledger audit trail: a grant row when turning on, a revoke row
      // when turning off. consent_ledger is append-only (no update policy).
      void insertCycleConsent(supabase, {
        user_id: userId,
        consent_type: 'cycle_tracking',
        version: CYCLE_TRACKING_CONSENT_VERSION,
        granted: next,
        granted_at: nowIso,
        revoked_at: next ? null : nowIso,
      }).catch((err) => {
        safeLog.warn(SCOPE, 'consent ledger write failed (non-fatal, opt-in state already saved)', {
          error: err instanceof Error ? err.message : String(err),
        });
      });

      notifyParent(next, next ? confirmedPhase : null);
    } catch (err) {
      setOptedIn(!next); // revert
      setError('Could not save that just now. Please try again.');
      safeLog.warn(SCOPE, 'opt-in write failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSaving(false);
    }
  };

  const parsedDraftCycleLength = (): number | null => {
    const trimmed = draftCycleLengthDays.trim();
    if (trimmed === '') return null;
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n <= 0 || n > 60) return null;
    return Math.round(n);
  };

  const detailsDirty =
    draftPhase !== confirmedPhase ||
    (parsedDraftCycleLength() ?? null) !== confirmedCycleLengthDays ||
    (draftLastPeriodStart || null) !== confirmedLastPeriodStart;

  const handleSaveDetails = async () => {
    const userId = userIdRef.current;
    if (!userId) return;
    setSaving(true);
    setError(null);
    const nextCycleLength = parsedDraftCycleLength();
    const nextLastPeriod = draftLastPeriodStart.trim() === '' ? null : draftLastPeriodStart;
    try {
      const supabase = createClient();
      const { error: upsertError } = await withTimeout(
        upsertOwnCycleContext(supabase, {
          user_id: userId,
          opt_in: true,
          opted_in_at: new Date().toISOString(),
          current_phase: draftPhase,
          cycle_length_days: nextCycleLength,
          last_period_start: nextLastPeriod,
        }),
        TIMEOUT_MS,
        `${SCOPE}.saveDetails`,
      );
      if (upsertError) throw new Error(upsertError.message);
      setConfirmedPhase(draftPhase);
      setConfirmedCycleLengthDays(nextCycleLength);
      setConfirmedLastPeriodStart(nextLastPeriod);
      notifyParent(true, draftPhase);
    } catch (err) {
      setError('Could not save that just now. Please try again.');
      safeLog.warn(SCOPE, 'details write failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-1.5">
      <CycleOptInContent
        optedIn={optedIn}
        saving={saving}
        draftPhase={draftPhase}
        draftCycleLengthDays={draftCycleLengthDays}
        draftLastPeriodStart={draftLastPeriodStart}
        detailsDirty={detailsDirty}
        onToggle={(next) => void handleToggle(next)}
        onDraftPhaseChange={setDraftPhase}
        onDraftCycleLengthChange={setDraftCycleLengthDays}
        onDraftLastPeriodChange={setDraftLastPeriodStart}
        onSaveDetails={() => void handleSaveDetails()}
      />
      {error && (
        <p data-testid="cycle-optin-error" className="px-1 text-xs text-[#FCA5A5]">
          {error}
        </p>
      )}
    </div>
  );
}

function isValidPhase(value: string | null): value is CyclePhase {
  return (
    value === 'menstrual' ||
    value === 'follicular' ||
    value === 'ovulatory' ||
    value === 'luteal' ||
    value === 'unknown'
  );
}
