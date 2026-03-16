'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  glassClasses,
} from '@genex360/ui';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

/* -------------------------------------------------------------------------- */
/*  Animation helpers                                                         */
/* -------------------------------------------------------------------------- */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: 'easeOut' } },
};

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface Achievement {
  id: string;
  name: string;
  reward: number;
  icon: string;
  unlocked: boolean;
  dateUnlocked?: string;
  requirement: string;
  progress?: number;
  category: 'streak' | 'protocol' | 'genomics' | 'community' | 'shopping';
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  lifetimeFT: number;
  streak: number;
  achievements: number;
  isUser?: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
}

/* -------------------------------------------------------------------------- */
/*  Mock data                                                                 */
/* -------------------------------------------------------------------------- */

const CURRENT_STREAK = 18;
const STREAK_BONUS = 180;

/* Last 30 days streak data: 1 = adherent, 0 = missed */
const STREAK_CALENDAR: number[] = [
  0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1,
];

const STREAK_MILESTONES = [
  { days: 7, label: '7-Day', unlocked: true, reward: 50 },
  { days: 14, label: '14-Day', unlocked: true, reward: 150 },
  { days: 30, label: '30-Day', unlocked: false, reward: 500, daysAway: 12 },
  { days: 60, label: '60-Day', unlocked: false, reward: 1500 },
  { days: 90, label: '90-Day', unlocked: false, reward: 3000 },
];

const ACHIEVEMENTS: Achievement[] = [
  { id: 'a1', name: '7-Day Warrior', reward: 50, icon: '\u{1F525}', unlocked: true, dateUnlocked: '2026-02-26', requirement: 'Maintain a 7-day streak', category: 'streak' },
  { id: 'a2', name: '30-Day Champion', reward: 250, icon: '\u{1F517}', unlocked: false, requirement: 'Maintain a 30-day streak', progress: 60, category: 'streak' },
  { id: 'a3', name: '90-Day Legend', reward: 1000, icon: '\u{1F3C6}', unlocked: false, requirement: 'Maintain a 90-day streak', progress: 20, category: 'streak' },
  { id: 'a4', name: 'First Protocol', reward: 25, icon: '\u{1F4CB}', unlocked: true, dateUnlocked: '2026-01-15', requirement: 'Complete your first protocol', category: 'protocol' },
  { id: 'a5', name: 'Protocol Master', reward: 100, icon: '\u{1F9EA}', unlocked: false, requirement: 'Complete 10 protocols', progress: 40, category: 'protocol' },
  { id: 'a6', name: 'Full Adherence Week', reward: 75, icon: '\u{1F4AF}', unlocked: true, dateUnlocked: '2026-03-01', requirement: '100% adherence for 7 consecutive days', category: 'protocol' },
  { id: 'a7', name: 'First Report', reward: 50, icon: '\u{1F9EC}', unlocked: true, dateUnlocked: '2026-01-20', requirement: 'View your first genomics report', category: 'genomics' },
  { id: 'a8', name: 'All Panels Complete', reward: 200, icon: '\u{1F52C}', unlocked: false, requirement: 'Complete all genomic panels', progress: 55, category: 'genomics' },
  { id: 'a9', name: 'Pathway Pioneer', reward: 100, icon: '\u{1F9ED}', unlocked: false, requirement: 'Explore 10 metabolic pathways', progress: 70, category: 'genomics' },
  { id: 'a10', name: 'First Post', reward: 10, icon: '\u{1F4AC}', unlocked: true, dateUnlocked: '2026-02-10', requirement: 'Make your first community post', category: 'community' },
  { id: 'a11', name: 'Helpful Answer', reward: 50, icon: '\u{1F64F}', unlocked: false, requirement: 'Receive 10 upvotes on a post', progress: 30, category: 'community' },
  { id: 'a12', name: 'Community Leader', reward: 200, icon: '\u{1F31F}', unlocked: false, requirement: 'Earn 50 upvotes total', progress: 15, category: 'community' },
  { id: 'a13', name: 'First Purchase', reward: 25, icon: '\u{1F6D2}', unlocked: true, dateUnlocked: '2026-01-18', requirement: 'Make your first supplement purchase', category: 'shopping' },
  { id: 'a14', name: 'Loyal Customer', reward: 100, icon: '\u{1F49C}', unlocked: false, requirement: 'Make 5 purchases', progress: 60, category: 'shopping' },
  { id: 'a15', name: 'Big Spender', reward: 150, icon: '\u{1F48E}', unlocked: false, requirement: 'Spend $200+ on supplements', progress: 45, category: 'shopping' },
];

const LEADERBOARD_THIS_MONTH: LeaderboardEntry[] = [
  { rank: 1, name: 'WellnessWarrior_42', lifetimeFT: 8450, streak: 42, achievements: 12 },
  { rank: 2, name: 'HealthHero_17', lifetimeFT: 7200, streak: 35, achievements: 11 },
  { rank: 3, name: 'GenomePro_88', lifetimeFT: 6800, streak: 28, achievements: 10 },
  { rank: 4, name: 'MethylMaven_23', lifetimeFT: 5900, streak: 25, achievements: 9 },
  { rank: 5, name: 'VitaChamp_55', lifetimeFT: 5100, streak: 22, achievements: 9 },
  { rank: 6, name: 'NutriNinja_91', lifetimeFT: 4300, streak: 20, achievements: 8 },
  { rank: 7, name: 'You', lifetimeFT: 3450, streak: 18, achievements: 7, isUser: true },
  { rank: 8, name: 'SupStack_64', lifetimeFT: 3100, streak: 15, achievements: 6 },
  { rank: 9, name: 'BioHack_39', lifetimeFT: 2800, streak: 12, achievements: 6 },
  { rank: 10, name: 'PathwayPilot_76', lifetimeFT: 2200, streak: 8, achievements: 5 },
];

const LEADERBOARD_ALL_TIME: LeaderboardEntry[] = [
  { rank: 1, name: 'WellnessWarrior_42', lifetimeFT: 24500, streak: 42, achievements: 14 },
  { rank: 2, name: 'GenomePro_88', lifetimeFT: 21800, streak: 28, achievements: 13 },
  { rank: 3, name: 'HealthHero_17', lifetimeFT: 19200, streak: 35, achievements: 12 },
  { rank: 4, name: 'MethylMaven_23', lifetimeFT: 16900, streak: 25, achievements: 11 },
  { rank: 5, name: 'NutriNinja_91', lifetimeFT: 14300, streak: 20, achievements: 10 },
  { rank: 6, name: 'VitaChamp_55', lifetimeFT: 12100, streak: 22, achievements: 10 },
  { rank: 7, name: 'SupStack_64', lifetimeFT: 9800, streak: 15, achievements: 8 },
  { rank: 8, name: 'You', lifetimeFT: 3450, streak: 18, achievements: 7, isUser: true },
  { rank: 9, name: 'BioHack_39', lifetimeFT: 3100, streak: 12, achievements: 6 },
  { rank: 10, name: 'PathwayPilot_76', lifetimeFT: 2500, streak: 8, achievements: 5 },
];

/* Daily token earnings over 30 days */
const DAILY_EARNINGS = Array.from({ length: 30 }, (_, i) => ({
  day: `Mar ${i + 1}`,
  tokens: Math.floor(Math.random() * 60 + 10) + (i > 11 ? 15 : 0),
}));

/* Pie chart data */
const EARNING_BREAKDOWN = [
  { name: 'Daily Adherence', value: 45, color: '#8b5cf6' },
  { name: 'Purchases', value: 18, color: '#06b6d4' },
  { name: 'Goals', value: 15, color: '#10b981' },
  { name: 'Community', value: 12, color: '#f59e0b' },
  { name: 'Other', value: 10, color: '#64748b' },
];

/* -------------------------------------------------------------------------- */
/*  Confetti particle system                                                  */
/* -------------------------------------------------------------------------- */

const CONFETTI_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#ffffff'];

function createParticles(): Particle[] {
  return Array.from({ length: 24 }, (_, i) => ({
    id: i,
    x: Math.random() * 200 - 100,
    y: -(Math.random() * 200 + 50),
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  }));
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function GamificationPage() {
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'month' | 'all'>('month');
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(true);
  const [earnAnimations, setEarnAnimations] = useState<
    { id: number; amount: number; particles: Particle[] }[]
  >([]);

  const leaderboard = leaderboardPeriod === 'month' ? LEADERBOARD_THIS_MONTH : LEADERBOARD_ALL_TIME;

  /* ---- Earn celebration trigger ---- */
  const triggerEarn = useCallback((amount: number) => {
    const id = Date.now();
    const particles = createParticles();
    setEarnAnimations((prev) => [...prev, { id, amount, particles }]);
    setTimeout(() => {
      setEarnAnimations((prev) => prev.filter((a) => a.id !== id));
    }, 2000);
  }, []);

  /* ---- Unlocked count ---- */
  const unlockedCount = useMemo(() => ACHIEVEMENTS.filter((a) => a.unlocked).length, []);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-10">
        {/* ---------------------------------------------------------------- */}
        {/*  Header                                                          */}
        {/* ---------------------------------------------------------------- */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Gamification Hub</h1>
              <p className="mt-1 text-slate-400">Track your streaks, achievements, and standings</p>
            </div>
            <Link href="/wellness/tokens">
              <Button variant="outline" className="!border-violet-500 !text-violet-400 hover:!bg-violet-500/10">
                Token Catalog
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* ---------------------------------------------------------------- */}
        {/*  Streak Counter Hero                                             */}
        {/* ---------------------------------------------------------------- */}
        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <Card padding="lg" className={`${glassClasses.dark} relative overflow-hidden`}>
            {/* Fire background glow */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-60 rounded-full bg-gradient-to-b from-orange-500/20 via-red-500/10 to-transparent blur-3xl pointer-events-none" />

            <div className="relative flex flex-col items-center text-center">
              {/* Animated flame */}
              <motion.div
                className="relative text-7xl mb-2"
                animate={{
                  scale: [1, 1.1, 1],
                  textShadow: [
                    '0 0 20px rgba(249,115,22,0.5)',
                    '0 0 40px rgba(249,115,22,0.8)',
                    '0 0 20px rgba(249,115,22,0.5)',
                  ],
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span
                  style={{
                    background: 'linear-gradient(180deg, #fbbf24, #f97316, #ef4444)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 0 12px rgba(249,115,22,0.6))',
                  }}
                >
                  {'\u{1F525}'}
                </span>
              </motion.div>

              <motion.h2
                className="text-4xl font-extrabold text-white mb-1"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              >
                {CURRENT_STREAK}-Day Streak!
              </motion.h2>
              <p className="text-sm text-orange-300/80 mb-6">
                +{STREAK_BONUS} FT earned from streak bonuses
              </p>

              {/* Streak calendar: 30-day row */}
              <div className="flex gap-1.5 flex-wrap justify-center mb-6 max-w-lg">
                {STREAK_CALENDAR.map((day, i) => (
                  <motion.div
                    key={i}
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      day
                        ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-sm shadow-orange-500/30'
                        : 'bg-slate-800 text-slate-600 border border-slate-700'
                    }`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.02 + 0.4 }}
                  >
                    {i + 1}
                  </motion.div>
                ))}
              </div>

              {/* Streak milestones */}
              <div className="flex items-center gap-3 flex-wrap justify-center">
                {STREAK_MILESTONES.map((ms) => (
                  <div
                    key={ms.days}
                    className={`rounded-lg px-3 py-2 text-center border transition-all ${
                      ms.unlocked
                        ? 'border-orange-500/40 bg-orange-500/10'
                        : 'border-slate-700 bg-slate-900/50 opacity-60'
                    }`}
                  >
                    <p className={`text-xs font-semibold ${ms.unlocked ? 'text-orange-300' : 'text-slate-500'}`}>
                      {ms.label}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {ms.unlocked ? `+${ms.reward} FT` : ms.daysAway ? `${ms.daysAway}d away` : `${ms.days}d`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </motion.section>

        {/* ---------------------------------------------------------------- */}
        {/*  Token Earning Celebration                                       */}
        {/* ---------------------------------------------------------------- */}
        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={2}>
          <Card padding="lg" className={glassClasses.dark}>
            <CardHeader>
              <CardTitle className="!text-white flex items-center gap-2">
                Earn Tokens
                <Badge variant="info" className="!bg-violet-500/20 !text-violet-300">Demo</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400 mb-4">
                Tap any action below to see the earning celebration animation.
              </p>
              <div className="flex flex-wrap gap-3 relative">
                {[
                  { label: 'Complete Check-in', amount: 5 },
                  { label: 'Log Adherence', amount: 10 },
                  { label: 'Sync Wearable', amount: 20 },
                ].map((action) => (
                  <div key={action.label} className="relative">
                    <Button
                      className="!bg-violet-600 hover:!bg-violet-700"
                      onClick={() => triggerEarn(action.amount)}
                    >
                      {action.label} (+{action.amount} FT)
                    </Button>
                  </div>
                ))}

                {/* Celebration overlay */}
                <AnimatePresence>
                  {earnAnimations.map((anim) => (
                    <div key={anim.id} className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
                      {/* Floating token text */}
                      <motion.div
                        className="text-3xl font-extrabold text-violet-300"
                        initial={{ opacity: 0, y: 0, scale: 0.5 }}
                        animate={{ opacity: [0, 1, 1, 0], y: -120, scale: [0.5, 1.2, 1, 0.8] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5, ease: 'easeOut' }}
                        style={{ textShadow: '0 0 20px rgba(139,92,246,0.8)' }}
                      >
                        +{anim.amount} FT
                      </motion.div>

                      {/* Confetti particles */}
                      {anim.particles.map((p) => (
                        <motion.div
                          key={p.id}
                          className="absolute w-2 h-2 rounded-full"
                          style={{ backgroundColor: p.color }}
                          initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                          animate={{
                            opacity: [1, 1, 0],
                            x: p.x,
                            y: p.y,
                            scale: [1, 0.6, 0],
                          }}
                          transition={{ duration: 1.5, ease: 'easeOut' }}
                        />
                      ))}

                      {/* Sound icon (visual only) */}
                      <motion.div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: [0, 0.6, 0], scale: [0, 1.5, 2] }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                      >
                        {'\u{1F50A}'}
                      </motion.div>
                    </div>
                  ))}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* ---------------------------------------------------------------- */}
        {/*  Achievement Badges Grid                                         */}
        {/* ---------------------------------------------------------------- */}
        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={3}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">
              Achievement Badges
              <span className="ml-2 text-sm font-normal text-slate-500">
                {unlockedCount}/{ACHIEVEMENTS.length} unlocked
              </span>
            </h2>
          </div>
          <motion.div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {ACHIEVEMENTS.map((ach) => (
              <motion.div key={ach.id} variants={scaleIn}>
                <Card
                  padding="md"
                  className={`${glassClasses.dark} h-full transition-all ${
                    ach.unlocked
                      ? 'border-violet-500/40 shadow-lg shadow-violet-500/10'
                      : 'border-dashed !border-slate-700 opacity-70'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`text-3xl flex-shrink-0 ${ach.unlocked ? '' : 'grayscale opacity-50'}`}
                    >
                      {ach.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${ach.unlocked ? 'text-white' : 'text-slate-500'}`}>
                        {ach.name}
                      </p>
                      <p className="text-xs text-violet-400 font-medium">+{ach.reward} FT</p>
                      {ach.unlocked ? (
                        <p className="text-[10px] text-emerald-400 mt-1">
                          Unlocked {ach.dateUnlocked}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-500 mt-1">{ach.requirement}</p>
                      )}

                      {/* Progress bar for locked achievements */}
                      {!ach.unlocked && ach.progress !== undefined && (
                        <div className="mt-2">
                          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-violet-600/60 to-cyan-500/60"
                              style={{ width: `${ach.progress}%` }}
                            />
                          </div>
                          <p className="text-[9px] text-slate-600 mt-0.5">{ach.progress}%</p>
                        </div>
                      )}
                    </div>
                    {ach.unlocked && (
                      <Badge variant="success" className="!bg-emerald-500/20 !text-emerald-400 flex-shrink-0">
                        Earned
                      </Badge>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* ---------------------------------------------------------------- */}
        {/*  Leaderboard                                                     */}
        {/* ---------------------------------------------------------------- */}
        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={4}>
          <Card padding="lg" className={glassClasses.dark}>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="!text-white">Community Leaderboard</CardTitle>
                <div className="flex items-center gap-4">
                  {/* Opt-in toggle */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-slate-400">Opt-In</span>
                    <button
                      onClick={() => setLeaderboardOptIn(!leaderboardOptIn)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        leaderboardOptIn ? 'bg-violet-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                          leaderboardOptIn ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </label>

                  {/* Period toggle */}
                  <div className="flex gap-1">
                    {([['month', 'This Month'], ['all', 'All Time']] as const).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setLeaderboardPeriod(key)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          leaderboardPeriod === key
                            ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                            : 'text-slate-500 hover:text-slate-300 border border-transparent'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {leaderboardOptIn ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-500 border-b border-slate-800">
                        <th className="text-left py-2 pr-3 font-medium">Rank</th>
                        <th className="text-left py-2 pr-3 font-medium">Display Name</th>
                        <th className="text-right py-2 pr-3 font-medium">Lifetime FT</th>
                        <th className="text-right py-2 pr-3 font-medium">Streak</th>
                        <th className="text-right py-2 font-medium">Badges</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((entry) => (
                        <motion.tr
                          key={entry.rank}
                          className={`border-b border-slate-800/50 transition-colors ${
                            entry.isUser
                              ? 'bg-violet-500/10 border-violet-500/20'
                              : 'hover:bg-white/[0.02]'
                          }`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: entry.rank * 0.04 }}
                        >
                          <td className="py-3 pr-3">
                            <span className={`font-bold ${
                              entry.rank <= 3 ? 'text-amber-400' : 'text-slate-400'
                            }`}>
                              #{entry.rank}
                            </span>
                          </td>
                          <td className="py-3 pr-3">
                            <span className={`font-medium ${entry.isUser ? 'text-violet-300' : 'text-slate-300'}`}>
                              {entry.name}
                            </span>
                            {entry.isUser && (
                              <Badge variant="info" className="ml-2 !bg-violet-500/20 !text-violet-300">
                                You
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 pr-3 text-right text-slate-300 tabular-nums">
                            {entry.lifetimeFT.toLocaleString()}
                          </td>
                          <td className="py-3 pr-3 text-right">
                            <span className="text-orange-400 tabular-nums">{entry.streak}d</span>
                          </td>
                          <td className="py-3 text-right text-slate-400 tabular-nums">
                            {entry.achievements}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 text-slate-500">
                  <p className="text-lg mb-2">Leaderboard is disabled</p>
                  <p className="text-sm">Toggle &quot;Opt-In&quot; to see community rankings and make your profile visible.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.section>

        {/* ---------------------------------------------------------------- */}
        {/*  Token Analytics                                                 */}
        {/* ---------------------------------------------------------------- */}
        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={5}>
          <h2 className="text-xl font-bold text-white mb-4">Token Analytics</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Line chart: daily earnings */}
            <Card padding="lg" className={glassClasses.dark}>
              <CardHeader>
                <CardTitle className="!text-white !text-base">Daily Token Earnings (30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={DAILY_EARNINGS}>
                      <XAxis
                        dataKey="day"
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        tickLine={false}
                        axisLine={{ stroke: '#334155' }}
                        interval={4}
                      />
                      <YAxis
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        width={35}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          color: '#e2e8f0',
                          fontSize: 12,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="tokens"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#8b5cf6', stroke: '#c4b5fd', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Pie chart: earning breakdown */}
            <Card padding="lg" className={glassClasses.dark}>
              <CardHeader>
                <CardTitle className="!text-white !text-base">Earning Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="h-48 w-48 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={EARNING_BREAKDOWN}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          dataKey="value"
                          stroke="none"
                        >
                          {EARNING_BREAKDOWN.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            color: '#e2e8f0',
                            fontSize: 12,
                          }}
                          formatter={(value: number) => [`${value}%`, '']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 flex-1">
                    {EARNING_BREAKDOWN.map((item) => (
                      <div key={item.name} className="flex items-center gap-2 text-xs">
                        <div
                          className="h-3 w-3 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-slate-400 flex-1">{item.name}</span>
                        <span className="text-slate-300 font-medium tabular-nums">{item.value}%</span>
                      </div>
                    ))}
                    <div className="pt-2 mt-2 border-t border-slate-800">
                      <p className="text-xs text-slate-500">
                        Most Common:{' '}
                        <span className="text-violet-300 font-medium">Daily Adherence (45%)</span>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.section>

        {/* Bottom spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
}
