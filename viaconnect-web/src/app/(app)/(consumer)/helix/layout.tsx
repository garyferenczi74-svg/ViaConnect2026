'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Swords, Trophy, Dna, Gift, Megaphone, Microscope,
} from 'lucide-react';
import { ParticleBG } from '@/components/helix/ParticleBG';
import { GlassCard } from '@/components/helix/GlassCard';
import { HelixIcon } from '@/components/helix/HelixIcon';
import { AnimatedNumber } from '@/components/helix/AnimatedNumber';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const NAV_ITEMS = [
  { label: 'Arena',      icon: Swords,     href: '/helix/arena' },
  { label: 'Challenges', icon: Trophy,     href: '/helix/challenges' },
  { label: 'Earn',       icon: Dna,        href: '/helix/earn' },
  { label: 'Redeem',     icon: Gift,       href: '/helix/redeem' },
  { label: 'Refer',      icon: Megaphone,  href: '/helix/refer' },
  { label: 'Research',   icon: Microscope, href: '/helix/research' },
];

const USER_BALANCE = 4350;
const USER_STREAK = 14;
const USER_RANK = 2;
const USER_CHALLENGES = 5;
const USER_LEVEL = 5;
const USER_LEVEL_NAME = 'Champion';
const HELIX_TO_NEXT = 3150;

/* ------------------------------------------------------------------ */
/*  Level Progress Ring                                                */
/* ------------------------------------------------------------------ */

function LevelRing() {
  const progress = 0.58; // 58% to next level
  const size = 100;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#levelGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference * progress} ${circumference * (1 - progress)}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="transition-all duration-1000"
          />
          <defs>
            <linearGradient id="levelGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2DA5A0" />
              <stop offset="100%" stopColor="#B75E18" />
            </linearGradient>
          </defs>
        </svg>
        {/* Center level number */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-extrabold text-white">{USER_LEVEL}</span>
        </div>
      </div>
      <span className="text-[11px] font-bold text-white/55 mt-2">{USER_LEVEL_NAME}</span>
      <span className="text-[9px] text-white/25 font-semibold uppercase tracking-wider">
        {HELIX_TO_NEXT.toLocaleString()} Helix to next level
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Layout                                                             */
/* ------------------------------------------------------------------ */

export default function HelixLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen relative font-instrument">
      {/* Particle background */}
      <ParticleBG />

      {/* Content layer */}
      <div className="relative z-10 px-4 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto flex flex-col gap-8">

          {/* ═══ HERO SECTION ═══ */}

          {/* Hero content */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-6 sm:gap-12 items-center">
            {/* Left side - Title & tagline */}
            <div className="flex-1 min-w-0 sm:min-w-[300px]">
              <h1
                className="font-extrabold tracking-[-1.5px]"
                style={{ fontSize: 'clamp(36px, 5vw, 62px)' }}
              >
                <span className="text-[#B75E18]">Helix</span>{' '}
                <span className="text-white">Rewards</span>
              </h1>
              <p
                className="font-bold uppercase tracking-[4px] text-white/35 mt-3"
                style={{ fontSize: 'clamp(14px, 2vw, 18px)' }}
              >
                Earn <span className="text-[#2DA5A0]">&middot;</span> Compete{' '}
                <span className="text-[#B75E18]">&middot;</span> Redeem
              </p>
              <p className="text-white/55 text-[15px] leading-relaxed mt-5 max-w-lg">
                Turn healthy habits into real rewards. Complete challenges, climb the leaderboard,
                and redeem Helix for premium products, consultations, and exclusive perks.
              </p>
            </div>

            {/* Right side - Balance Card */}
            <GlassCard glow className="w-full sm:w-auto sm:min-w-[340px]">
              {/* Balance header */}
              <div className="flex items-center gap-2 mb-5">
                <HelixIcon size={18} />
                <span className="text-[10px] font-bold uppercase tracking-[2px] text-white/35">
                  YOUR HELIX BALANCE
                </span>
              </div>

              {/* Large animated balance */}
              <div className="text-center mb-6">
                <AnimatedNumber
                  value={USER_BALANCE}
                  className="text-[56px] font-extrabold bg-gradient-to-r from-[#B75E18] to-[#FFD700] bg-clip-text text-transparent leading-none"
                />
                <p className="text-[11px] font-bold uppercase tracking-[2px] text-white/25 mt-1">
                  Helix
                </p>
              </div>

              {/* Three stat columns */}
              <div className="flex items-center justify-center gap-0 mb-6">
                {/* Day Streak */}
                <div className="flex-1 text-center">
                  <p className="text-[22px] font-extrabold text-[#2DA5A0]">{USER_STREAK}</p>
                  <p className="text-[9px] font-bold uppercase tracking-[1.5px] text-white/25">
                    Day Streak
                  </p>
                </div>
                <div className="w-px h-10 bg-white/[0.08]" />
                {/* Leaderboard Rank */}
                <div className="flex-1 text-center">
                  <p className="text-[22px] font-extrabold text-white">#{USER_RANK}</p>
                  <p className="text-[9px] font-bold uppercase tracking-[1.5px] text-white/25">
                    Leaderboard
                  </p>
                </div>
                <div className="w-px h-10 bg-white/[0.08]" />
                {/* Active Challenges */}
                <div className="flex-1 text-center">
                  <p className="text-[22px] font-extrabold text-[#B75E18]">{USER_CHALLENGES}</p>
                  <p className="text-[9px] font-bold uppercase tracking-[1.5px] text-white/25">
                    Challenges
                  </p>
                </div>
              </div>

              {/* Level ring */}
              <div className="flex justify-center">
                <LevelRing />
              </div>
            </GlassCard>
          </div>

          {/* ═══ TAB NAVIGATION ═══ */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0" style={{ WebkitOverflowScrolling: 'touch' }}>
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 sm:px-5 py-2.5 min-h-[44px] rounded-full text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-[#B75E18]/15 text-[#B75E18] border border-[#B75E18]/30'
                      : 'text-white/40 border border-white/[0.06] hover:bg-white/[0.04] hover:text-white/60'
                  }`}
                >
                  <item.icon size={16} strokeWidth={1.5} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* ═══ TAB CONTENT ═══ */}
          {children}

          {/* ═══ FOOTER ═══ */}
          <div className="border-t border-white/[0.04] pt-10 pb-6 text-center">
            <p className="text-[12px] text-white/20">
              Helix Rewards&trade; by ViaConnect&trade; &bull; ViaConnect &bull; &copy; 2026 All Rights Reserved
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
