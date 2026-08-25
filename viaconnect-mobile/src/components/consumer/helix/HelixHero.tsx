import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { GlassCard } from '../../ui/GlassCard';
import { HelixIcon } from './HelixIcon';

function StatColumn({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color, textAlign: 'center' }}>{value}</Text>
      <Text className="text-[9px] font-bold uppercase tracking-wider text-white/25 mt-0.5">
        {label}
      </Text>
    </View>
  );
}

export function HelixHero() {
  return (
    <Animated.View entering={FadeInUp.duration(500).springify().damping(18)}>
      <Text className="text-3xl font-extrabold tracking-tight">
        <Text className="text-copper">Helix</Text>{' '}
        <Text className="text-white">Rewards</Text>
      </Text>
      <Text className="text-xs font-bold uppercase tracking-[3px] text-white/30 mt-1">
        Earn <Text className="text-teal">·</Text> Redeem
      </Text>
      <Text className="text-[13px] text-white/45 leading-5 mt-3 mb-5">
        Turn healthy habits into real rewards. Show up. Streaks count rest days.
        Redeem Helix for premium products and perks.
      </Text>

      <GlassCard className="p-6">
        <View className="flex-row items-center mb-4">
          <HelixIcon size={16} />
          <Text className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-2">
            YOUR HELIX BALANCE
          </Text>
        </View>

        <View style={{ alignItems: 'center' }}>
          <Text className="text-5xl font-extrabold text-copper">0</Text>
          <Text className="text-[11px] font-bold uppercase tracking-widest text-white/25 mt-1">
            Helix
          </Text>
        </View>

        <View className="flex-row items-center mt-5 mb-5">
          <StatColumn value="0" label="Day Streak" color="#2DA5A0" />
          <View className="w-px h-8 bg-white/10" />
          <StatColumn value="Not enough data" label="Leaderboard" color="#FFFFFF" />
          <View className="w-px h-8 bg-white/10" />
          <StatColumn value="0" label="Challenges" color="#B75E18" />
        </View>

        <Text className="text-center text-[11px] font-bold text-white/55">Bronze</Text>
        <Text className="text-center text-[9px] text-white/25 font-semibold uppercase tracking-wider mt-1">
          Matches dashboard. No invented rank.
        </Text>
      </GlassCard>
    </Animated.View>
  );
}
