/**
 * Prompt 170o Phase 1 Phase D: Settings > NutriVision > Hydration section.
 *
 * Per Hannah Surface 6 wireframe: Default vs Custom target (slider always
 * visible per Hannah push-back; read-only when Default selected) +
 * Conservative vs Adjusted counting toggle + 5-option reminder cadence +
 * 2 hide toggles + tutorial replay link (deferred Phase 1.1 alongside
 * tutorial itself). FDA-verified disclaimer per Hannah revised copy.
 */

'use client';

import { Droplet } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface HydrationPreferences {
  counting_mode: 'conservative' | 'adjusted';
  notifications_enabled: boolean;
  notification_cadence: 'every_2h' | 'every_3h' | 'every_4h' | 'milestone_only' | null;
}

interface HydrationTargetState {
  custom_target_ml_per_day: number | null;
  effective_target_ml: number;
}

const NOTIFICATION_CADENCE_OPTIONS = [
  { value: null, label: 'Off' },
  { value: 'every_2h', label: 'Every 2 hours' },
  { value: 'every_3h', label: 'Every 3 hours' },
  { value: 'every_4h', label: 'Every 4 hours' },
  { value: 'milestone_only', label: 'Milestone only' },
] as const;

const TARGET_MIN = 500;
const TARGET_MAX = 6000;
const TARGET_STEP = 50;

export function HydrationSettingsSection() {
  const [prefs, setPrefs] = useState<HydrationPreferences>({
    counting_mode: 'conservative',
    notifications_enabled: false,
    notification_cadence: null,
  });
  const [target, setTarget] = useState<HydrationTargetState>({
    custom_target_ml_per_day: null,
    effective_target_ml: 1890,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [prefsResp, todayResp] = await Promise.all([
          fetch('/api/nutrition/hydration/preferences'),
          fetch('/api/nutrition/hydration/today'),
        ]);
        if (prefsResp.ok) {
          const prefsBody = (await prefsResp.json()) as HydrationPreferences;
          if (!cancelled) setPrefs(prefsBody);
        }
        if (todayResp.ok) {
          const todayBody = await todayResp.json();
          if (!cancelled) {
            setTarget((prev) => ({
              ...prev,
              effective_target_ml: typeof todayBody?.target_ml === 'number' ? todayBody.target_ml : prev.effective_target_ml,
            }));
          }
        }
      } catch {
        /* silent; defaults stay */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const persistTarget = useCallback(async (custom: number | null) => {
    setSaving(true);
    try {
      const resp = await fetch('/api/nutrition/hydration/target', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_target_ml_per_day: custom }),
      });
      if (!resp.ok) {
        toast.error('Could not update target');
        return;
      }
      const body = await resp.json();
      setTarget({
        custom_target_ml_per_day: custom,
        effective_target_ml: body?.effective_target_ml ?? target.effective_target_ml,
      });
      toast.success(custom === null ? 'Using default target' : `Target set to ${custom} ml`);
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  }, [target.effective_target_ml]);

  const persistPreferences = useCallback(async (next: Partial<HydrationPreferences>) => {
    const previousPrefs = prefs;
    setPrefs((p) => ({ ...p, ...next }));
    setSaving(true);
    try {
      const resp = await fetch('/api/nutrition/hydration/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (!resp.ok) {
        setPrefs(previousPrefs);
        toast.error('Could not update preferences');
      }
    } catch {
      setPrefs(previousPrefs);
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  }, [prefs]);

  const usingCustom = target.custom_target_ml_per_day !== null;

  return (
    <section
      aria-labelledby="hydration-settings-heading"
      className="mt-4 rounded-2xl border border-white/[0.08] bg-[#1E3054]/45 p-4"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#2DA5A0]/15">
          <Droplet className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
        </span>
        <div className="flex-1 min-w-0">
          <h3 id="hydration-settings-heading" className="text-sm font-semibold text-white">
            Hydration
          </h3>
          <p className="mt-1 text-[12px] leading-relaxed text-white/65">
            Track water and beverages alongside your meals. Quick-log buttons live on the Dashboard, the NutriVision tab, and the Hydration detail view.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="mt-4 text-xs text-white/45">Loading hydration settings...</p>
      ) : (
        <div className="mt-5 flex flex-col gap-5">
          <div>
            <label className="block text-[12px] font-medium uppercase tracking-wide text-white/65">
              Daily hydration target
            </label>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => void persistTarget(null)}
                disabled={saving}
                aria-pressed={!usingCustom}
                className={`inline-flex h-10 flex-1 items-center justify-center rounded-xl px-3 text-sm transition-colors ${
                  !usingCustom
                    ? 'border-2 border-[#2DA5A0] bg-[#2DA5A0]/15 text-[#2DA5A0]'
                    : 'border border-white/[0.08] bg-[#1A2744]/55 text-white/80 hover:bg-[#1A2744]/75'
                }`}
              >
                Default
              </button>
              <button
                type="button"
                onClick={() => void persistTarget(target.custom_target_ml_per_day ?? target.effective_target_ml)}
                disabled={saving}
                aria-pressed={usingCustom}
                className={`inline-flex h-10 flex-1 items-center justify-center rounded-xl px-3 text-sm transition-colors ${
                  usingCustom
                    ? 'border-2 border-[#2DA5A0] bg-[#2DA5A0]/15 text-[#2DA5A0]'
                    : 'border border-white/[0.08] bg-[#1A2744]/55 text-white/80 hover:bg-[#1A2744]/75'
                }`}
              >
                Custom
              </button>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="range"
                min={TARGET_MIN}
                max={TARGET_MAX}
                step={TARGET_STEP}
                value={target.custom_target_ml_per_day ?? target.effective_target_ml}
                disabled={!usingCustom || saving}
                onChange={(e) => setTarget((prev) => ({ ...prev, custom_target_ml_per_day: Number(e.target.value) }))}
                onMouseUp={(e) => { if (usingCustom) void persistTarget(Number((e.target as HTMLInputElement).value)); }}
                onTouchEnd={(e) => { if (usingCustom) void persistTarget(Number((e.target as HTMLInputElement).value)); }}
                aria-label="Custom hydration target in milliliters"
                className="flex-1 disabled:opacity-50"
              />
              <span className="min-w-[80px] text-right text-sm font-medium text-white">
                {(target.custom_target_ml_per_day ?? target.effective_target_ml).toLocaleString()} ml
              </span>
            </div>
            {!usingCustom ? (
              <p className="mt-2 text-[11px] text-white/55">
                Default is computed from your body weight, activity, and pregnancy status when set.
              </p>
            ) : null}
          </div>

          <div>
            <label className="block text-[12px] font-medium uppercase tracking-wide text-white/65">
              Counting mode
            </label>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => void persistPreferences({ counting_mode: 'conservative' })}
                disabled={saving}
                aria-pressed={prefs.counting_mode === 'conservative'}
                className={`inline-flex h-10 flex-1 items-center justify-center rounded-xl px-3 text-sm transition-colors ${
                  prefs.counting_mode === 'conservative'
                    ? 'border-2 border-[#2DA5A0] bg-[#2DA5A0]/15 text-[#2DA5A0]'
                    : 'border border-white/[0.08] bg-[#1A2744]/55 text-white/80 hover:bg-[#1A2744]/75'
                }`}
              >
                Conservative
              </button>
              <button
                type="button"
                onClick={() => void persistPreferences({ counting_mode: 'adjusted' })}
                disabled={saving}
                aria-pressed={prefs.counting_mode === 'adjusted'}
                className={`inline-flex h-10 flex-1 items-center justify-center rounded-xl px-3 text-sm transition-colors ${
                  prefs.counting_mode === 'adjusted'
                    ? 'border-2 border-[#2DA5A0] bg-[#2DA5A0]/15 text-[#2DA5A0]'
                    : 'border border-white/[0.08] bg-[#1A2744]/55 text-white/80 hover:bg-[#1A2744]/75'
                }`}
              >
                Adjusted
              </button>
            </div>
            <p className="mt-2 text-[11px] text-white/55">
              Conservative counts only pure water. Adjusted includes coffee, tea, juice, and other beverages at appropriate ratios.
            </p>
          </div>

          <div>
            <label className="block text-[12px] font-medium uppercase tracking-wide text-white/65">
              Hydration reminders
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {NOTIFICATION_CADENCE_OPTIONS.map((opt) => {
                const isSelected = opt.value === null
                  ? !prefs.notifications_enabled
                  : prefs.notifications_enabled && prefs.notification_cadence === opt.value;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      if (opt.value === null) {
                        void persistPreferences({ notifications_enabled: false, notification_cadence: null });
                      } else {
                        void persistPreferences({ notifications_enabled: true, notification_cadence: opt.value });
                      }
                    }}
                    disabled={saving}
                    aria-pressed={isSelected}
                    className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-[12px] transition-colors ${
                      isSelected
                        ? 'border-2 border-[#2DA5A0] bg-[#2DA5A0]/15 text-[#2DA5A0]'
                        : 'border border-white/[0.08] bg-[#1A2744]/55 text-white/80 hover:bg-[#1A2744]/75'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <p className="mt-5 text-[11px] leading-relaxed text-white/45">
        Hydration targets here are general estimates based on common formulas. Your needs may differ based on your health, medications, and lifestyle. For personalized guidance, talk with your healthcare provider. This feature supports your general wellness and is not intended to diagnose, treat, cure, or prevent any disease.
      </p>
    </section>
  );
}
