"use client";

// Prompt #53 — /shop/peptides
//
// Peptide Catalog (educational only). Renders all 29 FarmCeutica
// portfolio peptides organized by therapeutic category. Disclaimer
// banner is sticky to the top of the page; full disclaimer block sits
// above the grid; compact disclaimer rides every card. There are NO
// purchase buttons anywhere on this page or any page it links to.

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Heart,
  Flame,
  Zap,
  Brain,
  Clock,
  Shield,
  TrendingUp,
  FlaskConical,
  LayoutGrid,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  PEPTIDE_CATALOG,
  PEPTIDE_CATEGORIES,
  type PeptideCategory,
} from "@/data/peptideCatalog";
import { PeptideDisclaimer } from "@/components/shop/PeptideDisclaimer";
import { PeptideCard } from "@/components/shop/PeptideCard";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Heart,
  Flame,
  Zap,
  Brain,
  Clock,
  Shield,
  TrendingUp,
};

type CategoryFilter = PeptideCategory | "all";

export default function PeptidesCatalogPage() {
  const [filter, setFilter] = useState<CategoryFilter>("all");

  const filteredCategories = useMemo(() => {
    if (filter === "all") return PEPTIDE_CATEGORIES;
    return PEPTIDE_CATEGORIES.filter((c) => c.name === filter);
  }, [filter]);

  return (
    <div className="min-h-screen bg-[#1A2744] text-white">
      {/* Sticky disclaimer banner */}
      <PeptideDisclaimer variant="banner" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            Back to Shop
          </Link>
          <div className="flex items-center gap-2">
            <FlaskConical
              className="w-5 h-5 text-[#2DA5A0]"
              strokeWidth={1.5}
            />
            <h1 className="text-base sm:text-lg font-bold tracking-tight">
              Peptide Catalog
            </h1>
            <span className="text-[10px] text-white/45 font-mono ml-1">
              {PEPTIDE_CATALOG.length} compounds
            </span>
          </div>
        </div>

        {/* Full disclaimer */}
        <PeptideDisclaimer variant="full" />

        {/* Category filter pills */}
        <div className="mt-6 mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
            <FilterPill
              label="All"
              icon={LayoutGrid}
              color="#2DA5A0"
              active={filter === "all"}
              onClick={() => setFilter("all")}
              count={PEPTIDE_CATALOG.length}
            />
            {PEPTIDE_CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.icon] ?? FlaskConical;
              return (
                <FilterPill
                  key={cat.name}
                  label={cat.name}
                  icon={Icon}
                  color={cat.color}
                  active={filter === cat.name}
                  onClick={() => setFilter(cat.name)}
                  count={cat.peptideCount}
                />
              );
            })}
          </div>
        </div>

        {/* Category sections */}
        <div className="space-y-10">
          {filteredCategories.map((cat) => {
            const peptides = PEPTIDE_CATALOG.filter(
              (p) => p.category === cat.name,
            );
            const Icon = CATEGORY_ICONS[cat.icon] ?? FlaskConical;
            return (
              <section key={cat.name}>
                <div
                  className="rounded-2xl border p-5 mb-5"
                  style={{
                    background: `linear-gradient(135deg, ${cat.color}1F, ${cat.color}05)`,
                    borderColor: `${cat.color}33`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: `${cat.color}22`,
                        border: `1px solid ${cat.color}44`,
                      }}
                    >
                      <Icon
                        className="w-5 h-5"
                        strokeWidth={1.5}
                        style={{ color: cat.color }}
                      />
                    </div>
                    <div className="min-w-0">
                      <h2
                        className="text-base font-semibold"
                        style={{ color: cat.color }}
                      >
                        Category {cat.number}: {cat.name}
                      </h2>
                      <p className="text-xs text-white/55 mt-0.5">
                        {peptides.length}{" "}
                        {peptides.length === 1 ? "peptide" : "peptides"} ·{" "}
                        {cat.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {peptides.map((p) => (
                    <PeptideCard key={p.id} peptide={p} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Footer disclaimer reminder */}
        <div className="mt-12">
          <PeptideDisclaimer variant="full" />
        </div>
      </div>
    </div>
  );
}

interface FilterPillProps {
  label: string;
  icon: LucideIcon;
  color: string;
  active: boolean;
  onClick: () => void;
  count: number;
}

function FilterPill({
  label,
  icon: Icon,
  color,
  active,
  onClick,
  count,
}: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all duration-150 flex-shrink-0 min-h-[32px] ${
        active
          ? "text-white"
          : "text-white/55 bg-white/[0.04] border-white/[0.08] hover:text-white hover:bg-white/[0.08]"
      }`}
      style={
        active
          ? {
              background: `${color}1F`,
              borderColor: `${color}66`,
            }
          : undefined
      }
    >
      <Icon
        className="w-3 h-3 flex-shrink-0"
        strokeWidth={1.5}
        style={{ color: active ? color : undefined }}
      />
      {label}
      <span className="text-[10px] opacity-60 ml-0.5">({count})</span>
    </button>
  );
}
