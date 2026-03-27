import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Pill, Footprints, Salad, CircleCheckBig, Trophy, Megaphone, Microscope, BarChart3, Circle } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { StaggerItem } from '../../ui/animations';
import { HelixIcon } from './HelixIcon';

const EARN_CATEGORIES = [
  { icon: Pill,        glow: '#B75E18', label: 'Daily Supplements', helix: '+25/day',       desc: 'Log each supplement dose on time' },
  { icon: Footprints,  glow: '#2DA5A0', label: 'Steps & Activity',  helix: '+10-50/day',    desc: 'Earn more as your step count climbs' },
  { icon: Salad,       glow: '#8B5CF6', label: 'Nutrition Logging',  helix: '+15/day',      desc: 'Track breakfast, lunch, and dinner' },
  { icon: CircleCheckBig, glow: '#2DA5A0', label: 'Daily Check-in',     helix: '+10/day',      desc: 'Complete your wellness pulse check' },
  { icon: Trophy,      glow: '#FFD700', label: 'Challenge Wins',     helix: '+100-1,000',   desc: 'Finish challenges to earn big' },
  { icon: Trophy,      glow: '#B75E18', label: 'Streak Bonuses',     helix: '2x multiplier', desc: 'Keep your streak alive for double Helix' },
  { icon: Megaphone,   glow: '#B75E18', label: 'Refer Friends',      helix: '+500/referral', desc: 'Invite friends to ViaConnect' },
  { icon: Microscope,  glow: '#2DA5A0', label: 'Share for Science',  helix: '+200/month',   desc: 'Contribute anonymous data to research' },
];

const DAILY_ACTIONS = [
  { icon: Pill,        label: 'Morning Supplements',   helix: 25, done: true },
  { icon: Footprints,  label: '10K Steps',             helix: 50, done: true },
  { icon: Salad,       label: 'Meal Logging',          helix: 15, done: true },
  { icon: Pill,        label: 'Afternoon Supplements', helix: 25, done: true },
  { icon: CircleCheckBig, label: 'Wellness Check-in',     helix: 10, done: false },
  { icon: Pill,        label: 'Evening Supplements',   helix: 25, done: false },
];

function EarnCategoryCard({ cat, index }: { cat: (typeof EARN_CATEGORIES)[0]; index: number }) {
  const CatIcon = cat.icon;
  return (
    <StaggerItem index={index} stagger={60}>
      <GlassCard className="p-4 mb-3">
        <View className="flex-row items-start">
          <View
            className="w-12 h-12 rounded-2xl items-center justify-center mr-3"
            style={{ backgroundColor: cat.glow + '18' }}
          >
            <CatIcon size={22} strokeWidth={1.5} color={cat.glow} />
          </View>
          <View className="flex-1">
            <Text className="text-[14px] font-extrabold text-white">{cat.label}</Text>
            <View className="flex-row items-center mt-0.5">
              <HelixIcon size={12} />
              <Text className="text-[13px] font-bold text-teal ml-1">{cat.helix}</Text>
            </View>
            <Text className="text-[11px] text-white/35 mt-1 leading-4">{cat.desc}</Text>
          </View>
        </View>
      </GlassCard>
    </StaggerItem>
  );
}

function DailyActionRow({ action, index }: { action: (typeof DAILY_ACTIONS)[0]; index: number }) {
  const ActionIcon = action.icon;
  return (
    <StaggerItem index={index} stagger={50}>
      <View
        className={`flex-row items-center px-4 py-3 rounded-xl mb-2 ${
          action.done
            ? 'bg-teal/10 border border-teal/15'
            : 'bg-white/[0.02] border border-white/5'
        }`}
      >
        <ActionIcon size={16} strokeWidth={1.5} color="rgba(255,255,255,0.5)" />
        <View className="ml-2">
          {action.done ? (
            <CircleCheckBig size={14} strokeWidth={2} color="#2DA5A0" />
          ) : (
            <Circle size={14} strokeWidth={1.5} color="rgba(255,255,255,0.2)" />
          )}
        </View>
        <Text
          className={`flex-1 text-[12px] font-medium ml-2 ${
            action.done ? 'text-white' : 'text-white/30'
          }`}
        >
          {action.label}
        </Text>
        <View className="flex-row items-center">
          <HelixIcon size={11} />
          <Text
            className={`text-[12px] font-bold ml-0.5 ${
              action.done ? 'text-teal' : 'text-white/20'
            }`}
          >
            +{action.helix}
          </Text>
        </View>
      </View>
    </StaggerItem>
  );
}

export function HelixEarn() {
  const earned = DAILY_ACTIONS.filter((a) => a.done).reduce((s, a) => s + a.helix, 0);
  const possible = DAILY_ACTIONS.reduce((s, a) => s + a.helix, 0);

  return (
    <View>
      <Animated.View entering={FadeInUp.duration(400)}>
        <Text className="text-xl font-extrabold text-copper mb-1">Ways to Earn Helix</Text>
        <Text className="text-[13px] text-white/35 mb-4">
          Every healthy action earns redeemable Helix credits
        </Text>
      </Animated.View>

      {EARN_CATEGORIES.map((cat, i) => (
        <EarnCategoryCard key={cat.label} cat={cat} index={i} />
      ))}

      {/* Daily Activity Tracker */}
      <GlassCard className="p-5 mt-3">
        <View className="flex-row items-center mb-4">
          <BarChart3 size={20} strokeWidth={1.5} color="#B75E18" />
          <Text className="text-lg font-extrabold text-copper ml-2">
            Today&apos;s Helix Activity
          </Text>
        </View>

        {DAILY_ACTIONS.map((action, i) => (
          <DailyActionRow key={action.label} action={action} index={i} />
        ))}

        <View className="mt-4 pt-3 border-t border-white/5 items-center">
          <Text className="text-[13px] text-white/45">
            Today&apos;s earnings:{' '}
            <Text className="font-extrabold text-teal">+{earned} Helix</Text> / {possible} possible
          </Text>
        </View>
      </GlassCard>
    </View>
  );
}
