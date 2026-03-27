import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { GlassCard } from '../../ui/GlassCard';
import { HelixIcon } from './HelixIcon';

const USER_BALANCE = 4350;
const USER_STREAK = 14;
const USER_RANK = 2;
const USER_CHALLENGES = 5;
const USER_LEVEL = 5;
const USER_LEVEL_NAME = 'Champion';
const HELIX_TO_NEXT = 3150;
const LEVEL_PROGRESS = 0.58;

function AnimatedBalance() {
  const display = useSharedValue(0);

  useEffect(() => {
    display.value = withTiming(USER_BALANCE, {
      duration: 1500,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({}));

  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.Text
        style={animatedStyle}
        className="text-5xl font-extrabold text-copper"
      >
        {USER_BALANCE.toLocaleString()}
      </Animated.Text>
      <Text className="text-[11px] font-bold uppercase tracking-widest text-white/25 mt-1">
        Helix
      </Text>
    </View>
  );
}

function LevelRing() {
  const size = 90;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <LinearGradient id="lvlGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#2DA5A0" />
              <Stop offset="100%" stopColor="#B75E18" />
            </LinearGradient>
          </Defs>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#lvlGrad)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference * LEVEL_PROGRESS} ${circumference * (1 - LEVEL_PROGRESS)}`}
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text className="text-xl font-extrabold text-white">{USER_LEVEL}</Text>
        </View>
      </View>
      <Text className="text-[11px] font-bold text-white/55 mt-1.5">{USER_LEVEL_NAME}</Text>
      <Text className="text-[9px] text-white/25 font-semibold uppercase tracking-wider">
        {HELIX_TO_NEXT.toLocaleString()} Helix to next level
      </Text>
    </View>
  );
}

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
      <Text style={{ fontSize: 20, fontWeight: '800', color }}>{value}</Text>
      <Text className="text-[9px] font-bold uppercase tracking-wider text-white/25 mt-0.5">
        {label}
      </Text>
    </View>
  );
}

export function HelixHero() {
  return (
    <Animated.View entering={FadeInUp.duration(500).springify().damping(18)}>
      {/* Title */}
      <Text className="text-3xl font-extrabold text-copper tracking-tight">
        Helix Rewards<Text className="text-teal">™</Text>
      </Text>
      <Text className="text-xs font-bold uppercase tracking-[3px] text-white/30 mt-1">
        Earn <Text className="text-teal">·</Text> Compete{' '}
        <Text className="text-copper">·</Text> Redeem
      </Text>
      <Text className="text-[13px] text-white/45 leading-5 mt-3 mb-5">
        Turn healthy habits into real rewards. Complete challenges, climb the
        leaderboard, and redeem Helix for premium products and perks.
      </Text>

      {/* Balance Card */}
      <GlassCard className="p-6">
        {/* Balance header */}
        <View className="flex-row items-center mb-4">
          <HelixIcon size={16} />
          <Text className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-2">
            YOUR HELIX BALANCE
          </Text>
        </View>

        <AnimatedBalance />

        {/* Stats row */}
        <View className="flex-row items-center mt-5 mb-5">
          <StatColumn value={String(USER_STREAK)} label="Day Streak" color="#2DA5A0" />
          <View className="w-px h-8 bg-white/10" />
          <StatColumn value={`#${USER_RANK}`} label="Leaderboard" color="#FFFFFF" />
          <View className="w-px h-8 bg-white/10" />
          <StatColumn value={String(USER_CHALLENGES)} label="Challenges" color="#B75E18" />
        </View>

        <LevelRing />
      </GlassCard>
    </Animated.View>
  );
}
