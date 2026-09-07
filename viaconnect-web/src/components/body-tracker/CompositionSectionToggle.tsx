'use client';

// Prompt 210i: four-tab row (Body Fat, Muscle Mass, Measurements, FormaVision).
// Prompt 217 snap-scroll chips superseded by Arnold PASS / Picasso Brief 61:
// mobile 2×2 grid (no overflow-x / snap); md+ single row; larger brighter labels.

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

// Consumer chrome subhead (text-white/85) — higher contrast than the old 0.5 chip alpha.
const INACTIVE_LABEL = 'rgba(255,255,255,0.85)';

function TabLabel({ id, label, isActive }: { id: string; label: string; isActive: boolean }) {
  if (id === 'formavision') {
    // Two-tone wordmark: Forma Orange #B75E18, Vision white (210i / Brief 61).
    return (
      <span className="relative z-10">
        <span style={{ color: isActive ? '#B75E18' : 'rgba(183,94,24,0.65)' }}>Forma</span>
        <span style={{ color: isActive ? '#ffffff' : INACTIVE_LABEL }}>Vision</span>
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
      className="relative grid w-full max-w-full grid-cols-2 gap-2 rounded-2xl bg-white/[0.03] p-1 md:flex md:flex-nowrap"
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
            className="relative z-10 flex min-h-[52px] w-full min-w-0 items-center justify-center gap-1.5 rounded-full px-2 py-3 text-sm font-semibold transition-colors md:flex-1 md:whitespace-nowrap"
            style={{ color: isActive ? '#ffffff' : INACTIVE_LABEL }}
          >
            {isActive && (
              <motion.div
                layoutId="composition-pill"
                className="absolute inset-0 rounded-full border border-[#5B8DEF]/40 bg-[#2A4C9E]/25 backdrop-blur-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <Icon className="relative z-10 shrink-0" size={20} strokeWidth={1.5} />
            <TabLabel id={s.id} label={s.label} isActive={isActive} />
          </button>
        );
      })}
    </div>
  );
}
