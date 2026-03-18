"use client";

import {
  Sparkles,
  Dna,
  Shield,
  Brain,
  Flame,
  Activity,
  Download,
  Sun,
  Heart,
  Zap,
  FileText,
  ArrowRight,
  FlaskConical,
} from "lucide-react";
import Link from "next/link";
import PortalHeader from "@/components/wellness/PortalHeader";

/* ────────────────────────────────────────────
   TypeScript Interfaces
   ──────────────────────────────────────────── */

interface GeneticScore {
  label: string;
  value: number;
  unit: string;
  subtitle: string;
  progress: number; // 0–1
}

interface PathwayOverview {
  name: string;
  risk: "high" | "moderate" | "low";
  genes: string[];
  icon: React.ReactNode;
  filterParam: string;
}

interface AISummary {
  title: string;
  body: string;
}

/* ────────────────────────────────────────────
   Sample Data
   ──────────────────────────────────────────── */

const scores: GeneticScore[] = [
  {
    label: "Genetic Risk Score",
    value: 78,
    unit: "/100",
    subtitle: "Based on 25+ SNP analysis",
    progress: 0.78,
  },
  {
    label: "Personalization Score",
    value: 94,
    unit: "/100",
    subtitle: "GENEX360 Complete analyzed",
    progress: 0.94,
  },
  {
    label: "Protocol Match",
    value: 100,
    unit: "%",
    subtitle: "Genetically tailored protocols active",
    progress: 1.0,
  },
];

const pathways: PathwayOverview[] = [
  {
    name: "Methylation",
    risk: "high",
    genes: ["MTHFR", "MTR", "MTRR", "BHMT", "SHMT", "ACHY"],
    icon: <Dna className="h-5 w-5" />,
    filterParam: "methylation",
  },
  {
    name: "Neurotransmitter",
    risk: "high",
    genes: ["COMT", "MAOA", "VDR", "NOS", "DAO"],
    icon: <Brain className="h-5 w-5" />,
    filterParam: "neurotransmitter",
  },
  {
    name: "Detoxification",
    risk: "moderate",
    genes: ["CBS", "GST", "SOD", "SUOX", "NAT"],
    icon: <Shield className="h-5 w-5" />,
    filterParam: "detoxification",
  },
  {
    name: "Vitamin D",
    risk: "moderate",
    genes: ["VDR", "GC", "CYP2R1"],
    icon: <Sun className="h-5 w-5" />,
    filterParam: "vitamind",
  },
  {
    name: "Lipid / Neuroprotection",
    risk: "low",
    genes: ["APOE", "FTO", "FADS1"],
    icon: <Heart className="h-5 w-5" />,
    filterParam: "lipid",
  },
  {
    name: "Inflammation",
    risk: "moderate",
    genes: ["IL6", "TNF", "CRP"],
    icon: <Flame className="h-5 w-5" />,
    filterParam: "inflammation",
  },
];

const aiSummary: AISummary = {
  title: "AI Genomic Summary",
  body: "Based on your profile, your methylation and neurotransmitter pathways show significant genetic variance. Your MTHFR (C677T) heterozygous status combined with COMT (Val158Met) suggests a requirement for methylated B-vitamins and specific catecholamine support. We have adjusted your protocol to include L-Methylfolate and SAMe while monitoring homocysteine levels quarterly to optimize cellular function.",
};

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */

const riskColor = {
  high: {
    border: "border-l-red-400",
    badge: "bg-red-500/20 text-red-400",
    text: "text-red-400",
  },
  moderate: {
    border: "border-l-yellow-400",
    badge: "bg-yellow-500/20 text-yellow-400",
    text: "text-yellow-400",
  },
  low: {
    border: "border-l-green-400",
    badge: "bg-green-500/20 text-green-400",
    text: "text-green-400",
  },
} as const;

/* ────────────────────────────────────────────
   SVG Circular Gauge
   ──────────────────────────────────────────── */

function CircularGauge({ progress, label }: { progress: number; label: string }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="relative flex items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
        {/* Background track */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#374151"
          strokeWidth="8"
        />
        {/* Progress arc */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#4ade80"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-xl font-bold text-white">{label}</span>
    </div>
  );
}

/* ────────────────────────────────────────────
   Page Component
   ──────────────────────────────────────────── */

export default function GeneticsPage() {
  return (
    <div className="min-h-screen bg-[#111827] text-white font-sans antialiased">
      {/* ── Header ── */}
      <PortalHeader activeTab="genetics" />

      {/* ── Main Content ── */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {/* ── 1. Hero Banner ── */}
        <section className="bg-gray-800/50 border border-green-400/15 rounded-2xl backdrop-blur-sm p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm text-gray-300 leading-relaxed max-w-xl">
            Your comprehensive health blueprint integrating genetic analysis,
            biomarker tracking, and personalized protocols.
          </p>
          <button className="flex-shrink-0 bg-green-400 text-gray-900 px-5 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg shadow-green-400/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-900 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-gray-900" />
            </span>
            Sonar Monitor
          </button>
        </section>

        {/* ── 2. Score Cards ── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {scores.map((s) => (
            <div
              key={s.label}
              className="bg-gray-800/50 border border-green-400/15 rounded-xl backdrop-blur-sm p-5 flex flex-col items-center text-center gap-3"
            >
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                {s.label}
              </span>
              <CircularGauge
                progress={s.progress}
                label={`${s.value}${s.unit === "%" ? "%" : ""}`}
              />
              <p className="text-[11px] text-gray-500">{s.subtitle}</p>
            </div>
          ))}
        </section>

        {/* ── 3. Pathway Overview ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">Genetic Pathway Analysis</h2>
              <p className="text-xs text-gray-500">
                Risk assessment across 6 core biological pathways
              </p>
            </div>
            <Dna className="h-5 w-5 text-green-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pathways.map((pw) => {
              const colors = riskColor[pw.risk];
              return (
                <Link
                  key={pw.name}
                  href={`/wellness/variants?filter=${pw.filterParam}`}
                  className={`group bg-gray-800/50 border border-green-400/15 border-l-4 ${colors.border} rounded-xl backdrop-blur-sm p-4 flex flex-col gap-3 hover:bg-gray-800/80 transition-colors cursor-pointer`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className={colors.text}>{pw.icon}</span>
                      <h3 className="font-bold text-sm">{pw.name}</h3>
                    </div>
                    <span
                      className={`${colors.badge} text-[10px] px-2 py-0.5 rounded uppercase font-bold`}
                    >
                      {pw.risk}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {pw.genes.map((gene) => (
                      <span
                        key={gene}
                        className="bg-gray-900/60 border border-gray-700 text-[10px] text-gray-400 px-2 py-0.5 rounded"
                      >
                        {gene}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-600 group-hover:text-green-400 transition-colors">
                    <span>View variants</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── 4. AI Genomic Summary ── */}
        <section className="bg-gray-800/50 border border-green-400/15 rounded-2xl backdrop-blur-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-400" />
            <h3 className="font-bold text-green-400 text-lg">{aiSummary.title}</h3>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{aiSummary.body}</p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button className="flex items-center justify-center gap-2 px-5 py-2.5 border border-green-400 text-green-400 rounded-xl text-sm font-bold hover:bg-green-400/5 transition-colors">
              <FileText className="h-4 w-4" />
              View Full Genomic Report
            </button>
            <button className="flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-600 text-gray-300 rounded-xl text-sm font-bold hover:bg-white/5 transition-colors">
              <Download className="h-4 w-4" />
              Download PDF
            </button>
          </div>
        </section>

        {/* ── 5. Quick Links ── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/wellness/variants"
            className="bg-gray-800/50 border border-green-400/15 rounded-xl backdrop-blur-sm p-4 flex items-center gap-3 hover:bg-gray-800/80 transition-colors group"
          >
            <div className="p-2 bg-green-400/10 rounded-lg">
              <Activity className="h-5 w-5 text-green-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm">View Variants</h4>
              <p className="text-[10px] text-gray-500">127 actionable SNPs analyzed</p>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-600 group-hover:text-green-400 transition-colors" />
          </Link>

          <Link
            href="/wellness/biomarkers"
            className="bg-gray-800/50 border border-green-400/15 rounded-xl backdrop-blur-sm p-4 flex items-center gap-3 hover:bg-gray-800/80 transition-colors group"
          >
            <div className="p-2 bg-green-400/10 rounded-lg">
              <FlaskConical className="h-5 w-5 text-green-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm">View Biomarkers</h4>
              <p className="text-[10px] text-gray-500">Latest lab panel results</p>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-600 group-hover:text-green-400 transition-colors" />
          </Link>

          <Link
            href="/wellness/plans"
            className="bg-gray-800/50 border border-green-400/15 rounded-xl backdrop-blur-sm p-4 flex items-center gap-3 hover:bg-gray-800/80 transition-colors group"
          >
            <div className="p-2 bg-green-400/10 rounded-lg">
              <Zap className="h-5 w-5 text-green-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm">View Protocols</h4>
              <p className="text-[10px] text-gray-500">Genetically tailored plans</p>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-600 group-hover:text-green-400 transition-colors" />
          </Link>
        </section>
      </main>
    </div>
  );
}
