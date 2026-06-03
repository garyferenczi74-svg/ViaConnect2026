/**
 * Prompt 170o Phase 1.1: HydrationEditPanel per Hannah §5 wireframe.
 *
 * Triggered by tapping a hydration log entry in the Detail view Today
 * timeline. Bottom sheet on mobile / centered modal on desktop. Volume
 * slider with 50-ml increments + beverage type selector (9 kinds) +
 * Save / Delete / Cancel. No time field in v1 per Hannah §5 push-back
 * (filed for 1.2 if user research shows demand).
 */

'use client';

import { useEffect, useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { HydrationBeverageKind } from './useHydrationQuickLog';
import { notifyHydrationUpdated } from './hydration-events';

const BEVERAGE_OPTIONS: Array<{ value: HydrationBeverageKind; label: string }> = [
  { value: 'pure_water', label: 'Water' },
  { value: 'coffee_tea', label: 'Coffee or tea' },
  { value: 'juice_smoothie', label: 'Juice or smoothie' },
  { value: 'dairy', label: 'Milk' },
  { value: 'soda', label: 'Soda' },
  { value: 'alcohol_low', label: 'Beer' },
  { value: 'alcohol_high', label: 'Wine or spirits' },
  { value: 'sports_drink', label: 'Sports drink' },
];

const VOLUME_MIN = 10;
const VOLUME_MAX = 2000;
const VOLUME_STEP = 50;

export interface HydrationEditPanelProps {
  mealId: string | null;
  initialVolumeMl: number;
  initialBeverageKind: HydrationBeverageKind;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export function HydrationEditPanel({
  mealId,
  initialVolumeMl,
  initialBeverageKind,
  open,
  onClose,
  onSaved,
  onDeleted,
}: HydrationEditPanelProps): JSX.Element | null {
  const [volume, setVolume] = useState(initialVolumeMl);
  const [kind, setKind] = useState<HydrationBeverageKind>(initialBeverageKind);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setVolume(initialVolumeMl);
      setKind(initialBeverageKind);
    }
  }, [open, initialVolumeMl, initialBeverageKind]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleSave = async () => {
    if (!mealId) return;
    setSaving(true);
    try {
      const resp = await fetch(`/api/nutrition/hydration/log/${mealId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volume_ml: volume, beverage_kind: kind }),
      });
      if (!resp.ok) {
        toast.error('Could not update log');
        return;
      }
      toast.success('Log updated');
      notifyHydrationUpdated();
      onSaved();
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!mealId) return;
    setSaving(true);
    try {
      const resp = await fetch(`/api/nutrition/hydration/log/${mealId}`, {
        method: 'DELETE',
      });
      if (!resp.ok) {
        toast.error('Could not delete log');
        return;
      }
      toast.success('Log deleted');
      notifyHydrationUpdated();
      onDeleted();
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (!open || !mealId) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hydration-edit-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-t-2xl border border-white/[0.08] bg-[#1E3054] p-5 text-white sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close edit panel"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/65 hover:bg-white/10"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <h2 id="hydration-edit-title" className="text-base font-semibold text-white">
          Edit hydration log
        </h2>

        <div className="mt-5 flex flex-col gap-5">
          <div>
            <label className="block text-[12px] font-medium uppercase tracking-wide text-white/65">
              Volume
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range"
                min={VOLUME_MIN}
                max={VOLUME_MAX}
                step={VOLUME_STEP}
                value={volume}
                disabled={saving}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Volume in milliliters"
                className="flex-1 disabled:opacity-50"
              />
              <span className="min-w-[80px] text-right text-sm font-medium text-white">
                {volume.toLocaleString()} ml
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium uppercase tracking-wide text-white/65">
              Beverage type
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {BEVERAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setKind(opt.value)}
                  disabled={saving}
                  aria-pressed={kind === opt.value}
                  className={`inline-flex h-10 items-center justify-center rounded-lg px-2 text-[12px] transition-colors ${
                    kind === opt.value
                      ? 'border-2 border-[#2DA5A0] bg-[#2DA5A0]/15 text-[#2DA5A0]'
                      : 'border border-white/[0.08] bg-[#1A2744]/55 text-white/80 hover:bg-[#1A2744]/75'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#B75E18]/40 px-4 text-sm font-medium text-[#B75E18] transition-colors hover:bg-[#B75E18]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
            Delete
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="ml-auto inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm text-white/70 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#2DA5A0] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#2DA5A0]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
