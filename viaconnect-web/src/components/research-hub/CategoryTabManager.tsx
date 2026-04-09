'use client';

// CategoryTabManager — modal that lets the user activate/deactivate
// research category tabs. Enforces minimum 1 active.

import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Check,
  FlaskConical,
  Globe,
  Headphones,
  Newspaper,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { ResearchCategory } from '@/lib/research-hub/types';

const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen,
  Globe,
  Users,
  Headphones,
  FlaskConical,
  Newspaper,
};

interface CategoryTabManagerProps {
  open: boolean;
  categories: ResearchCategory[];
  activeIds: Set<string>;
  onToggle: (categoryId: string, nextActive: boolean) => void;
  onClose: () => void;
}

export function CategoryTabManager({
  open,
  categories,
  activeIds,
  onToggle,
  onClose,
}: CategoryTabManagerProps) {
  const activeCount = activeIds.size;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/10 bg-[#1E3054] shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-white/5 p-4 sm:p-5">
              <div>
                <h2 className="text-base font-bold text-white">Manage Research Categories</h2>
                <p className="mt-0.5 text-[11px] text-white/40">
                  Activate the tabs you want to follow
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/50 hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            <ul className="max-h-[60vh] overflow-y-auto p-2">
              {categories.map((cat) => {
                const Icon = ICON_MAP[cat.icon_name] ?? BookOpen;
                const isActive = activeIds.has(cat.id);
                const isLastActive = isActive && activeCount === 1;
                return (
                  <li key={cat.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (isLastActive) return; // enforce minimum 1
                        onToggle(cat.id, !isActive);
                      }}
                      disabled={isLastActive}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                        isActive
                          ? 'bg-[#2DA5A0]/10 hover:bg-[#2DA5A0]/15'
                          : 'hover:bg-white/[0.04]'
                      } ${isLastActive ? 'cursor-not-allowed opacity-70' : ''}`}
                    >
                      <div
                        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                          isActive
                            ? 'border border-[#2DA5A0]/40 bg-[#2DA5A0]/20'
                            : 'border border-white/10 bg-white/[0.04]'
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 ${isActive ? 'text-[#2DA5A0]' : 'text-white/50'}`}
                          strokeWidth={1.5}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white">{cat.label}</p>
                        {cat.description && (
                          <p className="mt-0.5 truncate text-[11px] text-white/40">
                            {cat.description}
                          </p>
                        )}
                      </div>
                      <div
                        className={`flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-all ${
                          isActive ? 'bg-[#2DA5A0]' : 'bg-white/10'
                        }`}
                      >
                        <motion.div
                          layout
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className={`flex h-5 w-5 items-center justify-center rounded-full bg-white shadow ${
                            isActive ? 'ml-auto mr-0.5' : 'ml-0.5'
                          }`}
                        >
                          {isActive && <Check className="h-3 w-3 text-[#2DA5A0]" strokeWidth={3} />}
                        </motion.div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-between border-t border-white/5 px-4 py-3 sm:px-5">
              <p className="text-[11px] text-white/40">
                {activeCount} active {activeCount === 1 ? 'tab' : 'tabs'}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/15 px-4 py-2 text-sm font-semibold text-[#2DA5A0] hover:bg-[#2DA5A0]/25"
              >
                Done
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
