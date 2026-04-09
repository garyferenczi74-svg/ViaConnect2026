'use client';

// CategoryTabBar — horizontal scrollable list of activated category tabs.

import { motion } from 'framer-motion';
import {
  BookOpen,
  FlaskConical,
  Globe,
  Headphones,
  Newspaper,
  Settings2,
  Users,
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

interface CategoryTabBarProps {
  categories: ResearchCategory[];
  activeId: string | null;
  onSelect: (categoryId: string) => void;
  onManage: () => void;
}

export function CategoryTabBar({
  categories,
  activeId,
  onSelect,
  onManage,
}: CategoryTabBarProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 snap-x snap-mandatory items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((cat) => {
          const Icon = ICON_MAP[cat.icon_name] ?? BookOpen;
          const isActive = cat.id === activeId;
          return (
            <motion.button
              key={cat.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(cat.id)}
              className={`flex min-h-[44px] flex-shrink-0 snap-center items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium transition-all ${
                isActive
                  ? 'border-[#2DA5A0]/40 bg-[#2DA5A0]/15 text-white'
                  : 'border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.5} />
              {cat.label}
            </motion.button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onManage}
        aria-label="Manage research categories"
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/60 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50"
      >
        <Settings2 className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
