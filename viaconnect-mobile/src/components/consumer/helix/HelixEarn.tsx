import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { GlassCard } from '../../ui/GlassCard';
import { StaggerItem } from '../../ui/animations';
import { HelixIcon } from './HelixIcon';

const EARN_CATEGORIES = [
  { emoji: '💊', label: 'Daily Supplements', helix: '+25/day',       desc: 'Log each supplement dose on time' },
  { emoji: '👟', label: 'Steps & Activity',  helix: '+10-50/day',    desc: 'Earn more as your step count climbs' },
  { emoji: '🥗', label: 'Nutrition Logging',  helix: '+15/day',      desc: 'Track breakfast, lunch, and dinner' },
  { emoji: '✅', label: 'Daily Check-in',     helix: '+10/day',      desc: 'Complete your wellness pulse check' },
  { emoji: '🏆', label: 'Challenge Wins',     helix: '+100-1,000',   desc: 'Finish challenges to earn big' },
  { emoji: '🔥', label: 'Streak Bonuses',     helix: '2x multiplier', desc: 'Keep your streak alive for double Helix' },
  { emoji: '📢', label: 'Refer Friends',      helix: '+500/referral', desc: 'Invite friends to ViaConnect' },
  { emoji: '🔬', label: 'Share for Science',  helix: '+200/month',   desc: 'Contribute anonymous data to research' },
];

const DAILY_ACTIONS = [
  { emoji: '💊', label: 'Morning Supplements',   helix: 25, done: true },
  { emoji: '👟', label: '10K Steps',             helix: 50, done: true },
  { emoji: '🥗', label: 'Meal Logging',          helix: 15, done: true },
  { emoji: '💊', label: 'Afternoon Supplements', helix: 25, done: true },
  { emoji: '✅', label: 'Wellness Check-in',     helix: 10, done: false },
  { emoji: '💊', label: 'Evening Supplements',   helix: 25, done: false },
];

function EarnCategoryCard({ cat, index }: { cat: (typeof EARN_CATEGORIES)[0]; index: number }) {
  return (
    <StaggerItem index={index} stagger={60}>
      <GlassCard className="p-4 mb-3">
        <View className="flex-row items-start">
          <View className="w-12 h-12 rounded-2xl bg-copper/10 items-center justify-center mr-3">
            <Text style={{ fontSize: 22 }}>{cat.emoji}</Text>
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
  return (
    <StaggerItem index={index} stagger={50}>
      <View
        className={`flex-row items-center px-4 py-3 rounded-xl mb-2 ${
          action.done
            ? 'bg-teal/10 border border-teal/15'
            : 'bg-white/[0.02] border border-white/5'
        }`}
      >
        <Text style={{ fontSize: 16 }}>{action.emoji}</Text>
        {action.done ? (
          <Text className="text-[11px] text-teal font-bold ml-2">✓</Text>
        ) : (
          <View className="w-3.5 h-3.5 rounded-full border border-white/20 ml-2" />
        )}
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
        <Text className="text-lg font-extrabold text-copper mb-4">
          📊 Today&apos;s Helix Activity
        </Text>

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
