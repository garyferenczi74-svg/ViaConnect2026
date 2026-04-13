'use client';

import { motion } from 'framer-motion';
import { ChallengeCard } from '@/components/helix/ChallengeCard';

/* ------------------------------------------------------------------ */
/*  Data — All 8 Challenges                                            */
/* ------------------------------------------------------------------ */

const CHALLENGES = [
  { type: 'steps',       title: '10K Steps Sprint',  description: 'Hit 10,000 steps every day for a week. Walking, running, or hiking — every step counts toward the goal.', helix: 500,   active: true,  progress: 71, participants: 5 },
  { type: 'supplements', title: 'Perfect Protocol',  description: 'Take all supplements on time for 14 consecutive days. Morning, afternoon, and evening doses.', helix: 750,   active: true,  progress: 43, participants: 3 },
  { type: 'nutrition',   title: 'Clean Plate Club',  description: 'Log every meal for 21 days straight. Breakfast, lunch, dinner, and snacks all count.', helix: 600,   active: true,  progress: 85, participants: 4 },
  { type: 'workout',     title: 'Iron Week',         description: 'Complete 5 full workouts in 7 days. Strength, cardio, or flexibility training all qualify.', helix: 800,   active: true,  progress: 60, participants: 2 },
  { type: 'weight',      title: 'Goal Crusher',      description: 'Hit your target weight goal within 60 days. Consistent tracking and healthy habits are key.', helix: 1000,  active: false, progress: 35, participants: 6 },
  { type: 'checkin',     title: 'Daily Pulse',        description: 'Complete your daily wellness check-in for 30 consecutive days without missing one.', helix: 450,   active: false, progress: 52, participants: 2 },
  { type: 'markers',     title: 'Biomarker Blitz',   description: 'Record all required biomarkers for 30 days. Blood pressure, glucose, and more.', helix: 900,   active: true,  progress: 40, participants: 3 },
  { type: 'sleep',       title: 'Dream Machine',     description: 'Log 7+ hours of quality sleep for 14 consecutive nights. Better sleep, better health.', helix: 550,   active: false, progress: 30, participants: 2 },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ChallengesPage() {
  return (
    <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      {/* Header */}
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

      {/* Challenge grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        {CHALLENGES.map((ch, i) => (
          <ChallengeCard
            key={ch.title}
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
    </div>
  );
}
