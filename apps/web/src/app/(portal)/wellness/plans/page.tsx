"use client";

import { useState } from "react";
import {
  Sparkles,
  User,
  Calendar,
  Info,
  FileText,
  FlaskConical,
} from "lucide-react";
import Link from "next/link";

/* ────────────────────────────────────────────
   TypeScript Interfaces
   ──────────────────────────────────────────── */

interface ProtocolItem {
  name: string;
  type: string;
  dosage: string;
  frequency: string;
  timing: string;
  geneticNote: string;
}

interface Protocol {
  id: string;
  name: string;
  status: "active" | "paused";
  category: string;
  itemCount: number;
  adherence: number;
  prescribedBy: string;
  startDate: string;
  description: string;
  geneticRationale: string;
  items: ProtocolItem[];
}

/* ────────────────────────────────────────────
   Sample Data
   ──────────────────────────────────────────── */

const protocols: Protocol[] = [
  {
    id: "methylation",
    name: "Methylation Support",
    status: "active",
    category: "supplement",
    itemCount: 4,
    adherence: 92,
    prescribedBy: "Dr. Sarah Chen",
    startDate: "2025-03-01",
    description:
      "Targeted methylation support protocol addressing MTHFR, MTR, MTRR, and BHMT variants identified in your GENEX360 analysis. Designed to optimize folate metabolism, reduce homocysteine levels, and support methyl donor availability.",
    geneticRationale:
      "Your MTHFR C677T homozygous (TT) status reduces enzyme activity by up to 70%, significantly impairing conversion of folic acid to L-methylfolate. Combined with your MTR A2756G variant, methionine synthase function is further compromised. This protocol bypasses the impaired enzymatic pathway by providing pre-methylated nutrients directly, ensuring adequate methyl group availability for DNA repair, neurotransmitter synthesis, and detoxification processes.",
    items: [
      {
        name: "L-Methylfolate (5-MTHF)",
        type: "supplement",
        dosage: "800 mcg",
        frequency: "Once daily",
        timing: "With breakfast",
        geneticNote:
          "Bypasses impaired MTHFR C677T enzyme. Your TT genotype reduces folate conversion by ~70%. Direct methylfolate supplementation ensures adequate folate status independent of RFC1 transport variants.",
      },
      {
        name: "Methylcobalamin (B12)",
        type: "supplement",
        dosage: "1000 mcg",
        frequency: "Once daily",
        timing: "With breakfast",
        geneticNote:
          "Supports MTR-dependent homocysteine remethylation. Your MTR A2756G variant may reduce B12-dependent methionine synthase activity. Methylated form preferred over cyanocobalamin.",
      },
      {
        name: "Riboflavin (B2)",
        type: "supplement",
        dosage: "100 mg",
        frequency: "Once daily",
        timing: "With lunch",
        geneticNote:
          "MTHFR is a flavin-dependent enzyme. Riboflavin (as FAD cofactor) has been shown to partially rescue reduced MTHFR activity in C677T homozygous individuals, lowering homocysteine by up to 40%.",
      },
      {
        name: "TMG (Trimethylglycine)",
        type: "supplement",
        dosage: "500 mg",
        frequency: "Twice daily",
        timing: "With meals",
        geneticNote:
          "Provides alternative methyl donation via BHMT pathway, reducing load on impaired MTHFR-dependent methylation cycle. Supports hepatic homocysteine clearance.",
      },
    ],
  },
  {
    id: "detox",
    name: "Detox Support",
    status: "active",
    category: "supplement",
    itemCount: 3,
    adherence: 88,
    prescribedBy: "Dr. Sarah Chen",
    startDate: "2025-03-15",
    description:
      "Phase I and Phase II detoxification support targeting CYP1A2, GSTM1, and GSTP1 variants. Enhances glutathione conjugation and supports liver detox pathways.",
    geneticRationale:
      "Your GSTM1 null genotype eliminates one key Phase II conjugation enzyme, while your GSTP1 Ile105Val variant reduces glutathione S-transferase efficiency. This creates a bottleneck in detoxification that can be partially compensated through targeted nutrient support and dietary modifications.",
    items: [
      {
        name: "NAC (N-Acetyl Cysteine)",
        type: "supplement",
        dosage: "600 mg",
        frequency: "Twice daily",
        timing: "Between meals",
        geneticNote:
          "Precursor to glutathione synthesis. Critical for compensating GSTM1 null status by increasing available glutathione pool for Phase II conjugation.",
      },
      {
        name: "Sulforaphane (Broccoli Extract)",
        type: "supplement",
        dosage: "30 mg",
        frequency: "Once daily",
        timing: "With breakfast",
        geneticNote:
          "Potent Nrf2 activator that upregulates Phase II enzyme expression, partially compensating for GSTM1 null deletion. Also induces glutathione synthesis.",
      },
      {
        name: "Calcium D-Glucarate",
        type: "supplement",
        dosage: "500 mg",
        frequency: "Once daily",
        timing: "With dinner",
        geneticNote:
          "Supports glucuronidation pathway — an alternative Phase II route important when glutathione conjugation is impaired by GST variants.",
      },
    ],
  },
  {
    id: "neuro",
    name: "Neurotransmitter Balance",
    status: "active",
    category: "supplement",
    itemCount: 3,
    adherence: 85,
    prescribedBy: "Dr. Sarah Chen",
    startDate: "2025-04-01",
    description:
      "Neurotransmitter support protocol targeting COMT Val158Met and MAOA variants. Aims to optimize dopamine clearance, support serotonin production, and improve stress resilience.",
    geneticRationale:
      "Your COMT rs4680 AA (Met/Met) status results in 3-4x slower dopamine breakdown, leading to elevated prefrontal dopamine during stress. Combined with your MAOA variant, this creates heightened catecholamine sensitivity requiring targeted nutritional and lifestyle interventions.",
    items: [
      {
        name: "Magnesium L-Threonate",
        type: "supplement",
        dosage: "2000 mg",
        frequency: "Once daily",
        timing: "Before bed",
        geneticNote:
          "Crosses blood-brain barrier effectively. Supports COMT enzyme function as a magnesium-dependent methyltransferase. Reduces catecholamine excess in slow COMT individuals.",
      },
      {
        name: "Phosphatidylserine",
        type: "supplement",
        dosage: "200 mg",
        frequency: "Once daily",
        timing: "With dinner",
        geneticNote:
          "Modulates cortisol response and supports HPA axis regulation. Particularly beneficial for slow COMT genotypes with heightened stress sensitivity.",
      },
      {
        name: "Rhodiola Rosea",
        type: "supplement",
        dosage: "300 mg",
        frequency: "Once daily",
        timing: "Morning, empty stomach",
        geneticNote:
          "Adaptogen that modulates monoamine oxidase activity and supports balanced catecholamine levels. Evidence-based support for COMT slow metabolizers.",
      },
    ],
  },
  {
    id: "vitamind",
    name: "Vitamin D Optimization",
    status: "active",
    category: "supplement",
    itemCount: 2,
    adherence: 94,
    prescribedBy: "Dr. Sarah Chen",
    startDate: "2025-03-01",
    description:
      "Vitamin D receptor optimization protocol addressing VDR Taq and VDR Bsm variants. Targets serum 25(OH)D levels of 60–80 ng/mL for optimal receptor activation.",
    geneticRationale:
      "Your VDR rs731236 AA genotype reduces vitamin D receptor efficiency, meaning standard supplementation doses may be insufficient. Higher baseline intake is required to achieve the same receptor activation as wild-type individuals, with K2 co-supplementation to ensure proper calcium routing.",
    items: [
      {
        name: "Vitamin D3 (Cholecalciferol)",
        type: "supplement",
        dosage: "5000 IU",
        frequency: "Once daily",
        timing: "With fatty meal",
        geneticNote:
          "Elevated dose required due to VDR Taq variant reducing receptor sensitivity. Target 25(OH)D of 60–80 ng/mL vs standard 40–60 ng/mL. Retest quarterly.",
      },
      {
        name: "Vitamin K2 (MK-7)",
        type: "supplement",
        dosage: "200 mcg",
        frequency: "Once daily",
        timing: "With D3",
        geneticNote:
          "Essential co-factor for high-dose D3 supplementation. Activates osteocalcin and matrix GLA protein, directing calcium to bone rather than soft tissue.",
      },
    ],
  },
];

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */

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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ────────────────────────────────────────────
   Page Component
   ──────────────────────────────────────────── */

export default function PlansPage() {
  const [selectedId, setSelectedId] = useState(protocols[0].id);
  const selected = protocols.find((p) => p.id === selectedId)!;

  const activeCount = protocols.filter((p) => p.status === "active").length;
  const avgAdherence = Math.round(
    protocols.reduce((sum, p) => sum + p.adherence, 0) / protocols.length
  );

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
            const isActive = tab.label === "Plans";
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
        {/* ── 1. Stat Cards ── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-800/50 border border-green-400/15 rounded-xl backdrop-blur-sm p-5 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">
              Active Protocols
            </p>
            <p className="text-4xl font-bold text-green-400">{activeCount}</p>
            <p className="text-xs text-gray-500 mt-1">Currently following</p>
          </div>
          <div className="bg-gray-800/50 border border-green-400/15 rounded-xl backdrop-blur-sm p-5 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">
              Average Adherence
            </p>
            <p className="text-4xl font-bold text-green-400">{avgAdherence}%</p>
            <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden mt-3">
              <div
                className="bg-green-400 h-full rounded-full transition-all"
                style={{ width: `${avgAdherence}%` }}
              />
            </div>
          </div>
          <div className="bg-gray-800/50 border border-green-400/15 rounded-xl backdrop-blur-sm p-5 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">
              Genetic Match
            </p>
            <p className="text-4xl font-bold text-green-400">100%</p>
            <p className="text-xs text-gray-500 mt-1">Genetically tailored</p>
          </div>
        </section>

        {/* ── 2. Two-Column Layout ── */}
        <section className="flex flex-col lg:flex-row gap-6">
          {/* LEFT — Protocol List (1/3) */}
          <div className="lg:w-1/3 space-y-3">
            <div className="mb-2">
              <h3 className="text-green-400 font-bold text-sm">
                Your Protocols
              </h3>
              <p className="text-[10px] text-gray-500">
                Click to view details
              </p>
            </div>

            {protocols.map((p) => {
              const isSelected = p.id === selectedId;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`w-full text-left bg-gray-800/50 border border-l-4 rounded-xl backdrop-blur-sm p-4 transition-all ${
                    isSelected
                      ? "border-green-400 border-l-green-400 bg-gray-800/80"
                      : "border-green-400/15 border-l-green-400/40 hover:bg-gray-800/60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-sm">{p.name}</h4>
                    <span className="bg-green-500/20 text-green-400 text-[10px] px-2 py-0.5 rounded uppercase font-bold">
                      {p.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-500 mb-2">
                    <span>{p.category} &middot; {p.itemCount} items</span>
                    <span className="text-green-400 font-bold">
                      {p.adherence}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-green-400 h-full rounded-full transition-all"
                      style={{ width: `${p.adherence}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* RIGHT — Protocol Detail (2/3) */}
          <div className="lg:w-2/3 space-y-4">
            {/* Header */}
            <div className="bg-gray-800/50 border border-green-400/15 rounded-xl backdrop-blur-sm p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <h2 className="text-xl font-bold">{selected.name}</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-green-500/20 text-green-400 text-[10px] px-2 py-0.5 rounded uppercase font-bold">
                    {selected.status}
                  </span>
                  <span className="flex items-center gap-1 bg-gray-900/50 border border-gray-700 text-[10px] text-gray-400 px-2 py-0.5 rounded">
                    <Calendar className="h-3 w-3" />
                    Started {formatDate(selected.startDate)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <User className="h-3.5 w-3.5" />
                <span>
                  Prescribed by{" "}
                  <span className="text-white font-medium">
                    {selected.prescribedBy}
                  </span>
                </span>
              </div>
            </div>

            {/* Protocol Description */}
            <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-400 leading-relaxed">
                  {selected.description}
                </p>
              </div>
            </div>

            {/* Genetic Rationale */}
            <div className="bg-gray-800/50 border border-green-400/15 rounded-xl backdrop-blur-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-green-400" />
                <h3 className="text-green-400 font-bold text-sm">
                  Genetic Rationale
                </h3>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                {selected.geneticRationale}
              </p>
            </div>

            {/* Protocol Items */}
            <div>
              <h3 className="text-green-400 font-bold text-sm mb-3">
                Protocol Items
              </h3>
              <div className="space-y-3">
                {selected.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-800/50 border border-green-400/15 rounded-xl backdrop-blur-sm p-5 space-y-4"
                  >
                    {/* Item header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm">{item.name}</h4>
                        <span className="bg-gray-900/60 border border-gray-700 text-[10px] text-gray-400 px-2 py-0.5 rounded">
                          {item.type}
                        </span>
                      </div>
                      <FileText className="h-4 w-4 text-gray-600" />
                    </div>

                    {/* Three columns */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-[10px] text-gray-500 mb-0.5">
                          Dosage
                        </p>
                        <p className="text-sm font-medium">{item.dosage}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 mb-0.5">
                          Frequency
                        </p>
                        <p className="text-sm font-medium">{item.frequency}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 mb-0.5">
                          Timing
                        </p>
                        <p className="text-sm font-medium">{item.timing}</p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      <button className="flex items-center gap-1.5 px-3 py-1.5 border border-green-400 text-green-400 rounded-lg text-[10px] font-bold hover:bg-green-400/5 transition-colors">
                        <FlaskConical className="h-3 w-3" />
                        Genetic Basis
                      </button>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-600 text-gray-400 rounded-lg text-[10px] font-bold hover:bg-white/5 transition-colors">
                        <FileText className="h-3 w-3" />
                        Scientific Evidence
                      </button>
                    </div>

                    {/* Genetic note */}
                    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3">
                      <p className="text-[10px] text-gray-400 leading-relaxed">
                        {item.geneticNote}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
