'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

/* -------------------------------------------------------------------------- */
/*  Animation helpers                                                         */
/* -------------------------------------------------------------------------- */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
};

/* -------------------------------------------------------------------------- */
/*  Data                                                                      */
/* -------------------------------------------------------------------------- */

const nutrientRisks = [
  { name: 'B Vitamins', risk: 'HIGH', pct: 85, color: 'bg-red-500' },
  { name: 'Vitamin D', risk: 'MODERATE', pct: 55, color: 'bg-amber-500' },
  { name: 'Iron', risk: 'LOW', pct: 20, color: 'bg-emerald-500' },
  { name: 'Zinc', risk: 'LOW', pct: 15, color: 'bg-emerald-500' },
  { name: 'Magnesium', risk: 'MODERATE', pct: 50, color: 'bg-amber-500' },
  { name: 'Omega-3', risk: 'LOW', pct: 25, color: 'bg-emerald-500' },
];

const cyp450Data = [
  {
    enzyme: 'CYP2D6',
    status: 'Intermediate Metabolizer',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    affects: 'Codeine, Tramadol, Tamoxifen, SSRIs',
    dosage: 'May require dose adjustment — monitor response closely',
  },
  {
    enzyme: 'CYP2C19',
    status: 'Normal Metabolizer',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    affects: 'Omeprazole, Clopidogrel, Escitalopram',
    dosage: 'Standard dosing expected to be effective',
  },
  {
    enzyme: 'CYP3A4',
    status: 'Normal Metabolizer',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    affects: 'Statins, Calcium Channel Blockers, Immunosuppressants',
    dosage: 'Standard dosing appropriate',
  },
  {
    enzyme: 'CYP2C9',
    status: 'Poor Metabolizer',
    badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30',
    affects: 'Warfarin, NSAIDs, Losartan, Phenytoin',
    dosage: 'Significantly reduced clearance — lower starting dose recommended',
  },
  {
    enzyme: 'CYP1A2',
    status: 'Ultra-Rapid Metabolizer',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    affects: 'Caffeine, Theophylline, Clozapine, Melatonin',
    dosage: 'Faster clearance — may require higher or more frequent dosing',
  },
];

const bioAgeClocks = [
  { name: 'Horvath', value: 33.8 },
  { name: 'Hannum', value: 34.1 },
  { name: 'PhenoAge', value: 34.9 },
  { name: 'GrimAge', value: 33.4 },
];

/* -------------------------------------------------------------------------- */
/*  Methylation Pathway SVG                                                   */
/* -------------------------------------------------------------------------- */

interface PathwayNode {
  id: string;
  label: string;
  x: number;
  y: number;
  status: 'red' | 'amber' | 'green';
  detail: string;
}

const pathwayNodes: PathwayNode[] = [
  { id: 'MTHFR', label: 'MTHFR', x: 100, y: 80, status: 'red', detail: 'C677T Heterozygous · 35% Reduced Activity' },
  { id: 'COMT', label: 'COMT', x: 320, y: 80, status: 'amber', detail: 'Val158Met · Slow COMT' },
  { id: 'CBS', label: 'CBS', x: 540, y: 80, status: 'green', detail: 'Normal' },
  { id: 'MTR', label: 'MTR', x: 100, y: 200, status: 'green', detail: 'Normal' },
  { id: 'MTRR', label: 'MTRR', x: 320, y: 200, status: 'green', detail: 'Normal' },
  { id: 'BHMT', label: 'BHMT', x: 540, y: 200, status: 'green', detail: 'Normal' },
  { id: 'SHMT', label: 'SHMT', x: 320, y: 300, status: 'green', detail: 'Normal' },
];

const pathwayEdges = [
  ['MTHFR', 'COMT'],
  ['COMT', 'CBS'],
  ['MTHFR', 'MTR'],
  ['MTR', 'MTRR'],
  ['MTRR', 'BHMT'],
  ['COMT', 'MTRR'],
  ['CBS', 'BHMT'],
  ['MTRR', 'SHMT'],
  ['MTR', 'SHMT'],
];

const nodeColors = {
  red: { fill: 'rgba(239,68,68,0.15)', stroke: '#ef4444', text: 'text-red-400' },
  amber: { fill: 'rgba(245,158,11,0.15)', stroke: '#f59e0b', text: 'text-amber-400' },
  green: { fill: 'rgba(34,197,94,0.15)', stroke: '#22c55e', text: 'text-emerald-400' },
};

function getNodePos(id: string) {
  const node = pathwayNodes.find((n) => n.id === id);
  return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function GenomicsDashboardPage() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {/* ------------------------------------------------------------------ */}
      {/*  Header                                                            */}
      {/* ------------------------------------------------------------------ */}
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[36px] font-[Syne] font-bold text-white leading-tight">
              Your Genetic Profile
            </h1>
            <p className="text-slate-400 mt-1">
              GENEX360™ Complete Results · Analyzed March 2026
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm font-semibold font-mono">
              94/100 — Highly Personalized
            </span>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Download PDF Report
            </button>
          </div>
        </div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/*  Main Grid                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1 — Methylation Pathway (spans 2 cols) */}
        <motion.div
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="lg:col-span-2 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-violet-400">genetics</span>
            <h2 className="text-lg font-[Syne] font-bold text-white">Methylation Pathway</h2>
          </div>

          {/* SVG Pathway */}
          <div className="w-full overflow-x-auto">
            <svg viewBox="0 0 640 360" className="w-full min-w-[500px]" xmlns="http://www.w3.org/2000/svg">
              {/* Background grid lines for circuit-board feel */}
              <defs>
                <pattern id="circuitGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="640" height="360" fill="url(#circuitGrid)" />

              {/* Edges */}
              {pathwayEdges.map(([from, to], idx) => {
                const a = getNodePos(from);
                const b = getNodePos(to);
                return (
                  <line
                    key={idx}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                  />
                );
              })}

              {/* Nodes */}
              {pathwayNodes.map((node) => {
                const colors = nodeColors[node.status];
                const isHovered = hoveredNode === node.id;
                return (
                  <g
                    key={node.id}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    className="cursor-pointer"
                  >
                    {/* Glow ring on hover */}
                    {isHovered && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="38"
                        fill="none"
                        stroke={colors.stroke}
                        strokeWidth="1"
                        opacity="0.3"
                      />
                    )}
                    {/* Node circle */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="30"
                      fill={colors.fill}
                      stroke={colors.stroke}
                      strokeWidth="2"
                    />
                    {/* Node label */}
                    <text
                      x={node.x}
                      y={node.y + 1}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="white"
                      fontSize="12"
                      fontWeight="600"
                      fontFamily="monospace"
                    >
                      {node.label}
                    </text>
                    {/* Detail text below node */}
                    <text
                      x={node.x}
                      y={node.y + 48}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={colors.stroke}
                      fontSize="9"
                      fontFamily="sans-serif"
                      opacity="0.9"
                    >
                      {node.detail}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="mt-4 p-4 rounded-lg bg-white/[0.03] border border-white/5">
            <p className="text-sm text-slate-300 leading-relaxed">
              <span className="font-semibold text-white">Methylation Status: </span>
              Your MTHFR C677T heterozygous variant reduces methylation efficiency by approximately 35%.
              Combined with slow COMT activity, your body may accumulate catechol compounds.
              We recommend methylated B-vitamins (L-methylfolate, methylcobalamin) and magnesium glycinate
              to support optimal methylation cycling.
            </p>
          </div>
        </motion.div>

        {/* Card 2 — Nutrient Risk Profile (1 col) */}
        <motion.div
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <span className="material-symbols-outlined text-cyan-400">monitoring</span>
            <h2 className="text-lg font-[Syne] font-bold text-white">Nutrient Risk Profile</h2>
          </div>

          <div className="flex flex-col gap-4">
            {nutrientRisks.map((item) => (
              <div key={item.name} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{item.name}</span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                      item.risk === 'HIGH'
                        ? 'bg-red-500/15 text-red-400 border-red-500/30'
                        : item.risk === 'MODERATE'
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {item.risk}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${item.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500 mt-5 pt-4 border-t border-white/5">
            Based on 25+ genetic variants analyzed
          </p>
        </motion.div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/*  Card 3 — CYP450 Drug Metabolism (full width)                      */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        custom={3}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-6"
      >
        <div className="flex items-center gap-2 mb-5">
          <span className="material-symbols-outlined text-violet-400">medication</span>
          <h2 className="text-lg font-[Syne] font-bold text-white">Drug Metabolism Profile</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4">Enzyme</th>
                <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4">Status</th>
                <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4">Affected Medications</th>
                <th className="text-left text-xs font-medium text-slate-500 pb-3">Dosage Note</th>
              </tr>
            </thead>
            <tbody>
              {cyp450Data.map((row) => (
                <tr key={row.enzyme} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 pr-4">
                    <span className="font-mono text-sm font-semibold text-white">{row.enzyme}</span>
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${row.badgeColor}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4 text-sm text-slate-400">{row.affects}</td>
                  <td className="py-3.5 text-sm text-slate-300">{row.dosage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/*  Card 4 — Biological Age                                           */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        custom={4}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-6"
      >
        <div className="flex items-center gap-2 mb-5">
          <span className="material-symbols-outlined text-cyan-400">hourglass_top</span>
          <h2 className="text-lg font-[Syne] font-bold text-white">Biological Age</h2>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Big number */}
          <div className="text-center md:text-left">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-mono font-bold text-white">34.2</span>
              <span className="text-lg text-slate-500">years</span>
            </div>
            <p className="text-sm text-slate-400 mt-2">
              Chronological Age: <span className="text-white font-semibold">38</span> ·{' '}
              <span className="text-emerald-400 font-semibold">You&apos;re 3.8 years younger</span>
            </p>
          </div>

          {/* Epigenetic clocks */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
            {bioAgeClocks.map((clock) => (
              <div
                key={clock.name}
                className="rounded-lg bg-white/[0.03] border border-white/5 p-4 text-center"
              >
                <p className="text-xs text-slate-500 mb-1">{clock.name}</p>
                <p className="text-2xl font-mono font-bold text-white">{clock.value}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">years</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
