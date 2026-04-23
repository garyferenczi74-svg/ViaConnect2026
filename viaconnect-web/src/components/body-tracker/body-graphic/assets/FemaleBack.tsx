// Prompt #118 — Female back-view body SVG.

import type { FC } from "react";
import type { BodySvgProps } from "../BodyGraphic.types";

export const FemaleBack: FC<BodySvgProps> = ({
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
         aria-labelledby="body-graphic-female-back-title"
         className={className}>
      <title id="body-graphic-female-back-title">Female body diagram, back view</title>

      <g id="body-form" stroke="currentColor" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="200" cy="72" r="30" />
        <path d="M187 102 L187 130 M213 102 L213 130" />
        <path d="M187 130 L160 148 L155 210 L170 255 L165 300 L175 350 L180 390" />
        <path d="M213 130 L240 148 L245 210 L230 255 L235 300 L225 350 L220 390" />
        <path d="M175 350 L150 385 L165 400" />
        <path d="M225 350 L250 385 L235 400" />
        <path d="M165 400 L235 400" />
        <path d="M160 148 L130 175 L115 250 L118 360 L115 450 L120 475" />
        <path d="M240 148 L270 175 L285 250 L282 360 L285 450 L280 475" />
        <path d="M165 400 L155 510 L150 620 L155 760 L165 790" />
        <path d="M200 410 L195 525 L198 640 L193 760 L185 790" />
        <path d="M235 400 L245 510 L250 620 L245 760 L235 790" />
        <path d="M200 410 L205 525 L202 640 L207 760 L215 790" />
      </g>

      {showAnatomicalDetail && (
        <g id="anatomical-detail" stroke="currentColor" strokeWidth={1.5} fill="none" opacity={0.4}>
          <path d="M175 130 L200 160 L225 130" />
          <path d="M165 170 L200 220 L235 170" />
          <path d="M170 230 Q195 255 195 325" />
          <path d="M230 230 Q205 255 205 325" />
          <path d="M200 120 L200 400" strokeDasharray="2 3" />
          <path d="M200 400 L200 460" />
          <path d="M172 470 Q183 520 178 575" />
          <path d="M228 470 Q217 520 222 575" />
          <path d="M170 650 Q180 690 175 730" />
          <path d="M225 650 Q220 690 225 730" />
        </g>
      )}

      {showCompositionRegions && (
        <g id="composition-regions">
          {region("comp-head",       "M170 42 L230 42 L230 105 L170 105 Z", "Head and face")}
          {region("comp-neck",       "M182 105 L218 105 L218 130 L182 130 Z", "Neck")}
          {region("comp-upper-back", "M155 130 L245 130 L245 260 L155 260 Z", "Upper back")}
          {region("comp-lower-back", "M160 260 L240 260 L235 400 L165 400 Z", "Lower back")}
          {region("comp-right-arm",  "M112 148 L160 148 L145 475 L105 475 Z", "Right arm")}
          {region("comp-left-arm",   "M240 148 L288 148 L295 475 L255 475 Z", "Left arm")}
          {region("comp-right-leg",  "M148 400 L202 400 L200 790 L150 790 Z", "Right leg")}
          {region("comp-left-leg",   "M200 400 L252 400 L250 790 L198 790 Z", "Left leg")}
        </g>
      )}

      {showMuscleRegions && (
        <g id="muscle-regions">
          {region("trapezius-upper",          "M165 130 L235 130 L220 168 L180 168 Z", "Upper Trapezius")}
          {region("trapezius-middle",         "M170 168 L230 168 L222 218 L178 218 Z", "Middle Trapezius")}
          {region("trapezius-lower",          "M178 218 L222 218 L212 275 L188 275 Z", "Lower Trapezius")}
          {region("deltoid-posterior-right",  "M130 145 L162 145 L162 210 L130 210 Z", "Right Posterior Deltoid")}
          {region("deltoid-posterior-left",   "M238 145 L270 145 L270 210 L238 210 Z", "Left Posterior Deltoid")}
          {region("triceps-brachii-right",    "M120 215 L155 215 L145 330 L115 330 Z", "Right Triceps Brachii")}
          {region("triceps-brachii-left",     "M245 215 L280 215 L285 330 L255 330 Z", "Left Triceps Brachii")}
          {region("forearm-extensors-right",  "M115 335 L148 335 L125 470 L110 470 Z", "Right Forearm Extensors")}
          {region("forearm-extensors-left",   "M252 335 L285 335 L290 470 L275 470 Z", "Left Forearm Extensors")}
          {region("latissimus-dorsi-right",   "M158 220 L198 220 L188 320 L162 320 Z", "Right Latissimus Dorsi")}
          {region("latissimus-dorsi-left",    "M202 220 L242 220 L238 320 L212 320 Z", "Left Latissimus Dorsi")}
          {region("rhomboids",                "M182 168 L218 168 L218 218 L182 218 Z", "Rhomboids")}
          {region("teres-major-right",        "M152 200 L180 200 L180 225 L152 225 Z", "Right Teres Major")}
          {region("teres-major-left",         "M220 200 L248 200 L248 225 L220 225 Z", "Left Teres Major")}
          {region("erector-spinae",           "M188 220 L212 220 L212 395 L188 395 Z", "Erector Spinae")}
          {region("gluteus-maximus-right",    "M165 405 L200 405 L200 475 L160 475 Z", "Right Gluteus Maximus")}
          {region("gluteus-maximus-left",     "M200 405 L235 405 L240 475 L200 475 Z", "Left Gluteus Maximus")}
          {region("gluteus-medius-right",     "M148 400 L170 400 L170 445 L148 445 Z", "Right Gluteus Medius")}
          {region("gluteus-medius-left",      "M230 400 L252 400 L252 445 L230 445 Z", "Left Gluteus Medius")}
          {region("biceps-femoris-right",     "M160 480 L185 480 L180 595 L158 595 Z", "Right Biceps Femoris")}
          {region("biceps-femoris-left",      "M215 480 L240 480 L242 595 L220 595 Z", "Left Biceps Femoris")}
          {region("semitendinosus-right",     "M185 480 L200 480 L198 595 L183 595 Z", "Right Semitendinosus")}
          {region("semitendinosus-left",      "M200 480 L215 480 L217 595 L202 595 Z", "Left Semitendinosus")}
          {region("semimembranosus-right",    "M170 530 L185 530 L183 605 L170 605 Z", "Right Semimembranosus")}
          {region("semimembranosus-left",     "M215 530 L230 530 L230 605 L217 605 Z", "Left Semimembranosus")}
          {region("gastrocnemius-right",      "M160 625 L200 625 L198 720 L160 720 Z", "Right Gastrocnemius")}
          {region("gastrocnemius-left",       "M200 625 L240 625 L240 720 L202 720 Z", "Left Gastrocnemius")}
          {region("soleus-right",             "M165 720 L200 720 L195 775 L170 775 Z", "Right Soleus")}
          {region("soleus-left",              "M200 720 L235 720 L230 775 L205 775 Z", "Left Soleus")}
        </g>
      )}
    </svg>
  );
};
