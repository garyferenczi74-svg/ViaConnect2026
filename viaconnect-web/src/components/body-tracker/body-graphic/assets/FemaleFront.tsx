// Prompt #118 — Female front-view body SVG.
// Differentiation from male: narrower shoulders (160-240 vs 135-265), slight
// waist taper around y=250, wider hip flare (140-260 vs 155-245). Same
// interactive region IDs + proportions remain accessible.

import type { FC } from "react";
import type { BodySvgProps } from "../BodyGraphic.types";

export const FemaleFront: FC<BodySvgProps> = ({
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
         aria-labelledby="body-graphic-female-front-title"
         className={className}>
      <title id="body-graphic-female-front-title">Female body diagram, front view</title>

      <g id="body-form" stroke="currentColor" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Head (slightly smaller) */}
        <circle cx="200" cy="72" r="30" />
        {/* Neck */}
        <path d="M187 102 L187 130 M213 102 L213 130" />
        {/* Shoulders narrower, waist tapered */}
        <path d="M187 130 L160 148 L155 210 L170 255 L165 300 L175 350 L180 390" />
        <path d="M213 130 L240 148 L245 210 L230 255 L235 300 L225 350 L220 390" />
        {/* Hip flare */}
        <path d="M175 350 L150 385 L165 400" />
        <path d="M225 350 L250 385 L235 400" />
        <path d="M165 400 L235 400" />
        {/* Arms */}
        <path d="M160 148 L130 175 L115 250 L118 360 L115 450 L120 475" />
        <path d="M155 210 L125 240 L115 320 L115 420 L120 470" />
        <path d="M240 148 L270 175 L285 250 L282 360 L285 450 L280 475" />
        <path d="M245 210 L275 240 L285 320 L285 420 L280 470" />
        {/* Legs */}
        <path d="M165 400 L155 510 L150 620 L155 760 L165 790" />
        <path d="M200 410 L195 525 L198 640 L193 760 L185 790" />
        <path d="M235 400 L245 510 L250 620 L245 760 L235 790" />
        <path d="M200 410 L205 525 L202 640 L207 760 L215 790" />
      </g>

      {showAnatomicalDetail && (
        <g id="anatomical-detail" stroke="currentColor" strokeWidth={1.5} fill="none" opacity={0.4}>
          {/* Bust hint */}
          <path d="M175 175 Q200 205 225 175" />
          <path d="M180 170 Q190 195 180 215" />
          <path d="M220 170 Q210 195 220 215" />
          {/* Waist taper */}
          <path d="M168 255 Q200 262 232 255" />
          {/* Abs center line */}
          <path d="M200 225 L200 340" />
          {/* Quadriceps hint */}
          <path d="M175 425 Q185 480 178 540" />
          <path d="M225 425 Q215 480 222 540" />
        </g>
      )}

      {showCompositionRegions && (
        <g id="composition-regions">
          {region("comp-head",      "M170 42 L230 42 L230 105 L170 105 Z", "Head and face")}
          {region("comp-neck",      "M182 105 L218 105 L218 130 L182 130 Z", "Neck")}
          {region("comp-chest",     "M155 130 L245 130 L245 250 L155 250 Z", "Chest")}
          {region("comp-abdomen",   "M160 250 L240 250 L235 400 L165 400 Z", "Abdomen")}
          {region("comp-right-arm", "M112 148 L160 148 L145 475 L105 475 Z", "Right arm")}
          {region("comp-left-arm",  "M240 148 L288 148 L295 475 L255 475 Z", "Left arm")}
          {region("comp-right-leg", "M148 400 L202 400 L200 790 L150 790 Z", "Right leg")}
          {region("comp-left-leg",  "M200 400 L252 400 L250 790 L198 790 Z", "Left leg")}
        </g>
      )}

      {showMuscleRegions && (
        <g id="muscle-regions">
          {region("sternocleidomastoid",     "M190 110 L210 110 L210 130 L190 130 Z", "Sternocleidomastoid")}
          {region("pectoralis-major-right",  "M160 140 L200 140 L200 220 L163 220 Z", "Right Pectoralis Major")}
          {region("pectoralis-major-left",   "M200 140 L240 140 L237 220 L200 220 Z", "Left Pectoralis Major")}
          {region("deltoid-anterior-right",  "M130 145 L162 145 L162 210 L130 210 Z", "Right Anterior Deltoid")}
          {region("deltoid-anterior-left",   "M238 145 L270 145 L270 210 L238 210 Z", "Left Anterior Deltoid")}
          {region("biceps-brachii-right",    "M120 215 L155 215 L148 315 L115 315 Z", "Right Biceps Brachii")}
          {region("biceps-brachii-left",     "M245 215 L280 215 L285 315 L252 315 Z", "Left Biceps Brachii")}
          {region("brachialis-right",        "M122 265 L148 265 L145 335 L122 335 Z", "Right Brachialis")}
          {region("brachialis-left",         "M252 265 L278 265 L278 335 L255 335 Z", "Left Brachialis")}
          {region("forearm-flexors-right",   "M115 335 L148 335 L125 470 L110 470 Z", "Right Forearm Flexors")}
          {region("forearm-flexors-left",    "M252 335 L285 335 L290 470 L275 470 Z", "Left Forearm Flexors")}
          {region("rectus-abdominis",        "M185 225 L215 225 L215 345 L185 345 Z", "Rectus Abdominis")}
          {region("external-oblique-right",  "M158 255 L185 255 L175 345 L160 345 Z", "Right External Oblique")}
          {region("external-oblique-left",   "M215 255 L242 255 L240 345 L225 345 Z", "Left External Oblique")}
          {region("serratus-anterior-right", "M155 215 L180 215 L180 255 L155 255 Z", "Right Serratus Anterior")}
          {region("serratus-anterior-left",  "M220 215 L245 215 L245 255 L220 255 Z", "Left Serratus Anterior")}
          {region("rectus-femoris-right",    "M170 410 L200 410 L200 550 L170 550 Z", "Right Rectus Femoris")}
          {region("rectus-femoris-left",     "M200 410 L230 410 L230 550 L200 550 Z", "Left Rectus Femoris")}
          {region("vastus-lateralis-right",  "M152 420 L172 420 L158 545 L148 545 Z", "Right Vastus Lateralis")}
          {region("vastus-lateralis-left",   "M228 420 L248 420 L252 545 L242 545 Z", "Left Vastus Lateralis")}
          {region("vastus-medialis-right",   "M180 490 L200 490 L197 585 L175 585 Z", "Right Vastus Medialis")}
          {region("vastus-medialis-left",    "M200 490 L220 490 L225 585 L203 585 Z", "Left Vastus Medialis")}
          {region("adductors-right",         "M175 415 L200 415 L200 490 L172 490 Z", "Right Adductors")}
          {region("adductors-left",          "M200 415 L225 415 L228 490 L200 490 Z", "Left Adductors")}
          {region("tibialis-anterior-right", "M170 640 L200 640 L195 770 L170 770 Z", "Right Tibialis Anterior")}
          {region("tibialis-anterior-left",  "M200 640 L230 640 L230 770 L205 770 Z", "Left Tibialis Anterior")}
        </g>
      )}
    </svg>
  );
};
