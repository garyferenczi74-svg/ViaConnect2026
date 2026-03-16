'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const products = [
  { name: 'Methylated B-Complex', dosage: '1 capsule', form: 'capsule' as const, time: 'Morning' as const, confidence: 95, rationale: 'MTHFR C677T — requires methylated folate and B12' },
  { name: 'Vitamin D3 + K2', dosage: '5000 IU', form: 'capsule' as const, time: 'Morning' as const, confidence: 88, rationale: 'VDR Taq variant — enhanced D3 requirement' },
  { name: 'Omega-3 DHA', dosage: '2000mg', form: 'liquid' as const, time: 'Morning' as const, confidence: 72, rationale: 'APOE \u03B53/\u03B54 — cardiovascular support' },
  { name: 'Magnesium Glycinate', dosage: '400mg', form: 'capsule' as const, time: 'Afternoon' as const, confidence: 91, rationale: 'COMT Val/Met — magnesium supports methylation' },
  { name: 'CoQ10 Ubiquinol', dosage: '200mg', form: 'capsule' as const, time: 'Afternoon' as const, confidence: 85, rationale: 'NQO1 variant — mitochondrial support' },
  { name: 'Ashwagandha KSM-66', dosage: '600mg', form: 'powder' as const, time: 'Evening' as const, confidence: 68, rationale: 'HPA axis support — cortisol optimization' },
  { name: 'Zinc Picolinate', dosage: '30mg', form: 'capsule' as const, time: 'Evening' as const, confidence: 79, rationale: 'Immune support — zinc transporter variants' },
];

type DayStatus = 'completed' | 'partial' | 'missed' | 'upcoming' | 'today';

function buildCalendar(): DayStatus[] {
  const days: DayStatus[] = [];
  for (let i = 1; i <= 28; i++) {
    if (i === 12) days.push('partial');
    else if (i <= 18) days.push('completed');
    else if (i === 19) days.push('today');
    else days.push('upcoming');
  }
  return days;
}

const statusColor: Record<DayStatus, string> = {
  completed: 'bg-emerald-500',
  partial: 'bg-yellow-500',
  missed: 'bg-red-500',
  upcoming: 'bg-white/10',
  today: 'ring-2 ring-violet-400 bg-violet-500/40',
};

const timeIcon: Record<string, string> = {
  Morning: '\u2600\uFE0F',
  Afternoon: '\uD83C\uDF24\uFE0F',
  Evening: '\uD83C\uDF19',
};

const formLabel: Record<string, string> = {
  capsule: 'Capsule',
  powder: 'Powder',
  liquid: 'Liquid',
};

/* ------------------------------------------------------------------ */
/*  Animations                                                         */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ProtocolPage() {
  const [calendar, setCalendar] = useState<DayStatus[]>(buildCalendar);

  const streak = calendar.filter((d) => d === 'completed').length;

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* ---- Header ---- */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-3xl font-bold text-white">Your Personalized Protocol</h1>
        <p className="mt-1 text-slate-400">Genetically-optimized supplement plan</p>
      </motion.div>

      {/* ---- Protocol Cards ---- */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {products.map((p) => (
          <motion.div
            key={p.name}
            variants={cardVariants}
            className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-xl p-5 flex flex-col gap-3 hover:border-violet-500/30 transition-colors"
          >
            {/* Top row */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">{p.name}</h3>
                <p className="text-sm text-slate-400">
                  {p.dosage} &middot; {formLabel[p.form]}
                </p>
              </div>
              <span className="text-xl" title={p.time}>
                {timeIcon[p.time]}
              </span>
            </div>

            {/* Rationale */}
            <p className="text-xs text-slate-300 leading-relaxed">{p.rationale}</p>

            {/* Badges */}
            <div className="flex items-center gap-2 mt-auto flex-wrap">
              {/* Confidence badge */}
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  p.confidence >= 80
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    : p.confidence >= 60
                    ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                    : 'bg-slate-500/15 text-slate-400 border border-slate-500/20'
                }`}
              >
                {p.confidence}% match
              </span>

              {/* Genetic Match badge */}
              {p.confidence > 80 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/20">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5m-4.75-11.396c.251.023.501.05.75.082M5 14.5l-1.456 1.456a2.25 2.25 0 00-.659 1.591v1.203a2.25 2.25 0 002.25 2.25h1.615m-3.206-5.5h7.711M19 14.5l1.456 1.456a2.25 2.25 0 01.659 1.591v1.203a2.25 2.25 0 01-2.25 2.25h-1.615m3.206-5.5h-7.711m-6.922 5.5h14.172"
                    />
                  </svg>
                  Genetic Match
                </span>
              )}

              {/* Time badge */}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                {p.time}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ---- Adherence Calendar ---- */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Adherence Calendar</h2>
            <p className="text-sm text-slate-400 mt-0.5">4-week tracking overview</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-emerald-400 text-sm font-semibold">{streak}-day streak!</span>
            <span className="text-emerald-300 text-xs">+{streak * 10} FT earned</span>
          </div>
        </div>

        {/* Week labels + grid */}
        <div className="space-y-2">
          {[0, 1, 2, 3].map((week) => (
            <div key={week} className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-16">Week {week + 1}</span>
              <div className="flex gap-2">
                {calendar.slice(week * 7, week * 7 + 7).map((status, idx) => {
                  const dayNum = week * 7 + idx + 1;
                  return (
                    <button
                      key={dayNum}
                      onClick={() => {
                        setCalendar((prev) => {
                          const next = [...prev];
                          if (status === 'today') next[dayNum - 1] = 'completed';
                          return next;
                        });
                      }}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-medium transition-colors ${statusColor[status]} ${
                        status === 'completed'
                          ? 'text-white'
                          : status === 'partial'
                          ? 'text-white'
                          : status === 'today'
                          ? 'text-white'
                          : 'text-slate-500'
                      }`}
                      title={`Day ${dayNum} — ${status}`}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500" /> Completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-yellow-500" /> Partial
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-500" /> Missed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-white/10" /> Upcoming
          </span>
        </div>
      </motion.section>

      {/* ---- Bottom CTA ---- */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.45 }} className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Ready to optimize?</h3>
          <p className="text-sm text-slate-400">Subscribe to your full protocol and save 20% every month.</p>
        </div>
        <button className="shrink-0 px-8 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 shadow-lg shadow-violet-500/25 transition-all">
          Add All to Cart &mdash; Subscribe &amp; Save 20%
        </button>
      </motion.div>
    </div>
  );
}
