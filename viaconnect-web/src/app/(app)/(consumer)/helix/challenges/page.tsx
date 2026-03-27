'use client';

const GLASS =
  'bg-[rgba(26,39,68,0.55)] backdrop-blur-[24px] border border-white/[0.08] rounded-2xl';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
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
/*  Helpers                                                            */
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

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ChallengesPage() {
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
