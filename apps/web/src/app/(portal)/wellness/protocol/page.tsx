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

interface Supplement {
  name: string;
  dosage: string;
  form: string;
}

interface TimeBlock {
  label: string;
  icon: string;
  iconColor: string;
  supplements: Supplement[];
}

const timeBlocks: TimeBlock[] = [
  {
    label: 'Morning',
    icon: 'light_mode',
    iconColor: 'text-amber-400',
    supplements: [
      { name: 'MTHFR+', dosage: '2 caps', form: 'capsule' },
      { name: 'NAD+', dosage: '1 cap', form: 'capsule' },
      { name: 'Vitamin D3', dosage: '1 softgel', form: 'softgel' },
    ],
  },
  {
    label: 'Afternoon',
    icon: 'wb_sunny',
    iconColor: 'text-orange-400',
    supplements: [
      { name: 'FOCUS+', dosage: '2 caps', form: 'capsule' },
      { name: 'Omega-3', dosage: '2 softgels', form: 'softgel' },
    ],
  },
  {
    label: 'Evening',
    icon: 'dark_mode',
    iconColor: 'text-indigo-400',
    supplements: [
      { name: 'RELAX+', dosage: '2 caps', form: 'capsule' },
      { name: 'Magnesium', dosage: '1 cap', form: 'capsule' },
    ],
  },
];

const weeklyData = [
  { day: 'Mon', pct: 100 },
  { day: 'Tue', pct: 100 },
  { day: 'Wed', pct: 85 },
  { day: 'Thu', pct: 100 },
  { day: 'Fri', pct: 70 },
  { day: 'Sat', pct: 100 },
  { day: 'Sun', pct: 0 },
];

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function ProtocolPage() {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const toggleItem = (block: string, name: string) => {
    const key = `${block}:${name}`;
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const totalSupplements = timeBlocks.reduce((sum, b) => sum + b.supplements.length, 0);
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {/* ------------------------------------------------------------------ */}
      {/*  Header                                                            */}
      {/* ------------------------------------------------------------------ */}
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-[Syne] font-bold text-white">Your Supplement Protocol</h1>
            <p className="text-slate-400 mt-1">Genetically-optimized daily supplement plan</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/15 border border-orange-500/30">
              <span className="material-symbols-outlined text-orange-400 text-[20px]">local_fire_department</span>
              <span className="text-sm font-semibold text-orange-400">14-day streak</span>
            </div>
            <div className="text-sm text-slate-400">
              <span className="font-mono font-semibold text-white">{checkedCount}/{totalSupplements}</span> taken today
            </div>
          </div>
        </div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/*  Time Block Cards                                                  */}
      {/* ------------------------------------------------------------------ */}
      <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {timeBlocks.map((block) => (
            <div
              key={block.label}
              className="rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-5"
            >
              {/* Block header */}
              <div className="flex items-center gap-2 mb-4">
                <span className={`material-symbols-outlined ${block.iconColor} text-[22px]`}>
                  {block.icon}
                </span>
                <h3 className="text-base font-[Syne] font-bold text-white">{block.label}</h3>
              </div>

              {/* Supplements */}
              <div className="flex flex-col gap-3">
                {block.supplements.map((supp) => {
                  const key = `${block.label}:${supp.name}`;
                  const isChecked = !!checkedItems[key];
                  return (
                    <label
                      key={supp.name}
                      className="flex items-center gap-3 group cursor-pointer py-1"
                    >
                      {/* Checkbox */}
                      <div
                        onClick={() => toggleItem(block.label, supp.name)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-violet-500 border-violet-500'
                            : 'border-slate-600 group-hover:border-slate-400'
                        }`}
                      >
                        {isChecked && (
                          <span className="material-symbols-outlined text-white text-[14px]">check</span>
                        )}
                      </div>

                      {/* Supplement info */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm transition-all ${
                            isChecked ? 'line-through text-slate-500' : 'text-slate-200'
                          }`}
                        >
                          {supp.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {supp.dosage} · {supp.form}
                        </p>
                      </div>

                      {/* Token reward */}
                      {isChecked && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20"
                        >
                          +5 FarmaTokens
                        </motion.span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/*  Weekly Adherence Chart                                            */}
      {/* ------------------------------------------------------------------ */}
      <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible">
        <div className="rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-[Syne] font-bold text-white">Weekly Adherence</h2>
              <p className="text-xs text-slate-400 mt-0.5">This week&apos;s compliance overview</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-mono font-bold text-white">93%</p>
              <p className="text-xs text-emerald-400">avg compliance</p>
            </div>
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-3 h-40">
            {weeklyData.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full relative flex items-end justify-center" style={{ height: '120px' }}>
                  <motion.div
                    className={`w-full max-w-[40px] rounded-t-lg ${
                      d.pct >= 90
                        ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                        : d.pct >= 70
                        ? 'bg-gradient-to-t from-amber-600 to-amber-400'
                        : d.pct > 0
                        ? 'bg-gradient-to-t from-red-600 to-red-400'
                        : 'bg-white/5'
                    }`}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(d.pct, 4)}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                  />
                  {d.pct > 0 && (
                    <span className="absolute -top-5 text-[10px] font-mono text-slate-400">
                      {d.pct}%
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs font-medium ${
                    d.day === 'Sun' ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  {d.day}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/*  AI Protocol Optimization                                          */}
      {/* ------------------------------------------------------------------ */}
      <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible">
        <div className="rounded-xl backdrop-blur-xl bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-violet-500/20 p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-violet-400">psychology</span>
            </div>
            <div>
              <h3 className="text-base font-[Syne] font-bold text-white mb-2">AI Protocol Optimization</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Based on your wearable data, your cortisol levels peak between 7:30-8:30 AM. I recommend
                taking your <span className="text-white font-semibold">MTHFR+</span> and{' '}
                <span className="text-white font-semibold">NAD+</span> during this window for optimal absorption.
                Your evening <span className="text-white font-semibold">RELAX+</span> timing looks perfect at 9 PM —
                it aligns with your melatonin onset detected by your sleep tracker.
              </p>
              <div className="flex items-center gap-4 mt-4">
                <button className="px-4 py-2 rounded-lg text-xs font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30 transition-colors">
                  Apply Suggestion
                </button>
                <button className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors">
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
