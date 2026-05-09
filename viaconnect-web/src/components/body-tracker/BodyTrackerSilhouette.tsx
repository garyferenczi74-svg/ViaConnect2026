'use client';

// Prompt #154 follow-up (Gary directive 2026-05-08): inline teal-line
// anatomical SVG silhouette that replaces the rasterized PNG-in-SVG
// avatar (Body Tracker/Male Avatar.svg + Female.svg) the body tracker
// has been hosting. The prior asset was a photographic raster wrapped
// in an SVG container, which made every glow + border tuning on the
// indicator pills look like cheap stickers on a stock photo per the
// design audit. This component is a pure vector silhouette: teal
// strokes at brand opacity (rgba 45,165,160) on transparent backing,
// matching the FemaleSilhouette pattern already used in the
// measurements section of composition/page.tsx.
//
// ViewBox: 400 x 800 (1:2 aspect, matches the heatMapPositions.ts
// reference grid). Pills positioned by percentage of the rendered
// viewBox land on the same anatomical landmarks regardless of the
// breakpoint the silhouette renders at.

interface BodyTrackerSilhouetteProps {
  gender: 'male' | 'female';
  className?: string;
}

const STROKE_PRIMARY = 'rgba(45,165,160,0.45)';
const STROKE_SECONDARY = 'rgba(45,165,160,0.32)';
const FILL_PRIMARY = 'rgba(45,165,160,0.10)';
const FILL_SECONDARY = 'rgba(45,165,160,0.06)';

export function BodyTrackerSilhouette({ gender, className }: BodyTrackerSilhouetteProps) {
  return gender === 'male' ? (
    <MaleFigure className={className} />
  ) : (
    <FemaleFigure className={className} />
  );
}

function MaleFigure({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 800"
      className={className}
      role="img"
      aria-label="Male body composition silhouette"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Head */}
      <ellipse cx={200} cy={72} rx={42} ry={52}
        fill={FILL_PRIMARY} stroke={STROKE_PRIMARY} strokeWidth={1.5} />

      {/* Neck */}
      <rect x={185} y={120} width={30} height={32} rx={4}
        fill={FILL_PRIMARY} stroke={STROKE_SECONDARY} strokeWidth={1.2} />

      {/* Torso: shoulders -> chest -> waist as one curved trapezoid */}
      <path
        d="M148,152 Q140,200 148,260 Q156,330 168,378 L232,378 Q244,330 252,260 Q260,200 252,152 Z"
        fill={FILL_PRIMARY} stroke={STROKE_PRIMARY} strokeWidth={1.5}
      />

      {/* Pelvis / hips */}
      <path
        d="M168,378 L232,378 L256,448 L144,448 Z"
        fill={FILL_PRIMARY} stroke={STROKE_PRIMARY} strokeWidth={1.5}
      />

      {/* Left thigh */}
      <path
        d="M148,448 L198,448 L194,612 L160,612 Z"
        fill={FILL_SECONDARY} stroke={STROKE_SECONDARY} strokeWidth={1.3}
      />

      {/* Right thigh */}
      <path
        d="M202,448 L252,448 L240,612 L206,612 Z"
        fill={FILL_SECONDARY} stroke={STROKE_SECONDARY} strokeWidth={1.3}
      />

      {/* Left calf */}
      <path
        d="M160,612 L194,612 L188,778 L168,778 Z"
        fill={FILL_SECONDARY} stroke={STROKE_SECONDARY} strokeWidth={1.3}
      />

      {/* Right calf */}
      <path
        d="M206,612 L240,612 L232,778 L212,778 Z"
        fill={FILL_SECONDARY} stroke={STROKE_SECONDARY} strokeWidth={1.3}
      />

      {/* Left upper arm (bicep) */}
      <path
        d="M148,160 L120,205 L114,310 L138,310 L162,205 Z"
        fill={FILL_SECONDARY} stroke={STROKE_SECONDARY} strokeWidth={1.3}
      />

      {/* Right upper arm */}
      <path
        d="M252,160 L280,205 L286,310 L262,310 L238,205 Z"
        fill={FILL_SECONDARY} stroke={STROKE_SECONDARY} strokeWidth={1.3}
      />

      {/* Left forearm */}
      <path
        d="M114,310 L98,355 L94,470 L120,470 L138,355 Z"
        fill={FILL_SECONDARY} stroke={STROKE_SECONDARY} strokeWidth={1.3}
      />

      {/* Right forearm */}
      <path
        d="M286,310 L302,355 L306,470 L280,470 L262,355 Z"
        fill={FILL_SECONDARY} stroke={STROKE_SECONDARY} strokeWidth={1.3}
      />
    </svg>
  );
}

function FemaleFigure({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 800"
      className={className}
      role="img"
      aria-label="Female body composition silhouette"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Head */}
      <ellipse cx={200} cy={72} rx={38} ry={48}
        fill={FILL_PRIMARY} stroke={STROKE_PRIMARY} strokeWidth={1.5} />

      {/* Neck */}
      <rect x={188} y={118} width={24} height={32} rx={4}
        fill={FILL_PRIMARY} stroke={STROKE_SECONDARY} strokeWidth={1.2} />

      {/* Torso: hourglass with narrower shoulders + pronounced waist */}
      <path
        d="M158,150 Q146,200 152,260 Q162,330 168,378 L232,378 Q238,330 248,260 Q254,200 242,150 Z"
        fill={FILL_PRIMARY} stroke={STROKE_PRIMARY} strokeWidth={1.5}
      />

      {/* Pelvis / hips: wider than shoulders */}
      <path
        d="M168,378 L232,378 L260,448 L140,448 Z"
        fill={FILL_PRIMARY} stroke={STROKE_PRIMARY} strokeWidth={1.5}
      />

      {/* Left thigh */}
      <path
        d="M146,448 L198,448 L194,612 L160,612 Z"
        fill={FILL_SECONDARY} stroke={STROKE_SECONDARY} strokeWidth={1.3}
      />

      {/* Right thigh */}
      <path
        d="M202,448 L254,448 L240,612 L206,612 Z"
        fill={FILL_SECONDARY} stroke={STROKE_SECONDARY} strokeWidth={1.3}
      />

      {/* Left calf */}
      <path
        d="M160,612 L194,612 L188,778 L168,778 Z"
        fill={FILL_SECONDARY} stroke={STROKE_SECONDARY} strokeWidth={1.3}
      />

      {/* Right calf */}
      <path
        d="M206,612 L240,612 L232,778 L212,778 Z"
        fill={FILL_SECONDARY} stroke={STROKE_SECONDARY} strokeWidth={1.3}
      />

      {/* Left upper arm (bicep): slightly slimmer than male */}
      <path
        d="M158,158 L132,205 L126,310 L146,310 L168,205 Z"
        fill={FILL_SECONDARY} stroke={STROKE_SECONDARY} strokeWidth={1.3}
      />

      {/* Right upper arm */}
      <path
        d="M242,158 L268,205 L274,310 L254,310 L232,205 Z"
        fill={FILL_SECONDARY} stroke={STROKE_SECONDARY} strokeWidth={1.3}
      />

      {/* Left forearm */}
      <path
        d="M126,310 L110,355 L106,470 L130,470 L146,355 Z"
        fill={FILL_SECONDARY} stroke={STROKE_SECONDARY} strokeWidth={1.3}
      />

      {/* Right forearm */}
      <path
        d="M274,310 L290,355 L294,470 L270,470 L254,355 Z"
        fill={FILL_SECONDARY} stroke={STROKE_SECONDARY} strokeWidth={1.3}
      />
    </svg>
  );
}
