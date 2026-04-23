'use client';

import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Scale, HeartPulse, Activity } from 'lucide-react';
import { WeightMeasurementsForm } from './forms/WeightMeasurementsForm';
import { MetabolicCardioForm } from './forms/MetabolicCardioForm';
import { SegmentalFatForm } from './forms/SegmentalFatForm';

type ActiveForm = 'weight' | 'metabolic' | 'composition' | null;

interface CardDef {
  id: Exclude<ActiveForm, null>;
  label: string;
  icon: LucideIcon;
  accent: string;
}

const CARDS: CardDef[] = [
  { id: 'weight',      label: 'Weight',       icon: Scale,      accent: '#2DA5A0' },
  { id: 'metabolic',   label: 'Blood pressure', icon: HeartPulse, accent: '#E8803A' },
  { id: 'composition', label: 'Body comp',    icon: Activity,   accent: '#7C3AED' },
];

interface QuickLogCardsProps {
  onSaved?: () => void;
}

export function QuickLogCards({ onSaved }: QuickLogCardsProps) {
  const [active, setActive] = useState<ActiveForm>(null);

  function close() { setActive(null); }
  function handleSaved() {
    close();
    onSaved?.();
  }

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">Quick log</h3>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActive(c.id)}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border bg-[#1E3054]/35 p-4 min-h-[96px] backdrop-blur-sm hover:bg-[#1E3054]/45 transition-colors"
              style={{ borderColor: `${c.accent}40` }}
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${c.accent}22` }}
              >
                <Icon className="h-4 w-4" strokeWidth={1.5} style={{ color: c.accent }} />
              </span>
              <span className="text-xs font-medium text-white">{c.label}</span>
              <span className="text-[10px] text-white/55">Log now</span>
            </button>
          );
        })}
      </div>

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
    </section>
  );
}
