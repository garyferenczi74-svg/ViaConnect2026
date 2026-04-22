'use client';

import { Zap, Star, Leaf, Dna, FlaskConical, Heart, Package, TestTube2 } from 'lucide-react';

// ── Category config ──

export interface CategoryConfig {
  label: string;
  order: number;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  borderColor: string;
  icon: React.ElementType;
  description: string;
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  ADVANCED: {
    label: 'Advanced Formulas',
    order: 1,
    color: '#2DA5A0',
    gradientFrom: 'rgba(45,165,160,0.15)',
    gradientTo: 'rgba(45,165,160,0.04)',
    borderColor: 'rgba(45,165,160,0.30)',
    icon: Zap,
    description: 'Targeted protocols for performance, longevity, and health optimization',
  },
  CHILDREN: {
    label: "Children's",
    order: 3,
    color: '#D97706',
    gradientFrom: 'rgba(217,119,6,0.15)',
    gradientTo: 'rgba(217,119,6,0.04)',
    borderColor: 'rgba(217,119,6,0.30)',
    icon: Star,
    description: 'Age-appropriate liposomal nutrition for infants, toddlers, and children',
  },
  MUSHROOM: {
    label: 'Functional Mushrooms',
    order: 8,
    color: '#16A34A',
    gradientFrom: 'rgba(22,163,74,0.15)',
    gradientTo: 'rgba(22,163,74,0.04)',
    borderColor: 'rgba(22,163,74,0.30)',
    icon: Leaf,
    description: 'Adaptogenic mushroom extracts for immune, cognitive, and metabolic support',
  },
  SNP: {
    label: 'Methylation SNP Support',
    order: 4,
    color: '#B75E18',
    gradientFrom: 'rgba(183,94,24,0.15)',
    gradientTo: 'rgba(183,94,24,0.04)',
    borderColor: 'rgba(183,94,24,0.30)',
    icon: Dna,
    description: 'Precision formulas targeting MTHFR, COMT, VDR and 80+ genetic variants',
  },
  BASE: {
    label: 'Proprietary Base',
    order: 5,
    color: '#2DA5A0',
    gradientFrom: 'rgba(26,39,68,0.60)',
    gradientTo: 'rgba(45,165,160,0.10)',
    borderColor: 'rgba(45,165,160,0.25)',
    icon: FlaskConical,
    description: 'Core building blocks. The foundation of every FarmCeutica protocol',
  },
  TESTING: {
    label: 'GeneX360 Testing & Diagnostics',
    order: 6,
    color: '#A78BFA',
    gradientFrom: 'rgba(167,139,250,0.15)',
    gradientTo: 'rgba(167,139,250,0.04)',
    borderColor: 'rgba(167,139,250,0.30)',
    icon: TestTube2,
    description: 'Genetic, hormone, and biological age testing for personalized protocols',
  },
  WOMEN: {
    label: "Women's Health",
    order: 2,
    color: '#9D4EDD',
    gradientFrom: 'rgba(157,78,221,0.15)',
    gradientTo: 'rgba(157,78,221,0.04)',
    borderColor: 'rgba(157,78,221,0.30)',
    icon: Heart,
    description: 'Hormonal balance, prenatal, postnatal, and female wellness formulas',
  },
};

// ── Normalise category string to match config keys ──

export function normaliseCategory(raw: string | null | undefined): string {
  if (!raw) return 'OTHER';
  const up = raw.trim().toUpperCase();
  if (up.includes('ADVANCED')) return 'ADVANCED';
  if (up.includes('CHILDREN') || up.includes('CHILD')) return 'CHILDREN';
  if (up.includes('MUSHROOM')) return 'MUSHROOM';
  if (up.includes('SNP') || up.includes('METHYLATION') || up.includes('GENEX')) return 'SNP';
  if (up.includes('BASE') || up.includes('PROPRIETARY')) return 'BASE';
  if (up.includes('TEST')) return 'TESTING';
  if (up.includes('WOMEN')) return 'WOMEN';
  return 'OTHER';
}

// ── Group + sort A-Z within each category ──

export function groupByCategory<T extends { Category?: string; Name?: string; category?: string; name?: string }>(
  products: T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const p of products) {
    const cat = p.Category ?? p.category ?? '';
    const key = normaliseCategory(cat);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  // Sort products A-Z within each group, with GeneX360 pinned first
  // and CannabisIQ pinned last inside the Testing & Diagnostics section.
  for (const [key, group] of groups) {
    group.sort((a, b) => {
      const aName = a.Name ?? a.name ?? '';
      const bName = b.Name ?? b.name ?? '';
      if (key === 'TESTING') {
        const aIsGeneX360 = aName.startsWith('GeneX360');
        const bIsGeneX360 = bName.startsWith('GeneX360');
        if (aIsGeneX360 && !bIsGeneX360) return -1;
        if (!aIsGeneX360 && bIsGeneX360) return 1;
        const aIsCannabis = aName.startsWith('CannabisIQ');
        const bIsCannabis = bName.startsWith('CannabisIQ');
        if (aIsCannabis && !bIsCannabis) return 1;
        if (!aIsCannabis && bIsCannabis) return -1;
      }
      return aName.localeCompare(bName);
    });
  }

  // Sort groups by config order
  const sorted = new Map(
    [...groups.entries()].sort(([a], [b]) => {
      const aOrder = CATEGORY_CONFIG[a]?.order ?? 99;
      const bOrder = CATEGORY_CONFIG[b]?.order ?? 99;
      return aOrder - bOrder;
    })
  );

  return sorted;
}

// ── Sticky Category Nav ──

export function CategoryNav({ categoryKeys }: { categoryKeys: string[] }) {
  const scrollToSection = (key: string) => {
    const el = document.getElementById(`category-${key.toLowerCase().replace(/[^a-z0-9]/g, '-')}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="sticky top-0 z-20 bg-[#1A2744]/95 backdrop-blur-md border-b border-[rgba(255,255,255,0.08)] py-3 px-1 -mx-1 mb-6">
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden">
        {categoryKeys.map(key => {
          const cfg = CATEGORY_CONFIG[key] || { label: key, color: '#888', icon: Package };
          const Icon = cfg.icon;
          return (
            <button
              key={key}
              onClick={() => scrollToSection(key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.55)] border border-[rgba(255,255,255,0.10)] hover:text-white hover:border-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.10)] transition-all duration-150 flex-shrink-0"
            >
              <Icon className="w-3 h-3 flex-shrink-0" strokeWidth={1.5} style={{ color: cfg.color }} />
              {cfg.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Category Section Header ──

export function CategoryHeader({ categoryKey, productCount }: { categoryKey: string; productCount: number }) {
  const cfg: CategoryConfig = CATEGORY_CONFIG[categoryKey] || {
    label: categoryKey === 'OTHER' ? 'Other' : categoryKey,
    order: 99,
    color: '#888888',
    gradientFrom: 'rgba(255,255,255,0.05)',
    gradientTo: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.15)',
    icon: Package,
    description: '',
  };
  const Icon = cfg.icon;

  return (
    <div
      className="rounded-2xl p-5 mb-5 border"
      style={{
        background: `linear-gradient(135deg, ${cfg.gradientFrom}, ${cfg.gradientTo})`,
        borderColor: cfg.borderColor,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${cfg.color}22`, border: `1px solid ${cfg.color}44` }}
          >
            <Icon className="w-5 h-5" strokeWidth={1.5} style={{ color: cfg.color }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: cfg.color }}>
              {cfg.label}
            </h2>
            {cfg.description && (
              <p className="text-xs text-[rgba(255,255,255,0.45)] mt-0.5 leading-snug">
                {cfg.description}
              </p>
            )}
          </div>
        </div>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 mt-0.5"
          style={{
            background: `${cfg.color}18`,
            color: cfg.color,
            border: `1px solid ${cfg.color}35`,
          }}
        >
          {productCount} product{productCount !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}

export function categorySectionId(key: string): string {
  return `category-${key.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
}
