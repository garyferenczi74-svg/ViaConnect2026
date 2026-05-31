'use client';

// Prompt 171b Phase 2: standalone caffeine entry pill for the dashboard.
// Lets a user log "I just had 95 mg of coffee" without going through a full
// NutriVision meal save. Writes via /api/nutrition/caffeine/log which
// creates a minimal meals + meal_items pair so the 171b Phase 1 BOS
// caffeine_timing source slice picks it up on the next recompute.
//
// Design intent: terse, single-purpose. One numeric input, one Save button,
// one confirmation toast. Quick-tap presets for common drinks reduce the
// friction for users who know their typical caffeine values.

import { useCallback, useState } from 'react';
import { Coffee } from 'lucide-react';

const QUICK_PRESETS = [
  { label: 'Coffee', caffeine_mg: 95 },
  { label: 'Espresso', caffeine_mg: 63 },
  { label: 'Tea', caffeine_mg: 47 },
  { label: 'Energy drink', caffeine_mg: 160 },
];

const NAVY = '#1A2744';
const CARD = '#1E3054';
const TEAL = '#2DA5A0';

export function CaffeineQuickEntry(): JSX.Element {
  const [value, setValue] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePreset = useCallback((mg: number) => {
    setValue(String(mg));
    setError(null);
  }, []);

  const handleSave = useCallback(async () => {
    const mg = Number.parseFloat(value);
    if (!Number.isFinite(mg) || mg <= 0 || mg > 1000) {
      setError('Enter a caffeine amount between 1 and 1000 mg.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setConfirmation(null);
    try {
      const res = await fetch('/api/nutrition/caffeine/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caffeine_mg: mg }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? 'Could not save caffeine entry');
        return;
      }
      setConfirmation(`Logged ${mg} mg of caffeine.`);
      setValue('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  }, [value]);

  return (
    <section
      aria-labelledby="caffeine-quick-entry-heading"
      className="rounded-2xl border border-white/[0.08] p-4"
      style={{ backgroundColor: `${CARD}66` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: 'rgba(45, 165, 160, 0.15)', color: TEAL }}
        >
          <Coffee className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        </span>
        <h3
          id="caffeine-quick-entry-heading"
          className="text-sm font-semibold text-white"
        >
          Log caffeine
        </h3>
      </div>

      <p className="mb-3 text-[11px] text-white/55 leading-relaxed">
        Adds a caffeine signal to your Bio Optimization Score. Use a quick preset or type the exact mg.
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        {QUICK_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => handlePreset(preset.caffeine_mg)}
            disabled={isSubmitting}
            className="rounded-full px-3 py-1.5 text-[11px] font-medium text-white/80 transition-colors hover:bg-white/10 disabled:opacity-50"
            style={{ backgroundColor: 'rgba(26, 39, 68, 0.6)' }}
          >
            {preset.label} ({preset.caffeine_mg} mg)
          </button>
        ))}
      </div>

      <div className="flex items-stretch gap-2">
        <label className="flex-1 relative">
          <span className="sr-only">Caffeine in milligrams</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={1000}
            step={1}
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(null); }}
            placeholder="mg"
            disabled={isSubmitting}
            className="w-full rounded-xl px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2"
            style={{
              backgroundColor: NAVY,
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          />
        </label>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSubmitting || value.length === 0}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: TEAL }}
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-[11px]" style={{ color: '#FCA5A5' }}>
          {error}
        </p>
      ) : null}
      {confirmation ? (
        <p role="status" aria-live="polite" className="mt-2 text-[11px] text-white/70">
          {confirmation}
        </p>
      ) : null}
    </section>
  );
}
