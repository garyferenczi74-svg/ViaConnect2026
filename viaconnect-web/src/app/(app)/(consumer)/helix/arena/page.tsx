'use client';

import { motion } from 'framer-motion';
import { GlassCard } from '@/components/helix/GlassCard';
import { AvatarRing } from '@/components/helix/AvatarRing';
import { LeaderboardBar } from '@/components/helix/LeaderboardBar';
import { ChallengeCard } from '@/components/helix/ChallengeCard';
import { HelixIcon } from '@/components/helix/HelixIcon';
import { Swords, MessageCircle, Flame } from 'lucide-react';
import { useHelixConsumerSnapshot } from '@/hooks/useHelixConsumerSnapshot';
import {
  CHALLENGES_EMPTY,
  LEADERBOARD_EMPTY,
  SQUAD_CHAT_EMPTY,
  leaderboardMaxHelix,
} from '@/lib/helix/consumer-honesty';

export default function ArenaPage() {
  const { leaderboard, challenges } = useHelixConsumerSnapshot();
  const maxHelix = leaderboardMaxHelix(leaderboard);
  const podium = leaderboard
    .filter((row) => row.rank >= 1 && row.rank <= 3)
    .sort((a, b) => {
      const order: Record<number, number> = { 2: 0, 1: 1, 3: 2 };
      return (order[a.rank] ?? a.rank) - (order[b.rank] ?? b.rank);
    });
  const active = challenges.filter((ch) => ch.active);

  return (
    <div className="flex flex-col gap-6 md:gap-8 p-4 md:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <GlassCard glow>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="flex items-center gap-2 text-[20px] font-extrabold text-[#B75E18]">
                <Swords size={20} strokeWidth={1.5} className="text-[#B75E18]" />
                Weekly Arena
              </h2>
              <p className="text-[11px] text-white/35 font-semibold mt-1">
                {leaderboard.length === 0 ? LEADERBOARD_EMPTY : `${leaderboard.length} ranked`}
              </p>
            </div>
          </div>

          {podium.length > 0 ? (
            <div className="flex items-end justify-center gap-3 md:gap-4 mb-6 md:mb-8">
              {podium.map((user) => {
                const heights: Record<number, number> = { 1: 110, 2: 90, 3: 75 };
                const medalColors: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };
                return (
                  <motion.div
                    key={`${user.rank}-${user.name}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: user.rank * 0.15, duration: 0.6 }}
                    className="flex flex-col items-center"
                  >
                    <AvatarRing
                      initials={user.initials}
                      color={user.color}
                      helix={user.helix}
                      maxHelix={maxHelix || user.helix || 1}
                      rank={user.rank}
                      size={user.rank === 1 ? 64 : 52}
                      online={false}
                    />
                    <span className="text-[12px] font-bold text-white mt-2">{user.name}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <HelixIcon size={11} />
                      <span className="text-[11px] font-extrabold text-white/55">
                        {user.helix.toLocaleString()}
                      </span>
                    </div>
                    <div
                      className="w-16 rounded-t-lg mt-2"
                      style={{
                        height: heights[user.rank] ?? 75,
                        background: `linear-gradient(180deg, ${medalColors[user.rank] ?? '#2DA5A0'}44, ${medalColors[user.rank] ?? '#2DA5A0'}11)`,
                        borderTop: `2px solid ${medalColors[user.rank] ?? '#2DA5A0'}66`,
                      }}
                    />
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-white/45 mb-6">{LEADERBOARD_EMPTY}</p>
          )}

          <div className="flex flex-col gap-1.5">
            {leaderboard.map((user, i) => (
              <LeaderboardBar
                key={`${user.rank}-${user.name}`}
                rank={user.rank}
                name={user.name}
                initials={user.initials}
                helix={user.helix}
                maxHelix={maxHelix || user.helix || 1}
                color={user.color}
                isYou={user.isYou}
                index={i}
              />
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-5">
            <h2 className="flex items-center gap-2 text-[20px] font-extrabold text-[#B75E18]">
              <MessageCircle size={20} strokeWidth={1.5} className="text-[#B75E18]" />
              Squad Chat
            </h2>
          </div>
          <p className="text-sm text-white/45 leading-relaxed">{SQUAD_CHAT_EMPTY}</p>
        </GlassCard>
      </div>

      <div>
        <h2 className="flex items-center gap-2 text-[20px] font-extrabold text-[#B75E18] mb-4">
          <Flame size={20} strokeWidth={1.5} className="text-[#B75E18]" />
          Active Challenges
        </h2>
        {active.length === 0 ? (
          <p className="text-sm text-white/45">{CHALLENGES_EMPTY}</p>
        ) : (
          <div className="flex gap-3 md:gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide">
            {active.map((ch, i) => (
              <div key={ch.id} className="snap-start flex-shrink-0 w-[260px] md:w-[280px]">
                <ChallengeCard
                  type={ch.type}
                  title={ch.title}
                  description={ch.description}
                  helix={ch.helix}
                  active={ch.active}
                  progress={ch.progress}
                  participants={ch.participants}
                  index={i}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
