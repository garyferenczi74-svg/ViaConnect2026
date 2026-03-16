'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const inflammationMarkers = [
  {
    name: 'IL-6',
    gene: 'IL6 -174G>C',
    variant: 'Heterozygous (GC)',
    tendency: 'Moderate',
    tendencyColor: 'text-amber-400',
    score: 60,
    description: 'Mildly elevated inflammatory response. Monitor CRP levels.',
  },
  {
    name: 'TNF-alpha',
    gene: 'TNF -308G>A',
    variant: 'Normal (GG)',
    tendency: 'Low',
    tendencyColor: 'text-emerald-400',
    score: 25,
    description: 'Normal tumor necrosis factor production. No elevated risk.',
  },
  {
    name: 'CRP',
    gene: 'CRP gene region',
    variant: 'Minor allele carrier',
    tendency: 'Moderate',
    tendencyColor: 'text-amber-400',
    score: 55,
    description: 'Genetic tendency toward slightly elevated baseline CRP.',
  },
];

const immuneScore = 74;

export default function ImmunePage() {
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (immuneScore / 100) * circumference;

  const scoreColor =
    immuneScore >= 80 ? '#22c55e' : immuneScore >= 60 ? '#eab308' : '#ef4444';

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
          Immune Resilience Panel
        </motion.h1>
        <p className="text-slate-400 mb-8">
          Genetic markers influencing immune response, inflammation, and resilience.
        </p>

        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          {/* Immune Response Score Gauge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-6 flex flex-col items-center"
          >
            <h2 className="text-lg font-semibold text-white mb-6">Immune Response Score</h2>
            <svg width="180" height="180" viewBox="0 0 180 180">
              <defs>
                <filter id="gaugeGlow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* Background circle */}
              <circle
                cx="90"
                cy="90"
                r="70"
                fill="none"
                stroke="#1e293b"
                strokeWidth="12"
              />
              {/* Score arc */}
              <motion.circle
                cx="90"
                cy="90"
                r="70"
                fill="none"
                stroke={scoreColor}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.5, delay: 0.4, ease: 'easeOut' }}
                transform="rotate(-90 90 90)"
                filter="url(#gaugeGlow)"
              />
              <text
                x="90"
                y="82"
                textAnchor="middle"
                fill="white"
                fontSize="32"
                fontWeight="700"
              >
                {immuneScore}
              </text>
              <text
                x="90"
                y="105"
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="12"
              >
                out of 100
              </text>
            </svg>
            <p className="mt-4 text-sm text-slate-400 text-center">
              Composite score based on genetic immune markers, VDR status, and inflammation tendency.
            </p>
          </motion.div>

          {/* ACE2 Expression Status */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4">ACE2 Expression Status</h2>
            <div className="rounded-xl bg-white/5 border border-white/5 p-5 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="text-sm font-semibold text-white">Normal Expression</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                ACE2 receptor expression is within the normal range. No identified variants
                associated with significantly altered expression levels.
              </p>
            </div>

            <h2 className="text-lg font-semibold text-white mb-4 mt-6">VDR Polymorphism</h2>
            <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="text-sm font-semibold text-white">VDR TaqI — Normal (TT)</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-3">
                Vitamin D receptor function is normal. Adequate response to vitamin D
                supplementation expected. Supports immune cell activation and antimicrobial
                peptide production.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Immune cell modulation', 'Antimicrobial peptides', 'T-cell activation'].map(
                  (tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-emerald-500/15 border border-emerald-500/20 px-3 py-0.5 text-xs text-emerald-300"
                    >
                      {tag}
                    </span>
                  )
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Inflammation Markers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4">Inflammation Markers — Genetic Tendency</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {inflammationMarkers.map((marker, i) => (
              <motion.div
                key={marker.name}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-white">{marker.name}</h3>
                  <span className={`text-sm font-semibold ${marker.tendencyColor}`}>
                    {marker.tendency}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-2">{marker.gene} — {marker.variant}</p>
                {/* Score bar */}
                <div className="w-full h-2 rounded-full bg-slate-800 mb-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${marker.score}%` }}
                    transition={{ duration: 0.8, delay: 0.7 + i * 0.1 }}
                    className="h-full rounded-full"
                    style={{
                      background:
                        marker.score <= 35
                          ? 'linear-gradient(90deg, #22c55e, #10b981)'
                          : marker.score <= 65
                          ? 'linear-gradient(90deg, #eab308, #f59e0b)'
                          : 'linear-gradient(90deg, #ef4444, #f97316)',
                    }}
                  />
                </div>
                <p className="text-sm text-slate-400">{marker.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
