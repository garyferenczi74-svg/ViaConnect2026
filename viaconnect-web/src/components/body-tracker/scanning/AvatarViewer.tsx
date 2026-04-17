'use client';

import { Suspense, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { BodyModelParameters } from '@/lib/arnold/scanning/types';
import { generateAvatarMesh, segmentColor, type AvatarSegmentSpec } from '@/lib/arnold/scanning/avatarMeshGenerator';
import { Loader2 } from 'lucide-react';

// Three + R3F code is loaded client-side only; SSR bundle stays small.
const ThreeScene = dynamic(() => import('./AvatarThreeScene').then((m) => m.AvatarThreeScene), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-white/50">
      <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
    </div>
  ),
});

export type AvatarVisualization = 'solid' | 'wireframe' | 'heatmap';
export type AvatarViewPreset = 'free' | 'front' | 'back' | 'left' | 'right';

interface AvatarViewerProps {
  params: BodyModelParameters;
  showControls?: boolean;
  initialView?: AvatarViewPreset;
  initialVisualization?: AvatarVisualization;
  className?: string;
}

export function AvatarViewer({
  params,
  showControls = true,
  initialView = 'free',
  initialVisualization = 'solid',
  className = '',
}: AvatarViewerProps) {
  const [view, setView] = useState<AvatarViewPreset>(initialView);
  const [viz, setViz] = useState<AvatarVisualization>(initialVisualization);

  const mesh = useMemo(() => generateAvatarMesh(params), [params]);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="relative aspect-[3/4] w-full rounded-2xl border border-white/[0.08] bg-[#0B1520] overflow-hidden">
        <Suspense fallback={
          <div className="absolute inset-0 flex items-center justify-center text-white/50">
            <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
          </div>
        }>
          <ThreeScene
            segments={mesh.segments}
            bodyFatPct={mesh.bodyFatPct}
            viewPreset={view}
            visualization={viz}
          />
        </Suspense>
      </div>

      {showControls && (
        <div className="space-y-2">
          <ViewControl value={view} onChange={setView} />
          <VisualizationControl value={viz} onChange={setViz} />
        </div>
      )}
    </div>
  );
}

function ViewControl({ value, onChange }: { value: AvatarViewPreset; onChange: (v: AvatarViewPreset) => void }) {
  const options: Array<{ id: AvatarViewPreset; label: string }> = [
    { id: 'front', label: 'Front' },
    { id: 'back',  label: 'Back' },
    { id: 'left',  label: 'Left' },
    { id: 'right', label: 'Right' },
    { id: 'free',  label: 'Free' },
  ];
  return (
    <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Avatar view">
      {options.map((o) => {
        const selected = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium min-h-[36px] ${
              selected ? 'border-[#2DA5A0]/50 bg-[#2DA5A0]/15 text-[#2DA5A0]' : 'border-white/[0.08] bg-white/[0.03] text-white/65'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function VisualizationControl({ value, onChange }: { value: AvatarVisualization; onChange: (v: AvatarVisualization) => void }) {
  const options: Array<{ id: AvatarVisualization; label: string }> = [
    { id: 'solid',     label: 'Solid' },
    { id: 'wireframe', label: 'Wireframe' },
    { id: 'heatmap',   label: 'Composition heatmap' },
  ];
  return (
    <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Avatar visualization">
      {options.map((o) => {
        const selected = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium min-h-[36px] ${
              selected ? 'border-[#E8803A]/50 bg-[#E8803A]/15 text-[#E8803A]' : 'border-white/[0.08] bg-white/[0.03] text-white/65'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export type { AvatarSegmentSpec };
export { segmentColor };
