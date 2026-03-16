'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const gabaGlutamateData = [
  { label: 'GABA', value: 55, fill: '#06b6d4' },
  { label: 'Glutamate', value: 45, fill: '#f59e0b' },
];

const geneData = [
  {
    gene: 'COMT',
    variant: 'Val158Met — Heterozygous (Val/Met)',
    status: 'yellow',
    description: 'Intermediate dopamine and norepinephrine clearance. Balanced between warrior and worrier phenotypes.',
  },
  {
    gene: 'GAD1',
    variant: 'Normal (wild-type)',
    status: 'green',
    description: 'Normal glutamic acid decarboxylase activity. Adequate GABA synthesis from glutamate.',
  },
  {
    gene: 'CLOCK',
    variant: 'T3111C — T/T genotype',
    status: 'yellow',
    description: 'Night owl tendency. Delayed circadian phase preference. Consider evening melatonin and morning light therapy.',
  },
];

const statusBg: Record<string, string> = {
  green: 'border-emerald-500/30 bg-emerald-500/10',
  yellow: 'border-amber-500/30 bg-amber-500/10',
};

const statusDot: Record<string, string> = {
  green: 'bg-emerald-400',
  yellow: 'bg-amber-400',
};

const sleepRecs = [
  { title: 'Optimal Sleep Window', detail: '12:00 AM – 8:00 AM (based on CLOCK T/T genotype)', icon: '🌙' },
  { title: 'Morning Light Exposure', detail: '10,000 lux for 20–30 min within 1 hour of waking', icon: '☀️' },
  { title: 'Evening Melatonin', detail: '0.5–1 mg sublingual, 90 min before target sleep', icon: '💊' },
  { title: 'Magnesium Glycinate', detail: '400 mg, 60 min before bed — supports GABA activity', icon: '🧪' },
  { title: 'Blue Light Restriction', detail: 'Amber lenses after 8 PM or f.lux/Night Shift', icon: '👓' },
  { title: 'Caffeine Cutoff', detail: 'No caffeine after 2 PM (CYP1A2 dependent)', icon: '☕' },
];

export default function CognitivePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/wellness/genomics"
          className="inline-flex items-center text-sm text-slate-400 hover:text-cyan-400 transition-colors mb-8"
        >
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Genomic Dashboard
        </Link>

        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent mb-2"
        >
          Cognitive & Neurological Panel
        </motion.h1>
        <p className="text-slate-400 mb-8">
          Neurotransmitter pathways, GABA/Glutamate balance, and chronotype analysis.
        </p>

        {/* GABA/Glutamate Balance */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-6 mb-8"
        >
          <h2 className="text-lg font-semibold text-white mb-4">GABA / Glutamate Balance</h2>
          <div className="h-16 flex rounded-full overflow-hidden border border-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '55%' }}
              transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
              className="bg-gradient-to-r from-cyan-600 to-cyan-400 flex items-center justify-center"
            >
              <span className="text-sm font-semibold text-white">GABA — 55%</span>
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '45%' }}
              transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
              className="bg-gradient-to-r from-amber-500 to-amber-400 flex items-center justify-center"
            >
              <span className="text-sm font-semibold text-white">Glutamate — 45%</span>
            </motion.div>
          </div>
          <p className="mt-3 text-sm text-slate-400">
            Your GAD1 gene is normal, indicating adequate conversion of glutamate to GABA.
            Balance is within the healthy range.
          </p>
        </motion.div>

        {/* Gene Cards */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          {geneData.map((item, i) => (
            <motion.div
              key={item.gene}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className={`rounded-2xl border p-5 ${statusBg[item.status]}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`h-2.5 w-2.5 rounded-full ${statusDot[item.status]}`} />
                <h3 className="text-base font-semibold text-white">{item.gene}</h3>
              </div>
              <p className="text-xs text-slate-400 mb-2">{item.variant}</p>
              <p className="text-sm text-slate-300 leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Neurotransmitter Pathway SVG */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-6 mb-8"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Neurotransmitter Pathways</h2>
          <svg viewBox="0 0 800 200" className="w-full h-auto">
            <defs>
              <marker id="ntArrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
              </marker>
            </defs>

            {/* Dopamine pathway */}
            <rect x="30" y="30" width="120" height="40" rx="20" fill="#8b5cf622" stroke="#8b5cf6" strokeWidth="1.5" />
            <text x="90" y="55" textAnchor="middle" fill="#c4b5fd" fontSize="13" fontWeight="600">Tyrosine</text>
            <line x1="150" y1="50" x2="200" y2="50" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#ntArrow)" />
            <text x="175" y="40" textAnchor="middle" fill="#94a3b8" fontSize="9">TH</text>

            <rect x="210" y="30" width="120" height="40" rx="20" fill="#8b5cf622" stroke="#8b5cf6" strokeWidth="1.5" />
            <text x="270" y="55" textAnchor="middle" fill="#c4b5fd" fontSize="13" fontWeight="600">Dopamine</text>
            <line x1="330" y1="50" x2="380" y2="50" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#ntArrow)" />
            <text x="355" y="40" textAnchor="middle" fill="#eab308" fontSize="9">COMT</text>

            <rect x="390" y="30" width="120" height="40" rx="20" fill="#47556922" stroke="#475569" strokeWidth="1.5" />
            <text x="450" y="55" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="600">Clearance</text>

            {/* Serotonin pathway */}
            <rect x="30" y="100" width="120" height="40" rx="20" fill="#06b6d422" stroke="#06b6d4" strokeWidth="1.5" />
            <text x="90" y="125" textAnchor="middle" fill="#67e8f9" fontSize="13" fontWeight="600">Tryptophan</text>
            <line x1="150" y1="120" x2="200" y2="120" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#ntArrow)" />
            <text x="175" y="110" textAnchor="middle" fill="#94a3b8" fontSize="9">TPH2</text>

            <rect x="210" y="100" width="120" height="40" rx="20" fill="#06b6d422" stroke="#06b6d4" strokeWidth="1.5" />
            <text x="270" y="125" textAnchor="middle" fill="#67e8f9" fontSize="13" fontWeight="600">Serotonin</text>
            <line x1="330" y1="120" x2="380" y2="120" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#ntArrow)" />
            <text x="355" y="110" textAnchor="middle" fill="#94a3b8" fontSize="9">MAO-A</text>

            <rect x="390" y="100" width="120" height="40" rx="20" fill="#06b6d422" stroke="#06b6d4" strokeWidth="1.5" />
            <text x="450" y="125" textAnchor="middle" fill="#67e8f9" fontSize="12" fontWeight="600">Melatonin</text>

            {/* GABA pathway */}
            <rect x="30" y="170" width="120" height="40" rx="20" fill="#22c55e22" stroke="#22c55e" strokeWidth="1.5" />
            <text x="90" y="195" textAnchor="middle" fill="#86efac" fontSize="13" fontWeight="600">Glutamate</text>
            <line x1="150" y1="190" x2="200" y2="190" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#ntArrow)" />
            <text x="175" y="180" textAnchor="middle" fill="#22c55e" fontSize="9">GAD1</text>

            <rect x="210" y="170" width="120" height="40" rx="20" fill="#22c55e22" stroke="#22c55e" strokeWidth="1.5" />
            <text x="270" y="195" textAnchor="middle" fill="#86efac" fontSize="13" fontWeight="600">GABA</text>
            <line x1="330" y1="190" x2="380" y2="190" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#ntArrow)" />
            <text x="355" y="180" textAnchor="middle" fill="#94a3b8" fontSize="9">GABA-T</text>

            <rect x="390" y="170" width="140" height="40" rx="20" fill="#47556922" stroke="#475569" strokeWidth="1.5" />
            <text x="460" y="195" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="600">Succinate</text>
          </svg>
        </motion.div>

        {/* Sleep Chronotype & Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-2xl border border-violet-500/20 bg-violet-500/5 backdrop-blur-md p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🦉</span>
            <div>
              <h2 className="text-lg font-semibold text-white">Chronotype: Night Owl</h2>
              <p className="text-xs text-slate-400">CLOCK gene T3111C — T/T genotype</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sleepRecs.map((rec, i) => (
              <div
                key={i}
                className="rounded-xl bg-white/5 border border-white/5 p-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>{rec.icon}</span>
                  <h3 className="text-sm font-semibold text-white">{rec.title}</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{rec.detail}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
