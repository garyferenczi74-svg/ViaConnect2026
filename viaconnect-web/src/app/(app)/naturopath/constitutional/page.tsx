"use client";

import { useState } from "react";
import Link from "next/link";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip as RTooltip,
  Legend,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageTransition, StaggerChild } from "@/lib/motion";

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const doshaData = [
  { axis: "Vata", score: 75 },
  { axis: "Pitta", score: 60 },
  { axis: "Kapha", score: 35 },
];

const prakritiTraits = [
  {
    category: "Physical",
    details: "Thin frame, dry skin, warm hands, sharp features",
    warning: false,
  },
  {
    category: "Temperament",
    details: "Creative, intense, quick-thinking, anxious under stress",
    warning: true,
  },
  {
    category: "Digestion",
    details: "Variable appetite, sensitive to spicy food, irregular patterns",
    warning: true,
  },
  {
    category: "Sleep",
    details: "Light sleeper, vivid dreams, difficulty winding down",
    warning: true,
  },
  {
    category: "Energy",
    details: "Bursts of energy followed by fatigue, afternoon slump",
    warning: false,
  },
];

const tcmSymptoms = [
  "Irritability and mood swings",
  "Headaches — temporal or vertex",
  "Menstrual irregularities",
  "Fatigue and dizziness on standing",
  "Dry eyes and blurred vision",
  "Insomnia with dream-disturbed sleep",
];

const geneticCorrelations = [
  {
    snp: "MTHFR C677T",
    pattern: "Vata tendency",
    explanation:
      "Impaired methylation increases nervous-system sensitivity and neurotransmitter variability — classic Vata imbalance markers.",
  },
  {
    snp: "COMT V158M",
    pattern: "Pitta aggravation",
    explanation:
      "Slow catecholamine clearance drives excess heat, irritability, and intensity associated with Pitta constitution.",
  },
  {
    snp: "CYP1A2 *1F/*1F",
    pattern: "Metabolizer phenotype",
    explanation:
      "Slow caffeine metabolism aligns with dietary recommendations to avoid stimulants and favour warm, grounding beverages.",
  },
  {
    snp: "VDR Taq1",
    pattern: "Kapha bone density",
    explanation:
      "Vitamin-D receptor variant correlates with lower bone density — relevant to Kapha structural-support patterns.",
  },
];

const therapeuticLevels = [
  {
    level: 1,
    title: "Establish Conditions for Health",
    description:
      "Diet, lifestyle, sleep hygiene, movement, stress management, and community connection form the foundation of healing.",
    active: true,
  },
  {
    level: 2,
    title: "Stimulate the Healing Power of Nature",
    description:
      "Vis Medicatrix Naturae — hydrotherapy, constitutional homeopathy, and nature-based therapies to stimulate the body's inherent self-healing mechanisms.",
    active: false,
  },
  {
    level: 3,
    title: "Support Weakened Systems",
    description:
      "Targeted nutritional supplementation (MTHFR+, COMT+, NAD+) to restore depleted pathways identified via genetic and constitutional analysis.",
    active: true,
  },
  {
    level: 4,
    title: "Correct Structural Integrity",
    description:
      "Bodywork, craniosacral therapy, and physical medicine to address postural imbalances and fascial restrictions.",
    active: false,
  },
  {
    level: 5,
    title: "Address Pathology with Natural Substances",
    description:
      "Botanical medicine, clinical nutrition, and bio-identical hormones to directly address disease processes using natural therapeutics.",
    active: true,
  },
  {
    level: 6,
    title: "Address Pathology with Pharmacologic Substances",
    description:
      "Conventional pharmaceutical intervention when naturopathic approaches are insufficient or in acute/emergency situations.",
    active: false,
  },
  {
    level: 7,
    title: "Suppress / Surgically Remove Pathology",
    description:
      "The most invasive tier — surgery and high-dose suppressive therapies reserved for life-threatening or refractory conditions.",
    active: false,
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ConstitutionalPage() {
  const [expandedLevel, setExpandedLevel] = useState<number | null>(null);

  return (
    <PageTransition className="min-h-screen bg-dark-bg px-6 py-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <StaggerChild className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Constitutional Typing
            </h1>
            <p className="mt-1 text-gray-400">
              Multi-system constitutional assessment with genetic correlation
            </p>
          </div>
          <Link
            href="/naturopath/dashboard"
            className="text-sm text-sage hover:text-sage/80"
          >
            &larr; Back to Dashboard
          </Link>
        </StaggerChild>

        {/* ============================================================ */}
        {/*  Radar Chart Section                                          */}
        {/* ============================================================ */}
        <StaggerChild>
        <Card hover={false} className="border border-dark-border p-6 mb-8">
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-semibold text-white mb-1">
              Constitutional Type Analysis &mdash; Elena Vasquez
            </h2>
            <span className="inline-flex items-center gap-2 rounded-full bg-sage/15 border border-sage/25 px-4 py-1.5 text-sm font-semibold text-sage mb-4">
              Primary: Vata-Pitta (VP)
            </span>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={doshaData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fill: "#9CA3AF", fontSize: 14, fontWeight: 600 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: "#6B7280", fontSize: 11 }}
                  axisLine={false}
                />
                <Radar
                  name="Dosha Score"
                  dataKey="score"
                  stroke="#76866F"
                  fill="#76866F"
                  fillOpacity={0.35}
                  strokeWidth={2}
                />
                <RTooltip
                  contentStyle={{
                    background: "#1F2937",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: 13,
                  }}
                />
                <Legend
                  wrapperStyle={{ color: "#9CA3AF", fontSize: 12 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        </StaggerChild>

        {/* ============================================================ */}
        {/*  Two-Column: Prakriti + TCM                                   */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* ---------- Ayurvedic Prakriti ---------- */}
          <Card hover={false} className="border border-sage/30 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-8 w-1 rounded-full bg-sage" />
              <h3 className="text-lg font-semibold text-white">
                Ayurvedic Prakriti Analysis
              </h3>
            </div>

            <p className="mb-4 text-sm font-medium text-sage">
              Dominant Dosha: Vata-Pitta
            </p>

            {/* Trait table */}
            <div className="mb-5 divide-y divide-white/[0.06]">
              {prakritiTraits.map((t) => (
                <div key={t.category} className="flex items-start gap-3 py-3">
                  <span className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {t.category}
                  </span>
                  <span className="text-sm text-gray-300">{t.details}</span>
                  {t.warning && (
                    <Badge variant="warning" className="ml-auto shrink-0">
                      Imbalance
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            {/* Recommendations */}
            <div className="space-y-4">
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-sage">
                  Recommended Diet
                </h4>
                <p className="text-sm text-gray-400">
                  Warm, grounding foods with healthy fats. Avoid raw, cold, and
                  dry foods. Maintain regular meal times with emphasis on cooked
                  grains, root vegetables, and warming spices (ginger, cumin,
                  cinnamon).
                </p>
              </div>
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-sage">
                  Lifestyle Recommendations
                </h4>
                <p className="text-sm text-gray-400">
                  Establish a regular daily routine (dinacharya). Favour calming
                  practices — yoga nidra, abhyanga self-massage with warm
                  sesame oil, and early bedtime. Avoid overstimulation, excess
                  screen time, and irregular schedules.
                </p>
              </div>
            </div>
          </Card>

          {/* ---------- TCM Pattern ---------- */}
          <Card hover={false} className="border border-[#A78BFA]/30 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-8 w-1 rounded-full bg-[#A78BFA]" />
              <h3 className="text-lg font-semibold text-white">
                TCM Pattern Identification
              </h3>
            </div>

            <p className="mb-4 text-sm font-medium text-[#A78BFA]">
              Liver Qi Stagnation with Blood Deficiency
            </p>

            {/* Pattern indicators */}
            <div className="mb-5 space-y-3">
              {[
                { label: "Pulse", value: "Wiry, thin" },
                {
                  label: "Tongue",
                  value: "Pale with slight purple hue, thin white coat",
                },
                { label: "Five Element", value: "Wood / Fire dominant" },
              ].map((ind) => (
                <div
                  key={ind.label}
                  className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2"
                >
                  <span className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {ind.label}
                  </span>
                  <span className="text-sm text-gray-300">{ind.value}</span>
                </div>
              ))}
            </div>

            {/* Associated symptoms */}
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#A78BFA]">
              Associated Symptoms
            </h4>
            <ul className="mb-5 space-y-1.5">
              {tcmSymptoms.map((s) => (
                <li key={s} className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="text-[#A78BFA]">&#10003;</span>
                  {s}
                </li>
              ))}
            </ul>

            {/* Treatment principles */}
            <div className="mb-4">
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#A78BFA]">
                Treatment Principles
              </h4>
              <p className="text-sm text-gray-400">
                Soothe Liver Qi, Nourish Blood, Harmonize Spleen
              </p>
            </div>

            {/* Acupoint recommendations */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#A78BFA]">
                Acupoint Recommendations
              </h4>
              <div className="flex flex-wrap gap-2">
                {["LV3 (Taichong)", "SP6 (Sanyinjiao)", "ST36 (Zusanli)", "PC6 (Neiguan)"].map(
                  (pt) => (
                    <span
                      key={pt}
                      className="rounded-full bg-[#A78BFA]/10 border border-[#A78BFA]/20 px-3 py-1 text-xs font-medium text-[#A78BFA]"
                    >
                      {pt}
                    </span>
                  )
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* ============================================================ */}
        {/*  Genetic-Constitutional Correlations                          */}
        {/* ============================================================ */}
        <Card hover={false} className="border border-dark-border p-6 mb-8">
          <h2 className="mb-5 text-lg font-semibold text-white">
            Genetic Profile &#8596; Constitutional Correlations
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    SNP Variant
                  </th>
                  <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Constitutional Pattern
                  </th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Explanation
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {geneticCorrelations.map((row) => (
                  <tr key={row.snp}>
                    <td className="py-3 pr-4 font-mono text-sm text-sage whitespace-nowrap">
                      {row.snp}
                    </td>
                    <td className="py-3 pr-4 text-sm text-white whitespace-nowrap">
                      {row.pattern}
                    </td>
                    <td className="py-3 text-sm text-gray-400">
                      {row.explanation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ============================================================ */}
        {/*  Therapeutic Order Framework                                   */}
        {/* ============================================================ */}
        <Card hover={false} className="border border-dark-border p-6">
          <h2 className="mb-6 text-lg font-semibold text-white">
            Therapeutic Order Framework
          </h2>

          <div className="relative pl-8">
            {/* Vertical line */}
            <div className="absolute left-[15px] top-0 bottom-0 w-px bg-white/[0.08]" />

            <div className="space-y-4">
              {therapeuticLevels.map((item) => {
                const isExpanded = expandedLevel === item.level;
                return (
                  <button
                    key={item.level}
                    type="button"
                    className={`relative flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-all duration-200 ${
                      item.active
                        ? "border-sage/30 bg-sage/[0.06] hover:bg-sage/[0.1]"
                        : "border-white/[0.06] bg-white/[0.02] opacity-60 hover:opacity-80 hover:bg-white/[0.04]"
                    }`}
                    onClick={() =>
                      setExpandedLevel(isExpanded ? null : item.level)
                    }
                  >
                    {/* Level number circle */}
                    <div
                      className={`absolute -left-8 top-4 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        item.active
                          ? "bg-sage text-white"
                          : "bg-white/[0.08] text-gray-500"
                      }`}
                    >
                      {item.level}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-sm font-semibold ${
                            item.active ? "text-sage" : "text-gray-400"
                          }`}
                        >
                          {item.title}
                        </h4>
                        {item.active && (
                          <Badge variant="active" className="text-[10px]">
                            Active Focus
                          </Badge>
                        )}
                      </div>
                      {isExpanded && (
                        <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Expand indicator */}
                    <span
                      className={`mt-0.5 text-gray-500 transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    >
                      &#9662;
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}
