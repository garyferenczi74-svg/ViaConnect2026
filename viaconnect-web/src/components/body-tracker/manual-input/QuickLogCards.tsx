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
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-4 min-h-[88px] hover:bg-white/[0.06] transition-colors"
              style={{ borderColor: `${c.accent}33` }}
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} style={{ color: c.accent }} />
              <span className="text-xs font-medium text-white">{c.label}</span>
              <span className="text-[10px] text-white/45">Log now</span>
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
