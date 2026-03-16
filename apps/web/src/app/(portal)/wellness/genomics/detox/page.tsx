'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const phaseIData = [
  { enzyme: 'CYP1A1', capacity: 85, color: '#22c55e' },
  { enzyme: 'CYP1A2', capacity: 95, color: '#06b6d4' },
  { enzyme: 'CYP1B1', capacity: 60, color: '#eab308' },
  { enzyme: 'CYP2D6', capacity: 55, color: '#eab308' },
  { enzyme: 'CYP2E1', capacity: 75, color: '#22c55e' },
  { enzyme: 'CYP3A4', capacity: 80, color: '#22c55e' },
];

const phaseIIData = [
  { pathway: 'Glutathione', capacity: 30, color: '#ef4444' },
  { pathway: 'Methylation', capacity: 55, color: '#eab308' },
  { pathway: 'Acetylation', capacity: 88, color: '#22c55e' },
  { pathway: 'Sulfation', capacity: 60, color: '#eab308' },
  { pathway: 'Glucuronidation', capacity: 82, color: '#22c55e' },
];

export default function DetoxPage() {
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
          Detoxification Capacity
        </motion.h1>
        <p className="text-slate-400 mb-8">
          Phase I and Phase II enzyme activity based on your genetic profile.
        </p>

        {/* Two-column layout */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          {/* Phase I */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-1">Phase I — CYP Enzymes</h2>
            <p className="text-xs text-slate-500 mb-4">Oxidation, reduction, hydrolysis</p>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={phaseIData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="enzyme"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    width={65}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#e2e8f0',
                    }}
                    formatter={(value: number) => [`${value}%`, 'Capacity']}
                  />
                  <Bar dataKey="capacity" radius={[0, 6, 6, 0]} barSize={20}>
                    {phaseIData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Phase II */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-1">Phase II — Conjugation</h2>
            <p className="text-xs text-slate-500 mb-4">Methylation, sulfation, glucuronidation</p>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={phaseIIData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="pathway"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#e2e8f0',
                    }}
                    formatter={(value: number) => [`${value}%`, 'Capacity']}
                  />
                  <Bar dataKey="capacity" radius={[0, 6, 6, 0]} barSize={20}>
                    {phaseIIData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Glutathione Alert */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl border border-red-500/20 bg-red-500/5 backdrop-blur-md p-6"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-300">
                Glutathione Conjugation — Critically Low (30%)
              </h3>
              <p className="mt-1 text-sm text-slate-400 leading-relaxed">
                Your GSTM1 and GSTP1 gene variants indicate significantly reduced glutathione
                S-transferase activity. This impairs Phase II detoxification of environmental
                toxins, heavy metals, and oxidative byproducts.
              </p>
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-slate-300 mb-2">Supplement Recommendations</h4>
                <ul className="space-y-1">
                  {[
                    'N-Acetyl Cysteine (NAC) 600–1200 mg daily',
                    'Liposomal Glutathione 500 mg daily',
                    'Selenium 200 mcg daily (cofactor)',
                    'Alpha-Lipoic Acid 300 mg daily',
                    'Milk Thistle (Silymarin) 150 mg 2x daily',
                  ].map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-cyan-300">
                      <span className="text-cyan-500 mt-0.5">+</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
