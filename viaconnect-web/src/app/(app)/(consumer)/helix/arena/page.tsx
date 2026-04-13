'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/helix/GlassCard';
import { AvatarRing } from '@/components/helix/AvatarRing';
import { LeaderboardBar } from '@/components/helix/LeaderboardBar';
import { ChallengeCard } from '@/components/helix/ChallengeCard';
import { MessageBubble } from '@/components/helix/MessageBubble';
import { HelixIcon } from '@/components/helix/HelixIcon';
import { Swords, MessageCircle, Flame, Activity, Footprints, Pill, Salad, Dumbbell, Target, HeartHandshake, Star, Trophy, Award } from 'lucide-react';
import { HelixIconWrapper } from '@/components/helix/HelixIcons';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const PODIUM_USERS = [
  { rank: 2, name: 'Marcus T.', initials: 'MT', helix: 3920, color: '#C0C0C0' },
  { rank: 1, name: 'Sarah K.',  initials: 'SK', helix: 4280, color: '#FFD700' },
  { rank: 3, name: 'Mike R.',   initials: 'MR', helix: 2195, color: '#CD7F32' },
];

const RANKED_USERS = [
  { rank: 1, name: 'Sarah K.',   initials: 'SK', helix: 4280, color: '#FFD700', isYou: false },
  { rank: 2, name: 'You',        initials: 'GF', helix: 4350, color: '#2DA5A0', isYou: true },
  { rank: 3, name: 'Mike R.',    initials: 'MR', helix: 2195, color: '#CD7F32', isYou: false },
  { rank: 4, name: 'Jessica L.', initials: 'JL', helix: 2010, color: '#8B5CF6', isYou: false },
  { rank: 5, name: 'David T.',   initials: 'DT', helix: 1875, color: '#F472B6', isYou: false },
  { rank: 6, name: 'Amanda W.',  initials: 'AW', helix: 1640, color: '#2DA5A0', isYou: false },
  { rank: 7, name: 'Chris P.',   initials: 'CP', helix: 1520, color: '#B75E18', isYou: false },
];

interface ChatMessage {
  id: number;
  sender: string;
  text: string;
  timestamp: string;
  isSent: boolean;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  { id: 1, sender: 'Sarah K.',  text: 'Just hit 4K Helix this week!', timestamp: '2:34 PM', isSent: false },
  { id: 2, sender: 'You',       text: 'Nice! I\'m right behind you', timestamp: '2:35 PM', isSent: true },
  { id: 3, sender: 'Mike R.',   text: 'The steps challenge is brutal today', timestamp: '2:36 PM', isSent: false },
  { id: 4, sender: 'You',       text: 'Already at 8K, pushing for 10K before lunch', timestamp: '2:37 PM', isSent: true },
  { id: 5, sender: 'Jessica L.', text: 'Who else is doing the supplement streak?', timestamp: '2:40 PM', isSent: false },
  { id: 6, sender: 'Sarah K.',  text: 'Day 12 for me! The 2x multiplier is incredible', timestamp: '2:41 PM', isSent: false },
];

const QUICK_REACTIONS = [
  { icon: Flame, text: "Let's go!" },
  { icon: Dumbbell, text: "Crushing it!" },
  { icon: HeartHandshake, text: "Great work!" },
  { icon: Footprints, text: "Keep moving!" },
];

const ACTIVE_CHALLENGES = [
  { type: 'steps',       title: '10K Steps Sprint',  description: 'Hit 10,000 steps every day for a week', helix: 500,  active: true, progress: 71, participants: 5 },
  { type: 'supplements', title: 'Perfect Protocol',  description: 'Take all supplements on time for 14 days', helix: 750,  active: true, progress: 43, participants: 3 },
  { type: 'nutrition',   title: 'Clean Plate Club',  description: 'Log every meal for 21 days straight', helix: 600,  active: true, progress: 85, participants: 4 },
  { type: 'workout',     title: 'Iron Week',         description: 'Complete 5 workouts in 7 days', helix: 800,  active: true, progress: 60, participants: 2 },
  { type: 'markers',     title: 'Biomarker Blitz',   description: 'Record all biomarkers for 30 days', helix: 900,  active: true, progress: 40, participants: 3 },
];

const ONLINE_USERS = [
  { initials: 'SK', color: '#FFD700' },
  { initials: 'MR', color: '#CD7F32' },
  { initials: 'JL', color: '#8B5CF6' },
];

/* ------------------------------------------------------------------ */
/*  Arena Page                                                         */
/* ------------------------------------------------------------------ */

export default function ArenaPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const maxHelix = 4350;

  // Chat scroll is manual — no auto-scroll

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const newMsg: ChatMessage = {
      id: Date.now(),
      sender: 'You',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSent: true,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 p-4 md:p-6">
      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Column 1 — Leaderboard */}
        <GlassCard glow>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="flex items-center gap-2 text-[20px] font-extrabold text-[#B75E18]">
                <Swords size={20} strokeWidth={1.5} className="text-[#B75E18]" />
                Weekly Arena
              </h2>
              <p className="text-[11px] text-white/35 font-semibold mt-1">Resets in 3d 14h 22m</p>
            </div>
            <div className="flex items-center gap-2">
              <Activity size={12} strokeWidth={2} className="text-[#2DA5A0] animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2DA5A0]">
                LIVE
              </span>
            </div>
          </div>

          {/* Podium Display: 2nd | 1st | 3rd */}
          <div className="flex items-end justify-center gap-3 md:gap-4 mb-6 md:mb-8">
            {PODIUM_USERS.map((user) => {
              const heights: Record<number, number> = { 1: 110, 2: 90, 3: 75 };
              const medalColors: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };
              return (
                <motion.div
                  key={user.rank}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: user.rank * 0.15, duration: 0.6 }}
                  className="flex flex-col items-center"
                >
                  <AvatarRing
                    initials={user.initials}
                    color={user.color}
                    helix={user.helix}
                    rank={user.rank}
                    size={user.rank === 1 ? 64 : 52}
                  />
                  <span className="text-[12px] font-bold text-white mt-2">{user.name}</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <HelixIcon size={11} />
                    <span className="text-[11px] font-extrabold text-white/55">
                      {user.helix.toLocaleString()}
                    </span>
                  </div>
                  {/* Podium bar */}
                  <div
                    className="w-16 rounded-t-lg mt-2"
                    style={{
                      height: heights[user.rank],
                      background: `linear-gradient(180deg, ${medalColors[user.rank]}44, ${medalColors[user.rank]}11)`,
                      borderTop: `2px solid ${medalColors[user.rank]}66`,
                    }}
                  />
                </motion.div>
              );
            })}
          </div>

          {/* Ranked list */}
          <div className="flex flex-col gap-1.5">
            {RANKED_USERS.map((user, i) => (
              <LeaderboardBar
                key={user.rank}
                rank={user.rank}
                name={user.name}
                initials={user.initials}
                helix={user.helix}
                maxHelix={maxHelix}
                color={user.color}
                isYou={user.isYou}
                index={i}
              />
            ))}
          </div>
        </GlassCard>

        {/* Column 2 — Squad Chat */}
        <GlassCard>
          {/* Chat header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="flex items-center gap-2 text-[20px] font-extrabold text-[#B75E18]">
              <MessageCircle size={20} strokeWidth={1.5} className="text-[#B75E18]" />
              Squad Chat
            </h2>
            <div className="flex -space-x-2">
              {ONLINE_USERS.map((u) => (
                <div
                  key={u.initials}
                  className="w-7 h-7 rounded-full border-2 border-[rgba(26,39,68,0.55)] flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ background: u.color }}
                >
                  {u.initials}
                </div>
              ))}
              <div className="w-7 h-7 rounded-full border-2 border-[rgba(26,39,68,0.55)] bg-white/10 flex items-center justify-center text-[9px] font-bold text-white/40">
                +4
              </div>
            </div>
          </div>

          {/* Message feed */}
          <div className="h-[260px] md:h-[320px] overflow-y-auto pr-1 mb-4 scrollbar-hide">
            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.id}
                text={msg.text}
                sender={msg.sender}
                timestamp={msg.timestamp}
                isSent={msg.isSent}
                index={i}
              />
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input area */}
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 min-h-[44px] rounded-xl bg-white/[0.04] border border-white/[0.08] text-[13px] text-white placeholder-white/25 outline-none focus:border-[#2DA5A0]/40 transition-colors"
            />
            <button
              onClick={() => sendMessage(input)}
              className="px-4 py-2.5 min-h-[44px] rounded-xl bg-gradient-to-r from-[#2DA5A0] to-[#35bdb7] text-white text-sm font-bold hover:opacity-90 transition-opacity"
            >
              Send
            </button>
          </div>

          {/* Quick reactions */}
          <div className="flex flex-wrap gap-2">
            {QUICK_REACTIONS.map((reaction) => (
              <button
                key={reaction.text}
                onClick={() => sendMessage(reaction.text)}
                className="flex items-center px-3 py-1.5 min-h-[44px] md:min-h-0 rounded-full text-[11px] font-semibold bg-white/[0.04] border border-white/[0.06] text-white/50 hover:bg-white/[0.08] hover:text-white/70 transition-colors"
              >
                <reaction.icon size={12} strokeWidth={1.5} className="text-white/30 mr-1" />
                {reaction.text}
              </button>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Active Challenges Strip */}
      <div>
        <h2 className="flex items-center gap-2 text-[20px] font-extrabold text-[#B75E18] mb-4">
          <Flame size={20} strokeWidth={1.5} className="text-[#B75E18]" />
          Active Challenges
        </h2>
        <div className="flex gap-3 md:gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide">
          {ACTIVE_CHALLENGES.map((ch, i) => (
            <div key={ch.title} className="snap-start flex-shrink-0 w-[260px] md:w-[280px]">
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
      </div>
    </div>
  );
}
