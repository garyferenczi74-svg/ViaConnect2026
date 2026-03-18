"use client";

import { useState, useMemo } from "react";
import {
  Sparkles,
  Upload,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import Link from "next/link";

/* ────────────────────────────────────────────
   TypeScript Interfaces
   ──────────────────────────────────────────── */

type BioStatus = "optimal" | "elevated" | "low";
type BioCategory = "vitamins" | "hormones" | "metabolic" | "inflammatory";
type TrendDirection = "up" | "down" | "flat";

interface Biomarker {
  name: string;
  status: BioStatus;
  value: number;
  unit: string;
  referenceRange: string;
  optimalRange: string;
  trend: TrendDirection;
  lastDate: string;
  category: BioCategory;
}

/* ────────────────────────────────────────────
   Sample Data
   ──────────────────────────────────────────── */

const biomarkers: Biomarker[] = [
  {
    name: "Vitamin D",
    status: "optimal",
    value: 45,
    unit: "ng/mL",
    referenceRange: "30–100",
    optimalRange: "50–80",
    trend: "up",
    lastDate: "2025-11-15",
    category: "vitamins",
  },
  {
    name: "Cortisol AM",
    status: "optimal",
    value: 16.2,
    unit: "µg/dL",
    referenceRange: "6–23",
    optimalRange: "10–18",
    trend: "flat",
    lastDate: "2025-11-18",
    category: "hormones",
  },
  {
    name: "Testosterone",
    status: "optimal",
    value: 580,
    unit: "ng/dL",
    referenceRange: "300–1000",
    optimalRange: "550–850",
    trend: "up",
    lastDate: "2025-11-18",
    category: "hormones",
  },
  {
    name: "HbA1c",
    status: "optimal",
    value: 5.4,
    unit: "%",
    referenceRange: "<5.7",
    optimalRange: "<5.5",
    trend: "down",
    lastDate: "2025-11-10",
    category: "metabolic",
  },
  {
    name: "Vitamin B12",
    status: "optimal",
    value: 680,
    unit: "pg/mL",
    referenceRange: "200–900",
    optimalRange: "500–800",
    trend: "up",
    lastDate: "2025-11-15",
    category: "vitamins",
  },
  {
    name: "hs-CRP",
    status: "elevated",
    value: 2.8,
    unit: "mg/L",
    referenceRange: "<3.0",
    optimalRange: "<1.0",
    trend: "up",
    lastDate: "2025-11-10",
    category: "inflammatory",
  },
  {
    name: "Homocysteine",
    status: "elevated",
    value: 12.4,
    unit: "µmol/L",
    referenceRange: "5–15",
    optimalRange: "<8",
    trend: "flat",
    lastDate: "2025-11-10",
    category: "metabolic",
  },
  {
    name: "Ferritin",
    status: "low",
    value: 28,
    unit: "ng/mL",
    referenceRange: "20–250",
    optimalRange: "50–150",
    trend: "down",
    lastDate: "2025-11-15",
    category: "vitamins",
  },
  {
    name: "DHEA-S",
    status: "optimal",
    value: 310,
    unit: "µg/dL",
    referenceRange: "100–500",
    optimalRange: "250–400",
    trend: "flat",
    lastDate: "2025-11-18",
    category: "hormones",
  },
  {
    name: "IL-6",
    status: "elevated",
    value: 4.2,
    unit: "pg/mL",
    referenceRange: "<7.0",
    optimalRange: "<1.8",
    trend: "up",
    lastDate: "2025-11-10",
    category: "inflammatory",
  },
];

/* ────────────────────────────────────────────
   Filter Categories
   ──────────────────────────────────────────── */

const FILTER_ROW_1: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Vitamins", value: "vitamins" },
  { label: "Hormones", value: "hormones" },
];

const FILTER_ROW_2: { label: string; value: string }[] = [
  { label: "Metabolic", value: "metabolic" },
  { label: "Inflammatory", value: "inflammatory" },
];

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */

const statusStyles = {
  optimal: {
    border: "border-l-green-400",
    badge: "bg-green-500/20 text-green-400",
    value: "text-green-400",
  },
  elevated: {
    border: "border-l-yellow-400",
    badge: "bg-yellow-500/20 text-yellow-400",
    value: "text-yellow-400",
  },
  low: {
    border: "border-l-red-400",
    badge: "bg-red-500/20 text-red-400",
    value: "text-red-400",
  },
} as const;

function TrendIcon({ direction }: { direction: TrendDirection }) {
  switch (direction) {
    case "up":
      return <TrendingUp className="h-4 w-4 text-green-400" />;
    case "down":
      return <TrendingDown className="h-4 w-4 text-red-400" />;
    case "flat":
      return <Minus className="h-4 w-4 text-gray-500" />;
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const NAV_TABS = [
  { label: "Dashboard", href: "/wellness" },
  { label: "Genetics", href: "/wellness/genetics" },
  { label: "Variants", href: "/wellness/variants" },
  { label: "Bio", href: "/wellness/bio" },
  { label: "Plans", href: "/wellness/plans" },
  { label: "Track", href: "/wellness/track" },
  { label: "Share", href: "/wellness/share" },
  { label: "Insights", href: "/wellness/insights" },
  { label: "Learn", href: "/wellness/learn" },
  { label: "Research", href: "/wellness/research" },
];

/* ────────────────────────────────────────────
   Page Component
   ──────────────────────────────────────────── */

export default function BioPage() {
  const [activeFilter, setActiveFilter] = useState("all");

  const filtered = useMemo(() => {
    if (activeFilter === "all") return biomarkers;
    return biomarkers.filter((b) => b.category === activeFilter);
  }, [activeFilter]);

  function FilterPill({ label, value }: { label: string; value: string }) {
    const isActive = activeFilter === value;
    return (
      <button
        onClick={() => setActiveFilter(value)}
        className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
          isActive
            ? "bg-white text-gray-900"
            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-[#111827] text-white font-sans antialiased">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-[#111827]/90 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/wellness"
              className="px-3 py-1.5 rounded-full bg-gray-800 text-xs text-gray-300 border border-gray-700 hover:bg-gray-700 transition-colors"
            >
              &larr; Return to Main Menu
            </Link>
            <div className="w-8 h-8 rounded-full bg-green-400 flex items-center justify-center text-gray-900">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold leading-tight">
                Personal Wellness Portal
              </h1>
              <p className="text-[10px] text-gray-400">
                ViaConnect&trade; AI-Powered Health
              </p>
            </div>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <nav className="max-w-6xl mx-auto px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
          {NAV_TABS.map((tab) => {
            const isActive = tab.label === "Bio";
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className={`whitespace-nowrap px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-green-400 text-gray-900 font-bold"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* ── Main Content ── */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* ── 1. Title Row ── */}
        <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Biomarker Tracking</h2>
            <p className="text-sm text-gray-400 mt-1">
              Monitor lab results, track trends, and compare against
              genetically-optimized reference ranges.
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-green-400 text-green-400 rounded-full text-xs font-bold hover:bg-green-400/5 transition-colors flex-shrink-0">
            <Upload className="h-4 w-4" />
            Upload Lab Results
          </button>
        </section>

        {/* ── 2. Filter Tabs ── */}
        <section className="bg-gray-800/50 border border-green-400/15 rounded-xl backdrop-blur-sm p-3 space-y-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {FILTER_ROW_1.map((f) => (
              <FilterPill key={f.value} label={f.label} value={f.value} />
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {FILTER_ROW_2.map((f) => (
              <FilterPill key={f.value} label={f.label} value={f.value} />
            ))}
          </div>
        </section>

        {/* ── 3. Biomarker Cards ── */}
        <section className="space-y-3">
          {filtered.map((b) => {
            const styles = statusStyles[b.status];
            return (
              <div
                key={b.name}
                className={`bg-gray-800/50 border border-green-400/15 border-l-4 ${styles.border} rounded-xl backdrop-blur-sm p-5`}
              >
                {/* Mobile: stacked / Desktop: row */}
                <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-0">
                  {/* Col 1: Name + Value */}
                  <div className="lg:flex-[2] min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-sm">{b.name}</h3>
                      <span
                        className={`${styles.badge} text-[10px] px-2 py-0.5 rounded uppercase font-bold`}
                      >
                        {b.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 mb-1">
                      Current Value
                    </p>
                    <p className={`text-2xl font-bold ${styles.value}`}>
                      {b.value}
                      <span className="text-sm font-normal text-gray-500 ml-1">
                        {b.unit}
                      </span>
                    </p>
                  </div>

                  {/* Col 2: Reference Range */}
                  <div className="lg:flex-1">
                    <p className="text-[10px] text-gray-500 mb-1">
                      Reference Range
                    </p>
                    <p className="text-sm text-gray-300">
                      {b.referenceRange}{" "}
                      <span className="text-gray-600">{b.unit}</span>
                    </p>
                  </div>

                  {/* Col 3: Optimal Range */}
                  <div className="lg:flex-1">
                    <p className="text-[10px] text-gray-500 mb-1">
                      Optimal Range
                    </p>
                    <p className="text-sm text-green-400">
                      {b.optimalRange}{" "}
                      <span className="text-green-400/60">{b.unit}</span>
                    </p>
                  </div>

                  {/* Col 4: Trend + Date */}
                  <div className="lg:flex-1">
                    <p className="text-[10px] text-gray-500 mb-1">Trend</p>
                    <div className="flex items-center gap-2">
                      <TrendIcon direction={b.trend} />
                      <span className="text-xs text-gray-400">
                        {formatDate(b.lastDate)}
                      </span>
                    </div>
                  </div>

                  {/* Far right: Document icon */}
                  <div className="lg:flex-shrink-0 lg:ml-4 flex lg:items-center">
                    <button className="p-2 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-green-400/30 transition-colors">
                      <FileText className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* ── Results count ── */}
        <p className="text-[11px] text-gray-600 text-center">
          Showing {filtered.length} of {biomarkers.length} tracked biomarkers
        </p>
      </main>
    </div>
  );
}
