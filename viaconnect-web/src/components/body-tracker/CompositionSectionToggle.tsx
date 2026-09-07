'use client';

// Prompt 210i: four-tab row (Body Fat, Muscle Mass, Measurements, FormaVision).
// Prompt 217 snap-scroll chips superseded by Arnold PASS / Picasso Brief 61.
// Picasso DESIGN-READY: 390→~358 inner, grid-cols-2 gap-2, cells ~175×52,
// rounded-xl Log Data glass, text-foreground, teal consumerChrome active,
// 2×2 until 1280 (xl row only if no scroll).

import { motion } from 'framer-motion';
import { PieChart, Dumbbell, Ruler, Box } from 'lucide-react';

export type CompositionSection = 'fat' | 'muscle' | 'measurements';
export type CompositionNavTab = CompositionSection | 'formavision';

interface CompositionSectionToggleProps {
  active: CompositionNavTab;
  onChange: (section: CompositionNavTab) => void;
  // BodyCompositionForm only needs the three content sections (no FormaVision).
  includeFormaVision?: boolean;
}

const CONTENT_SECTIONS = [
  { id: 'fat' as const, label: 'Body Fat', icon: PieChart },
  { id: 'muscle' as const, label: 'Muscle Mass', icon: Dumbbell },
  { id: 'measurements' as const, label: 'Measurements', icon: Ruler },
];

const FORMAVISION_TAB = {
  id: 'formavision' as const,
  label: 'FormaVision',
  icon: Box,
};

// Log Data family glass (BiologyActionRow): rounded-xl, #1E3054 frost, teal active.
const CELL_BASE =
  'relative z-10 flex h-[52px] min-h-[52px] w-full min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-sm font-semibold text-foreground backdrop-blur-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/45 xl:h-auto xl:min-h-[52px] xl:flex-1';
const CELL_IDLE = `${CELL_BASE} border-white/15 bg-[rgba(30,48,84,0.92)]`;
const CELL_ACTIVE = `${CELL_BASE} border-[rgba(45,165,160,0.8)] bg-transparent`;

function TabLabel({ id, label }: { id: string; label: string }) {
  if (id === 'formavision') {
    // Two-tone wordmark: Forma Orange #B75E18, Vision inherits text-foreground.
    // Full "FormaVision" stays readable in a ~175px cell (no ellipsis clip).
    return (
      <span className="relative z-10">
        <span className="text-[#B75E18]">Forma</span>
        <span>Vision</span>
      </span>
    );
  }
  return <span className="relative z-10">{label}</span>;
}

export function CompositionSectionToggle({
  active,
  onChange,
  includeFormaVision = true,
}: CompositionSectionToggleProps) {
  const sections = includeFormaVision
    ? [...CONTENT_SECTIONS, FORMAVISION_TAB]
    : CONTENT_SECTIONS;

  return (
    <div
      role="radiogroup"
      aria-label="Body composition section"
      data-testid="composition-section-toggle"
      className="relative grid w-full max-w-full grid-cols-2 gap-2 xl:flex xl:flex-nowrap"
    >
      {sections.map((s) => {
        const Icon = s.icon;
        const isActive = active === s.id;
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            data-testid={`composition-tab-${s.id}`}
            data-active={isActive ? 'true' : 'false'}
            onClick={() => onChange(s.id)}
            className={isActive ? CELL_ACTIVE : CELL_IDLE}
          >
            {isActive && (
              <motion.div
                layoutId="composition-pill"
                className="absolute inset-0 rounded-xl border border-[rgba(45,165,160,0.8)] bg-[rgba(45,165,160,0.18)] backdrop-blur-md"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <Icon className="relative z-10 shrink-0" size={20} strokeWidth={1.5} />
            <TabLabel id={s.id} label={s.label} />
          </button>
        );
      })}
    </div>
  );
}
