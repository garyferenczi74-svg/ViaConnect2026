"use client";

import { useState } from "react";
import {
  Brain,
  Loader2,
  Check,
  X,
  Pencil,
  Leaf,
  ChevronDown,
  ExternalLink,
  Dna,
  ClipboardList,
} from "lucide-react";

/* ───────── Data ───────── */

const caqScores = [
  { label: "Energy", score: 6, max: 10 },
  { label: "Sleep", score: 4, max: 10 },
  { label: "Digestion", score: 7, max: 10 },
  { label: "Mood", score: 5, max: 10 },
  { label: "Cognition", score: 7, max: 10 },
];

const genomicHighlights = [
  { gene: "MTHFR", risk: "MOD", color: "text-yellow-400", bg: "bg-yellow-400/20" },
  { gene: "CYP2D6", risk: "HIGH", color: "text-red-400", bg: "bg-red-400/20" },
  { gene: "COMT", risk: "MOD", color: "text-yellow-400", bg: "bg-yellow-400/20" },
];

const currentProtocols = ["Methylation Support", "Adrenal Recovery", "GI Restoration"];

const symptomTags = ["Poor sleep", "Brain fog", "Joint pain", "Low energy"];

interface Recommendation {
  rank: number;
  name: string;
  relevance: number;
  genes: string[];
  evidence: string;
  dosing: string;
  citations: string[];
}

const recommendations: Recommendation[] = [
  {
    rank: 1,
    name: "MTHFR+",
    relevance: 92,
    genes: ["MTHFR C677T", "MTR A2756G"],
    evidence: "Strong evidence for methylfolate supplementation in MTHFR heterozygous carriers. Supports homocysteine reduction and neurotransmitter synthesis.",
    dosing: "7.5mg methylfolate daily (adjusted from 5mg standard based on C677T status)",
    citations: ["PMID: 29368407", "PMID: 31520459"],
  },
  {
    rank: 2,
    name: "COMT+",
    relevance: 87,
    genes: ["COMT Val158Met"],
    evidence: "Magnesium threonate combined with SAMe support for intermediate COMT activity. Optimizes catecholamine clearance.",
    dosing: "15mg SAMe + 200mg Mag Threonate (increased from standard due to Val/Met genotype)",
    citations: ["PMID: 28506732"],
  },
  {
    rank: 3,
    name: "RELAX+",
    relevance: 81,
    genes: ["MAOA", "GAD1"],
    evidence: "GABA-precursor blend addressing sleep quality complaints. L-theanine + passionflower synergy for HPA axis modulation.",
    dosing: "400mg L-Theanine + 300mg Passionflower, 1hr before bed",
    citations: ["PMID: 31623400", "PMID: 30580081"],
  },
  {
    rank: 4,
    name: "NAD+",
    relevance: 78,
    genes: ["NAMPT"],
    evidence: "NMN precursor for cellular energy restoration. Addresses fatigue and cognitive complaints via mitochondrial support.",
    dosing: "250mg NMN sublingual, morning (standard dose — no CYP interaction)",
    citations: ["PMID: 33888596"],
  },
  {
    rank: 5,
    name: "FOCUS+",
    relevance: 74,
    genes: ["COMT", "DRD2"],
    evidence: "Nootropic stack targeting dopaminergic pathways. Citicoline + Lion's Mane for cognitive clarity and brain fog reduction.",
    dosing: "150mg Citicoline + 500mg Lion's Mane (reduced from 200mg standard — CYP1A2 ultra-rapid)",
    citations: ["PMID: 32083891", "PMID: 31413233"],
  },
];

const botanicals = [
  { name: "Ashwagandha (Withania somnifera)", rationale: "Vata-pacifying adaptogen — calms nervous system, supports adrenal recovery" },
  { name: "Brahmi (Bacopa monnieri)", rationale: "Pitta-balancing nootropic — enhances cognition without overstimulation" },
  { name: "Shatavari (Asparagus racemosus)", rationale: "Vata-Pitta harmonizer — nourishes tissues, supports gut lining repair" },
  { name: "Turmeric (Curcuma longa)", rationale: "Pitta-cooling anti-inflammatory — joint pain, systemic inflammation" },
];

/* ───────── Mini Gauge ───────── */

function RelevanceGauge({ pct }: { pct: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} fill="transparent" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle cx="26" cy="26" r={r} fill="transparent" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-green-400">
        {pct}%
      </span>
    </div>
  );
}

/* ───────── Page ───────── */

export default function AIEnginePage() {
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [results, setResults] = useState<Recommendation[] | null>(null);
  const [decisions, setDecisions] = useState<Record<number, string>>({});

  const handleGenerate = () => {
    setGenerating(true);
    setGenStep(0);
    setResults(null);
    setDecisions({});
    const t1 = setTimeout(() => setGenStep(1), 1000);
    const t2 = setTimeout(() => setGenStep(2), 2000);
    const t3 = setTimeout(() => {
      setGenerating(false);
      setResults(recommendations);
    }, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  };

  const stepLabels = ["Analyzing patient context...", "Cross-referencing genomic data...", "Building consensus recommendations..."];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Brain className="w-6 h-6 text-green-400" /> AI Clinical Decision Support
        </h1>
        <p className="text-sm text-white/60">Genomic-informed supplement recommendations</p>
      </div>

      <div className="flex gap-6">
        {/* ── Left Panel ── */}
        <div className="hidden lg:block w-80 shrink-0">
          <div className="sticky top-4 bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5 space-y-5">
            {/* Patient Selector */}
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold block mb-1.5">Patient</label>
              <div className="flex items-center gap-2 bg-gray-900/60 border border-gray-700/50 rounded-lg px-3 py-2">
                <div className="w-7 h-7 rounded-full bg-green-400/20 flex items-center justify-center text-green-400 text-[10px] font-bold">JS</div>
                <span className="text-sm text-white flex-1">Jane Smith</span>
                <ChevronDown className="w-4 h-4 text-white/30" />
              </div>
            </div>

            {/* CAQ Scores */}
            <div>
              <h4 className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-2">CAQ Scores</h4>
              <div className="space-y-2">
                {caqScores.map((c) => (
                  <div key={c.label}>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-white/60">{c.label}</span>
                      <span className="text-white/40">{c.score}/{c.max}</span>
                    </div>
                    <div className="h-1.5 bg-gray-900/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${c.score <= 4 ? "bg-red-400" : c.score <= 6 ? "bg-yellow-400" : "bg-green-400"}`}
                        style={{ width: `${(c.score / c.max) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Genomic Highlights */}
            <div>
              <h4 className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-2 flex items-center gap-1">
                <Dna className="w-3 h-3" /> Genomic Highlights
              </h4>
              <div className="space-y-1.5">
                {genomicHighlights.map((g) => (
                  <div key={g.gene} className="flex items-center justify-between bg-gray-900/40 rounded-lg px-3 py-1.5">
                    <span className="text-xs text-white/70">{g.gene}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${g.bg} ${g.color}`}>
                      {g.risk}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Protocols */}
            <div>
              <h4 className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-2 flex items-center gap-1">
                <ClipboardList className="w-3 h-3" /> Current Protocols
              </h4>
              <div className="space-y-1">
                {currentProtocols.map((p) => (
                  <p key={p} className="text-xs text-white/60 pl-3 border-l-2 border-green-400/30">
                    {p}
                  </p>
                ))}
              </div>
            </div>

            {/* Symptom Tags */}
            <div>
              <h4 className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-2">Symptoms</h4>
              <div className="flex flex-wrap gap-1.5">
                {symptomTags.map((s) => (
                  <span key={s} className="bg-gray-700/50 text-white/60 text-[10px] px-2.5 py-1 rounded-full border border-gray-700/50">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Panel ── */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Generate Button */}
          {!results && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full bg-green-400 hover:bg-green-500 text-gray-900 font-bold text-lg py-4 rounded-xl shadow-lg shadow-green-400/20 transition-all duration-200 disabled:opacity-70 flex items-center justify-center gap-3"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <div className="text-left">
                    <p className="text-sm font-bold">{stepLabels[genStep]}</p>
                    <div className="flex gap-1.5 mt-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            genStep >= i ? "bg-gray-900 scale-110" : "bg-gray-900/30"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Brain className="w-6 h-6" />
                  Generate AI Recommendations
                </>
              )}
            </button>
          )}

          {/* Recommendation Cards */}
          {results && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Recommendations</h2>
                <button
                  onClick={() => { setResults(null); setDecisions({}); }}
                  className="text-xs text-green-400 hover:underline"
                >
                  Regenerate
                </button>
              </div>

              {results.map((rec) => (
                <div
                  key={rec.rank}
                  className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5"
                >
                  <div className="flex items-start gap-4">
                    {/* Rank */}
                    <div className="w-8 h-8 rounded-full bg-green-400/20 flex items-center justify-center text-green-400 text-sm font-bold shrink-0">
                      {rec.rank}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-lg font-bold text-white">{rec.name}</h3>
                        {rec.genes.map((g) => (
                          <span key={g} className="bg-purple-400/20 text-purple-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {g}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-white/60 mb-3">{rec.evidence}</p>
                      <p className="text-xs text-green-400 font-medium mb-2">
                        {rec.dosing}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {rec.citations.map((c) => (
                          <a key={c} className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5" href="#">
                            {c} <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ))}
                      </div>
                    </div>

                    {/* Gauge + Actions */}
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <RelevanceGauge pct={rec.relevance} />
                      <div className="flex gap-1">
                        <button
                          onClick={() => setDecisions((p) => ({ ...p, [rec.rank]: "accept" }))}
                          className={`p-1.5 rounded-lg transition-colors ${
                            decisions[rec.rank] === "accept"
                              ? "bg-green-400 text-gray-900"
                              : "text-green-400 hover:bg-green-400/10"
                          }`}
                          title="Accept"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDecisions((p) => ({ ...p, [rec.rank]: "modify" }))}
                          className={`p-1.5 rounded-lg transition-colors ${
                            decisions[rec.rank] === "modify"
                              ? "bg-yellow-400 text-gray-900"
                              : "text-yellow-400 hover:bg-yellow-400/10"
                          }`}
                          title="Modify"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDecisions((p) => ({ ...p, [rec.rank]: "reject" }))}
                          className={`p-1.5 rounded-lg transition-colors ${
                            decisions[rec.rank] === "reject"
                              ? "bg-red-400 text-gray-900"
                              : "text-red-400 hover:bg-red-400/10"
                          }`}
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Constitutional Advisor */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-pink-400/20 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Leaf className="w-5 h-5 text-pink-400" />
                  <h3 className="text-lg font-semibold text-white">Constitutional Advisor</h3>
                  <span className="text-purple-400 text-sm font-medium ml-auto">Vata-Pitta Constitution</span>
                </div>
                <p className="text-xs text-white/50 mb-4">
                  Botanical recommendations aligned with constitutional assessment. Air/Fire dominant pattern suggests cooling, grounding, and nervine tonics.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {botanicals.map((b) => (
                    <div key={b.name} className="bg-gray-900/40 rounded-lg p-3">
                      <p className="text-sm font-medium text-white mb-1">{b.name}</p>
                      <p className="text-[10px] text-white/50">{b.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
