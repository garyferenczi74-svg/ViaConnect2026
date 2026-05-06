'use client';

import { motion } from 'framer-motion';
import { PieChart, Dumbbell, Ruler } from 'lucide-react';

export type CompositionSection = 'fat' | 'muscle' | 'measurements';

interface CompositionSectionToggleProps {
  active: CompositionSection;
  onChange: (section: CompositionSection) => void;
}

const SECTIONS = [
  { id: 'fat',          label: 'Body Fat',     icon: PieChart },
  { id: 'muscle',       label: 'Muscle Mass',  icon: Dumbbell },
  { id: 'measurements', label: 'Measurements', icon: Ruler },
] as const;

export function CompositionSectionToggle({ active, onChange }: CompositionSectionToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Body composition section"
      className="relative inline-flex gap-1 rounded-full bg-white/[0.03] p-1"
    >
      {SECTIONS.map((s) => {
        const Icon = s.icon;
        const isActive = active === s.id;
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(s.id)}
            className="relative z-10 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors min-h-[36px]"
            style={{ color: isActive ? '#ffffff' : 'rgba(255,255,255,0.5)' }}
          >
            {isActive && (
              <motion.div
                layoutId="composition-pill"
                className="absolute inset-0 rounded-full bg-[#2DA5A0]"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <Icon className="relative z-10" size={14} strokeWidth={1.5} />
            <span className="relative z-10">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}
