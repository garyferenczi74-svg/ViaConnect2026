'use client';

// Prompt 210i: four-tab row (Body Fat, Muscle Mass, Measurements, FormaVision).
// Existing pill treatment preserved; FormaVision is navigation to the 3D surface.

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

function TabLabel({ id, label, isActive }: { id: string; label: string; isActive: boolean }) {
  if (id === 'formavision') {
    // Two-tone wordmark at the existing tab type scale (210i Section 1.2).
    return (
      <span className="relative z-10">
        <span style={{ color: isActive ? '#B75E18' : 'rgba(183,94,24,0.65)' }}>Forma</span>
        <span style={{ color: isActive ? '#ffffff' : 'rgba(255,255,255,0.5)' }}>Vision</span>
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
      className="relative inline-flex max-w-full flex-wrap gap-1 rounded-full bg-white/[0.03] p-1"
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
            className="relative z-10 inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:px-4"
            style={{ color: isActive ? '#ffffff' : 'rgba(255,255,255,0.5)' }}
          >
            {isActive && (
              <motion.div
                layoutId="composition-pill"
                className="absolute inset-0 rounded-full border border-[#5B8DEF]/40 bg-[#2A4C9E]/25 backdrop-blur-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <Icon className="relative z-10" size={14} strokeWidth={1.5} />
            <TabLabel id={s.id} label={s.label} isActive={isActive} />
          </button>
        );
      })}
    </div>
  );
}
