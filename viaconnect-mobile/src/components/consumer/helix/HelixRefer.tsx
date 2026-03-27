import React, { useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Megaphone, Send, CircleCheckBig, Dna as DnaIcon, Clock, Star, Gem, Trophy, Crown } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { StaggerItem } from '../../ui/animations';
import { HelixIcon } from './HelixIcon';

const REFERRAL_STATS = [
  { label: 'Invites Sent',   value: 12, teal: false },
  { label: 'Friends Joined', value: 6,  teal: false },
  { label: 'Helix Earned',   value: 4500, teal: true },
  { label: 'Pending',        value: 3,  teal: false },
];

const MILESTONES = [
  { count: 5,  label: '5 Referrals',  icon: Star },
  { count: 10, label: '10 Referrals', icon: Gem },
  { count: 25, label: '25 Referrals', icon: Trophy },
  { count: 50, label: '50 Referrals', icon: Crown },
];

const FRIENDS_JOINED = 6;
const CODE = 'GARY-VIA-2026';

export function HelixRefer() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(CODE);
      }
      // On native, would use expo-clipboard
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View>
      {/* Invite Card */}
      <GlassCard className="p-5 mb-4">
        <View className="flex-row items-center mb-2">
          <Megaphone size={20} strokeWidth={1.5} color="#B75E18" />
          <Text className="text-lg font-extrabold text-copper ml-2">
            Invite & Earn Together
          </Text>
        </View>
        <Text className="text-[12px] text-white/35 leading-5 mb-5">
          Share your unique referral code with friends and family. When they join
          ViaConnect, you both earn Helix rewards.
        </Text>

        {/* Referral Code */}
        <Pressable
          onPress={handleCopy}
          className="rounded-2xl border-2 border-dashed border-white/15 p-5 items-center mb-5 active:border-copper/40"
        >
          <Text className="text-xl font-extrabold text-copper tracking-wider">{CODE}</Text>
          <Text className="text-[10px] text-white/30 font-semibold uppercase tracking-wider mt-1.5">
            {copied ? 'Copied to clipboard!' : 'Tap to copy referral code'}
          </Text>
        </Pressable>

        {/* Reward tiers */}
        <View className="flex-row gap-2 mb-5">
          {[
            { amount: '500', label: 'You Earn', color: '#B75E18' },
            { amount: '250', label: 'Friend Gets', color: '#2DA5A0' },
            { amount: '+1,000', label: 'If Subscribe', color: '#FFD700' },
          ].map((tier) => (
            <View
              key={tier.label}
              className="flex-1 items-center p-3 rounded-xl bg-white/[0.03] border border-white/5"
            >
              <View className="flex-row items-center mb-0.5">
                <HelixIcon size={12} />
                <Text style={{ fontSize: 16, fontWeight: '800', color: tier.color, marginLeft: 3 }}>
                  {tier.amount}
                </Text>
              </View>
              <Text className="text-[8px] font-bold text-white/20 uppercase tracking-wider">
                {tier.label}
              </Text>
            </View>
          ))}
        </View>

        {/* CTA Buttons */}
        <View className="flex-row gap-3">
          <Pressable
            onPress={handleCopy}
            className="flex-1 py-3 rounded-xl bg-copper items-center active:opacity-80"
          >
            <Text className="text-white text-sm font-bold">
              {copied ? 'Copied!' : 'Copy Link'}
            </Text>
          </Pressable>
          <Pressable className="flex-1 py-3 rounded-xl bg-teal items-center active:opacity-80">
            <Text className="text-white text-sm font-bold">Share via Text</Text>
          </Pressable>
        </View>
      </GlassCard>

      {/* Stats */}
      <GlassCard className="p-5 mb-4">
        <Text className="text-[15px] font-extrabold text-white mb-3">Referral Stats</Text>
        {REFERRAL_STATS.map((stat, i) => (
          <StaggerItem key={stat.label} index={i} stagger={50}>
            <View className="flex-row items-center justify-between py-2.5 border-b border-white/5">
              <Text className="text-[12px] text-white/35 font-medium">{stat.label}</Text>
              <View className="flex-row items-center">
                {stat.teal && <HelixIcon size={12} />}
                <Text
                  className={`text-[15px] font-extrabold ml-1 ${
                    stat.teal ? 'text-teal' : 'text-white'
                  }`}
                >
                  {stat.value.toLocaleString()}
                </Text>
              </View>
            </View>
          </StaggerItem>
        ))}
      </GlassCard>

      {/* Milestones */}
      <GlassCard className="p-5">
        <Text className="text-[15px] font-extrabold text-white mb-3">Referral Milestones</Text>
        <View className="flex-row gap-2">
          {MILESTONES.map((m, i) => {
            const achieved = FRIENDS_JOINED >= m.count;
            const MIcon = m.icon;
            return (
              <StaggerItem key={m.count} index={i} stagger={80}>
                <View
                  className={`flex-1 items-center p-3 rounded-xl border ${
                    achieved
                      ? 'bg-teal/10 border-teal/20'
                      : 'bg-white/[0.02] border-white/5 opacity-40'
                  }`}
                >
                  <View style={{ marginBottom: 4 }}>
                    <MIcon size={22} strokeWidth={1.5} color={achieved ? '#2DA5A0' : 'rgba(255,255,255,0.4)'} />
                  </View>
                  <Text className="text-[9px] font-bold text-white/40 text-center">{m.label}</Text>
                  {achieved && (
                    <View className="flex-row items-center mt-1">
                      <CircleCheckBig size={10} strokeWidth={2} color="#2DA5A0" />
                      <Text className="text-[8px] font-bold text-teal ml-0.5">Done</Text>
                    </View>
                  )}
                </View>
              </StaggerItem>
            );
          })}
        </View>
      </GlassCard>
    </View>
  );
}
