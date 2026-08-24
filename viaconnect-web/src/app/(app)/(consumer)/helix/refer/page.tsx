'use client';

import { useState } from 'react';
import { Megaphone, Send, CircleCheckBig, Dna, Clock } from 'lucide-react';
import { GlassCard } from '@/components/helix/GlassCard';
import { HelixIcon } from '@/components/helix/HelixIcon';
import { ReferralCode } from '@/components/helix/ReferralCode';
import { useHelixConsumerSnapshot } from '@/hooks/useHelixConsumerSnapshot';
import { useHelixEarnCatalog } from '@/hooks/useHelixEarnCatalog';
import { NOT_ENOUGH_DATA, REFERRAL_CODE_EMPTY, referralEarningEvents } from '@/lib/helix/consumer-honesty';

export default function ReferPage() {
  const [copied, setCopied] = useState(false);
  const { referralCode, referralStats } = useHelixConsumerSnapshot();
  const { events, loading } = useHelixEarnCatalog();
  const referralRewards = referralEarningEvents(events);
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
    { label: 'Invites Sent', value: referralStats.invitesSent, icon: Send, isTeal: false },
    { label: 'Friends Joined', value: referralStats.friendsJoined, icon: CircleCheckBig, isTeal: false },
    { label: 'Helix Earned', value: referralStats.helixEarned, icon: Dna, isTeal: true },
    { label: 'Pending', value: referralStats.pending, icon: Clock, isTeal: false },
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

          {referralRewards.length === 0 ? (
            <p className="text-sm text-white/45 mb-6">{loading ? 'Loading' : NOT_ENOUGH_DATA}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              {referralRewards.map((reward) => (
                <div
                  key={reward.id}
                  className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]"
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <HelixIcon size={14} />
                    <span className="text-[18px] font-extrabold text-[#B75E18]">
                      {reward.points.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white/25">
                    {reward.title}
                  </span>
                </div>
              ))}
            </div>
          )}

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

        <GlassCard>
          <h3 className="text-[16px] font-extrabold text-white mb-4">Referral Stats</h3>
          <div className="flex flex-col gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center justify-between py-2 min-h-[44px] border-b border-white/[0.04] last:border-0"
              >
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
      </div>
    </div>
  );
}
