"use client";

/**
 * src/components/journey/accelerators/AcceleratorCard.tsx
 *
 * NEW AcceleratorCard for the coaching-layout Your Journey page (Prompt 208g,
 * Task G-T6). Renders a single Journey accelerator as a glass card with a
 * "Why this, why you" provenance expander at the bottom.
 *
 * Design mirrors the shared JourneyAccelerators card (icon disc, impact pill,
 * DM Sans title, description, DM Mono category tag) and adds the collapsible
 * provenance row with accessible aria-expanded, 44px touch target, and a
 * useReducedMotion gate on the chevron animation.
 *
 * Rules:
 *   - No em-dashes or en-dashes anywhere (copy, JSX, comments).
 *   - No emojis.
 *   - Lucide strokeWidth={1.5}.
 *   - provenanceFor is a pure, deterministic helper that never throws.
 *   - Educational / structure-function framing only in provenance copy.
 *   - No diagnosis, treatment, or disease language.
 *   - DM Sans / DM Mono font tokens throughout.
 */

import { useState } from "react";
import type { LucideProps } from "lucide-react";
import { Moon, Apple, Activity, Brain, Pill, ChevronDown } from "lucide-react";
import { useReducedMotion } from "@/components/body-tracker/HoverSystem/useReducedMotion";
import type { JourneyRec } from "@/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/hooks/useJourneyRecommendations";

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

const DM_SANS = "var(--font-dm-sans), sans-serif";
const DM_MONO = "var(--font-dm-mono), monospace";

// ---------------------------------------------------------------------------
// Icon mapping (matches the shared JourneyAccelerators component)
// ---------------------------------------------------------------------------

type LucideIcon = React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>;

const ICONS: Record<JourneyRec["icon"], LucideIcon> = {
  sleep: Moon,
  nutrition: Apple,
  movement: Activity,
  stress: Brain,
  supplement: Pill,
};

// ---------------------------------------------------------------------------
// provenanceFor
//
// Pure, deterministic helper. Returns the "why this, why you" educational text
// for a given recommendation. Framing is structure-function only. No diagnosis,
// no treatment claims, no disease language. Never throws. No em/en-dashes.
// ---------------------------------------------------------------------------

export function provenanceFor(rec: JourneyRec): string {
  switch (rec.icon) {
    case "sleep":
      return "Sleep consistency is one of the largest levers on your Bio Optimization baseline, which is why your engine surfaced this first.";
    case "supplement":
      return "Suggested to support your foundational nutrient status as your baseline forms. Educational only, not a medical claim.";
    case "movement":
      return "Steady Zone 2 work supports your activity pillar and aerobic foundation over the coming weeks.";
    case "stress":
      return "A short daily reset supports your mood and stress pillar as your scores build.";
    case "nutrition":
      return "Supports your nutrition pillar as your daily logs and scores develop over time.";
    default:
      return "This accelerator was surfaced by your recommendation engine to support your overall Bio Optimization baseline.";
  }
}

// ---------------------------------------------------------------------------
// AcceleratorCard
// ---------------------------------------------------------------------------

export function AcceleratorCard({ rec }: { rec: JourneyRec }) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();

  const Icon = (ICONS[rec.icon] ?? Pill) as LucideIcon;

  const provenance = provenanceFor(rec);

  // Chevron rotation: 0deg closed, 180deg open. Gated on reduced motion.
  const chevronStyle: React.CSSProperties = {
    width: 14,
    height: 14,
    color: "rgba(255,255,255,0.45)",
    flexShrink: 0,
    transform: open && !reduced ? "rotate(180deg)" : "rotate(0deg)",
    transition: reduced ? undefined : "transform 0.18s ease",
  };

  return (
    <article
      className="h-full flex flex-col rounded-xl p-4"
      style={{
        background: "rgba(22,36,64,0.4)",
        border: "1px solid rgba(45,165,160,0.18)",
        boxShadow: "0 2px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {/* Icon disc + impact pill */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: "rgba(232,128,58,0.14)",
            border: "1px solid rgba(232,128,58,0.35)",
          }}
        >
          <Icon
            className="w-4 h-4"
            strokeWidth={1.5}
            style={{ color: "#E8803A" }}
          />
        </div>
        <div
          className="rounded-md px-2 py-0.5 text-[10px] font-semibold tabular-nums"
          style={{
            background: "rgba(52,211,153,0.14)",
            color: "#34D399",
            border: "1px solid rgba(52,211,153,0.3)",
          }}
        >
          +{rec.estimatedImpact} pts
        </div>
      </div>

      {/* Title */}
      <p
        className="text-sm font-semibold text-white mb-1"
        style={{ fontFamily: DM_SANS }}
      >
        {rec.title}
      </p>

      {/* Description */}
      <p className="text-xs text-white/60 leading-relaxed mb-2 flex-1">
        {rec.description}
      </p>

      {/* Category tag */}
      <span
        className="text-[10px] uppercase tracking-wider text-white/40 mb-3 block"
        style={{ fontFamily: DM_MONO }}
      >
        {rec.category}
      </span>

      {/* Provenance expander */}
      <div className="border-t border-white/[0.06] pt-2 mt-auto">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`provenance-${rec.id}`}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left"
          style={{
            minHeight: 44,
            background: "none",
            border: "none",
            padding: "4px 0",
            cursor: "pointer",
          }}
        >
          <span
            className="text-[10px] uppercase tracking-wider"
            style={{ fontFamily: DM_MONO, color: "rgba(45,165,160,0.8)" }}
          >
            Why this, why you
          </span>
          <ChevronDown strokeWidth={1.5} style={chevronStyle} />
        </button>

        {/* Expanded provenance panel */}
        <div
          id={`provenance-${rec.id}`}
          role="region"
          aria-label={`Provenance for ${rec.title}`}
          style={{
            overflow: "hidden",
            maxHeight: open ? 200 : 0,
            opacity: open ? 1 : 0,
            transition: reduced
              ? undefined
              : "max-height 0.22s ease, opacity 0.18s ease",
          }}
        >
          <div className="pb-2 pt-1 flex flex-col gap-2">
            <p
              className="text-xs leading-relaxed"
              style={{ fontFamily: DM_SANS, color: "rgba(255,255,255,0.6)" }}
            >
              {provenance}
            </p>
            <span
              className="text-[10px] uppercase tracking-wider"
              style={{ fontFamily: DM_MONO, color: "rgba(45,165,160,0.55)" }}
            >
              Engine sourced
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
