// Prompt #118 — Male front-view body SVG.
// Mid-fidelity line art (Phase 1 per §5.2) — asset-swappable when a
// commissioned illustrator ships full-fidelity replacements.

import type { FC } from "react";
import type { BodySvgProps } from "../BodyGraphic.types";

export const MaleFront: FC<BodySvgProps> = ({
  showAnatomicalDetail = true,
  showCompositionRegions = false,
  showMuscleRegions = false,
  onRegionClick,
  onRegionHover,
  highlightedRegions = [],
  regionOverlayFills = {},
  className,
}) => {
  const region = (id: string, d: string, label: string) => (
    <path
      key={id}
      id={id}
      data-region-id={id}
      fill={regionOverlayFills[id] ?? (highlightedRegions.includes(id) ? "rgba(183,94,24,0.35)" : "transparent")}
      stroke={highlightedRegions.includes(id) ? "#2DA5A0" : "transparent"}
      strokeWidth={1}
      pointerEvents="all"
      tabIndex={0}
      role="button"
      aria-label={label}
      onClick={() => onRegionClick?.(id)}
      onMouseEnter={() => onRegionHover?.(id)}
      onMouseLeave={() => onRegionHover?.(null)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onRegionClick?.(id); }
      }}
      style={{ cursor: "pointer", transition: "fill 150ms ease" }}
      d={d}
    />
  );

  return (
    <svg viewBox="0 0 400 800" xmlns="http://www.w3.org/2000/svg" role="img"
         aria-labelledby="body-graphic-male-front-title"
         className={className}>
      <title id="body-graphic-male-front-title">Male body diagram, front view</title>

      {/* Layer 1: body form (silhouette) */}
      <g id="body-form" stroke="currentColor" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Head */}
        <circle cx="200" cy="70" r="32" />
        {/* Neck */}
        <path d="M185 102 L185 130 M215 102 L215 130" />
        {/* Shoulders + torso outline (broad-shouldered male proportions) */}
        <path d="M185 130 L140 145 L135 200 L145 260 L160 330 L170 380 L180 390" />
        <path d="M215 130 L260 145 L265 200 L255 260 L240 330 L230 380 L220 390" />
        {/* Waist/hip band */}
        <path d="M170 380 L230 380" />
        {/* Left arm */}
        <path d="M140 145 L115 170 L100 250 L105 360 L100 450 L105 475" />
        <path d="M135 200 L110 230 L100 310 L100 420 L105 465" />
        {/* Right arm */}
        <path d="M260 145 L285 170 L300 250 L295 360 L300 450 L295 475" />
        <path d="M265 200 L290 230 L300 310 L300 420 L295 465" />
        {/* Left leg */}
        <path d="M170 380 L155 500 L150 620 L155 760 L165 790" />
        <path d="M200 395 L195 520 L198 640 L193 760 L185 790" />
        {/* Right leg */}
        <path d="M230 380 L245 500 L250 620 L245 760 L235 790" />
        <path d="M200 395 L205 520 L202 640 L207 760 L215 790" />
      </g>

      {/* Layer 2: anatomical detail */}
      {showAnatomicalDetail && (
        <g id="anatomical-detail" stroke="currentColor" strokeWidth={1.5} fill="none" opacity={0.4}>
          {/* Pec boundary */}
          <path d="M160 160 Q200 190 240 160" />
          <path d="M200 150 L200 220" />
          {/* Deltoid caps */}
          <path d="M140 145 Q130 170 145 200" />
          <path d="M260 145 Q270 170 255 200" />
          {/* Abs ladder */}
          <path d="M185 225 L215 225 M185 255 L215 255 M185 285 L215 285" />
          <path d="M200 220 L200 330" />
          {/* Quadriceps bulge */}
          <path d="M175 420 Q185 460 175 530" />
          <path d="M225 420 Q215 460 225 530" />
          {/* Knee line */}
          <path d="M165 610 Q180 618 195 610" />
          <path d="M205 610 Q220 618 235 610" />
        </g>
      )}

      {/* Layer 3: composition regions (broad zones) */}
      {showCompositionRegions && (
        <g id="composition-regions">
          {region("comp-head",     "M168 40 L232 40 L232 105 L168 105 Z", "Head and face")}
          {region("comp-neck",     "M180 105 L220 105 L220 130 L180 130 Z", "Neck")}
          {region("comp-chest",    "M140 130 L260 130 L260 235 L140 235 Z", "Chest")}
          {region("comp-abdomen",  "M150 235 L250 235 L240 380 L160 380 Z", "Abdomen")}
          {region("comp-right-arm","M100 145 L145 145 L135 475 L90 475 Z", "Right arm")}
          {region("comp-left-arm", "M255 145 L300 145 L310 475 L265 475 Z", "Left arm")}
          {region("comp-right-leg","M150 380 L202 380 L200 790 L148 790 Z", "Right leg")}
          {region("comp-left-leg", "M200 380 L250 380 L250 790 L198 790 Z", "Left leg")}
        </g>
      )}

      {/* Layer 4: muscle regions (front view) */}
      {showMuscleRegions && (
        <g id="muscle-regions">
          {region("sternocleidomastoid",     "M188 110 L212 110 L212 130 L188 130 Z", "Sternocleidomastoid")}
          {region("pectoralis-major-right",  "M145 140 L200 140 L200 220 L150 220 Z", "Right Pectoralis Major")}
          {region("pectoralis-major-left",   "M200 140 L255 140 L250 220 L200 220 Z", "Left Pectoralis Major")}
          {region("deltoid-anterior-right",  "M115 140 L150 140 L150 205 L115 205 Z", "Right Anterior Deltoid")}
          {region("deltoid-anterior-left",   "M250 140 L285 140 L285 205 L250 205 Z", "Left Anterior Deltoid")}
          {region("biceps-brachii-right",    "M105 215 L140 215 L135 315 L100 315 Z", "Right Biceps Brachii")}
          {region("biceps-brachii-left",     "M260 215 L295 215 L300 315 L265 315 Z", "Left Biceps Brachii")}
          {region("brachialis-right",        "M108 265 L135 265 L132 335 L108 335 Z", "Right Brachialis")}
          {region("brachialis-left",         "M265 265 L292 265 L292 335 L268 335 Z", "Left Brachialis")}
          {region("forearm-flexors-right",   "M100 335 L135 335 L115 470 L95 470 Z", "Right Forearm Flexors")}
          {region("forearm-flexors-left",    "M265 335 L300 335 L305 470 L285 470 Z", "Left Forearm Flexors")}
          {region("rectus-abdominis",        "M180 225 L220 225 L220 335 L180 335 Z", "Rectus Abdominis")}
          {region("external-oblique-right",  "M150 245 L180 245 L170 340 L150 340 Z", "Right External Oblique")}
          {region("external-oblique-left",   "M220 245 L250 245 L250 340 L230 340 Z", "Left External Oblique")}
          {region("serratus-anterior-right", "M145 215 L175 215 L175 245 L145 245 Z", "Right Serratus Anterior")}
          {region("serratus-anterior-left",  "M225 215 L255 215 L255 245 L225 245 Z", "Left Serratus Anterior")}
          {region("rectus-femoris-right",    "M165 390 L200 390 L200 540 L165 540 Z", "Right Rectus Femoris")}
          {region("rectus-femoris-left",     "M200 390 L235 390 L235 540 L200 540 Z", "Left Rectus Femoris")}
          {region("vastus-lateralis-right",  "M150 400 L175 400 L155 545 L148 545 Z", "Right Vastus Lateralis")}
          {region("vastus-lateralis-left",   "M225 400 L250 400 L252 545 L245 545 Z", "Left Vastus Lateralis")}
          {region("vastus-medialis-right",   "M180 480 L200 480 L197 580 L175 580 Z", "Right Vastus Medialis")}
          {region("vastus-medialis-left",    "M200 480 L220 480 L225 580 L203 580 Z", "Left Vastus Medialis")}
          {region("adductors-right",         "M175 400 L200 400 L200 480 L172 480 Z", "Right Adductors")}
          {region("adductors-left",          "M200 400 L225 400 L228 480 L200 480 Z", "Left Adductors")}
          {region("tibialis-anterior-right", "M170 640 L200 640 L195 770 L170 770 Z", "Right Tibialis Anterior")}
          {region("tibialis-anterior-left",  "M200 640 L230 640 L230 770 L205 770 Z", "Left Tibialis Anterior")}
        </g>
      )}
    </svg>
  );
};
