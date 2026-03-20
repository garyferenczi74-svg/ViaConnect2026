import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { FadeIn } from 'react-native-reanimated';

// ── Types ────────────────────────────────────────────────────────────────────

export interface VitalityScoreBreakdown {
  caqScore: number; // 0-100, weight 30%
  geneticRisk: number; // 0-100, weight 30%
  adherence: number; // 0-100, weight 20%
  lifestyle: number; // 0-100, weight 20%
}

export interface VitalityScoreProps {
  score: number; // 0-100
  breakdown?: VitalityScoreBreakdown;
  isLoading?: boolean;
}

// ── Circular Gauge ───────────────────────────────────────────────────────────

function CircularGauge({ score, size = 180 }: { score: number; size?: number }) {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <View className="items-center" accessibilityLabel={`Vitality score ${score} out of 100`}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#EF4444" />
            <Stop offset="0.33" stopColor="#FBBF24" />
            <Stop offset="0.66" stopColor="#4ADE80" />
            <Stop offset="1" stopColor="#22C55E" />
          </LinearGradient>
        </Defs>

        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#374151"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#scoreGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${progress} ${circumference - progress}`}
          strokeDashoffset={circumference / 4}
          strokeLinecap="round"
        />
      </Svg>

      <View className="absolute inset-0 items-center justify-center" style={{ width: size, height: size }}>
        <Text className="text-white text-4xl font-bold">{score}</Text>
        <Text className="text-dark-border text-sm">Vitality</Text>
      </View>
    </View>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export function VitalityScore({ score, breakdown, isLoading }: VitalityScoreProps) {
  if (isLoading) return <VitalityScoreSkeleton />;

  const level =
    score >= 80 ? { label: 'Excellent', color: 'text-green-400' }
    : score >= 60 ? { label: 'Good', color: 'text-yellow-400' }
    : score >= 40 ? { label: 'Fair', color: 'text-orange-400' }
    : { label: 'Needs Attention', color: 'text-red-400' };

  return (
    <Animated.View
      entering={FadeIn.duration(600)}
      className="bg-dark-card rounded-2xl p-5 border border-dark-border"
      accessibilityLabel={`Vitality score ${score}, ${level.label}`}
    >
      <View className="items-center mb-4">
        <CircularGauge score={score} />
        <Text className={`text-sm font-semibold mt-2 ${level.color}`}>{level.label}</Text>
      </View>

      {/* Breakdown */}
      {breakdown && (
        <View className="gap-3">
          <BreakdownRow label="Clinical Assessment" value={breakdown.caqScore} weight="30%" />
          <BreakdownRow label="Genetic Risk" value={breakdown.geneticRisk} weight="30%" />
          <BreakdownRow label="Supplement Adherence" value={breakdown.adherence} weight="20%" />
          <BreakdownRow label="Lifestyle Factors" value={breakdown.lifestyle} weight="20%" />
        </View>
      )}
    </Animated.View>
  );
}

function BreakdownRow({ label, value, weight }: { label: string; value: number; weight: string }) {
  const color = value >= 70 ? 'bg-green-500' : value >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <View>
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-gray-300 text-sm">{label}</Text>
        <Text className="text-dark-border text-xs">
          {value}/100 ({weight})
        </Text>
      </View>
      <View className="h-1.5 bg-dark-border/30 rounded-full overflow-hidden">
        <View className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </View>
    </View>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

export function VitalityScoreSkeleton() {
  return (
    <View className="bg-dark-card rounded-2xl p-5 border border-dark-border items-center">
      <View className="w-[180px] h-[180px] rounded-full bg-dark-border/30 animate-pulse mb-4" />
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} className="w-full h-6 rounded bg-dark-border/30 animate-pulse mb-2" />
      ))}
    </View>
  );
}
