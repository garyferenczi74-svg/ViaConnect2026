'use client';

// PeptideCatalogSection — collapsible "Browse Full Peptide Catalog" section
// rendered on /peptide-protocol below the Cycling Protocol. Mirrors the
// categorized grid from /shop/peptides but tuned for the narrower
// max-w-3xl container (1 col mobile, 2 col sm+).

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  FlaskConical,
  Dna,
  Battery,
  Zap,
  Flame,
  BrainCircuit,
  Brain,
  Shield,
  Activity,
  Clock,
  Heart,
  Leaf,
  TrendingDown,
  Library,
  type LucideIcon,
} from 'lucide-react';
import { ALL_CATEGORIES } from '@/config/peptide-database/registry';
import { PeptideCatalogCard } from '@/components/shop/PeptideCatalogCard';

const ICON_MAP: Record<string, LucideIcon> = {
  Dna,
  Battery,
  Zap,
  Flame,
  BrainCircuit,
  Brain,
  Shield,
  Activity,
  Clock,
  Heart,
  Leaf,
  TrendingDown,
  FlaskConical,
};

export function PeptideCatalogSection() {
  const [open, setOpen] = useState(false);

  const categories = useMemo(
    () =>
      ALL_CATEGORIES.map((cat) => ({
        ...cat,
        products: cat.products.filter(
          (p) =>
            !p.id.includes('semaglutide') &&
            !p.name.toLowerCase().includes('semaglutide'),
        ),
      })).filter((cat) => cat.products.length > 0),
    [],
  );

  const totalPeptides = categories.reduce((sum, c) => sum + c.products.length, 0);

  return (
    <section className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1E3054]/35 backdrop-blur-md overflow-hidden">
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-[rgba(255,255,255,0.04)] focus-visible:bg-[rgba(255,255,255,0.04)] focus-visible:outline-none"
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-[rgba(45,165,160,0.30)] bg-gradient-to-br from-[#1A2744] to-[#2DA5A0]">
          <Library className="h-[18px] w-[18px] text-white" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-white">Browse Full Peptide Catalog</h2>
          <p className="mt-0.5 text-[11px] text-[rgba(255,255,255,0.45)]">
            {totalPeptides} peptides · {categories.length} categories · educational reference
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-[rgba(255,255,255,0.45)] transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          strokeWidth={1.5}
        />
      </button>

      {/* Expandable body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-[rgba(255,255,255,0.06)] p-4">
              {/* Educational notice */}
              <p className="rounded-xl border border-[rgba(183,94,24,0.20)] bg-[rgba(183,94,24,0.08)] px-3 py-2 text-[11px] leading-relaxed text-[rgba(255,255,255,0.65)]">
                Educational reference only. FarmCeutica Wellness LLC does not sell
                peptides at retail. Use the share buttons on each card to send
                profiles to your licensed practitioner.
              </p>

              {/* Category sections */}
              {categories.map((cat) => {
                const Icon = ICON_MAP[cat.icon] ?? FlaskConical;
                return (
                  <div key={cat.id} className="space-y-2.5">
                    {/* Category header */}
                    <div
                      className="flex items-center gap-2.5 rounded-xl border p-2.5"
                      style={{
                        background: `linear-gradient(135deg, ${cat.color}1A, ${cat.color}05)`,
                        borderColor: `${cat.color}33`,
                      }}
                    >
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                        style={{
                          background: `${cat.color}26`,
                          border: `1px solid ${cat.color}40`,
                        }}
                      >
                        <Icon
                          className="h-4 w-4"
                          strokeWidth={1.5}
                          style={{ color: cat.color }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3
                          className="break-words text-xs font-semibold leading-tight sm:text-sm"
                          style={{ color: cat.color }}
                        >
                          {cat.label}
                        </h3>
                        <p className="mt-0.5 text-[10px] text-[rgba(255,255,255,0.40)]">
                          {cat.products.length} peptide{cat.products.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Card grid: 1 col mobile, 2 col sm+ (narrower than /shop/peptides) */}
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {cat.products.map((peptide) => (
                        <PeptideCatalogCard key={peptide.id} peptide={peptide} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
