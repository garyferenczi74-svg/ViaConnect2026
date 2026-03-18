"use client";

import { useState } from "react";
import {
  Info,
  CheckSquare,
  FlaskConical,
  Dna,
  Brain,
  Shield,
  Truck,
  Check,
} from "lucide-react";
import PortalHeader from "@/components/wellness/PortalHeader";

/* ────────────────────────────────────────────
   TypeScript Interfaces
   ──────────────────────────────────────────── */

type PanelTab = "genex-m" | "nutrigen-dx" | "hormoneiq";

interface PathwayCard {
  name: string;
  icon: React.ReactNode;
  genes: string[];
  color: string;
}

interface FeatureCard {
  title: string;
  description: string;
}

/* ────────────────────────────────────────────
   Sample Data
   ──────────────────────────────────────────── */

const features: FeatureCard[] = [
  {
    title: "Total Systems Biology View",
    description:
      "Integrated analysis of interconnected genetic pathways rather than isolated SNP interpretation.",
  },
  {
    title: "Personalized Protocols",
    description:
      "Customized health optimization strategies based on your unique genetic blueprint.",
  },
  {
    title: "Early Risk Identification",
    description:
      "Spotting genetic predispositions before they manifest as clinical symptoms.",
  },
];

const pathways: PathwayCard[] = [
  {
    name: "Methylation",
    icon: <Dna className="h-4 w-4 text-green-400" />,
    genes: ["MTHFR", "MTR", "MTRR", "BHMT", "SHMT", "ACHY"],
    color: "border-l-green-400",
  },
  {
    name: "Neurotransmitter",
    icon: <Brain className="h-4 w-4 text-purple-400" />,
    genes: ["COMT", "MAOA", "VDR", "NOS", "DAO"],
    color: "border-l-purple-400",
  },
  {
    name: "Detoxification",
    icon: <Shield className="h-4 w-4 text-yellow-400" />,
    genes: ["CBS", "GST", "SOD", "SUOX", "NAT"],
    color: "border-l-yellow-400",
  },
  {
    name: "Nutrient Absorption",
    icon: <FlaskConical className="h-4 w-4 text-blue-400" />,
    genes: ["TCN2", "RFC1", "ACAT", "ADO"],
    color: "border-l-blue-400",
  },
];

const deliveryItems = [
  "Non-invasive saliva collection kit shipped to your door",
  "Secure, CLIA-certified laboratory processing",
  "20+ page comprehensive genetic report with clinical annotations",
  "Optional 30-minute consultation with a genetic counselor",
];

const PANEL_TABS: { label: string; value: PanelTab }[] = [
  { label: "GENEX-M\u2122", value: "genex-m" },
  { label: "NUTRIGEN-DX\u2122", value: "nutrigen-dx" },
  { label: "HormoneIQ\u2122", value: "hormoneiq" },
];

/* ────────────────────────────────────────────
   Page Component
   ──────────────────────────────────────────── */

export default function LearnPage() {
  const [activePanel, setActivePanel] = useState<PanelTab>("genex-m");

  return (
    <div className="min-h-screen bg-[#111827] text-white font-sans antialiased">
      {/* ── Header ── */}
      <PortalHeader activeTab="learn" />

      {/* ── Main Content ── */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* ── 1. Evidence Banner ── */}
        <section className="bg-gray-800/50 border border-green-400/15 border-l-4 border-l-green-400 rounded-xl backdrop-blur-sm p-5">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="text-green-400 font-bold text-lg leading-tight">
                Evidence-Based Precision Medicine
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-gray-300">
                <li className="flex gap-2">
                  <span className="text-green-400">&bull;</span>
                  Phenotype-first approach
                </li>
                <li className="flex gap-2">
                  <span className="text-green-400">&bull;</span>
                  Peer-reviewed clinical guidelines
                </li>
                <li className="flex gap-2">
                  <span className="text-green-400">&bull;</span>
                  Individualized care pathways
                </li>
                <li className="flex gap-2">
                  <span className="text-green-400">&bull;</span>
                  Clinically appropriate use standards
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── 2. About GENEX360 ── */}
        <section className="bg-gray-800/50 border border-green-400/15 rounded-xl backdrop-blur-sm p-6 space-y-4">
          <div>
            <h2 className="text-[#a78bfa] text-2xl font-bold">
              About GENEX360&trade;
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Premier genetic interpretation suite for clinical insights
            </p>
          </div>

          {/* Badges */}
          <div className="flex gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold border border-yellow-400 text-yellow-400 uppercase">
              Evidence: Level B
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold border border-yellow-400 text-yellow-400 uppercase">
              Clinical Context Required
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-400 leading-relaxed">
            GENEX360&trade; is our premier genetic interpretation suite designed
            to bridge the gap between complex genomic data and actionable
            clinical insights. We utilize high-fidelity sequencing combined with
            evidence-based analysis frameworks to identify unique metabolic
            requirements, nutrient-gene interactions, and therapeutic
            opportunities tailored to your individual genotype.
          </p>

          {/* Sub-card: What GENEX360 Delivers */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4">
            <h3 className="text-green-400 font-bold mb-3">
              What GENEX360&trade; Delivers:
            </h3>
            <ul className="text-sm space-y-2 text-gray-300">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                Comprehensive Genomic Landscape — full-spectrum SNP analysis
                across metabolic, neurological, and immune pathways
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                Epigenetic Influence Mapping — environmental and lifestyle
                factors that modulate gene expression
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                Actionable Therapeutic Windows — time-sensitive intervention
                points based on pathway status
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                Nutrient-Gene Interactions — personalized supplement and dietary
                recommendations grounded in pharmacogenomic evidence
              </li>
            </ul>
          </div>

          {/* Italic note */}
          <p className="text-xs text-gray-500 italic">
            All GENEX360&trade; reports are reviewed by board-certified genetic
            counselors and should be interpreted in the context of a complete
            clinical evaluation.
          </p>
        </section>

        {/* ── 3. Feature Cards ── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-gray-800/50 border border-green-400/15 rounded-xl backdrop-blur-sm p-4 flex items-start gap-3"
            >
              <CheckSquare className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-sm mb-1">{f.title}</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </section>

        {/* ── 4. Test Panel Tabs ── */}
        <section className="bg-gray-800/50 border border-green-400/15 rounded-xl backdrop-blur-sm p-6 space-y-6">
          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            {PANEL_TABS.map((tab) => {
              const isActive = activePanel === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActivePanel(tab.value)}
                  className={`pb-2 px-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                    isActive
                      ? "border-green-400 text-green-400"
                      : "border-transparent text-gray-500 hover:text-gray-400"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── 5. GENEX-M Content ── */}
          {activePanel === "genex-m" && (
            <div className="space-y-6">
              {/* a. ACMG/CDC Guidance Banner */}
              <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-blue-400 font-bold text-sm mb-2">
                      Clinical Practice Guidance
                    </h4>
                    <ul className="text-[11px] text-blue-200 space-y-1.5">
                      <li className="flex gap-2">
                        <span>&bull;</span>
                        Adheres to ACMG &amp; CDC guidelines for genetic testing
                        and reporting
                      </li>
                      <li className="flex gap-2">
                        <span>&bull;</span>
                        Results should be confirmed with clinical-grade
                        sequencing when used for medical decisions
                      </li>
                      <li className="flex gap-2">
                        <span>&bull;</span>
                        Genetic counseling recommended for high-impact variants
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* b. GENEX-M Title + Badge */}
              <div>
                <h3 className="text-[#a78bfa] text-xl font-bold">
                  GENEX-M&trade;
                </h3>
                <p className="text-sm text-gray-400 mb-2">
                  Genetic Methylation &amp; Detox Profile
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold border border-yellow-400 text-yellow-400 uppercase">
                    Evidence: Level B
                  </span>
                  <span className="text-[10px] text-gray-500">
                    20+ variants analyzed across 4 core pathways
                  </span>
                </div>
              </div>

              {/* Phenotype-first card */}
              <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4">
                <h4 className="text-green-400 font-bold text-sm mb-2">
                  Phenotype-First Approach
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  GENEX-M&trade; prioritizes phenotypic expression and clinical
                  symptoms to validate genetic findings. Raw genotype data is
                  contextualized against your biomarker results, symptom
                  presentation, and family history to ensure clinically
                  meaningful interpretation rather than isolated SNP analysis.
                </p>
              </div>

              {/* c. Pathway Cards 2x2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pathways.map((pw) => (
                  <div
                    key={pw.name}
                    className={`bg-gray-900/40 border border-gray-700 border-l-4 ${pw.color} rounded-xl p-4`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      {pw.icon}
                      <h4 className="font-bold text-sm">{pw.name}</h4>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {pw.genes.map((gene) => (
                        <span
                          key={gene}
                          className="flex items-center gap-1 bg-gray-800 border border-gray-700 text-[10px] text-gray-300 px-2 py-0.5 rounded"
                        >
                          <CheckSquare className="h-2.5 w-2.5 text-green-400" />
                          {gene}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* d. Test Kit & Delivery */}
              <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="h-5 w-5 text-green-400" />
                  <div>
                    <h4 className="font-bold text-sm">
                      Test Kit &amp; Delivery
                    </h4>
                    <p className="text-[10px] text-gray-500">
                      Standard shipping included
                    </p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {deliveryItems.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm text-gray-300"
                    >
                      <div className="w-5 h-5 rounded-full bg-green-400/20 flex items-center justify-center flex-shrink-0">
                        <Check className="h-3 w-3 text-green-400" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* NUTRIGEN-DX Placeholder */}
          {activePanel === "nutrigen-dx" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-[#a78bfa] text-xl font-bold">
                  NUTRIGEN-DX&trade;
                </h3>
                <p className="text-sm text-gray-400 mb-2">
                  Nutrigenomic &amp; Dietary Response Profile
                </p>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold border border-yellow-400 text-yellow-400 uppercase">
                  Evidence: Level B
                </span>
              </div>
              <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4">
                <p className="text-xs text-gray-400 leading-relaxed">
                  NUTRIGEN-DX&trade; analyzes 30+ gene variants related to
                  macronutrient metabolism, micronutrient absorption, food
                  sensitivities, and dietary response patterns. Covers FTO,
                  MC4R, FADS1/2, BCMO1, SLC23A1, HFE, TCN2, and more. Provides
                  personalized dietary frameworks including optimal
                  macronutrient ratios, food sensitivity alerts, and
                  nutrient-timing recommendations.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-900/40 border border-gray-700 border-l-4 border-l-green-400 rounded-xl p-4">
                  <h4 className="font-bold text-sm mb-2">
                    Macronutrient Response
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {["FTO", "MC4R", "PPARG", "ADRB2", "FABP2"].map((g) => (
                      <span
                        key={g}
                        className="flex items-center gap-1 bg-gray-800 border border-gray-700 text-[10px] text-gray-300 px-2 py-0.5 rounded"
                      >
                        <CheckSquare className="h-2.5 w-2.5 text-green-400" />
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-900/40 border border-gray-700 border-l-4 border-l-yellow-400 rounded-xl p-4">
                  <h4 className="font-bold text-sm mb-2">
                    Micronutrient Absorption
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {["BCMO1", "SLC23A1", "HFE", "TCN2", "GC"].map((g) => (
                      <span
                        key={g}
                        className="flex items-center gap-1 bg-gray-800 border border-gray-700 text-[10px] text-gray-300 px-2 py-0.5 rounded"
                      >
                        <CheckSquare className="h-2.5 w-2.5 text-green-400" />
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HormoneIQ Placeholder */}
          {activePanel === "hormoneiq" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-[#a78bfa] text-xl font-bold">
                  HormoneIQ&trade;
                </h3>
                <p className="text-sm text-gray-400 mb-2">
                  Endocrine &amp; Hormonal Genetics Profile
                </p>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold border border-yellow-400 text-yellow-400 uppercase">
                  Evidence: Level C
                </span>
              </div>
              <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4">
                <p className="text-xs text-gray-400 leading-relaxed">
                  HormoneIQ&trade; evaluates 25+ genetic variants influencing
                  thyroid function, cortisol metabolism, sex hormone balance,
                  and circadian regulation. Includes CYP19A1 (aromatase),
                  SRD5A2, SHBG, DIO1/2, HSD11B1, and CLOCK/PER gene analysis.
                  Provides insights into hormonal optimization, stress
                  resilience, and circadian alignment strategies.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-900/40 border border-gray-700 border-l-4 border-l-purple-400 rounded-xl p-4">
                  <h4 className="font-bold text-sm mb-2">
                    Sex Hormone Metabolism
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {["CYP19A1", "SRD5A2", "SHBG", "ESR1", "AR"].map((g) => (
                      <span
                        key={g}
                        className="flex items-center gap-1 bg-gray-800 border border-gray-700 text-[10px] text-gray-300 px-2 py-0.5 rounded"
                      >
                        <CheckSquare className="h-2.5 w-2.5 text-green-400" />
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-900/40 border border-gray-700 border-l-4 border-l-blue-400 rounded-xl p-4">
                  <h4 className="font-bold text-sm mb-2">
                    Circadian &amp; Thyroid
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {["CLOCK", "PER2", "DIO1", "DIO2", "HSD11B1"].map((g) => (
                      <span
                        key={g}
                        className="flex items-center gap-1 bg-gray-800 border border-gray-700 text-[10px] text-gray-300 px-2 py-0.5 rounded"
                      >
                        <CheckSquare className="h-2.5 w-2.5 text-green-400" />
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
