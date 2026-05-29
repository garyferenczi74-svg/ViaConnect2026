'use client';

// Prompt #170 Phase 1l: analyzing-state UI.
//
// Three stage labels cycle on a setTimeout in the parent hook. After 5 s of
// no response, the parent flips a `slow` flag and we render an extra line +
// a Cancel button.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { useEffect, useState } from 'react';
import { Camera, ChefHat, FlaskConical, Loader2, X } from 'lucide-react';
import type { ProgressStage } from './types';

interface AnalysisProgressProps {
  stage: ProgressStage;
  onCancel: () => void;
}

const STAGE_COPY: Record<Exclude<ProgressStage, 'idle'>, { title: string; Icon: typeof Camera }> = {
  reading:   { title: 'Reading your plate...',     Icon: Camera },
  portions:  { title: 'Estimating portions...',    Icon: ChefHat },
  nutrients: { title: 'Looking up nutrients...',   Icon: FlaskConical },
};

const STAGES: ReadonlyArray<Exclude<ProgressStage, 'idle'>> = ['reading', 'portions', 'nutrients'];

export function AnalysisProgress({ stage, onCancel }: AnalysisProgressProps) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(t);
  }, []);

  const currentIdx = stage === 'idle' ? 0 : STAGES.indexOf(stage);

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/45 p-5 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-[#2DA5A0]" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold text-white">Analyzing your meal</h2>
      </div>
      <ol className="mt-4 flex flex-col gap-2" role="list">
        {STAGES.map((s, i) => {
          const { title, Icon } = STAGE_COPY[s];
          const active = i === currentIdx;
          const complete = i < currentIdx;
          return (
            <li
              key={s}
              className={`flex items-center gap-3 rounded-lg px-2 py-1.5 text-[12px] ${
                active ? 'bg-[#2DA5A0]/10 text-white' : 'text-white/55'
              }`}
              aria-current={active ? 'step' : undefined}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full ${
                  complete
                    ? 'bg-[#2DA5A0]/20 text-[#2DA5A0]'
                    : active
                    ? 'bg-[#2DA5A0]/15 text-[#2DA5A0]'
                    : 'bg-white/5 text-white/45'
                }`}
              >
                <Icon className="h-3 w-3" strokeWidth={1.5} />
              </span>
              <span>{title}</span>
            </li>
          );
        })}
      </ol>
      {slow && (
        <div className="mt-4 rounded-lg border border-white/[0.08] bg-white/[0.03] p-2.5 text-[11px] text-white/65">
          <p>Still working. This can take a moment on slow connections.</p>
          <button
            type="button"
            onClick={onCancel}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/5 px-2.5 py-1 text-[11px] text-white/80 transition-colors hover:bg-white/10"
          >
            <X className="h-3 w-3" strokeWidth={1.5} />
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
