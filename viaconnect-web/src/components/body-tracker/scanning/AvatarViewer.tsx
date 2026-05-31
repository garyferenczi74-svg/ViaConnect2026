'use client';

import { Suspense, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { BodyModelParameters } from '@/lib/arnold/scanning/types';
import {
  generateAvatarMesh,
  segmentColor,
  type AvatarSegmentSpec,
  type AvatarRegionColorMap,
} from '@/lib/arnold/scanning/avatarMeshGenerator';
import type { BodyRegion } from '@/lib/body-tracker/regional-distribution-ratios';
import type { RegionDistribution } from '@/lib/body-tracker/regional-fat-distribution';
import { RegionalDisclaimer } from './RegionalDisclaimer';
import { RegionalOverlayTooltip, regionLabel } from './RegionalOverlayTooltip';
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

// Phase 1 regional composition overlay bundle (ViaConnect Prompt #169e(a)).
// Optional: when omitted, the viewer behaves exactly as before. When supplied
// and `enabled` is true, the avatar is colored per region from `colorMap` and
// the disclaimer + region tooltip render. The owning surface (ScanResultsPanel)
// computes these from the regional service and the overlay hook.
export interface AvatarRegionalOverlay {
  /** Whether the user has the overlay toggle ON (drives the switch UI). */
  enabled: boolean;
  /**
   * Whether the overlay COLORS should actually paint the avatar: toggle ON AND
   * the scan/user is not in a suppressed state (Section 5). When false but
   * `enabled` is true, the toggle reads on and the suppressed note shows, but the
   * avatar stays uncolored.
   */
  colorsActive: boolean;
  /** Per-region CSS colors driving the avatar shading. */
  colorMap: AvatarRegionColorMap;
  /** Per-region fat-mass + share, for the tap tooltip. */
  distribution: RegionDistribution;
  /** Toggle handler for the "Show regional distribution" chrome control. */
  onToggle: (next: boolean) => void;
  /** Whether the toggle should be offered at all (overlay available for scan). */
  available: boolean;
  /** Hide numeric values in the tooltip (#169b numbers-optional). */
  hideNumbers?: boolean;
  /** Optional note shown in place of colors when the overlay is suppressed. */
  suppressedNote?: string | null;
}

interface AvatarViewerProps {
  params: BodyModelParameters;
  showControls?: boolean;
  initialView?: AvatarViewPreset;
  initialVisualization?: AvatarVisualization;
  className?: string;
  // "Hide specific numbers" mode (Prompt #169b section 3.2.4): when true the
  // avatar must render NO numeric labels. The current avatar draws none (the
  // 3D mesh + heatmap colors carry no on-canvas numbers), so this is a forward
  // guard: any numeric overlay added later must respect this flag. The mesh /
  // heatmap themselves stay (they are non-numeric and body-image-neutral).
  hideNumericLabels?: boolean;
  // Phase 1 regional composition overlay (Prompt #169e(a)). Optional; additive.
  regional?: AvatarRegionalOverlay;
}

export function AvatarViewer({
  params,
  showControls = true,
  initialView = 'free',
  initialVisualization = 'solid',
  className = '',
  hideNumericLabels = false,
  regional,
}: AvatarViewerProps) {
  // Referenced so the guard is part of the component contract; no numeric labels
  // exist to suppress today (see prop doc above).
  void hideNumericLabels;
  const [view, setView] = useState<AvatarViewPreset>(initialView);
  const [viz, setViz] = useState<AvatarVisualization>(initialVisualization);
  // Region selected via the legend chips (the 3D canvas does not emit picks in
  // Phase 1; the legend is the accessible tap target for the Section 6.2 tooltip).
  const [tappedRegion, setTappedRegion] = useState<BodyRegion | null>(null);

  const mesh = useMemo(() => generateAvatarMesh(params), [params]);

  // The overlay paints the avatar only when its colors are active (toggle on AND
  // not suppressed). When active the avatar is forced into heatmap mode (the
  // regional colors ride the existing per-segment heatmap seam); otherwise the
  // user's viz choice wins and the avatar renders exactly as before.
  const overlayActive = Boolean(regional?.colorsActive);
  const effectiveViz: AvatarVisualization = overlayActive ? 'heatmap' : viz;
  const regionColorMap = overlayActive ? regional?.colorMap ?? null : null;

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
            visualization={effectiveViz}
            regionColorMap={regionColorMap}
          />
        </Suspense>
      </div>

      {/* Regional overlay chrome (Section 6.1): toggle + legend + disclaimer. */}
      {regional?.available && (
        <RegionalOverlayChrome
          regional={regional}
          overlayActive={overlayActive}
          tappedRegion={tappedRegion}
          onTapRegion={(r) => setTappedRegion((cur) => (cur === r ? null : r))}
        />
      )}

      {showControls && (
        <div className="space-y-2">
          <ViewControl value={view} onChange={setView} />
          {/* When the regional overlay is active it owns the coloring; the manual
              visualization control is hidden to avoid a conflicting choice. */}
          {!overlayActive && <VisualizationControl value={viz} onChange={setViz} />}
        </div>
      )}
    </div>
  );
}

function RegionalOverlayChrome({
  regional,
  overlayActive,
  tappedRegion,
  onTapRegion,
}: {
  regional: AvatarRegionalOverlay;
  overlayActive: boolean;
  tappedRegion: BodyRegion | null;
  onTapRegion: (r: BodyRegion) => void;
}) {
  const regions: BodyRegion[] = ['trunk', 'arms', 'legs', 'head_neck'];
  return (
    <div className="space-y-2">
      {/* "Show regional distribution" toggle (Section 6.1). */}
      <label className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2">
        <span className="text-xs font-medium text-white/80">Show regional distribution</span>
        <button
          type="button"
          role="switch"
          aria-checked={regional.enabled}
          onClick={() => regional.onToggle(!regional.enabled)}
          className={`relative h-5 w-9 flex-none rounded-full transition-colors ${
            regional.enabled ? 'bg-[#2DA5A0]' : 'bg-white/15'
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
              regional.enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
            }`}
          />
        </button>
      </label>

      {/* Suppressed note (e.g. 5.6 missing composition) shown in place of colors. */}
      {regional.enabled && !overlayActive && regional.suppressedNote && (
        <p className="text-[11px] leading-relaxed text-white/45">{regional.suppressedNote}</p>
      )}

      {/* Region legend = accessible tap targets for the Section 6.2 tooltip. */}
      {overlayActive && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Regions">
            {regions.map((r) => {
              const selected = tappedRegion === r;
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onTapRegion(r)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium min-h-[32px] ${
                    selected
                      ? 'border-white/25 bg-white/[0.06] text-white/85'
                      : 'border-white/[0.08] bg-white/[0.03] text-white/60'
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 flex-none rounded-full"
                    style={{ backgroundColor: regional.colorMap[r] ?? '#2DA5A0' }}
                  />
                  {regionLabel(r)}
                </button>
              );
            })}
          </div>
          {tappedRegion && (
            <RegionalOverlayTooltip
              entry={regional.distribution[tappedRegion]}
              hideNumbers={regional.hideNumbers}
            />
          )}
          <RegionalDisclaimer />
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
