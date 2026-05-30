/**
 * Prompt 170l Phase 1c-3: barcode settings section (Hannah §11.9 + Gate 2
 * sub-page placement).
 *
 * Three toggles per Hannah:
 *   1. Quality indicators (Nova / NutriScore / Eco-Score chips on the product
 *      confirmation screen). ON by default. Sub-label "These are informational,
 *      not recommendations." primes correct interpretation.
 *   2. Audio chime on detection. OFF by default (public-space considerate).
 *   3. Haptic feedback on detection. ON by default (accessibility-positive).
 *
 * Persistence via /api/nutrition/barcode/preferences GET+PUT.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { AttributionFooter } from '@/components/barcode/AttributionFooter';

interface BarcodePreferences {
  barcode_quality_indicators: boolean;
  barcode_audio_chime: boolean;
  barcode_haptic_feedback: boolean;
}

const DEFAULT_PREFS: BarcodePreferences = {
  barcode_quality_indicators: true,
  barcode_audio_chime: false,
  barcode_haptic_feedback: true,
};

export function BarcodeSettingsSection(): JSX.Element {
  const [prefs, setPrefs] = useState<BarcodePreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/nutrition/barcode/preferences');
        if (cancelled) return;
        if (res.ok) {
          const body = (await res.json()) as Partial<BarcodePreferences>;
          setPrefs({
            barcode_quality_indicators:
              typeof body.barcode_quality_indicators === 'boolean'
                ? body.barcode_quality_indicators
                : DEFAULT_PREFS.barcode_quality_indicators,
            barcode_audio_chime:
              typeof body.barcode_audio_chime === 'boolean'
                ? body.barcode_audio_chime
                : DEFAULT_PREFS.barcode_audio_chime,
            barcode_haptic_feedback:
              typeof body.barcode_haptic_feedback === 'boolean'
                ? body.barcode_haptic_feedback
                : DEFAULT_PREFS.barcode_haptic_feedback,
          });
        }
      } catch {
        // Network failure: silently keep defaults.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback(async (patch: Partial<BarcodePreferences>) => {
    setSaving(true);
    try {
      await fetch('/api/nutrition/barcode/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    } catch {
      // Best-effort: UI keeps optimistic state.
    } finally {
      setSaving(false);
    }
  }, []);

  const toggle = useCallback(
    (key: keyof BarcodePreferences) => {
      const next = !prefs[key];
      setPrefs((p) => ({ ...p, [key]: next }));
      void persist({ [key]: next });
    },
    [prefs, persist],
  );

  return (
    <section
      aria-labelledby="barcode-settings-heading"
      className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/55 p-5 backdrop-blur-md"
    >
      <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-white/55">
        Barcode scanning
      </h2>
      <h3
        id="barcode-settings-heading"
        className="text-base font-semibold text-white"
      >
        Preferences
      </h3>
      <p className="mt-2 text-sm leading-[22px] text-white/80">
        Customize how the barcode scanner behaves when you scan packaged foods.
      </p>

      {loading ? (
        <p className="mt-5 text-xs text-white/45">Loading preferences...</p>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          <SettingToggle
            label="Show quality indicators"
            sublabel="These are informational, not recommendations."
            checked={prefs.barcode_quality_indicators}
            disabled={saving}
            onToggle={() => toggle('barcode_quality_indicators')}
          />
          <SettingToggle
            label="Audio chime on detection"
            sublabel="Plays a short tone when a barcode is detected."
            checked={prefs.barcode_audio_chime}
            disabled={saving}
            onToggle={() => toggle('barcode_audio_chime')}
          />
          <SettingToggle
            label="Haptic feedback on detection"
            sublabel="Vibrates briefly when a barcode is detected (mobile only)."
            checked={prefs.barcode_haptic_feedback}
            disabled={saving}
            onToggle={() => toggle('barcode_haptic_feedback')}
          />
        </div>
      )}

      <AttributionFooter />
    </section>
  );
}

interface SettingToggleProps {
  label: string;
  sublabel: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}

function SettingToggle(props: SettingToggleProps): JSX.Element {
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-white/[0.06] bg-[#1A2744]/40 px-3.5 py-3">
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-white/85">{props.label}</span>
        <span className="mt-0.5 block text-[11px] text-white/55 leading-tight">
          {props.sublabel}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={props.checked}
        disabled={props.disabled}
        onClick={props.onToggle}
        className={`relative inline-flex h-6 w-11 flex-none items-center rounded-full transition-colors disabled:opacity-50 ${
          props.checked ? 'bg-[#2DA5A0]' : 'bg-white/15'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            props.checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}
