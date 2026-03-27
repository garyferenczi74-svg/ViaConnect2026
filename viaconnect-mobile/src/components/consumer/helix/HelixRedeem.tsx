import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Dna, Pill, Gift, ShoppingBag, Star } from 'lucide-react';
import Svg, { Path } from 'react-native-svg';
import { GlassCard } from '../../ui/GlassCard';
import { StaggerItem } from '../../ui/animations';
import { HelixIcon } from './HelixIcon';

/* Simple stethoscope-style consult icon via react-native-svg */
function ConsultIcon({ size = 32, color = 'rgba(255,255,255,0.7)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.8 2.655A.5.5 0 0 1 5.3 2.5h.6a.5.5 0 0 1 .5.155l.3.345H4.5l.3-.345ZM2 8.5a4 4 0 0 0 4 4h.5v2a3.5 3.5 0 1 0 7 0v-2h.5a4 4 0 0 0 4-4v-4a1 1 0 0 0-1-1h-2v2h1v3a3 3 0 0 1-3 3H6.5a3 3 0 0 1-3-3v-3h1v-2H2.5a1 1 0 0 0-1 1v4Zm5.5 6v-2h5v2a2.5 2.5 0 0 1-5 0Z"
        fill={color}
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </Svg>
  );
}

const USER_BALANCE = 4350;

const REWARDS = [
  { icon: Dna,         glow: '#2DA5A0', name: 'GeneX360 Retest',  desc: 'Full genetic health panel retest with updated insights',     cost: 5000 },
  { icon: Pill,        glow: '#B75E18', name: 'Free Month Supply', desc: 'One month of your personalized supplement protocol, free',   cost: 3500 },
  { icon: Gift,        glow: '#8B5CF6', name: 'Product Upgrade',   desc: 'Upgrade to premium-tier supplements',                        cost: 2000 },
  { icon: ConsultIcon, glow: '#FFD700', name: '1:1 Consult',       desc: '30-minute session with a certified health practitioner',     cost: 4000, isCustom: true },
  { icon: ShoppingBag, glow: '#F472B6', name: 'Merch Drop',        desc: 'Exclusive ViaConnect branded wellness gear',                  cost: 1500 },
  { icon: Star,        glow: '#FFD700', name: 'VIP Early Access',  desc: 'Be first to try new products, features, and programs',       cost: 2500 },
];

function RewardCard({ rw, index }: { rw: (typeof REWARDS)[0]; index: number }) {
  const canAfford = USER_BALANCE >= rw.cost;
  const RwIcon = rw.icon;

  return (
    <StaggerItem index={index} stagger={60}>
      <GlassCard className="p-5 mb-3" style={canAfford ? undefined : { opacity: 0.5 }}>
        <View
          className="w-16 h-16 rounded-2xl items-center justify-center mb-3"
          style={{ backgroundColor: rw.glow + '18' }}
        >
          {(rw as any).isCustom ? (
            <RwIcon size={32} color={rw.glow} />
          ) : (
            <RwIcon size={32} strokeWidth={1.5} color={rw.glow} />
          )}
        </View>
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
