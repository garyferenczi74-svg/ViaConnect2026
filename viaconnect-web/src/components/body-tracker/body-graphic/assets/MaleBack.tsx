// Prompt #118 — Male back-view body SVG.

import type { FC } from "react";
import type { BodySvgProps } from "../BodyGraphic.types";

export const MaleBack: FC<BodySvgProps> = ({
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
         aria-labelledby="body-graphic-male-back-title"
         className={className}>
      <title id="body-graphic-male-back-title">Male body diagram, back view</title>

      <g id="body-form" stroke="currentColor" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="200" cy="70" r="32" />
        <path d="M185 102 L185 130 M215 102 L215 130" />
        <path d="M185 130 L140 145 L135 200 L145 260 L160 330 L170 380 L180 390" />
        <path d="M215 130 L260 145 L265 200 L255 260 L240 330 L230 380 L220 390" />
        <path d="M170 380 L230 380" />
        <path d="M140 145 L115 170 L100 250 L105 360 L100 450 L105 475" />
        <path d="M260 145 L285 170 L300 250 L295 360 L300 450 L295 475" />
        <path d="M170 380 L155 500 L150 620 L155 760 L165 790" />
        <path d="M200 395 L195 520 L198 640 L193 760 L185 790" />
        <path d="M230 380 L245 500 L250 620 L245 760 L235 790" />
        <path d="M200 395 L205 520 L202 640 L207 760 L215 790" />
      </g>

      {showAnatomicalDetail && (
        <g id="anatomical-detail" stroke="currentColor" strokeWidth={1.5} fill="none" opacity={0.4}>
          {/* Trapezius triangle */}
          <path d="M170 130 L200 160 L230 130" />
          <path d="M160 170 L200 220 L240 170" />
          {/* Lat boundaries */}
          <path d="M145 220 Q175 260 185 330" />
          <path d="M255 220 Q225 260 215 330" />
          {/* Spine */}
          <path d="M200 120 L200 380" strokeDasharray="2 3" />
          {/* Glute cleft */}
          <path d="M200 395 L200 445" />
          {/* Hamstring bulge */}
          <path d="M175 460 Q185 510 180 570" />
          <path d="M225 460 Q215 510 220 570" />
          {/* Calf bulge */}
          <path d="M170 650 Q180 690 175 730" />
          <path d="M225 650 Q220 690 225 730" />
        </g>
      )}

      {showCompositionRegions && (
        <g id="composition-regions">
          {region("comp-head",       "M168 40 L232 40 L232 105 L168 105 Z", "Head and face")}
          {region("comp-neck",       "M180 105 L220 105 L220 130 L180 130 Z", "Neck")}
          {region("comp-upper-back", "M140 130 L260 130 L260 255 L140 255 Z", "Upper back")}
          {region("comp-lower-back", "M150 255 L250 255 L240 380 L160 380 Z", "Lower back")}
          {region("comp-right-arm",  "M100 145 L145 145 L135 475 L90 475 Z", "Right arm")}
          {region("comp-left-arm",   "M255 145 L300 145 L310 475 L265 475 Z", "Left arm")}
          {region("comp-right-leg",  "M150 380 L202 380 L200 790 L148 790 Z", "Right leg")}
          {region("comp-left-leg",   "M200 380 L250 380 L250 790 L198 790 Z", "Left leg")}
        </g>
      )}

      {showMuscleRegions && (
        <g id="muscle-regions">
          {region("trapezius-upper",          "M160 130 L240 130 L225 165 L175 165 Z", "Upper Trapezius")}
          {region("trapezius-middle",         "M165 165 L235 165 L225 215 L175 215 Z", "Middle Trapezius")}
          {region("trapezius-lower",          "M175 215 L225 215 L215 275 L185 275 Z", "Lower Trapezius")}
          {region("deltoid-posterior-right",  "M115 140 L150 140 L150 205 L115 205 Z", "Right Posterior Deltoid")}
          {region("deltoid-posterior-left",   "M250 140 L285 140 L285 205 L250 205 Z", "Left Posterior Deltoid")}
          {region("triceps-brachii-right",    "M105 215 L140 215 L130 330 L100 330 Z", "Right Triceps Brachii")}
          {region("triceps-brachii-left",     "M260 215 L295 215 L300 330 L270 330 Z", "Left Triceps Brachii")}
          {region("forearm-extensors-right",  "M100 335 L135 335 L115 470 L95 470 Z", "Right Forearm Extensors")}
          {region("forearm-extensors-left",   "M265 335 L300 335 L305 470 L285 470 Z", "Left Forearm Extensors")}
          {region("latissimus-dorsi-right",   "M145 215 L195 215 L185 325 L150 325 Z", "Right Latissimus Dorsi")}
          {region("latissimus-dorsi-left",    "M205 215 L255 215 L250 325 L215 325 Z", "Left Latissimus Dorsi")}
          {region("rhomboids",                "M180 165 L220 165 L220 215 L180 215 Z", "Rhomboids")}
          {region("teres-major-right",        "M145 200 L175 200 L175 225 L145 225 Z", "Right Teres Major")}
          {region("teres-major-left",         "M225 200 L255 200 L255 225 L225 225 Z", "Left Teres Major")}
          {region("erector-spinae",           "M185 215 L215 215 L215 375 L185 375 Z", "Erector Spinae")}
          {region("gluteus-maximus-right",    "M165 385 L200 385 L200 460 L160 460 Z", "Right Gluteus Maximus")}
          {region("gluteus-maximus-left",     "M200 385 L235 385 L240 460 L200 460 Z", "Left Gluteus Maximus")}
          {region("gluteus-medius-right",     "M148 385 L170 385 L170 430 L148 430 Z", "Right Gluteus Medius")}
          {region("gluteus-medius-left",      "M230 385 L252 385 L252 430 L230 430 Z", "Left Gluteus Medius")}
          {region("biceps-femoris-right",     "M160 465 L185 465 L180 590 L158 590 Z", "Right Biceps Femoris")}
          {region("biceps-femoris-left",      "M215 465 L240 465 L242 590 L220 590 Z", "Left Biceps Femoris")}
          {region("semitendinosus-right",     "M185 465 L200 465 L198 590 L183 590 Z", "Right Semitendinosus")}
          {region("semitendinosus-left",      "M200 465 L215 465 L217 590 L202 590 Z", "Left Semitendinosus")}
          {region("semimembranosus-right",    "M170 520 L185 520 L183 600 L170 600 Z", "Right Semimembranosus")}
          {region("semimembranosus-left",     "M215 520 L230 520 L230 600 L217 600 Z", "Left Semimembranosus")}
          {region("gastrocnemius-right",      "M160 625 L200 625 L198 720 L160 720 Z", "Right Gastrocnemius")}
          {region("gastrocnemius-left",       "M200 625 L240 625 L240 720 L202 720 Z", "Left Gastrocnemius")}
          {region("soleus-right",             "M165 720 L200 720 L195 775 L170 775 Z", "Right Soleus")}
          {region("soleus-left",              "M200 720 L235 720 L230 775 L205 775 Z", "Left Soleus")}
        </g>
      )}
    </svg>
  );
};
