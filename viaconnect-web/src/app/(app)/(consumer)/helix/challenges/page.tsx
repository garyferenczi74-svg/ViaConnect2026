'use client';

import { motion } from 'framer-motion';
import { ChallengeCard } from '@/components/helix/ChallengeCard';
import { useHelixConsumerSnapshot } from '@/hooks/useHelixConsumerSnapshot';
import { CHALLENGES_EMPTY } from '@/lib/helix/consumer-honesty';

export default function ChallengesPage() {
  const { loading, challenges } = useHelixConsumerSnapshot();

  return (
    <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-[22px] font-extrabold text-[#B75E18]">All Challenges</h2>
        <p className="text-[14px] text-white/40 mt-1">
          Join challenges, earn bonus Helix, and compete with your squad
        </p>
      </motion.div>

      {challenges.length === 0 ? (
        <p className="text-sm text-white/45">{loading ? 'Loading' : CHALLENGES_EMPTY}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {challenges.map((ch, i) => (
            <ChallengeCard
              key={ch.id}
              type={ch.type}
              title={ch.title}
              description={ch.description}
              helix={ch.helix}
              active={ch.active}
              progress={ch.progress}
              participants={ch.participants}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}
