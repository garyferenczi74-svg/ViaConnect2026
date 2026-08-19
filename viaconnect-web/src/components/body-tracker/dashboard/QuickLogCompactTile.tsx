'use client';

import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Scale, HeartPulse, Activity, Flame } from 'lucide-react';
import { BentoTile } from '@/components/ui/BentoTile';
import { WeightMeasurementsForm } from '@/components/body-tracker/manual-input/forms/WeightMeasurementsForm';
import { MetabolicCardioForm } from '@/components/body-tracker/manual-input/forms/MetabolicCardioForm';
import { SegmentalFatForm } from '@/components/body-tracker/manual-input/forms/SegmentalFatForm';
import { CaloriesQuickForm } from '@/components/body-tracker/manual-input/forms/CaloriesQuickForm';

type ActiveForm = 'weight' | 'metabolic' | 'composition' | 'calories' | null;

const ACTIONS: Array<{
  id: Exclude<ActiveForm, null>;
  label: string;
  icon: LucideIcon;
  accent: string;
}> = [
  { id: 'weight', label: 'Weight', icon: Scale, accent: '#2DA5A0' },
  { id: 'metabolic', label: 'Blood Pressure', icon: HeartPulse, accent: '#E8803A' },
  { id: 'composition', label: 'Body Comp', icon: Activity, accent: '#7C3AED' },
  { id: 'calories', label: 'Calories', icon: Flame, accent: '#B75E18' },
];

interface QuickLogCompactTileProps {
  onSaved?: () => void;
  className?: string;
}

export function QuickLogCompactTile({ onSaved, className }: QuickLogCompactTileProps) {
  const [active, setActive] = useState<ActiveForm>(null);

  function close() {
    setActive(null);
  }
  function handleSaved() {
    close();
    onSaved?.();
  }

  return (
    <>
      <BentoTile
        className={`min-h-[120px] rounded-[20px] ${className ?? ''}`}
        contentClassName="gap-3"
        scrim={false}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
          Quick Log
        </span>
        <div className="grid grid-cols-4 gap-2">
          {ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setActive(a.id)}
                className="flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-1 py-2 transition hover:border-white/20"
              >
                <Icon className="h-4 w-4" strokeWidth={1.5} style={{ color: a.accent }} />
                <span className="text-[10px] text-white/80">{a.label}</span>
              </button>
            );
          })}
        </div>
      </BentoTile>

      <WeightMeasurementsForm
        open={active === 'weight'}
        onOpenChange={(o) => !o && close()}
        onSaved={handleSaved}
      />
      <MetabolicCardioForm
        open={active === 'metabolic'}
        onOpenChange={(o) => !o && close()}
        onSaved={handleSaved}
      />
      <SegmentalFatForm
        open={active === 'composition'}
        onOpenChange={(o) => !o && close()}
        onSaved={handleSaved}
      />
      <CaloriesQuickForm
        open={active === 'calories'}
        onOpenChange={(o) => !o && close()}
        onSaved={handleSaved}
      />
    </>
  );
}
