// Prompt 207a Task 6: CreateBeverageForm component.
//
// Small form collecting display_name, category, default_volume_ml, and
// optional caffeine_mg (shown only for CAFFEINE_CATEGORIES). On submit it
// calls onCreateCustom then immediately fires onLogged with the new
// beverage's id + default volume so the parent logs the drink without
// requiring a second interaction. Cancel returns to the default view.
//
// Design tokens: bg #1A2744 card / border #1E3054 / teal #2DA5A0 / amber #B75E18.
// Lucide icons: strokeWidth 1.5 throughout.

'use client';

import { useState } from 'react';
import { Minus, Plus, ChevronDown, X, Loader2 } from 'lucide-react';
import {
  BEVERAGE_CATEGORIES,
  CAFFEINE_CATEGORIES,
} from '@/lib/nutrition/hydration/custom-beverage-mapping';
import type { BeverageLogIntent } from './BeveragePicker.types';
import type { UserBeverage, CreateBeverageInput } from '@/components/hydration/useUserBeverages';
import type { BeverageCategory } from '@/lib/nutrition/hydration/custom-beverage-mapping';

const CATEGORY_LABELS: Record<BeverageCategory, string> = {
  water: 'Water',
  coffee: 'Coffee',
  tea: 'Tea',
  juice: 'Juice',
  pop: 'Pop / Soda',
  sports_energy: 'Sports / Energy',
  milk: 'Milk',
  functional: 'Functional',
  alcohol: 'Alcohol',
};

const VOLUME_MIN = 10;
const VOLUME_MAX = 5000;
const VOLUME_STEP = 50;

export interface CreateBeverageFormProps {
  onCreateCustom: (input: CreateBeverageInput) => Promise<UserBeverage | null>;
  onLogged?: (intent: BeverageLogIntent) => Promise<void> | void;
  onCancel: () => void;
}

export function CreateBeverageForm({
  onCreateCustom,
  onLogged,
  onCancel,
}: CreateBeverageFormProps): JSX.Element {
  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState<BeverageCategory>('water');
  const [volumeMl, setVolumeMl] = useState(250);
  const [caffeineMg, setCaffeineMg] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showCaffeine = (CAFFEINE_CATEGORIES as readonly string[]).includes(category);

  function clampVolume(v: number): number {
    if (!Number.isFinite(v)) return VOLUME_MIN;
    return Math.max(VOLUME_MIN, Math.min(VOLUME_MAX, Math.round(v)));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (!trimmed) {
      setError('Name is required.');
      return;
    }
    if (trimmed.length > 60) {
      setError('Name must be 60 characters or fewer.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const input: CreateBeverageInput = {
        display_name: trimmed,
        category,
        default_volume_ml: volumeMl,
      };
      if (showCaffeine && caffeineMg !== '' && Number(caffeineMg) >= 0) {
        input.caffeine_mg_per_serving = Number(caffeineMg);
      }

      const created = await onCreateCustom(input);
      if (!created) {
        setError('Could not save beverage. Please try again.');
        return;
      }

      await onLogged?.({
        beverage_kind: created.hydration_source_kind as import('./BeveragePicker.types').HydrationSourceKind,
        volume_ml: created.default_volume_ml,
        user_beverage_id: created.id,
        slug: '',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      noValidate
      className="flex flex-col gap-4"
      aria-label="Create a custom beverage"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-white">Create my own</h3>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/5 text-white/70 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2DA5A0] focus-visible:outline-offset-2"
        >
          <X className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg bg-[#B75E18]/10 px-3 py-2 text-[12px] text-[#B75E18]">
          {error}
        </p>
      ) : null}

      {/* Display name */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cbf-name" className="text-[11px] font-medium uppercase tracking-wide text-white/55">
          Beverage name
        </label>
        <input
          id="cbf-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={60}
          placeholder="e.g. Homemade Kombucha"
          required
          className="w-full rounded-lg border border-white/[0.08] bg-[#1A2744] px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:border-[#2DA5A0]/50 focus:outline-none"
        />
        <span className="text-right text-[10px] text-white/35">
          {displayName.length}/60
        </span>
      </div>

      {/* Category */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cbf-category" className="text-[11px] font-medium uppercase tracking-wide text-white/55">
          Category
        </label>
        <div className="relative">
          <select
            id="cbf-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as BeverageCategory)}
            className="w-full appearance-none rounded-lg border border-white/[0.08] bg-[#1A2744] px-3 py-2 pr-8 text-[13px] text-white focus:border-[#2DA5A0]/50 focus:outline-none"
          >
            {BEVERAGE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Default volume stepper */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium uppercase tracking-wide text-white/55">
          Default volume
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setVolumeMl((v) => clampVolume(v - VOLUME_STEP))}
            aria-label="Decrease volume"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/5 text-white/80 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2DA5A0] focus-visible:outline-offset-2"
          >
            <Minus className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
          <span className="flex-1 text-center text-[15px] font-semibold text-white">
            {volumeMl} ml
          </span>
          <button
            type="button"
            onClick={() => setVolumeMl((v) => clampVolume(v + VOLUME_STEP))}
            aria-label="Increase volume"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/5 text-white/80 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2DA5A0] focus-visible:outline-offset-2"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
        <p className="text-center text-[10px] text-white/35">{VOLUME_MIN} ml min / {VOLUME_MAX} ml max</p>
      </div>

      {/* Optional caffeine field - shown only for caffeine-relevant categories */}
      {showCaffeine ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cbf-caffeine" className="text-[11px] font-medium uppercase tracking-wide text-white/55">
            Caffeine per serving (mg, optional)
          </label>
          <input
            id="cbf-caffeine"
            type="number"
            min={0}
            max={2000}
            value={caffeineMg}
            onChange={(e) =>
              setCaffeineMg(e.target.value === '' ? '' : Number(e.target.value))
            }
            placeholder="e.g. 95"
            className="w-full rounded-lg border border-white/[0.08] bg-[#1A2744] px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:border-[#2DA5A0]/50 focus:outline-none"
          />
        </div>
      ) : null}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-[13px] font-medium text-white/70 transition-colors hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2DA5A0] focus-visible:outline-offset-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#2DA5A0]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2DA5A0] focus-visible:outline-offset-2 disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} aria-hidden="true" />
          ) : null}
          {submitting ? 'Saving...' : 'Save and log'}
        </button>
      </div>
    </form>
  );
}
