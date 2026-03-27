'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/helix/GlassCard';
import { HelixIcon } from '@/components/helix/HelixIcon';
import { ReferralCode } from '@/components/helix/ReferralCode';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const REFERRAL_STATS = [
  { label: 'Invites Sent',  value: 12 },
  { label: 'Friends Joined', value: 6 },
  { label: 'Helix Earned',  value: 4500, isTeal: true },
  { label: 'Pending',       value: 3 },
];

const MILESTONES = [
  { count: 5,  label: '5 Referrals',  emoji: '🌟' },
  { count: 10, label: '10 Referrals', emoji: '💎' },
  { count: 25, label: '25 Referrals', emoji: '🏆' },
  { count: 50, label: '50 Referrals', emoji: '👑' },
];

const FRIENDS_JOINED = 6;

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ReferPage() {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://viaconnectapp.com/ref/GARY-VIA-2026');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card — Invite & Earn */}
        <GlassCard glow>
          <h2 className="text-[20px] font-extrabold text-[#B75E18] mb-2">
            📢 Invite & Earn Together
          </h2>
          <p className="text-[13px] text-white/40 leading-relaxed mb-6">
            Share your unique referral code with friends and family. When they join ViaConnect,
            you both earn Helix rewards. The more friends you invite, the more you earn.
          </p>

          {/* Referral code with breathing animation */}
          <div className="mb-6">
            <ReferralCode code="GARY-VIA-2026" />
          </div>

          {/* Reward tiers */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
              <div className="flex items-center justify-center gap-1 mb-1">
                <HelixIcon size={14} />
                <span className="text-[18px] font-extrabold text-[#B75E18]">500</span>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/25">You Earn</span>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
              <div className="flex items-center justify-center gap-1 mb-1">
                <HelixIcon size={14} />
                <span className="text-[18px] font-extrabold text-[#2DA5A0]">250</span>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/25">Friend Gets</span>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
              <div className="flex items-center justify-center gap-1 mb-1">
                <HelixIcon size={14} />
                <span className="text-[18px] font-extrabold text-[#FFD700]">+1,000</span>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/25">If They Subscribe</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCopyLink}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#B75E18] to-[#d4751f] text-white text-sm font-bold hover:opacity-90 transition-opacity"
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <button className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#2DA5A0] to-[#35bdb7] text-white text-sm font-bold hover:opacity-90 transition-opacity">
              Share via Text
            </button>
          </div>
        </GlassCard>

        {/* Right Card — Stats & Milestones */}
        <div className="flex flex-col gap-6">
          {/* Referral stats */}
          <GlassCard>
            <h3 className="text-[16px] font-extrabold text-white mb-4">Referral Stats</h3>
            <div className="flex flex-col gap-3">
              {REFERRAL_STATS.map((stat) => (
                <div key={stat.label} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <span className="text-[13px] text-white/40 font-medium">{stat.label}</span>
                  <div className="flex items-center gap-1">
                    {stat.isTeal && <HelixIcon size={13} />}
                    <span className={`text-[16px] font-extrabold ${stat.isTeal ? 'text-[#2DA5A0]' : 'text-white'}`}>
                      {stat.value.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Milestones */}
          <GlassCard>
            <h3 className="text-[16px] font-extrabold text-white mb-4">Referral Milestones</h3>
            <div className="grid grid-cols-4 gap-3">
              {MILESTONES.map((m) => {
                const achieved = FRIENDS_JOINED >= m.count;
                return (
                  <motion.div
                    key={m.count}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: m.count * 0.03, duration: 0.4 }}
                    className={`flex flex-col items-center p-3 rounded-xl border transition-colors ${
                      achieved
                        ? 'bg-[#2DA5A0]/10 border-[#2DA5A0]/25'
                        : 'bg-white/[0.02] border-white/[0.04] opacity-40'
                    }`}
                  >
                    <span className="text-2xl mb-1">{m.emoji}</span>
                    <span className="text-[10px] font-bold text-white/50 text-center">{m.label}</span>
                    {achieved && (
                      <span className="text-[9px] font-bold text-[#2DA5A0] mt-1">✓ Done</span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
