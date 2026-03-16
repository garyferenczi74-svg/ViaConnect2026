'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';

const monthlyData = [
  { month: 'Jul', cortisol: 18, dhea: 320, estrogenRatio: 2.1, hrv: 45 },
  { month: 'Aug', cortisol: 22, dhea: 300, estrogenRatio: 1.9, hrv: 42 },
  { month: 'Sep', cortisol: 20, dhea: 310, estrogenRatio: 2.3, hrv: 48 },
  { month: 'Oct', cortisol: 25, dhea: 280, estrogenRatio: 2.0, hrv: 38 },
  { month: 'Nov', cortisol: 19, dhea: 330, estrogenRatio: 2.4, hrv: 50 },
  { month: 'Dec', cortisol: 16, dhea: 345, estrogenRatio: 2.5, hrv: 52 },
  { month: 'Jan', cortisol: 21, dhea: 315, estrogenRatio: 2.2, hrv: 46 },
  { month: 'Feb', cortisol: 17, dhea: 340, estrogenRatio: 2.6, hrv: 54 },
  { month: 'Mar', cortisol: 15, dhea: 355, estrogenRatio: 2.7, hrv: 56 },
];

const geneInsights = [
  {
    gene: 'CYP1A1',
    variant: 'Normal (wild-type)',
    status: 'green',
    insight:
      'Normal Phase I estrogen hydroxylation. 2-OH estrogen pathway predominant — favorable protective ratio.',
  },
  {
    gene: 'CYP1B1',
    variant: 'Leu432Val — Heterozygous',
    status: 'yellow',
    insight:
      'Mildly increased 4-OH estrogen production. Consider DIM and cruciferous vegetable intake to support 2-OH pathway.',
  },
  {
    gene: 'COMT',
    variant: 'Val158Met — Heterozygous',
    status: 'yellow',
    insight:
      'Intermediate methylation of catechol estrogens. Ensure adequate magnesium and methylation cofactors.',
  },
];

const statusColors: Record<string, string> = {
  green: 'border-emerald-500/30 bg-emerald-500/10',
  yellow: 'border-amber-500/30 bg-amber-500/10',
  red: 'border-red-500/30 bg-red-500/10',
};

const statusDot: Record<string, string> = {
  green: 'bg-emerald-400',
  yellow: 'bg-amber-400',
  red: 'bg-red-400',
};

export default function HormonesPage() {
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
          Hormonal Balance Panel
        </motion.h1>
        <p className="text-slate-400 mb-8">
          Hormone trends with wearable HRV correlation and genetic associations.
        </p>

        {/* Timeline Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-6 mb-8"
        >
          <h2 className="text-lg font-semibold text-white mb-1">Hormone Trends & HRV Overlay</h2>
          <p className="text-xs text-slate-500 mb-4">Monthly data — last 9 months</p>
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData}>
                <defs>
                  <linearGradient id="hrvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#e2e8f0',
                  }}
                />
                <Legend
                  wrapperStyle={{ color: '#94a3b8', fontSize: 12 }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="cortisol"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Cortisol (mcg/dL)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="dhea"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="DHEA (mcg/dL)"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="estrogenRatio"
                  stroke="#f472b6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="2:16 Estrogen Ratio"
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="hrv"
                  fill="url(#hrvGrad)"
                  stroke="#06b6d4"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  name="HRV (ms)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Key Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4">Gene Associations & Insights</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {geneInsights.map((item, i) => (
              <motion.div
                key={item.gene}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className={`rounded-2xl border p-5 ${statusColors[item.status]}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${statusDot[item.status]}`} />
                  <h3 className="text-base font-semibold text-white">{item.gene}</h3>
                </div>
                <p className="text-xs text-slate-400 mb-3">{item.variant}</p>
                <p className="text-sm text-slate-300 leading-relaxed">{item.insight}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
