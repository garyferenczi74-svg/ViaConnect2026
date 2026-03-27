'use client';

import { Check, Circle } from 'lucide-react';

const GLASS =
  'bg-[rgba(26,39,68,0.55)] backdrop-blur-[24px] border border-white/[0.08] rounded-2xl';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
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
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function Overline({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest text-[#B75E18] mb-3">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function EarnPage() {
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
