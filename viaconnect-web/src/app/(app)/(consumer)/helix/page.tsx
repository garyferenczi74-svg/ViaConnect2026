'use client';

import { useState } from 'react';
import { HelixBalance } from '@/components/helix-rewards/HelixBalance';
import {
  Copy,
  Share2,
  Shield,
  Lock,
  UserX,
  LogOut,
  Check,
  Circle,
  ChevronRight,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Constants & Types                                                  */
/* ------------------------------------------------------------------ */

const TABS = ['Arena', 'Challenges', 'Earn', 'Redeem', 'Refer', 'Research'] as const;
type Tab = (typeof TABS)[number];

const GLASS =
  'bg-[rgba(26,39,68,0.55)] backdrop-blur-[24px] border border-white/[0.08] rounded-2xl';

/* ------------------------------------------------------------------ */
/*  Earn Tab Data                                                      */
/* ------------------------------------------------------------------ */

interface DailyAction {
  emoji: string;
  name: string;
  helix: number;
  completed: boolean;
}

const DAILY_ACTIONS: DailyAction[] = [
  { emoji: '💊', name: 'Morning Supplements', helix: 25, completed: true },
  { emoji: '📋', name: 'Daily Check-in', helix: 10, completed: true },
  { emoji: '👟', name: '5K Steps', helix: 10, completed: true },
  { emoji: '💊', name: 'Afternoon Supplements', helix: 25, completed: false },
  { emoji: '🥗', name: 'Lunch Log', helix: 15, completed: false },
  { emoji: '👟', name: '10K Steps', helix: 30, completed: false },
  { emoji: '💪', name: 'Workout', helix: 35, completed: false },
  { emoji: '💊', name: 'Evening Supplements', helix: 25, completed: false },
];

const CATEGORIES = [
  { emoji: '💊', name: 'Daily Supplements', reward: '+75/day' },
  { emoji: '👟', name: 'Steps', reward: '+10-50' },
  { emoji: '🥗', name: 'Nutrition', reward: '+45/day' },
  { emoji: '✅', name: 'Check-in', reward: '+10' },
  { emoji: '💪', name: 'Workout', reward: '+35' },
  { emoji: '🏆', name: 'Challenges', reward: '+100-1000' },
  { emoji: '🤝', name: 'Referrals', reward: '+500' },
  { emoji: '🔬', name: 'Research', reward: '+200/mo' },
];

/* ------------------------------------------------------------------ */
/*  Arena Tab Data                                                     */
/* ------------------------------------------------------------------ */

const PODIUM = [
  { rank: 1, name: 'Sarah K.', helix: 4280, medal: '🥇', borderColor: '#FFD700', isYou: false },
  { rank: 2, name: 'You', helix: 2847, medal: '🥈', borderColor: '#C0C0C0', isYou: true },
  { rank: 3, name: 'Mike R.', helix: 2195, medal: '🥉', borderColor: '#CD7F32', isYou: false },
];

const RANKED_LIST = [
  { rank: 4, name: 'Jessica L.', helix: 2010 },
  { rank: 5, name: 'David T.', helix: 1875 },
  { rank: 6, name: 'Amanda W.', helix: 1640 },
  { rank: 7, name: 'Chris P.', helix: 1520 },
  { rank: 8, name: 'Rachel N.', helix: 1390 },
  { rank: 9, name: 'Tom B.', helix: 1205 },
  { rank: 10, name: 'Laura G.', helix: 1100 },
];

/* ------------------------------------------------------------------ */
/*  Challenges Tab Data                                                */
/* ------------------------------------------------------------------ */

const CHALLENGES = [
  {
    emoji: '👟',
    title: '10K Steps Challenge',
    duration: '7 days',
    reward: 500,
    progress: '4/7 days completed',
    percent: 57,
    participants: 23,
  },
  {
    emoji: '💊',
    title: 'Supplement Streak',
    duration: '14 days',
    reward: 750,
    progress: '9/14 days',
    percent: 64,
    participants: 23,
  },
  {
    emoji: '🥗',
    title: 'Meal Logger',
    duration: '21 days',
    reward: 1000,
    progress: '12/63 meals',
    percent: 19,
    participants: 23,
  },
];

/* ------------------------------------------------------------------ */
/*  Redeem Tab Data                                                    */
/* ------------------------------------------------------------------ */

const REWARDS = [
  { icon: '🎯', name: 'Custom Supplement Sample', cost: 500, desc: 'Try a personalized blend' },
  { icon: '📦', name: '10% Off Next Order', cost: 750, desc: 'Discount on any subscription' },
  { icon: '🧬', name: 'Bonus Genetic Insight', cost: 1000, desc: 'Unlock an extra report section' },
  { icon: '🎧', name: 'Wellness Podcast Pass', cost: 250, desc: '1-month premium access' },
  { icon: '📖', name: 'E-Book: Longevity Guide', cost: 400, desc: 'Digital download' },
  { icon: '🏋️', name: 'Workout Plan (30-Day)', cost: 1500, desc: 'Custom training program' },
  { icon: '🥗', name: 'Meal Plan Generator', cost: 2000, desc: 'AI-powered weekly plans' },
  { icon: '💎', name: 'VIP Consultation', cost: 5000, desc: '30-min with a health coach' },
];

const USER_BALANCE = 2847;

/* ------------------------------------------------------------------ */
/*  Research Tab Data                                                  */
/* ------------------------------------------------------------------ */

const RESEARCH_TOGGLES = [
  {
    id: 'supplement',
    label: 'Supplement Adherence',
    desc: 'Share daily supplement completion data',
  },
  {
    id: 'biomarker',
    label: 'Biomarker Trends',
    desc: 'Share bloodwork & biomarker changes over time',
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle Metrics',
    desc: 'Share steps, sleep, and activity data',
  },
  {
    id: 'genomic',
    label: 'Genomic Outcomes',
    desc: 'Share anonymized genetic health correlations',
  },
];

const PRIVACY_ITEMS = [
  { icon: Shield, text: 'HIPAA-compliant data handling' },
  { icon: Lock, text: 'End-to-end encryption' },
  { icon: UserX, text: 'Data is never sold to third parties' },
  { icon: LogOut, text: 'Withdraw anytime with full data deletion' },
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function Overline({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest text-[#B75E18] mb-3">
      {children}
    </p>
  );
}

function ProgressBar({ percent, className = '' }: { percent: number; className?: string }) {
  return (
    <div className={`w-full h-2 rounded-full bg-[#1A2744] ${className}`}>
      <div
        className="h-2 rounded-full bg-[#2DA5A0] transition-all duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function Toggle({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        on ? 'bg-[#2DA5A0]' : 'bg-[#1A2744]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
          on ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab Sections                                                       */
/* ------------------------------------------------------------------ */

function EarnTab() {
  const earned = DAILY_ACTIONS.filter((a) => a.completed).reduce((s, a) => s + a.helix, 0);
  const possible = DAILY_ACTIONS.reduce((s, a) => s + a.helix, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Today's activity */}
      <div>
        <Overline>Today&apos;s Helix Activity</Overline>
        <div className="flex flex-col gap-2">
          {DAILY_ACTIONS.map((action) => (
            <div
              key={action.name}
              className={`${GLASS} p-3 flex items-center gap-3`}
            >
              <span className="text-lg">{action.emoji}</span>
              <span className="text-sm text-white flex-1">{action.name}</span>
              <span className="text-sm font-bold text-[#2DA5A0]">+{action.helix}</span>
              {action.completed ? (
                <Check className="w-5 h-5 text-[#2DA5A0]" />
              ) : (
                <Circle className="w-5 h-5 text-white/20" />
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className={`${GLASS} p-3 mt-3 text-center`}>
          <span className="text-sm text-white">
            Today: <span className="font-bold text-[#2DA5A0]">+{earned} earned</span> /{' '}
            {possible} possible
          </span>
        </div>
      </div>

      {/* Categories */}
      <div>
        <Overline>Earning Categories</Overline>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CATEGORIES.map((cat) => (
            <div key={cat.name} className={`${GLASS} p-4 text-center`}>
              <span className="text-2xl">{cat.emoji}</span>
              <p className="text-sm text-white mt-2 font-medium">{cat.name}</p>
              <p className="text-xs text-[#2DA5A0] font-bold mt-1">{cat.reward}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ArenaTab() {
  const maxHelix = PODIUM[0].helix;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Overline>Weekly Leaderboard</Overline>
        <p className="text-xs text-tertiary mb-4">Resets in 3d 14h</p>

        {/* Podium */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {PODIUM.map((entry) => (
            <div
              key={entry.rank}
              className={`${GLASS} p-4 text-center border-t-2 ${
                entry.isYou ? '!border-[#2DA5A0]' : ''
              }`}
              style={
                !entry.isYou
                  ? { borderTopColor: entry.borderColor }
                  : undefined
              }
            >
              <span className="text-2xl">{entry.medal}</span>
              <p className="text-sm font-bold text-white mt-2">{entry.name}</p>
              <p className="text-lg font-extrabold text-[#2DA5A0]">
                {entry.helix.toLocaleString()}
              </p>
              <p className="text-xs text-tertiary">Helix$</p>
            </div>
          ))}
        </div>

        {/* Full list */}
        <div className="flex flex-col gap-2">
          {RANKED_LIST.map((entry) => (
            <div key={entry.rank} className={`${GLASS} p-3 flex items-center gap-3`}>
              <span className="text-sm font-bold text-white/50 w-6 text-center">
                {entry.rank}
              </span>
              <span className="text-sm text-white flex-1">{entry.name}</span>
              <span className="text-sm font-bold text-[#2DA5A0]">
                {entry.helix.toLocaleString()}
              </span>
              <div className="w-20">
                <ProgressBar percent={(entry.helix / maxHelix) * 100} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChallengesTab() {
  return (
    <div className="flex flex-col gap-4">
      <Overline>Active Challenges</Overline>
      {CHALLENGES.map((ch) => (
        <div key={ch.title} className={`${GLASS} p-4 flex flex-col gap-3`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">{ch.emoji}</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">{ch.title}</p>
              <p className="text-xs text-[#2DA5A0]">
                {ch.duration} &middot; {ch.reward.toLocaleString()} Helix$
              </p>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/70">{ch.progress}</span>
              <span className="text-[#2DA5A0] font-bold">{ch.percent}%</span>
            </div>
            <ProgressBar percent={ch.percent} />
          </div>
          <p className="text-xs text-tertiary">{ch.participants} participants</p>
        </div>
      ))}
    </div>
  );
}

function RedeemTab() {
  return (
    <div className="flex flex-col gap-4">
      <Overline>Rewards Marketplace</Overline>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {REWARDS.map((rw) => {
          const canAfford = USER_BALANCE >= rw.cost;
          const needed = rw.cost - USER_BALANCE;
          return (
            <div
              key={rw.name}
              className={`${GLASS} p-4 flex flex-col gap-2 ${
                canAfford ? '' : 'opacity-50'
              }`}
            >
              <span className="text-2xl">{rw.icon}</span>
              <p className="text-sm font-bold text-white">{rw.name}</p>
              <p className="text-xs text-tertiary">{rw.desc}</p>
              <p className="text-sm font-extrabold text-[#2DA5A0]">
                {rw.cost.toLocaleString()} Helix$
              </p>
              {canAfford ? (
                <button className="mt-auto w-full py-2 rounded-xl bg-[#2DA5A0] text-white text-sm font-bold hover:bg-[#2DA5A0]/80 transition-colors">
                  Redeem
                </button>
              ) : (
                <button
                  disabled
                  className="mt-auto w-full py-2 rounded-xl bg-white/10 text-white/40 text-sm font-bold cursor-not-allowed"
                >
                  Need {needed.toLocaleString()} more
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReferTab() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('https://viaconnect.com/ref/GARY-VIA-2026');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-5">
      <Overline>Refer Friends, Earn Helix$</Overline>

      {/* Referral code */}
      <div
        className={`${GLASS} p-6 text-center border border-dashed border-white/20 cursor-pointer`}
        onClick={handleCopy}
      >
        <p className="font-mono text-xl text-[#2DA5A0] font-bold">GARY-VIA-2026</p>
        <p className="text-xs text-tertiary mt-1">{copied ? 'Copied!' : 'Tap to copy'}</p>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#2DA5A0] text-white text-sm font-bold hover:bg-[#2DA5A0]/80 transition-colors"
        >
          <Copy className="w-4 h-4" />
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/20 text-white text-sm font-bold hover:bg-white/5 transition-colors">
          <Share2 className="w-4 h-4" />
          Share via Text
        </button>
      </div>

      {/* Stats */}
      <div className={`${GLASS} p-4 text-center`}>
        <p className="text-sm text-white">
          <span className="font-bold">3</span> Invited &middot;{' '}
          <span className="font-bold">2</span> Joined &middot;{' '}
          <span className="font-bold text-[#2DA5A0]">1,500 Helix$</span> Earned
        </p>
      </div>

      {/* Tier info */}
      <div className={`${GLASS} p-4`}>
        <p className="text-xs text-tertiary leading-relaxed">
          <span className="text-white font-bold">You: +500</span> &middot;{' '}
          <span className="text-white font-bold">Friend: +250</span> &middot;{' '}
          Friend subscribes: <span className="text-[#2DA5A0] font-bold">+1,000 more to you</span>
        </p>
      </div>
    </div>
  );
}

function ResearchTab() {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    supplement: false,
    biomarker: false,
    lifestyle: false,
    genomic: false,
  });

  const handleToggle = (id: string) => {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col gap-5">
      <Overline>Share for Science</Overline>

      {/* Anonymous badge */}
      <span className="inline-flex self-start items-center px-3 py-1 rounded-full text-xs font-bold bg-[#2DA5A0]/20 text-[#2DA5A0] border border-[#2DA5A0]/30">
        100% Anonymous & Encrypted
      </span>

      {/* Toggles */}
      <div className={`${GLASS} p-4 flex flex-col gap-4`}>
        {RESEARCH_TOGGLES.map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            <Toggle on={toggles[item.id]} onToggle={() => handleToggle(item.id)} />
            <div className="flex-1">
              <p className="text-sm text-white font-medium">{item.label}</p>
              <p className="text-xs text-tertiary">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Reward note */}
      <p className="text-sm font-bold text-[#2DA5A0] text-center">
        +200 Helix$/month when enrolled
      </p>

      {/* Enroll button */}
      <button className="w-full py-3 rounded-xl bg-gradient-to-r from-[#2DA5A0] to-[#2DA5A0]/70 text-white text-sm font-bold hover:opacity-90 transition-opacity">
        Enroll in Research
      </button>

      {/* Privacy */}
      <div className={`${GLASS} p-4 flex flex-col gap-3`}>
        {PRIVACY_ITEMS.map((item) => (
          <div key={item.text} className="flex items-center gap-3">
            <item.icon className="w-4 h-4 text-[#2DA5A0] flex-shrink-0" />
            <span className="text-xs text-white/70">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function HelixPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Earn');

  const renderTab = () => {
    switch (activeTab) {
      case 'Arena':
        return <ArenaTab />;
      case 'Challenges':
        return <ChallengesTab />;
      case 'Earn':
        return <EarnTab />;
      case 'Redeem':
        return <RedeemTab />;
      case 'Refer':
        return <ReferTab />;
      case 'Research':
        return <ResearchTab />;
    }
  };

  return (
    <div
      className="min-h-screen px-4 lg:px-6 py-6"
      style={{ background: 'var(--gradient-hero)' }}
    >
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        {/* Hero Balance */}
        <div className={`${GLASS} p-6`}>
          <HelixBalance
            balance={2847}
            streak={14}
            level={4}
            levelName="Vitality Champion"
            lifetimeEarned={12480}
            xpCurrent={3500}
            xpToNextLevel={7000}
            nextLevelName="Bio-Optimizer"
          />
        </div>

        {/* Nav Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#2DA5A0]/15 text-[#2DA5A0] border border-[#2DA5A0]/40'
                    : `${GLASS} text-secondary hover:text-white`
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {renderTab()}
      </div>
    </div>
  );
}
