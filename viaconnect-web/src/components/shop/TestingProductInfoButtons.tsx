'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Search,
  Users,
  Package,
  ListChecks,
  Workflow,
  ChevronDown,
} from 'lucide-react';
import {
  getTestingProductBySku,
  type TestInfoSection,
} from '@/data/testingDiagnosticsInfo';

// Map data-file string icon names → actual Lucide components.
// Only the icons used by the 8 testing products' sections.
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties }>> = {
  Search,
  Users,
  Package,
  ListChecks,
  Workflow,
};

// Section icon color by ordinal position.
// 1st = teal, 2nd = orange, 3rd = white. This works for both
// the regular test layout (What's Tested / Who It's For / What
// You Get) and the 30-Day Custom Vitamin layout (What's Included
// / How It Works / Who It's For) without per-label hardcoding.
const SECTION_ICON_COLORS = ['#2DA5A0', '#B75E18', '#FFFFFF'] as const;

interface TestingProductInfoButtonsProps {
  sku: string;
}

export function TestingProductInfoButtons({ sku }: TestingProductInfoButtonsProps) {
  const product = getTestingProductBySku(sku);
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);
  const [openItemIdx, setOpenItemIdx] = useState<number | null>(null);
  const shouldReduceMotion = useReducedMotion();

  if (!product) return null;

  const toggleSection = (id: string) => {
    setOpenItemIdx(null);
    setOpenSectionId((prev) => (prev === id ? null : id));
  };

  const toggleItem = (idx: number) => {
    setOpenItemIdx((prev) => (prev === idx ? null : idx));
  };

  const activeSection: TestInfoSection | null =
    product.sections.find((s) => s.id === openSectionId) ?? null;

  return (
    <div
      className="mt-2 space-y-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Button row — three pills, one per section.
          Compact layout: icon stacked above 2-line label so all 3
          fit inside narrow card columns without truncation. */}
      <div className="grid grid-cols-3 gap-1 w-full">
        {product.sections.map((section, idx) => {
          const Icon = ICON_MAP[section.icon] ?? Package;
          const iconColor = SECTION_ICON_COLORS[idx] ?? '#FFFFFF';
          const isActive = openSectionId === section.id;
          return (
            <motion.button
              key={section.id}
              type="button"
              onClick={() => toggleSection(section.id)}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              className={`min-w-0 flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded-lg text-[9px] leading-tight font-medium transition-all duration-200 border ${
                isActive
                  ? 'bg-[rgba(45,165,160,0.20)] text-[#2DA5A0] border-[rgba(45,165,160,0.40)]'
                  : 'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.50)] border-[rgba(255,255,255,0.10)] hover:border-[rgba(255,255,255,0.20)] hover:text-[rgba(255,255,255,0.75)]'
              }`}
            >
              <Icon
                className="w-3.5 h-3.5 flex-shrink-0"
                strokeWidth={1.5}
                style={{ color: iconColor }}
              />
              <span className="text-center break-words w-full">{section.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Expanded section panel — single section open at a time */}
      <AnimatePresence initial={false}>
        {activeSection && (
          <motion.div
            key={activeSection.id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 300, damping: 30 }
            }
            style={{ overflow: 'hidden' }}
          >
            <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] mt-0.5 px-3 py-1">
              {activeSection.items.map((item, idx) => {
                const isItemOpen = openItemIdx === idx;
                return (
                  <div
                    key={`${activeSection.id}-${idx}`}
                    className="border-b border-[rgba(255,255,255,0.05)] last:border-b-0 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => toggleItem(idx)}
                      className="w-full flex items-start justify-between gap-2 text-left min-h-[24px]"
                    >
                      <span className="text-xs font-semibold text-white leading-snug flex-1">
                        {item.title}
                      </span>
                      <motion.div
                        animate={{ rotate: isItemOpen ? 180 : 0 }}
                        transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                        className="flex-shrink-0 mt-0.5"
                      >
                        <ChevronDown
                          className="w-3 h-3 text-[rgba(255,255,255,0.40)]"
                          strokeWidth={1.5}
                        />
                      </motion.div>
                    </button>
                    <AnimatePresence initial={false}>
                      {isItemOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={
                            shouldReduceMotion
                              ? { duration: 0 }
                              : { duration: 0.25, ease: 'easeInOut' }
                          }
                          style={{ overflow: 'hidden' }}
                        >
                          <p className="text-[11px] sm:text-xs text-[rgba(255,255,255,0.55)] leading-relaxed mt-1.5">
                            {item.detail}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
