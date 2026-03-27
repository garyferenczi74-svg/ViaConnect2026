'use client';

const GLASS =
  'bg-[rgba(26,39,68,0.55)] backdrop-blur-[24px] border border-white/[0.08] rounded-2xl';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
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

export default function ArenaPage() {
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
