'use client';

import { AlertTriangle, Info } from 'lucide-react';
import type { FoodInteraction } from '@/lib/nutrition/checkFoodInteractions';

function InteractionRow({ interaction }: { interaction: FoodInteraction }) {
  return (
    <div className="mb-2 last:mb-0">
      <p className="text-sm text-white/80">
        <span className="font-medium">{interaction.foodItem}</span>
        {' × '}
        <span className="font-medium">{interaction.interactsWith}</span>
      </p>
      <p className="mt-0.5 text-xs text-white/50">{interaction.description}</p>
      <p className="mt-0.5 text-xs text-[#2DA5A0]">{interaction.recommendation}</p>
    </div>
  );
}

export function FoodInteractionAlert({ interactions }: { interactions: FoodInteraction[] }) {
  if (interactions.length === 0) return null;

  const warnings = interactions.filter((i) => i.severity === 'warning');
  const cautions = interactions.filter((i) => i.severity === 'caution');
  const infos = interactions.filter((i) => i.severity === 'info');

  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      {warnings.length > 0 && (
        <div className="border-b border-red-500/20 bg-red-500/10 p-3">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" strokeWidth={1.5} />
            <span className="text-xs font-semibold uppercase text-red-400">Interaction Warning</span>
          </div>
          {warnings.map((w, i) => <InteractionRow key={i} interaction={w} />)}
        </div>
      )}
      {cautions.length > 0 && (
        <div className="border-b border-[#B75E18]/20 bg-[#B75E18]/10 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Info className="h-4 w-4 text-[#B75E18]" strokeWidth={1.5} />
            <span className="text-xs font-semibold uppercase text-[#B75E18]">Timing Note</span>
          </div>
          {cautions.map((c, i) => <InteractionRow key={i} interaction={c} />)}
        </div>
      )}
      {infos.length > 0 && (
        <div className="bg-[#2DA5A0]/10 p-3">
          {infos.map((info, i) => <InteractionRow key={i} interaction={info} />)}
        </div>
      )}
    </div>
  );
}
