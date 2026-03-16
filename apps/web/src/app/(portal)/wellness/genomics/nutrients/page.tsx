'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const radarData = [
  { nutrient: 'Vitamin B12', score: 85 },
  { nutrient: 'Folate', score: 45 },
  { nutrient: 'Vitamin D', score: 72 },
  { nutrient: 'Iron', score: 90 },
  { nutrient: 'Zinc', score: 55 },
  { nutrient: 'Magnesium', score: 38 },
];

const nutrientCards = [
  {
    name: 'Vitamin B12',
    score: 85,
    status: 'Adequate',
    statusColor: 'text-emerald-400',
    genes: ['FUT2', 'TCN2'],
    recommendation: 'Methylcobalamin 1000 mcg daily (maintenance)',
  },
  {
    name: 'Folate',
    score: 45,
    status: 'Attention Needed',
    statusColor: 'text-amber-400',
    genes: ['MTHFR C677T', 'DHFR'],
    recommendation: 'L-Methylfolate 1000 mcg daily — MTHFR heterozygosity reduces conversion',
  },
  {
    name: 'Vitamin D',
    score: 72,
    status: 'Borderline',
    statusColor: 'text-amber-400',
    genes: ['VDR Taq', 'GC (DBP)'],
    recommendation: 'Vitamin D3 2000–4000 IU daily with K2 (MK-7)',
  },
  {
    name: 'Iron',
    score: 90,
    status: 'Optimal',
    statusColor: 'text-emerald-400',
    genes: ['HFE', 'TF'],
    recommendation: 'No supplementation needed. Monitor ferritin annually.',
  },
  {
    name: 'Zinc',
    score: 55,
    status: 'Attention Needed',
    statusColor: 'text-amber-400',
    genes: ['SLC30A8', 'MT1A'],
    recommendation: 'Zinc picolinate 15–30 mg daily with copper 1 mg',
  },
  {
    name: 'Magnesium',
    score: 38,
    status: 'Low Risk',
    statusColor: 'text-red-400',
    genes: ['TRPM6', 'CNNM2'],
    recommendation: 'Magnesium glycinate 400 mg daily — genetic tendency toward depletion',
  },
];

export default function NutrientsPage() {
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
          Nutrient Risk Profile
        </motion.h1>
        <p className="text-slate-400 mb-8">
          Genetic predispositions affecting nutrient absorption, metabolism, and requirements.
        </p>

        {/* Radar Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-6 mb-8"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Nutrient Score Radar</h2>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis
                  dataKey="nutrient"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={false}
                />
                <Radar
                  name="Nutrient Score"
                  dataKey="score"
                  stroke="#8b5cf6"
                  fill="#06b6d4"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#e2e8f0',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Nutrient Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {nutrientCards.map((nutrient, i) => (
            <motion.div
              key={nutrient.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-white">{nutrient.name}</h3>
                <span className={`text-sm font-semibold ${nutrient.statusColor}`}>
                  {nutrient.status}
                </span>
              </div>

              {/* Score bar */}
              <div className="w-full h-2 rounded-full bg-slate-800 mb-3">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${nutrient.score}%`,
                    background:
                      nutrient.score >= 70
                        ? 'linear-gradient(90deg, #22c55e, #10b981)'
                        : nutrient.score >= 50
                        ? 'linear-gradient(90deg, #eab308, #f59e0b)'
                        : 'linear-gradient(90deg, #ef4444, #f97316)',
                  }}
                />
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {nutrient.genes.map((gene) => (
                  <span
                    key={gene}
                    className="rounded-full bg-violet-500/15 border border-violet-500/20 px-2 py-0.5 text-xs text-violet-300"
                  >
                    {gene}
                  </span>
                ))}
              </div>

              <p className="text-sm text-slate-400">{nutrient.recommendation}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
