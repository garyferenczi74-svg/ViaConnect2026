'use client';

const GLASS =
  'bg-[rgba(26,39,68,0.55)] backdrop-blur-[24px] border border-white/[0.08] rounded-2xl';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
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

export default function RedeemPage() {
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
