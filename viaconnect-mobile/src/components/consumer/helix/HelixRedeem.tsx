import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { GlassCard } from '../../ui/GlassCard';
import { StaggerItem } from '../../ui/animations';
import { HelixIcon } from './HelixIcon';

const USER_BALANCE = 4350;

const REWARDS = [
  { emoji: '🧬', name: 'GeneX360 Retest',  desc: 'Full genetic health panel retest with updated insights',     cost: 5000 },
  { emoji: '💊', name: 'Free Month Supply', desc: 'One month of your personalized supplement protocol, free',   cost: 3500 },
  { emoji: '🎁', name: 'Product Upgrade',   desc: 'Upgrade to premium-tier supplements',                        cost: 2000 },
  { emoji: '👨‍⚕️', name: '1:1 Consult',       desc: '30-minute session with a certified health practitioner',     cost: 4000 },
  { emoji: '🛍️', name: 'Merch Drop',        desc: 'Exclusive ViaConnect branded wellness gear',                  cost: 1500 },
  { emoji: '⭐', name: 'VIP Early Access',  desc: 'Be first to try new products, features, and programs',       cost: 2500 },
];

function RewardCard({ rw, index }: { rw: (typeof REWARDS)[0]; index: number }) {
  const canAfford = USER_BALANCE >= rw.cost;

  return (
    <StaggerItem index={index} stagger={60}>
      <GlassCard className="p-5 mb-3" style={canAfford ? undefined : { opacity: 0.5 }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>{rw.emoji}</Text>
        <Text className="text-[15px] font-extrabold text-white mb-1">{rw.name}</Text>
        <Text className="text-[11px] text-white/40 mb-3 leading-4">{rw.desc}</Text>

        <View className="flex-row items-center mb-3">
          <HelixIcon size={15} />
          <Text className="text-base font-extrabold text-copper ml-1">
            {rw.cost.toLocaleString()}
          </Text>
          <Text className="text-[11px] text-white/30 font-semibold ml-1">Helix</Text>
        </View>

        {canAfford ? (
          <Pressable className="w-full py-3 rounded-xl bg-copper items-center active:opacity-80">
            <Text className="text-white text-sm font-bold">Redeem</Text>
          </Pressable>
        ) : (
          <View className="w-full py-3 rounded-xl bg-white/5 items-center">
            <Text className="text-white/25 text-sm font-bold">Need More</Text>
          </View>
        )}
      </GlassCard>
    </StaggerItem>
  );
}

export function HelixRedeem() {
  return (
    <View>
      <Animated.View entering={FadeInUp.duration(400)}>
        <Text className="text-xl font-extrabold text-copper mb-1">Spend Your Helix</Text>
        <Text className="text-[13px] text-white/35 mb-4">
          Redeem earned Helix for premium rewards, products, and experiences
        </Text>
      </Animated.View>

      {REWARDS.map((rw, i) => (
        <RewardCard key={rw.name} rw={rw} index={i} />
      ))}
    </View>
  );
}
