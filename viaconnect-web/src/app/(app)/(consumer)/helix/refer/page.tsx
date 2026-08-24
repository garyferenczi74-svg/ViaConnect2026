'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Megaphone, Send, CircleCheckBig, Dna, Clock, Star, Gem, Trophy, Crown } from 'lucide-react';
import { GlassCard } from '@/components/helix/GlassCard';
import { HelixIcon } from '@/components/helix/HelixIcon';
import { ReferralCode } from '@/components/helix/ReferralCode';
import { useHelixConsumerSnapshot } from '@/hooks/useHelixConsumerSnapshot';
import { REFERRAL_CODE_EMPTY } from '@/lib/helix/consumer-honesty';

const MILESTONES = [
  { count: 5,  label: '5 Referrals',  icon: Star },
  { count: 10, label: '10 Referrals', icon: Gem },
  { count: 25, label: '25 Referrals', icon: Trophy },
  { count: 50, label: '50 Referrals', icon: Crown },
];

export default function ReferPage() {
  const [copied, setCopied] = useState(false);
  const { referralCode, referralStats } = useHelixConsumerSnapshot();
  const shareUrl = referralCode
    ? `https://viaconnectapp.com/ref/${encodeURIComponent(referralCode)}`
    : null;

  const handleCopyLink = () => {
    if (!shareUrl) return;
    void navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = [
    { label: 'Invites Sent',  value: referralStats.invitesSent, icon: Send, isTeal: false },
    { label: 'Friends Joined', value: referralStats.friendsJoined, icon: CircleCheckBig, isTeal: false },
    { label: 'Helix Earned',  value: referralStats.helixEarned, icon: Dna, isTeal: true },
    { label: 'Pending',       value: referralStats.pending, icon: Clock, isTeal: false },
  ];

  return (
    <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <GlassCard glow>
          <h2 className="flex items-center gap-2 text-[20px] font-extrabold text-[#B75E18] mb-2">
            <Megaphone size={20} strokeWidth={1.5} className="text-[#B75E18]" />
            Invite & Earn Together
          </h2>
          <p className="text-[13px] text-white/40 leading-relaxed mb-6">
            Share your unique referral code with friends and family. When they join ViaConnect,
            you both earn Helix rewards. The more friends you invite, the more you earn.
          </p>

          <div className="mb-6">
            {referralCode ? (
              <ReferralCode code={referralCode} />
            ) : (
              <p className="text-sm text-white/45 text-center py-6">{REFERRAL_CODE_EMPTY}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
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

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleCopyLink}
              disabled={!shareUrl}
              className="flex-1 py-3 min-h-[44px] rounded-xl bg-gradient-to-r from-[#B75E18] to-[#d4751f] text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </GlassCard>

        <div className="flex flex-col gap-6">
          <GlassCard>
            <h3 className="text-[16px] font-extrabold text-white mb-4">Referral Stats</h3>
            <div className="flex flex-col gap-3">
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-center justify-between py-2 min-h-[44px] border-b border-white/[0.04] last:border-0">
                  <div className="flex items-center gap-2">
                    <stat.icon size={14} strokeWidth={1.5} className="text-white/30" />
                    <span className="text-[13px] text-white/40 font-medium">{stat.label}</span>
                  </div>
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

          <GlassCard>
            <h3 className="flex items-center gap-2 text-[16px] font-extrabold text-white mb-4">
              <Trophy size={18} strokeWidth={1.5} className="text-[#2DA5A0]" />
              Referral Milestones
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {MILESTONES.map((m) => {
                const achieved = referralStats.friendsJoined >= m.count;
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
                    <m.icon size={22} strokeWidth={1.5} className={achieved ? 'text-[#2DA5A0]' : 'text-white/40'} />
                    <span className="text-[10px] font-bold text-white/50 text-center mt-1.5">{m.label}</span>
                    {achieved && (
                      <span className="text-[9px] font-bold text-[#2DA5A0] mt-1">Done</span>
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
