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

const tiers = [
  { name: 'Bronze', threshold: 0, active: false },
  { name: 'Silver', threshold: 500, active: false },
  { name: 'Gold', threshold: 1000, active: true },
  { name: 'Platinum', threshold: 2500, active: false },
];

const dailyActions = [
  { name: 'Log Supplements', tokens: '+5/day', completed: true, icon: 'medication' },
  { name: 'Weekly Check-in', tokens: '+15', completed: false, icon: 'event_available' },
  { name: 'Sync Wearable', tokens: '+15/day', completed: true, icon: 'watch', auto: true },
];

const oneTimeActions = [
  { name: 'Complete GENEX360', tokens: '+500', icon: 'genetics' },
  { name: 'Leave Review', tokens: '+25', icon: 'rate_review' },
  { name: 'Share Results', tokens: '+15', icon: 'share' },
];

const milestones = [
  { name: '30-Day Streak', tokens: '+75', progress: 14, total: 30, icon: 'local_fire_department' },
  { name: '90-Day Streak', tokens: '+250', progress: 14, total: 90, icon: 'emoji_events' },
  { name: 'Refer a Friend', tokens: '+100', progress: 0, total: 1, icon: 'group_add' },
];

interface RedeemItem {
  name: string;
  cost: number;
  available: boolean;
  moreNeeded?: number;
}

const redeemItems: RedeemItem[] = [
  { name: '$10 Credit', cost: 200, available: true },
  { name: '$25 Credit', cost: 450, available: true },
  { name: 'Premium 1mo', cost: 400, available: true },
  { name: 'Consultation', cost: 800, available: false, moreNeeded: 245 },
  { name: 'Free Product', cost: 1000, available: true },
  { name: 'Sproutables Kit', cost: 1200, available: true },
  { name: 'Free GENEX-M', cost: 1500, available: false, moreNeeded: 253 },
  { name: 'Founders VIP', cost: 3000, available: false, moreNeeded: 1753 },
];

const activityHistory = [
  { date: 'Mar 16, 2026', amount: '+5', description: 'Logged morning supplements', balance: '1,247' },
  { date: 'Mar 15, 2026', amount: '+15', description: 'Synced Apple Watch data', balance: '1,242' },
  { date: 'Mar 15, 2026', amount: '+5', description: 'Logged evening supplements', balance: '1,227' },
  { date: 'Mar 14, 2026', amount: '+25', description: 'Left review for MTHFR+', balance: '1,222' },
  { date: 'Mar 14, 2026', amount: '-200', description: 'Redeemed $10 Store Credit', balance: '1,197' },
];

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function TokensPage() {
  const [selectedTab] = useState('earn');

  const balance = 1247;
  const progressToCredit = ((balance % 200) / 75) * 100;

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {/* ------------------------------------------------------------------ */}
      {/*  Header — Balance + Streak                                         */}
      {/* ------------------------------------------------------------------ */}
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
        <div className="rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-6 relative overflow-hidden">
          {/* Glow */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Balance */}
            <div>
              <p className="text-sm text-slate-400 mb-1">Your Balance</p>
              <h1 className="text-4xl font-[Syne] font-bold bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
                1,247 FarmaTokens
              </h1>
            </div>

            {/* Streak badge */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/15 border border-orange-500/30">
                <span className="material-symbols-outlined text-orange-400 text-[20px]">local_fire_department</span>
                <span className="text-sm font-semibold text-orange-400">14-Day Streak</span>
                <span className="text-xs text-orange-300/70">· 2x Token Multiplier Active</span>
              </div>
            </div>
          </div>

          {/* Progress to next credit */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span>75 tokens to $10 Store Credit</span>
              <span className="font-mono text-slate-300">47/75</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progressToCredit, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/*  Tier Status Bar                                                   */}
      {/* ------------------------------------------------------------------ */}
      <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
        <div className="rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-5">
          <div className="flex items-center justify-between gap-2 overflow-x-auto">
            {tiers.map((tier, i) => (
              <div key={tier.name} className="flex items-center gap-2 flex-shrink-0">
                <div
                  className={`flex flex-col items-center rounded-lg px-4 py-2 border transition-all ${
                    tier.active
                      ? 'border-amber-500/50 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                      : tier.threshold <= 1000
                      ? 'border-white/10 bg-white/[0.03]'
                      : 'border-white/5 bg-white/[0.02] opacity-50'
                  }`}
                >
                  <span
                    className={`text-sm font-semibold ${
                      tier.active ? 'text-amber-400' : 'text-slate-400'
                    }`}
                  >
                    {tier.name}
                  </span>
                  <span className="text-[10px] text-slate-600 font-mono">{tier.threshold} FT</span>
                </div>
                {i < tiers.length - 1 && (
                  <div className="flex items-center">
                    <div
                      className={`h-px w-8 md:w-16 ${
                        tier.active ? 'bg-gradient-to-r from-amber-500 to-slate-600' : i < 2 ? 'bg-amber-500/50' : 'bg-slate-700'
                      }`}
                    />
                    <span className="material-symbols-outlined text-[14px] text-slate-600">chevron_right</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/*  Section 1 — Earn Tokens                                           */}
      {/* ------------------------------------------------------------------ */}
      <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible">
        <h2 className="text-lg font-[Syne] font-bold text-white mb-4">Earn Tokens</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Daily Actions */}
          <div className="rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-400 text-[18px]">today</span>
              Daily Actions
            </h3>
            <div className="flex flex-col gap-3">
              {dailyActions.map((action) => (
                <div key={action.name} className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      action.completed
                        ? 'bg-emerald-500/15 border border-emerald-500/30'
                        : 'bg-white/5 border border-white/10'
                    }`}
                  >
                    {action.completed ? (
                      <span className="material-symbols-outlined text-emerald-400 text-[16px]">check</span>
                    ) : (
                      <span className="material-symbols-outlined text-slate-500 text-[16px]">{action.icon}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200">{action.name}</p>
                    {action.auto && <p className="text-[10px] text-slate-500">auto</p>}
                  </div>
                  <span className="text-xs font-mono font-semibold text-amber-400">{action.tokens}</span>
                </div>
              ))}
            </div>
          </div>

          {/* One-Time Actions */}
          <div className="rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-violet-400 text-[18px]">stars</span>
              One-Time Actions
            </h3>
            <div className="flex flex-col gap-3">
              {oneTimeActions.map((action) => (
                <div key={action.name} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-slate-400 text-[16px]">{action.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200">{action.name}</p>
                  </div>
                  <span className="text-xs font-mono font-semibold text-amber-400">{action.tokens}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Milestones */}
          <div className="rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-[18px]">emoji_events</span>
              Milestones
            </h3>
            <div className="flex flex-col gap-3">
              {milestones.map((m) => (
                <div key={m.name} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-[16px]">{m.icon}</span>
                      <span className="text-sm text-slate-200">{m.name}</span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-amber-400">{m.tokens}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400"
                      style={{ width: `${(m.progress / m.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">{m.progress}/{m.total}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/*  Section 2 — Redeem Rewards                                        */}
      {/* ------------------------------------------------------------------ */}
      <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible">
        <h2 className="text-lg font-[Syne] font-bold text-white mb-4">Redeem Rewards</h2>

        <div className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-thin scrollbar-thumb-slate-700">
          {redeemItems.map((item) => (
            <div
              key={item.name}
              className={`shrink-0 w-44 rounded-xl backdrop-blur-xl border p-4 flex flex-col gap-3 ${
                item.available
                  ? 'bg-white/5 border-white/10 hover:border-amber-500/30 transition-colors'
                  : 'bg-white/[0.02] border-white/5 opacity-60 blur-[0.5px]'
              }`}
            >
              <h4 className="text-sm font-semibold text-white">{item.name}</h4>
              <p className="text-xs font-mono text-amber-400">{item.cost} tokens</p>
              <button
                disabled={!item.available}
                className={`w-full py-2 rounded-lg text-xs font-semibold transition-all ${
                  item.available
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:from-amber-400 hover:to-yellow-400 shadow-lg shadow-amber-500/20'
                    : 'bg-white/5 text-slate-500 cursor-not-allowed'
                }`}
              >
                {item.available ? 'Redeem' : `${item.moreNeeded} more`}
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/*  Section 3 — Activity History                                      */}
      {/* ------------------------------------------------------------------ */}
      <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible">
        <h2 className="text-lg font-[Syne] font-bold text-white mb-4">Activity History</h2>

        <div className="rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Date</th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Description</th>
                <th className="text-right text-xs font-medium text-slate-500 px-5 py-3">Amount</th>
                <th className="text-right text-xs font-medium text-slate-500 px-5 py-3">Balance</th>
              </tr>
            </thead>
            <tbody>
              {activityHistory.map((entry, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-xs text-slate-400">{entry.date}</td>
                  <td className="px-5 py-3 text-sm text-slate-300">{entry.description}</td>
                  <td
                    className={`px-5 py-3 text-sm text-right font-mono font-semibold ${
                      entry.amount.startsWith('+') ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {entry.amount}
                  </td>
                  <td className="px-5 py-3 text-sm text-right font-mono text-slate-400">{entry.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
