'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent, Badge, glassClasses } from '@genex360/ui';
import {
  calculatePersonalizationScore,
  PERSONALIZATION_LABELS,
  type PersonalizationInput,
  type PersonalizationScore,
} from '@genex360/core';

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
/*  Mock data                                                                 */
/* -------------------------------------------------------------------------- */

const MOCK_INPUT: PersonalizationInput = {
  hasGeneticData: true,
  geneticPathwaysAnalyzed: 12,
  totalPathways: 18,
  caqCompleted: true,
  caqModulesCompleted: 10,
  totalCAQModules: 10,
  hasInteractionCheck: true,
  interactionsResolved: 3,
  totalInteractions: 4,
  goalsSet: 5,
  goalsWithProtocols: 3,
};

const PROTOCOL_DATA = {
  Morning: [
    { name: 'Methylated B-Complex', checked: false },
    { name: 'Vitamin D3 5000 IU', checked: false },
    { name: 'Omega-3 DHA', checked: false },
  ],
  Afternoon: [
    { name: 'Magnesium Glycinate', checked: false },
    { name: 'CoQ10 200mg', checked: false },
  ],
  Evening: [
    { name: 'Ashwagandha KSM-66', checked: false },
    { name: 'Zinc Picolinate', checked: false },
  ],
} as const;

type TimeOfDay = keyof typeof PROTOCOL_DATA;

const HEALTH_FEED = [
  { title: 'MTHFR & Methylation: Your Personalized Protocol', source: 'PubMed', category: 'Genomics', readTime: '5 min' },
  { title: 'Optimizing Sleep with CLOCK Gene Variants', source: 'Perplexity Sonar', category: 'Sleep', readTime: '4 min' },
  { title: 'CoQ10 & Mitochondrial Health: New Research', source: 'PubMed', category: 'Supplements', readTime: '6 min' },
];

const WEARABLE_METRICS = [
  {
    label: 'Sleep',
    value: '7.2h',
    trend: 'up' as const,
    sparkline: 'M0,20 L8,18 L16,22 L24,15 L32,17 L40,12 L48,14 L56,10 L64,8',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
      </svg>
    ),
  },
  {
    label: 'HRV',
    value: '45ms',
    trend: 'up' as const,
    sparkline: 'M0,18 L8,22 L16,16 L24,20 L32,14 L40,18 L48,10 L56,14 L64,12',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
  },
  {
    label: 'Steps',
    value: '8,432',
    trend: 'down' as const,
    sparkline: 'M0,12 L8,10 L16,14 L24,8 L32,16 L40,18 L48,20 L56,16 L64,22',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
      </svg>
    ),
  },
  {
    label: 'Recovery',
    value: '82%',
    trend: 'up' as const,
    sparkline: 'M0,22 L8,18 L16,20 L24,14 L32,16 L40,10 L48,12 L56,8 L64,6',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
];

const BADGES_DATA = [
  { label: '7-Day Streak', icon: '🔥' },
  { label: 'Protocol Master', icon: '🧬' },
  { label: 'First Genomic Report', icon: '📊' },
  { label: 'Community Helper', icon: '🤝' },
];

/* -------------------------------------------------------------------------- */
/*  Circular Gauge component                                                  */
/* -------------------------------------------------------------------------- */

function PersonalizationGauge({ score }: { score: PersonalizationScore }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score.total / 100) * circumference;

  return (
    <div className="relative w-44 h-44 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
        {/* Background track */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="10"
        />
        {/* Animated score arc */}
        <motion.circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }}
        />
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-4xl font-bold text-white"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          {score.total}
        </motion.span>
        <span className="text-xs text-slate-400 mt-1">out of 100</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Component breakdown bar                                                   */
/* -------------------------------------------------------------------------- */

function ComponentBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-32 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-white/5">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.5 }}
        />
      </div>
      <span className="text-xs font-medium text-slate-300 w-8 text-right">{value}%</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main page                                                                 */
/* -------------------------------------------------------------------------- */

export default function WellnessPortalPage() {
  const score = useMemo(() => calculatePersonalizationScore(MOCK_INPUT), []);

  // Protocol check state
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const toggleItem = (timeOfDay: string, name: string) => {
    const key = `${timeOfDay}:${name}`;
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const timeIcons: Record<TimeOfDay, JSX.Element> = {
    Morning: (
      <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    ),
    Afternoon: (
      <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    ),
    Evening: (
      <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
      </svg>
    ),
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {/* ------------------------------------------------------------------ */}
      {/*  1. HERO CARD - Personalization Score                              */}
      {/* ------------------------------------------------------------------ */}
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
        <Card
          variant="flat"
          padding="lg"
          className={`!bg-white/5 backdrop-blur-xl !border-violet-500/20 shadow-lg shadow-violet-500/5 relative overflow-hidden`}
        >
          {/* Glow accents */}
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <CardHeader>
            <CardTitle className="!text-white text-xl">Personalization Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Gauge */}
              <div className="flex flex-col items-center gap-3">
                <PersonalizationGauge score={score} />
                <Badge variant="primary" className="!bg-violet-500/20 !text-violet-300 mt-2">
                  {PERSONALIZATION_LABELS[score.level]}
                </Badge>
              </div>

              {/* Component breakdown */}
              <div className="flex-1 w-full flex flex-col gap-3">
                <ComponentBar label="Genetic Match" value={score.components.genetic_match} color="bg-gradient-to-r from-violet-500 to-violet-400" />
                <ComponentBar label="Clinical Evidence" value={score.components.clinical_evidence} color="bg-gradient-to-r from-cyan-500 to-cyan-400" />
                <ComponentBar label="Safety Profile" value={score.components.safety_profile} color="bg-gradient-to-r from-emerald-500 to-emerald-400" />
                <ComponentBar label="User Goals" value={score.components.user_goals} color="bg-gradient-to-r from-amber-500 to-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/*  2. QUICK ACTIONS                                                  */}
      {/* ------------------------------------------------------------------ */}
      <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Order Supplements', href: '/wellness/shop', icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            )},
            { label: 'View Genomics', href: '/wellness/genomics', icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5m-4.75-11.396c.251.023.501.05.75.082M5 14.5l-1.456 1.456a2.25 2.25 0 00-.659 1.591v1.203a2.25 2.25 0 002.25 2.25h1.615m-3.206-5.5h7.711M19 14.5l1.456 1.456a2.25 2.25 0 01.659 1.591v1.203a2.25 2.25 0 01-2.25 2.25h-1.615m3.206-5.5h-7.711m-6.922 5.5h14.172" />
              </svg>
            )},
            { label: 'Track Goals', href: '#goals', icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            )},
            { label: 'Chat with AI', href: '/wellness/chat', icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            )},
          ].map((action) => (
            <Link key={action.label} href={action.href}>
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer ${glassClasses.dark} border-cyan-500/20 hover:border-cyan-400/40 hover:shadow-cyan-500/10 hover:shadow-lg transition-all`}
              >
                <span className="text-cyan-400">{action.icon}</span>
                <span className="text-sm font-medium text-slate-200">{action.label}</span>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/*  3. TODAY'S PROTOCOL                                               */}
      {/* ------------------------------------------------------------------ */}
      <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible">
        <h2 className="text-lg font-semibold text-white mb-4">Today&apos;s Protocol</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.keys(PROTOCOL_DATA) as TimeOfDay[]).map((timeOfDay) => (
            <Card
              key={timeOfDay}
              variant="flat"
              padding="md"
              className={`!bg-white/5 backdrop-blur-xl !border-white/10`}
            >
              <CardHeader className="!mb-3">
                <div className="flex items-center gap-2">
                  {timeIcons[timeOfDay]}
                  <CardTitle className="!text-white !text-base">{timeOfDay}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  {PROTOCOL_DATA[timeOfDay].map((item) => {
                    const key = `${timeOfDay}:${item.name}`;
                    const isChecked = !!checkedItems[key];
                    return (
                      <label
                        key={item.name}
                        className="flex items-center gap-3 group cursor-pointer py-1"
                      >
                        <div
                          onClick={() => toggleItem(timeOfDay, item.name)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isChecked
                              ? 'bg-violet-500 border-violet-500'
                              : 'border-slate-600 group-hover:border-slate-400'
                          }`}
                        >
                          {isChecked && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </div>
                        <span
                          className={`text-sm transition-all ${
                            isChecked ? 'line-through text-slate-500' : 'text-slate-300'
                          }`}
                        >
                          {item.name}
                        </span>
                        {isChecked && (
                          <Badge variant="success" className="ml-auto !bg-emerald-500/20 !text-emerald-300 text-[10px]">
                            +10 FT
                          </Badge>
                        )}
                      </label>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/*  4. HEALTH FEED                                                    */}
      {/* ------------------------------------------------------------------ */}
      <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible">
        <h2 className="text-lg font-semibold text-white mb-4">Health Feed</h2>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin scrollbar-thumb-slate-700">
          {HEALTH_FEED.map((article) => (
            <Card
              key={article.title}
              variant="flat"
              padding="md"
              className={`!bg-white/5 backdrop-blur-xl !border-white/10 hover:!border-violet-500/30 transition-colors min-w-[280px] max-w-[320px] shrink-0 cursor-pointer`}
            >
              <CardContent>
                <div className="flex flex-col gap-3">
                  <Badge
                    variant="info"
                    className="!bg-violet-500/15 !text-violet-300 w-fit"
                  >
                    {article.category}
                  </Badge>
                  <h3 className="text-sm font-semibold text-slate-100 leading-snug">
                    {article.title}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{article.source}</span>
                    <span>{article.readTime} read</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/*  5. WEARABLE SYNC                                                  */}
      {/* ------------------------------------------------------------------ */}
      <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible">
        <h2 className="text-lg font-semibold text-white mb-4">Wearable Sync</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {WEARABLE_METRICS.map((metric) => (
            <Card
              key={metric.label}
              variant="flat"
              padding="md"
              className={`!bg-white/5 backdrop-blur-xl !border-white/10`}
            >
              <CardContent>
                <div className="flex flex-col gap-2">
                  {/* Icon + label */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400">
                      {metric.icon}
                      <span className="text-xs font-medium">{metric.label}</span>
                    </div>
                    {/* Trend arrow */}
                    <span className={metric.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}>
                      {metric.trend === 'up' ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
                        </svg>
                      )}
                    </span>
                  </div>
                  {/* Value */}
                  <span className="text-2xl font-bold text-white">{metric.value}</span>
                  {/* Sparkline */}
                  <svg className="w-full h-8" viewBox="0 0 64 28" fill="none" preserveAspectRatio="none">
                    <path
                      d={metric.sparkline}
                      stroke={metric.trend === 'up' ? '#34d399' : '#f87171'}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                    <path
                      d={`${metric.sparkline} L64,28 L0,28 Z`}
                      fill={metric.trend === 'up' ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)'}
                    />
                  </svg>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/*  6. ACHIEVEMENT BADGES                                             */}
      {/* ------------------------------------------------------------------ */}
      <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible">
        <h2 className="text-lg font-semibold text-white mb-4">Achievements</h2>
        <Card
          variant="flat"
          padding="lg"
          className={`!bg-white/5 backdrop-blur-xl !border-white/10`}
        >
          <CardContent>
            <div className="flex flex-col gap-5">
              {/* Badge circles */}
              <div className="flex items-center gap-4 overflow-x-auto pb-2">
                {BADGES_DATA.map((badge) => (
                  <motion.div
                    key={badge.label}
                    whileHover={{ scale: 1.1, y: -2 }}
                    className="flex flex-col items-center gap-2 shrink-0"
                  >
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 flex items-center justify-center text-2xl shadow-lg shadow-violet-500/10">
                      {badge.icon}
                    </div>
                    <span className="text-[10px] text-slate-400 text-center max-w-[72px] leading-tight">
                      {badge.label}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Token earnings + streak */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-violet-400" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="currentColor">F</text>
                  </svg>
                  <span className="text-sm text-slate-300">
                    This week: <span className="font-semibold text-violet-300">+320 FT</span>
                  </span>
                </div>

                {/* Streak tracker */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 mr-1">7-day streak</span>
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i < 5
                          ? 'bg-gradient-to-br from-violet-500 to-cyan-500'
                          : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
