'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

const panels = [
  {
    slug: 'methylation',
    icon: '🧬',
    title: 'Methylation Pathways',
    risk: 'Medium',
    insight: 'MTHFR C677T heterozygous detected',
  },
  {
    slug: 'nutrients',
    icon: '💊',
    title: 'Nutrient Risk Profile',
    risk: 'Low',
    insight: '2 of 6 nutrients require attention',
  },
  {
    slug: 'hormones',
    icon: '⚖️',
    title: 'Hormonal Balance',
    risk: 'Low',
    insight: 'Estrogen metabolism optimal',
  },
  {
    slug: 'detox',
    icon: '🛡️',
    title: 'Detoxification Capacity',
    risk: 'High',
    insight: 'Phase II conjugation reduced',
  },
  {
    slug: 'cognitive',
    icon: '🧠',
    title: 'Cognitive & Neurological',
    risk: 'Medium',
    insight: 'COMT Val/Met — moderate dopamine clearance',
  },
  {
    slug: 'immune',
    icon: '🦠',
    title: 'Immune Resilience',
    risk: 'Low',
    insight: 'VDR Taq positive — vitamin D receptor normal',
  },
  {
    slug: 'cyp450',
    icon: '💉',
    title: 'CYP450 Drug Metabolism',
    risk: 'Medium',
    insight: 'CYP2D6 intermediate metabolizer',
  },
];

const riskColors: Record<string, string> = {
  Low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  High: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function GenomicsDashboard() {
  const [hasGeneticData] = useState(true);

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Genomic Dashboard
          </h1>
          <p className="mt-2 text-slate-400 text-lg">GeneX360 Analysis Results</p>
        </motion.div>

        {hasGeneticData ? (
          /* Panel Cards Grid */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {panels.map((panel, i) => (
              <motion.div
                key={panel.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 * i }}
              >
                <Link
                  href={`/wellness/genomics/${panel.slug}`}
                  className="group block rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-6 transition-all hover:border-violet-500/30 hover:bg-white/10 hover:shadow-lg hover:shadow-violet-500/5"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-3xl">{panel.icon}</span>
                    <span
                      className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${riskColors[panel.risk]}`}
                    >
                      {panel.risk} Risk
                    </span>
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-white group-hover:text-violet-300 transition-colors">
                    {panel.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400 leading-relaxed">
                    {panel.insight}
                  </p>
                  <div className="mt-4 flex items-center text-xs text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    View Details
                    <svg className="ml-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          /* Upgrade CTA */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto max-w-lg rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 p-10 text-center backdrop-blur-md"
          >
            <div className="text-5xl mb-4">🧬</div>
            <h2 className="text-2xl font-bold text-white">Unlock Your Genomic Profile</h2>
            <p className="mt-3 text-slate-400 leading-relaxed">
              Get personalized insights into your methylation pathways, nutrient needs,
              hormonal balance, detox capacity, and drug metabolism with the GeneX360
              comprehensive panel.
            </p>
            <button className="mt-8 rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 px-8 py-3 font-semibold text-white transition-transform hover:scale-105 hover:shadow-lg hover:shadow-violet-500/25 active:scale-100">
              Order GeneX360 Kit — $299
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
