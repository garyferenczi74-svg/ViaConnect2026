"use client";

import {
  ArrowLeft,
  Activity,
  Dna,
  FlaskConical,
  HeartPulse,
  ClipboardList,
  BarChart3,
  Share2,
  Lightbulb,
  BookOpen,
  Search,
  ShieldCheck,
  Moon,
  Flame,
  Clock,
  Heart,
  Wind,
  Droplets,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface MetricCard {
  label: string;
  value: string;
  unit?: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}

interface SmallMetric {
  label: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
}

interface GeneBadge {
  gene: string;
  status: "normal" | "attention" | "optimal";
  detail: string;
}

interface TabItem {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}

// ─── Sample Data ────────────────────────────────────────────────────────────

const TABS: TabItem[] = [
  { label: "Dashboard", icon: <Activity size={16} />, active: true },
  { label: "Genetics", icon: <Dna size={16} /> },
  { label: "Variants", icon: <FlaskConical size={16} /> },
  { label: "Bio", icon: <HeartPulse size={16} /> },
  { label: "Plans", icon: <ClipboardList size={16} /> },
  { label: "Track", icon: <BarChart3 size={16} /> },
  { label: "Share", icon: <Share2 size={16} /> },
  { label: "Insights", icon: <Lightbulb size={16} /> },
  { label: "Learn", icon: <BookOpen size={16} /> },
  { label: "Research", icon: <Search size={16} /> },
];

const LARGE_METRICS: MetricCard[] = [
  {
    label: "Recovery",
    value: "85",
    unit: "%",
    icon: <HeartPulse size={24} className="text-green-400" />,
    trend: "+5% from yesterday",
    trendUp: true,
  },
  {
    label: "Strain",
    value: "14.2",
    icon: <Flame size={24} className="text-green-400" />,
    trend: "Moderate intensity",
  },
  {
    label: "Sleep",
    value: "7.5",
    unit: "hrs",
    icon: <Moon size={24} className="text-green-400" />,
    trend: "Above target",
    trendUp: true,
  },
];

const SMALL_METRICS: SmallMetric[] = [
  { label: "HRV", value: "68", unit: "ms", icon: <Activity size={18} className="text-green-400" /> },
  { label: "RHR", value: "58", unit: "bpm", icon: <Heart size={18} className="text-green-400" /> },
  { label: "SpO2", value: "97", unit: "%", icon: <Wind size={18} className="text-green-400" /> },
  { label: "Adherence", value: "89", unit: "%", icon: <CheckCircle2 size={18} className="text-green-400" /> },
];

const GENE_BADGES: GeneBadge[] = [
  {
    gene: "MTHFR",
    status: "attention",
    detail: "C677T heterozygous — Consider methylfolate over folic acid. Your methylation pathway shows reduced efficiency at ~65%.",
  },
  {
    gene: "HRV",
    status: "optimal",
    detail: "Your heart rate variability is trending above baseline. Parasympathetic tone is strong — ideal for recovery-focused training.",
  },
  {
    gene: "Sleep",
    status: "optimal",
    detail: "Deep sleep proportion is 22% — exceeding the 15-20% target range. Continue current magnesium glycinate protocol.",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function badgeColor(status: GeneBadge["status"]) {
  switch (status) {
    case "attention":
      return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    case "optimal":
      return "bg-green-500/15 text-green-400 border-green-500/30";
    default:
      return "bg-slate-500/15 text-slate-400 border-slate-500/30";
  }
}

function badgeIcon(status: GeneBadge["status"]) {
  return status === "attention" ? (
    <AlertTriangle size={12} />
  ) : (
    <TrendingUp size={12} />
  );
}

// ─── Progress Ring ──────────────────────────────────────────────────────────

function ProgressRing({ value, max = 100, size = 80 }: { value: number; max?: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / max) * c;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="transparent"
        stroke="rgba(74,222,128,0.12)"
        strokeWidth={6}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="transparent"
        stroke="url(#greenGrad)"
        strokeWidth={6}
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function WellnessPortalPage() {
  return (
    <div className="min-h-screen w-full" style={{ background: "#111827" }}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-green-400/20 bg-green-400/5 px-4 py-2 text-sm font-medium text-green-400 transition hover:bg-green-400/10"
            >
              <ArrowLeft size={16} />
              Return to Main Menu
            </a>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-green-400 shadow-lg shadow-green-400/25">
              <Sparkles size={18} className="text-gray-900" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-green-400/70">
                ViaConnect™
              </p>
              <h1 className="text-lg font-bold text-white leading-tight">
                Personal Wellness Portal
              </h1>
            </div>
          </div>
        </header>

        {/* ── Tab Navigation ─────────────────────────────────────── */}
        <nav className="mb-8 -mx-4 px-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab.label}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition whitespace-nowrap ${
                  tab.active
                    ? "bg-green-400 text-gray-900 shadow-lg shadow-green-400/25"
                    : "border border-white/10 text-slate-400 hover:border-green-400/30 hover:text-green-400"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* ── Research Consent Banner ────────────────────────────── */}
        <div className="mb-8 rounded-2xl border border-green-400/15 bg-white/[0.03] p-5 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-green-400/10">
              <ShieldCheck size={20} className="text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-white mb-1">
                Research Consent & Data Sharing
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your anonymized wellness data can contribute to advancing personalized
                medicine research. All data is encrypted, de-identified, and shared only
                with IRB-approved studies. You maintain full control and can opt out at
                any time.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button className="rounded-full bg-green-400 px-4 py-2 text-xs font-bold text-gray-900 transition hover:bg-green-300 shadow-lg shadow-green-400/20">
                Review Options
              </button>
              <button className="rounded-full border border-white/10 px-4 py-2 text-xs font-medium text-slate-400 transition hover:border-green-400/30 hover:text-green-400">
                Learn More
              </button>
            </div>
          </div>
        </div>

        {/* ── Today's Wellness Snapshot ──────────────────────────── */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-green-400/10">
              <Activity size={18} className="text-green-400" />
            </div>
            <h2 className="text-lg font-bold text-white">
              Today&apos;s Wellness Snapshot
            </h2>
            <span className="ml-auto text-xs font-medium text-slate-500">
              Last synced 12 min ago
            </span>
          </div>

          {/* Large Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {LARGE_METRICS.map((m) => (
              <div
                key={m.label}
                className="relative rounded-2xl border border-green-400/15 bg-white/[0.03] p-5 backdrop-blur-xl overflow-hidden"
              >
                {/* Subtle glow */}
                <div className="absolute -top-10 -right-10 size-32 rounded-full bg-green-400/5 blur-2xl" />

                <div className="relative flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      {m.label}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-green-400 leading-none">
                        {m.value}
                      </span>
                      {m.unit && (
                        <span className="text-lg font-semibold text-green-400/60">
                          {m.unit}
                        </span>
                      )}
                    </div>
                  </div>
                  {m.label === "Recovery" ? (
                    <ProgressRing value={85} />
                  ) : (
                    <div className="flex size-12 items-center justify-center rounded-xl bg-green-400/10">
                      {m.icon}
                    </div>
                  )}
                </div>

                {m.trend && (
                  <div className="flex items-center gap-1.5">
                    {m.trendUp && <TrendingUp size={12} className="text-green-400" />}
                    <span className="text-xs text-slate-400">{m.trend}</span>
                  </div>
                )}

                {/* Progress bar */}
                <div className="mt-3 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: m.label === "Recovery" ? "85%" : m.label === "Strain" ? "67%" : "94%",
                      background: "linear-gradient(to right, #4ade80, #22c55e)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Small Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {SMALL_METRICS.map((m) => (
              <div
                key={m.label}
                className="rounded-2xl border border-green-400/15 bg-white/[0.03] p-4 backdrop-blur-xl"
              >
                <div className="flex items-center gap-2 mb-2">
                  {m.icon}
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {m.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[28px] font-bold text-green-400 leading-none">
                    {m.value}
                  </span>
                  <span className="text-sm font-medium text-green-400/50">
                    {m.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── AI Health Insights ──────────────────────────────────── */}
        <section className="mb-8">
          <div className="rounded-2xl border border-green-400/15 bg-white/[0.03] backdrop-blur-xl overflow-hidden">
            {/* Green header */}
            <div className="px-5 py-4 border-b border-green-400/15" style={{ background: "rgba(74,222,128,0.06)" }}>
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-green-400 shadow-lg shadow-green-400/30">
                  <Sparkles size={16} className="text-gray-900" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-green-400">
                    AI Health Insights
                  </h3>
                  <p className="text-xs text-slate-500">
                    Personalized recommendations from your genomic + biometric data
                  </p>
                </div>
              </div>
            </div>

            {/* Gene badges + insights */}
            <div className="p-5 space-y-4">
              {GENE_BADGES.map((badge) => (
                <div
                  key={badge.gene}
                  className="flex flex-col sm:flex-row gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4"
                >
                  <div className="shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${badgeColor(badge.status)}`}
                    >
                      {badgeIcon(badge.status)}
                      {badge.gene}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {badge.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Footer spacer ─────────────────────────────────────── */}
        <div className="h-8" />
      </div>
    </div>
  );
}
