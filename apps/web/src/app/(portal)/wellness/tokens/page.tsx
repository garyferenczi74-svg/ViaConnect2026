'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Badge,
  Button,
  glassClasses,
} from '@genex360/ui';

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
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface Reward {
  id: string;
  name: string;
  cost: number;
  description: string;
  icon: string;
  category: 'credit' | 'perk' | 'premium';
}

interface EarningAction {
  id: string;
  action: string;
  tokens: number;
  dailyCap?: number;
  icon: string;
  link: string;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  balance: number;
  type: 'earn' | 'spend';
}

type TierKey = 'bronze' | 'silver' | 'gold' | 'platinum' | 'founders';

interface Tier {
  name: string;
  threshold: number;
  icon: string;
  color: string;
}

type TxFilter = 'all' | 'earned' | 'spent';

/* -------------------------------------------------------------------------- */
/*  Mock data                                                                 */
/* -------------------------------------------------------------------------- */

const TOKEN_BALANCE = 1250;
const LIFETIME_EARNED = 3450;
const EARNED_MONTH = 320;
const REDEEMED_TOTAL = 2200;
const PENDING = 0;

const TIERS: Record<TierKey, Tier> = {
  bronze: { name: 'Bronze', threshold: 0, icon: '\u{1F949}', color: 'from-amber-700 to-amber-500' },
  silver: { name: 'Silver', threshold: 1000, icon: '\u{1FA99}', color: 'from-slate-400 to-slate-300' },
  gold: { name: 'Gold', threshold: 3000, icon: '\u{1F947}', color: 'from-yellow-500 to-amber-400' },
  platinum: { name: 'Platinum', threshold: 7500, icon: '\u{1F48E}', color: 'from-cyan-400 to-blue-500' },
  founders: { name: 'Founders Circle', threshold: 15000, icon: '\u{1F451}', color: 'from-violet-500 to-purple-600' },
};

const TIER_ORDER: TierKey[] = ['bronze', 'silver', 'gold', 'platinum', 'founders'];
const CURRENT_TIER: TierKey = 'silver';

const REWARDS: Reward[] = [
  { id: 'r1', name: '$5 Store Credit', cost: 100, description: 'Apply to any supplement order.', icon: '\u{1F4B5}', category: 'credit' },
  { id: 'r2', name: '$10 Store Credit', cost: 200, description: 'Save on your next purchase.', icon: '\u{1F4B0}', category: 'credit' },
  { id: 'r3', name: 'Free Shipping', cost: 150, description: 'Free standard shipping on your next order.', icon: '\u{1F4E6}', category: 'perk' },
  { id: 'r4', name: '15% Discount', cost: 300, description: 'One-time 15% off your entire cart.', icon: '\u{1F3F7}\uFE0F', category: 'perk' },
  { id: 'r5', name: '$25 Store Credit', cost: 500, description: 'Significant savings on any order.', icon: '\u{1F4B8}', category: 'credit' },
  { id: 'r6', name: 'Free Product Sample', cost: 750, description: 'Try any supplement sample free.', icon: '\u{1F381}', category: 'perk' },
  { id: 'r7', name: '$50 Store Credit', cost: 1000, description: 'Major credit for premium supplements.', icon: '\u{1F4A0}', category: 'credit' },
  { id: 'r8', name: 'Premium Consultation', cost: 1500, description: '1-on-1 session with a wellness advisor.', icon: '\u{1F9D1}\u200D\u2695\uFE0F', category: 'premium' },
  { id: 'r9', name: '$100 Store Credit', cost: 2000, description: 'Ultimate savings for loyal members.', icon: '\u{1F48E}', category: 'credit' },
  { id: 'r10', name: 'Founders Circle VIP', cost: 3000, description: 'Exclusive access, early products, priority support.', icon: '\u{1F451}', category: 'premium' },
];

const EARNING_ACTIONS: EarningAction[] = [
  { id: 'e1', action: 'Complete CAQ', tokens: 500, icon: '\u{1F4CB}', link: '/wellness/caq' },
  { id: 'e2', action: 'Upload Genetics', tokens: 300, icon: '\u{1F9EC}', link: '/wellness/genomics' },
  { id: 'e3', action: 'Daily Adherence', tokens: 10, dailyCap: 10, icon: '\u2705', link: '/wellness/protocol' },
  { id: 'e4', action: 'Purchase Supplements', tokens: 50, icon: '\u{1F6D2}', link: '/wellness/shop' },
  { id: 'e5', action: 'Achieve Health Goal', tokens: 100, icon: '\u{1F3AF}', link: '/wellness' },
  { id: 'e6', action: 'Community Post', tokens: 15, dailyCap: 45, icon: '\u{1F4AC}', link: '/community' },
  { id: 'e7', action: 'Refer a Friend', tokens: 200, icon: '\u{1F91D}', link: '#referral' },
  { id: 'e8', action: 'Import Labs', tokens: 75, icon: '\u{1F9EA}', link: '/wellness/labs' },
  { id: 'e9', action: 'Sync Wearable', tokens: 20, dailyCap: 20, icon: '\u231A', link: '/wellness/wearables' },
  { id: 'e10', action: 'Review Supplement', tokens: 25, dailyCap: 75, icon: '\u2B50', link: '/wellness/shop' },
];

const TRANSACTIONS: Transaction[] = [
  { id: 't1', date: '2026-03-16', description: 'Daily Adherence Logged', amount: 10, balance: 1250, type: 'earn' },
  { id: 't2', date: '2026-03-15', description: 'Community Post', amount: 15, balance: 1240, type: 'earn' },
  { id: 't3', date: '2026-03-15', description: 'Daily Adherence Logged', amount: 10, balance: 1225, type: 'earn' },
  { id: 't4', date: '2026-03-14', description: 'Supplement Purchase Bonus', amount: 50, balance: 1215, type: 'earn' },
  { id: 't5', date: '2026-03-14', description: 'Redeemed: $10 Store Credit', amount: -200, balance: 1165, type: 'spend' },
  { id: 't6', date: '2026-03-13', description: 'Daily Adherence Logged', amount: 10, balance: 1365, type: 'earn' },
  { id: 't7', date: '2026-03-12', description: 'Wearable Sync', amount: 20, balance: 1355, type: 'earn' },
  { id: 't8', date: '2026-03-12', description: 'Review: Magnesium Glycinate', amount: 25, balance: 1335, type: 'earn' },
  { id: 't9', date: '2026-03-11', description: 'Daily Adherence Logged', amount: 10, balance: 1310, type: 'earn' },
  { id: 't10', date: '2026-03-10', description: 'Redeemed: Free Shipping', amount: -150, balance: 1300, type: 'spend' },
  { id: 't11', date: '2026-03-09', description: 'Health Goal Achieved: Sleep 7h+', amount: 100, balance: 1450, type: 'earn' },
  { id: 't12', date: '2026-03-08', description: 'Lab Results Imported', amount: 75, balance: 1350, type: 'earn' },
  { id: 't13', date: '2026-03-07', description: 'Referral: Friend Purchased', amount: 200, balance: 1275, type: 'earn' },
  { id: 't14', date: '2026-03-06', description: 'Redeemed: $5 Store Credit', amount: -100, balance: 1075, type: 'spend' },
  { id: 't15', date: '2026-03-05', description: 'CAQ Module Completed', amount: 500, balance: 1175, type: 'earn' },
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function generateIdempotencyKey(): string {
  return `redeem_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/* -------------------------------------------------------------------------- */
/*  useCountUp hook                                                           */
/* -------------------------------------------------------------------------- */

function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function TokensPage() {
  const [balance, setBalance] = useState(TOKEN_BALANCE);
  const [redeemTarget, setRedeemTarget] = useState<Reward | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState(false);
  const [txFilter, setTxFilter] = useState<TxFilter>('all');
  const [copiedCode, setCopiedCode] = useState(false);

  const animatedBalance = useCountUp(balance);

  /* ---- Next reward calculation ---- */
  const nextReward = useMemo(() => {
    const affordable = REWARDS.filter((r) => r.cost > balance).sort((a, b) => a.cost - b.cost);
    return affordable[0] ?? REWARDS[REWARDS.length - 1];
  }, [balance]);

  const tokensToNext = Math.max(0, nextReward.cost - balance);

  /* ---- Filtered transactions ---- */
  const filteredTx = useMemo(() => {
    if (txFilter === 'earned') return TRANSACTIONS.filter((t) => t.type === 'earn');
    if (txFilter === 'spent') return TRANSACTIONS.filter((t) => t.type === 'spend');
    return TRANSACTIONS;
  }, [txFilter]);

  /* ---- Redemption ---- */
  const handleRedeem = useCallback(() => {
    if (!redeemTarget || balance < redeemTarget.cost) return;
    const _idempotencyKey = generateIdempotencyKey();
    setBalance((b) => b - redeemTarget.cost);
    setRedeemSuccess(true);
    setTimeout(() => {
      setRedeemSuccess(false);
      setRedeemTarget(null);
    }, 2500);
  }, [redeemTarget, balance]);

  /* ---- Referral copy ---- */
  const copyReferralCode = useCallback(() => {
    navigator.clipboard?.writeText('VIA-CHEN-4829');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }, []);

  /* ---- Tier index ---- */
  const currentTierIdx = TIER_ORDER.indexOf(CURRENT_TIER);
  const nextTierKey = TIER_ORDER[currentTierIdx + 1] as TierKey | undefined;
  const nextTier = nextTierKey ? TIERS[nextTierKey] : null;
  const tierProgress = nextTier
    ? ((LIFETIME_EARNED - TIERS[CURRENT_TIER].threshold) /
        (nextTier.threshold - TIERS[CURRENT_TIER].threshold)) *
      100
    : 100;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-10">
        {/* ---------------------------------------------------------------- */}
        {/*  Header                                                          */}
        {/* ---------------------------------------------------------------- */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">FarmaTokens</h1>
              <p className="mt-1 text-slate-400">Earn rewards for your wellness journey</p>
            </div>
            <Link href="/wellness/tokens/gamification">
              <Button variant="outline" className="!border-violet-500 !text-violet-400 hover:!bg-violet-500/10">
                Gamification Hub
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* ---------------------------------------------------------------- */}
        {/*  Token Balance Hero                                              */}
        {/* ---------------------------------------------------------------- */}
        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <Card
            padding="lg"
            className={`${glassClasses.dark} relative overflow-hidden`}
          >
            <div className="flex flex-col items-center text-center lg:flex-row lg:text-left lg:gap-12">
              {/* Glowing token circle */}
              <div className="relative flex-shrink-0 mb-6 lg:mb-0">
                <motion.div
                  className="relative flex h-40 w-40 items-center justify-center rounded-full"
                  animate={{ boxShadow: ['0 0 30px rgba(139,92,246,0.4)', '0 0 60px rgba(139,92,246,0.7)', '0 0 30px rgba(139,92,246,0.4)'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-600/30 to-cyan-500/20 backdrop-blur-sm border border-violet-500/40" />
                  <div className="relative z-10">
                    <p className="text-4xl font-extrabold text-white tabular-nums">
                      {animatedBalance.toLocaleString()}
                    </p>
                    <p className="text-sm font-semibold text-violet-300">FT</p>
                  </div>
                </motion.div>
              </div>

              {/* Stats */}
              <div className="flex-1 space-y-4">
                <p className="text-sm text-slate-400">
                  Lifetime earned:{' '}
                  <span className="font-semibold text-violet-300">{LIFETIME_EARNED.toLocaleString()} FT</span>
                </p>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Earned This Month', value: EARNED_MONTH, color: 'text-emerald-400' },
                    { label: 'Redeemed', value: REDEEMED_TOTAL, color: 'text-amber-400' },
                    { label: 'Pending', value: PENDING, color: 'text-slate-400' },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className={`rounded-lg ${glassClasses.dark} p-3 text-center`}
                    >
                      <p className={`text-xl font-bold ${stat.color} tabular-nums`}>
                        {stat.value.toLocaleString()} FT
                      </p>
                      <p className="text-xs text-slate-500">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </motion.section>

        {/* ---------------------------------------------------------------- */}
        {/*  Progress to Next Tier                                           */}
        {/* ---------------------------------------------------------------- */}
        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={2}>
          <Card padding="lg" className={glassClasses.dark}>
            <CardHeader>
              <CardTitle className="!text-white flex items-center gap-2">
                <span className="text-2xl">{TIERS[CURRENT_TIER].icon}</span>
                {TIERS[CURRENT_TIER].name} Member
                <Badge variant="info" className="ml-2">Current Tier</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Progress bar to next reward */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-400">Progress to &quot;{nextReward.name}&quot;</span>
                  <span className="text-violet-300 font-medium">
                    {tokensToNext > 0 ? `${tokensToNext} FT to go` : 'Redeemable!'}
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((balance / nextReward.cost) * 100, 100)}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                  />
                </div>
              </div>

              {/* Tier progression */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {TIER_ORDER.map((key, i) => {
                  const tier = TIERS[key];
                  const isActive = key === CURRENT_TIER;
                  const isUnlocked = i <= currentTierIdx;
                  return (
                    <div key={key} className="flex items-center gap-2 flex-shrink-0">
                      <div
                        className={`flex flex-col items-center rounded-xl px-4 py-3 border transition-all ${
                          isActive
                            ? 'border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/20'
                            : isUnlocked
                            ? 'border-slate-600 bg-slate-800/50'
                            : 'border-slate-700/50 bg-slate-900/30 opacity-50'
                        }`}
                      >
                        <span className="text-2xl">{tier.icon}</span>
                        <span className={`text-xs mt-1 ${isActive ? 'text-violet-300 font-semibold' : 'text-slate-500'}`}>
                          {tier.name}
                        </span>
                        <span className="text-[10px] text-slate-600">
                          {tier.threshold.toLocaleString()} FT
                        </span>
                      </div>
                      {i < TIER_ORDER.length - 1 && (
                        <div className={`h-px w-6 ${i < currentTierIdx ? 'bg-violet-500' : 'bg-slate-700'}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Tier progress bar */}
              {nextTier && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{TIERS[CURRENT_TIER].name} ({TIERS[CURRENT_TIER].threshold.toLocaleString()} FT)</span>
                    <span>{nextTier.name} ({nextTier.threshold.toLocaleString()} FT)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(tierProgress, 100)}%` }}
                      transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.section>

        {/* ---------------------------------------------------------------- */}
        {/*  Reward Tiers Grid                                               */}
        {/* ---------------------------------------------------------------- */}
        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={3}>
          <h2 className="text-xl font-bold text-white mb-4">Redemption Catalog</h2>
          <motion.div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {REWARDS.map((reward) => {
              const canRedeem = balance >= reward.cost;
              const progress = Math.min((balance / reward.cost) * 100, 100);
              const tokensNeeded = reward.cost - balance;

              return (
                <motion.div key={reward.id} variants={scaleIn}>
                  <Card
                    padding="md"
                    className={`${glassClasses.dark} h-full flex flex-col transition-all ${
                      canRedeem
                        ? 'border-violet-500/50 shadow-lg shadow-violet-500/10 hover:shadow-violet-500/20'
                        : ''
                    }`}
                  >
                    <CardHeader className="!mb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{reward.icon}</span>
                        <Badge
                          variant={canRedeem ? 'success' : 'default'}
                          className={canRedeem ? '!bg-violet-500/20 !text-violet-300' : ''}
                        >
                          {reward.cost.toLocaleString()} FT
                        </Badge>
                      </div>
                      <CardTitle className="!text-white !text-base mt-2">{reward.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="text-xs text-slate-400 mb-3">{reward.description}</p>
                      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            canRedeem
                              ? 'bg-gradient-to-r from-violet-500 to-cyan-400'
                              : 'bg-slate-600'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        {canRedeem ? 'Ready to redeem' : `${tokensNeeded.toLocaleString()} more FT needed`}
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button
                        size="sm"
                        disabled={!canRedeem}
                        onClick={() => setRedeemTarget(reward)}
                        className={
                          canRedeem
                            ? '!bg-violet-600 hover:!bg-violet-700 w-full'
                            : 'w-full'
                        }
                      >
                        {canRedeem ? 'Redeem' : `${tokensNeeded.toLocaleString()} more needed`}
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.section>

        {/* ---------------------------------------------------------------- */}
        {/*  Redemption Modal                                                */}
        {/* ---------------------------------------------------------------- */}
        <AnimatePresence>
          {redeemTarget && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => {
                  if (!redeemSuccess) {
                    setRedeemTarget(null);
                  }
                }}
              />

              {/* Modal */}
              <motion.div
                className={`relative z-10 w-full max-w-md rounded-2xl ${glassClasses.dark} p-6 border-violet-500/30`}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              >
                {redeemSuccess ? (
                  /* Success state */
                  <motion.div
                    className="text-center py-6"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    <motion.div
                      className="text-6xl mb-4"
                      animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 0.6 }}
                    >
                      {'\u2728'}
                    </motion.div>
                    <h3 className="text-xl font-bold text-white mb-2">Redemption Successful!</h3>
                    <p className="text-slate-400 text-sm">
                      Your <span className="text-violet-300">{redeemTarget.name}</span> reward is being processed.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-4 py-2">
                      <span className="text-sm text-violet-300">
                        New Balance: {balance.toLocaleString()} FT
                      </span>
                    </div>
                  </motion.div>
                ) : (
                  /* Confirmation state */
                  <>
                    <div className="text-center mb-6">
                      <span className="text-4xl">{redeemTarget.icon}</span>
                      <h3 className="text-xl font-bold text-white mt-3">{redeemTarget.name}</h3>
                      <p className="text-sm text-slate-400 mt-1">{redeemTarget.description}</p>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Token Cost</span>
                        <span className="text-white font-semibold">-{redeemTarget.cost.toLocaleString()} FT</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Current Balance</span>
                        <span className="text-white font-semibold">{balance.toLocaleString()} FT</span>
                      </div>
                      <div className="h-px bg-slate-700" />
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Remaining After</span>
                        <span className="text-violet-300 font-bold">
                          {(balance - redeemTarget.cost).toLocaleString()} FT
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="ghost"
                        className="flex-1 !text-slate-400"
                        onClick={() => setRedeemTarget(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1 !bg-violet-600 hover:!bg-violet-700"
                        onClick={handleRedeem}
                      >
                        Confirm Redemption
                      </Button>
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------------------------------------------------------------- */}
        {/*  Earning Opportunities                                           */}
        {/* ---------------------------------------------------------------- */}
        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={4}>
          <h2 className="text-xl font-bold text-white mb-4">Earn More Tokens</h2>
          <motion.div
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {EARNING_ACTIONS.map((ea) => (
              <motion.div key={ea.id} variants={scaleIn}>
                <Card padding="sm" className={`${glassClasses.dark} hover:border-violet-500/30 transition-all`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl flex-shrink-0">{ea.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{ea.action}</p>
                      <p className="text-xs text-violet-300 font-semibold">
                        +{ea.tokens} FT
                        {ea.dailyCap ? ` (max ${ea.dailyCap}/day)` : ''}
                      </p>
                    </div>
                    <Link href={ea.link}>
                      <Button size="sm" variant="ghost" className="!text-violet-400 flex-shrink-0 !px-2">
                        Start
                      </Button>
                    </Link>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* ---------------------------------------------------------------- */}
        {/*  Transaction History                                             */}
        {/* ---------------------------------------------------------------- */}
        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={5}>
          <Card padding="lg" className={glassClasses.dark}>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="!text-white">Transaction History</CardTitle>
                <div className="flex gap-1">
                  {(['all', 'earned', 'spent'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setTxFilter(f)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                        txFilter === f
                          ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                          : 'text-slate-500 hover:text-slate-300 border border-transparent'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                {/* Table header */}
                <div className="grid grid-cols-[100px_1fr_90px_90px] gap-2 text-xs text-slate-500 font-medium pb-2 border-b border-slate-800 sticky top-0 bg-slate-950/90 backdrop-blur-sm">
                  <span>Date</span>
                  <span>Description</span>
                  <span className="text-right">Amount</span>
                  <span className="text-right">Balance</span>
                </div>

                <AnimatePresence mode="popLayout">
                  {filteredTx.map((tx, i) => (
                    <motion.div
                      key={tx.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: i * 0.03 }}
                      className="grid grid-cols-[100px_1fr_90px_90px] gap-2 items-center py-2 text-sm border-b border-slate-800/50 hover:bg-white/[0.02] rounded"
                    >
                      <span className="text-slate-500 text-xs">{tx.date}</span>
                      <span className="text-slate-300 truncate text-xs">{tx.description}</span>
                      <span
                        className={`text-right text-xs font-semibold tabular-nums ${
                          tx.type === 'earn' ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {tx.type === 'earn' ? '+' : ''}{tx.amount.toLocaleString()} FT
                      </span>
                      <span className="text-right text-xs text-slate-400 tabular-nums">
                        {tx.balance.toLocaleString()} FT
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* ---------------------------------------------------------------- */}
        {/*  Referral Section                                                */}
        {/* ---------------------------------------------------------------- */}
        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={6}>
          <Card padding="lg" className={`${glassClasses.dark} border-violet-500/20`}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:gap-10">
              <div className="flex-1">
                <CardHeader>
                  <CardTitle className="!text-white !text-xl">
                    Invite Friends, Earn Tokens
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-400 mb-4">
                    Share your referral code and earn <span className="text-violet-300 font-semibold">200 FT</span>{' '}
                    for each friend who makes their first purchase.
                  </p>

                  {/* Referral code */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 rounded-lg bg-slate-800/80 border border-slate-700 px-4 py-3 font-mono text-lg text-violet-300 text-center tracking-wider">
                      VIA-CHEN-4829
                    </div>
                    <Button
                      size="sm"
                      className="!bg-violet-600 hover:!bg-violet-700 flex-shrink-0"
                      onClick={copyReferralCode}
                    >
                      {copiedCode ? 'Copied!' : 'Copy Code'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="!border-violet-500 !text-violet-400 flex-shrink-0"
                    >
                      Share Link
                    </Button>
                  </div>
                </CardContent>
              </div>

              {/* Referral stats */}
              <div className="grid grid-cols-3 gap-4 lg:gap-6">
                {[
                  { label: 'Friends Invited', value: 3 },
                  { label: 'Purchases Made', value: 2 },
                  { label: 'FT Earned', value: 500 },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-2xl font-bold text-violet-300 tabular-nums">{s.value}</p>
                    <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </motion.section>

        {/* Bottom spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
}
