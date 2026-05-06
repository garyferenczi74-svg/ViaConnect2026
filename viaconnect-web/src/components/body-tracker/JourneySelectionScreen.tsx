'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingDown, Dumbbell, Check, Loader2 } from 'lucide-react';
import { useCurrentUser } from './manual-input';
import { useUserJourney, type JourneyType } from '@/hooks/body-tracker/useUserJourney';

interface JourneyDef {
  id: JourneyType;
  label: string;
  icon: typeof TrendingDown;
  accent: string;
  benefits: string[];
}

const JOURNEYS: JourneyDef[] = [
  {
    id: 'weight_loss',
    label: 'Weight Loss',
    icon: TrendingDown,
    accent: '#2DA5A0',
    benefits: ['Reduce body fat', 'Hit your target weight', 'Improve metabolic health'],
  },
  {
    id: 'muscle_building',
    label: 'Muscle Building',
    icon: Dumbbell,
    accent: '#B75E18',
    benefits: ['Build lean muscle', 'Increase strength', 'Optimize body composition'],
  },
];

interface JourneySelectionScreenProps {
  onSelected?: (journey: JourneyType) => void;
  redirectAfter?: string;
}

export function JourneySelectionScreen({
  onSelected,
  redirectAfter = '/body-tracker',
}: JourneySelectionScreenProps) {
  const router = useRouter();
  const { id: userId } = useCurrentUser();
  const { activeJourney, setJourney, loading } = useUserJourney(userId);
  const [submitting, setSubmitting] = useState<JourneyType | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(journey: JourneyType) {
    if (!userId || submitting) return;
    setSubmitting(journey);
    setError(null);
    try {
      await setJourney(journey);
      onSelected?.(journey);
      router.push(redirectAfter);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set journey');
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Choose Your Journey</h1>
        <p className="mt-1 text-sm text-white/60">
          Arnold will tailor your entire Body Tracker experience to your goal.
        </p>
      </div>

      {activeJourney && !loading && (
        <div className="rounded-xl border border-white/[0.08] bg-white/5 p-4 text-sm text-white/70">
          Current journey:{' '}
          <span className="font-semibold text-white">
            {activeJourney === 'weight_loss' ? 'Weight Loss' : 'Muscle Building'}
          </span>
          . Pick a different one below to switch.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {JOURNEYS.map((j) => {
          const Icon = j.icon;
          const isActive = activeJourney === j.id;
          const isSubmitting = submitting === j.id;
          return (
            <div
              key={j.id}
              className="rounded-2xl border p-6 backdrop-blur-md transition-all"
              style={
                isActive
                  ? { borderColor: j.accent, borderWidth: 2, backgroundColor: `${j.accent}1A` }
                  : { borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.05)' }
              }
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${j.accent}22` }}
                >
                  <Icon size={24} strokeWidth={1.5} style={{ color: j.accent }} />
                </span>
                <h2 className="text-lg font-bold text-white">{j.label}</h2>
                {isActive && (
                  <span
                    className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium"
                    style={{ backgroundColor: `${j.accent}33`, color: j.accent }}
                  >
                    <Check size={12} strokeWidth={1.5} /> Active
                  </span>
                )}
              </div>

              <ul className="mt-4 space-y-2 text-sm text-white/70">
                {j.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <Check size={14} strokeWidth={1.5} style={{ color: j.accent }} className="mt-0.5 flex-none" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => handleSelect(j.id)}
                disabled={isActive || isSubmitting || loading || !userId}
                className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                style={{ backgroundColor: j.accent }}
              >
                {isSubmitting && <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />}
                {isActive ? 'Currently Active' : 'Choose This Path'}
              </button>
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-[#FCA5A5]">{error}</p>}

      <p className="text-xs text-white/40">
        You can switch journeys anytime in Body Tracker Settings.
      </p>
    </div>
  );
}
