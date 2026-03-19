"use client";

import { useState } from "react";
import { Dna, FlaskConical, Pill, Sparkles } from "lucide-react";

/* ───────── Data ───────── */

const panels = [
  { key: "GENEX-M", label: "GENEX-M", desc: "Methylation" },
  { key: "GENEX-N", label: "GENEX-N", desc: "Neuro" },
  { key: "GENEX-C", label: "GENEX-C", desc: "Cardio" },
  { key: "GENEX-D", label: "GENEX-D", desc: "Detox" },
  { key: "GENEX-I", label: "GENEX-I", desc: "Immune" },
  { key: "GX360", label: "GeneX360", desc: "Complete" },
] as const;

interface SNP {
  gene: string;
  variant: string;
  rsId: string;
  genotype: string;
  impact: string;
  risk: "HIGH" | "MOD" | "LOW";
}

const snps: SNP[] = [
  { gene: "MTHFR", variant: "C677T", rsId: "rs1801133", genotype: "CT (Heterozygous)", impact: "Reduced folate conversion (~35%)", risk: "MOD" },
  { gene: "MTHFR", variant: "A1298C", rsId: "rs1801131", genotype: "AC (Heterozygous)", impact: "Mild BH4 cycle impairment", risk: "LOW" },
  { gene: "MTR", variant: "A2756G", rsId: "rs1805087", genotype: "AG (Heterozygous)", impact: "Altered B12 utilization", risk: "MOD" },
  { gene: "MTRR", variant: "A66G", rsId: "rs1801394", genotype: "GG (Homozygous)", impact: "Impaired methionine synthase reductase", risk: "HIGH" },
  { gene: "BHMT", variant: "G742A", rsId: "rs3733890", genotype: "GA (Heterozygous)", impact: "Reduced betaine-homocysteine pathway", risk: "MOD" },
  { gene: "CBS", variant: "C699T", rsId: "rs234706", genotype: "CT (Heterozygous)", impact: "Upregulated transsulfuration", risk: "LOW" },
];

const riskStyle: Record<string, { bg: string; text: string }> = {
  HIGH: { bg: "bg-red-400/20", text: "text-red-400" },
  MOD: { bg: "bg-yellow-400/20", text: "text-yellow-400" },
  LOW: { bg: "bg-green-400/20", text: "text-green-400" },
};

interface CYP {
  enzyme: string;
  allele: string;
  status: string;
  pct: number;
  color: string;
  barColor: string;
}

const cyps: CYP[] = [
  { enzyme: "CYP2D6", allele: "*4/*41", status: "Intermediate", pct: 45, color: "text-yellow-400", barColor: "bg-yellow-400" },
  { enzyme: "CYP2C19", allele: "*1/*1", status: "Normal", pct: 75, color: "text-green-400", barColor: "bg-green-400" },
  { enzyme: "CYP2C9", allele: "*1/*2", status: "Intermediate", pct: 45, color: "text-yellow-400", barColor: "bg-yellow-400" },
  { enzyme: "CYP3A4", allele: "*1/*1", status: "Normal", pct: 75, color: "text-green-400", barColor: "bg-green-400" },
  { enzyme: "CYP1A2", allele: "*1F/*1F", status: "Ultra-rapid", pct: 95, color: "text-purple-400", barColor: "bg-purple-400" },
];

const heatmapGenes = ["MTHFR C677T", "MTHFR A1298C", "COMT Val158Met", "MTRR A66G", "CYP2D6 *4/*41", "CBS C699T"];
const heatmapSupps = ["MTHFR+", "COMT+", "RELAX+", "FOCUS+", "NAD+", "MAOA+"];
const heatmapScores = [
  [0.9, 0.3, 0.2, 0.1, 0.5, 0.2],
  [0.7, 0.2, 0.1, 0.1, 0.4, 0.1],
  [0.1, 0.9, 0.6, 0.7, 0.3, 0.8],
  [0.6, 0.2, 0.1, 0.2, 0.7, 0.1],
  [0.1, 0.4, 0.3, 0.5, 0.2, 0.3],
  [0.3, 0.1, 0.4, 0.1, 0.6, 0.1],
];

interface DoseRec {
  supplement: string;
  standard: string;
  adjusted: string;
  reason: string;
  confidence: number;
  direction: "increased" | "normal" | "reduced";
}

const doseRecs: DoseRec[] = [
  { supplement: "MTHFR+", standard: "5mg", adjusted: "7.5mg", reason: "MTHFR C677T heterozygous — reduced folate conversion", confidence: 92, direction: "increased" },
  { supplement: "NAD+", standard: "250mg", adjusted: "250mg", reason: "No relevant variants detected", confidence: 85, direction: "normal" },
  { supplement: "COMT+", standard: "10mg", adjusted: "15mg", reason: "COMT Val158Met — accelerated catecholamine clearance", confidence: 88, direction: "increased" },
  { supplement: "FOCUS+", standard: "200mg", adjusted: "150mg", reason: "CYP1A2 ultra-rapid — faster caffeine metabolism", confidence: 79, direction: "reduced" },
];

const directionStyle: Record<string, { bg: string; text: string; label: string }> = {
  increased: { bg: "bg-green-400/20", text: "text-green-400", label: "↑ Increased" },
  normal: { bg: "bg-white/10", text: "text-white/60", label: "— Standard" },
  reduced: { bg: "bg-red-400/20", text: "text-red-400", label: "↓ Reduced" },
};

/* ───────── Helpers ───────── */

function heatCellBg(score: number): string {
  if (score >= 0.8) return "bg-green-400/80";
  if (score >= 0.6) return "bg-green-400/60";
  if (score >= 0.4) return "bg-green-400/40";
  if (score >= 0.2) return "bg-green-400/20";
  return "bg-green-400/10";
}

/* ───────── Page ───────── */

export default function GenomicsPage() {
  const [activePanel, setActivePanel] = useState("GENEX-M");

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Dna className="w-6 h-6 text-purple-400" />
          <h1 className="text-2xl font-bold text-white">Genomic Profile</h1>
        </div>
        <p className="text-sm text-white/60">
          Jane Smith &bull; MRN: 1042 &bull; GeneX360 Complete
        </p>
      </div>

      {/* ── Panel Selector ── */}
      <div className="flex flex-wrap gap-2">
        {panels.map((p) => (
          <button
            key={p.key}
            onClick={() => setActivePanel(p.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              activePanel === p.key
                ? "bg-purple-400/20 text-purple-400 border border-purple-400/30"
                : "text-white/40 border border-gray-700/50 hover:text-white/60"
            }`}
          >
            {p.label}{" "}
            <span className="text-xs opacity-60">({p.desc})</span>
          </button>
        ))}
      </div>

      {/* ── SNP Variant Grid ── */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">SNP Variants</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {snps.map((s) => {
            const r = riskStyle[s.risk];
            return (
              <div
                key={s.rsId}
                className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">{s.gene}</h3>
                    <p className="text-sm text-purple-400">{s.variant}</p>
                    <p className="text-xs text-white/30 font-mono mt-0.5">
                      {s.rsId}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${r.bg} ${r.text}`}
                  >
                    {s.risk}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/40">Genotype</span>
                    <span className="text-white font-medium">{s.genotype}</span>
                  </div>
                  <div>
                    <span className="text-white/40 text-xs">
                      Functional Impact
                    </span>
                    <p className="text-white/70 text-xs mt-0.5">{s.impact}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Metabolizer Status ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <FlaskConical className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold text-white">
            CYP450 Metabolizer Status
          </h2>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl divide-y divide-gray-700/30">
          {cyps.map((c) => (
            <div
              key={c.enzyme}
              className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="sm:w-40 shrink-0">
                <p className="text-sm font-medium text-white">{c.enzyme}</p>
                <p className="text-xs text-white/40 font-mono">{c.allele}</p>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-semibold ${c.color}`}>
                    {c.status}
                  </span>
                  <span className="text-xs text-white/40">{c.pct}%</span>
                </div>
                <div className="h-2 w-full bg-gray-900/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${c.barColor} transition-all duration-500`}
                    style={{ width: `${c.pct}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Gene-Supplement Correlation Heatmap ── */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">
          Gene–Supplement Correlation
        </h2>
        <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5 overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr>
                <th className="text-left text-xs text-white/40 font-medium pb-3 pr-4">
                  Variant
                </th>
                {heatmapSupps.map((s) => (
                  <th
                    key={s}
                    className="text-center text-xs text-white/40 font-medium pb-3 px-2"
                  >
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapGenes.map((gene, gi) => (
                <tr key={gene}>
                  <td className="text-sm text-white/70 font-medium py-1.5 pr-4 whitespace-nowrap">
                    {gene}
                  </td>
                  {heatmapScores[gi].map((score, si) => (
                    <td key={si} className="px-1.5 py-1.5 text-center">
                      <div
                        className={`mx-auto w-12 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white/80 ${heatCellBg(score)}`}
                      >
                        {Math.round(score * 100)}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Dosing Recommendations ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Pill className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold text-white">
            Genomic Dosing Recommendations
          </h2>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-gray-800 text-xs font-medium text-white/40 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Supplement</th>
                  <th className="px-5 py-3 text-left">Standard Dose</th>
                  <th className="px-5 py-3 text-left">Adjusted Dose</th>
                  <th className="px-5 py-3 text-left">Reason</th>
                  <th className="px-5 py-3 text-left">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {doseRecs.map((d) => {
                  const dir = directionStyle[d.direction];
                  return (
                    <tr
                      key={d.supplement}
                      className="hover:bg-gray-700/20 transition-colors"
                    >
                      <td className="px-5 py-3 text-sm font-medium text-white">
                        {d.supplement}
                      </td>
                      <td className="px-5 py-3 text-sm text-white/60">
                        {d.standard}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${dir.bg} ${dir.text}`}
                        >
                          {d.adjusted}{" "}
                          <span className="text-[10px]">{dir.label}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-white/50 max-w-xs">
                        {d.reason}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-900/60 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-400 rounded-full"
                              style={{ width: `${d.confidence}%` }}
                            />
                          </div>
                          <span className="text-xs text-white/40">
                            {d.confidence}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Peptide / Cannabis IQ Badges ── */}
      <section>
        <div className="flex flex-wrap gap-4">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-400/20 rounded-xl px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-400/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Peptide IQ</p>
              <p className="text-xs text-white/40">
                BPC-157 &bull; Thymosin Alpha-1 &bull; KPV
              </p>
            </div>
            <span className="bg-purple-400/20 text-purple-400 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
              3 Matched
            </span>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/20 rounded-xl px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-400/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Cannabis IQ</p>
              <p className="text-xs text-white/40">
                CBD dominant &bull; Low THC tolerance &bull; CYP2C9 caution
              </p>
            </div>
            <span className="bg-yellow-400/20 text-yellow-400 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
              Caution
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
