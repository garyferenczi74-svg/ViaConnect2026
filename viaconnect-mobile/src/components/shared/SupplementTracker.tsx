import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ProtocolItemEntry {
  id: string;
  productName: string;
  dosage: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'bedtime';
  completed: boolean;
}

export interface DayStatus {
  date: string; // ISO date string
  completedCount: number;
  totalCount: number;
}

export interface SupplementTrackerProps {
  items: ProtocolItemEntry[];
  weekStreak: DayStatus[];
  currentStreak: number;
  onToggle: (itemId: string, completed: boolean) => void;
  onDaySelect?: (date: string) => void;
  tokensPerCheck?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const TIME_LABELS: Record<string, { label: string; icon: string }> = {
  morning: { label: 'Morning', icon: '🌅' },
  afternoon: { label: 'Afternoon', icon: '☀️' },
  evening: { label: 'Evening', icon: '🌇' },
  bedtime: { label: 'Bedtime', icon: '🌙' },
};

const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// ── Calendar Strip ───────────────────────────────────────────────────────────

function WeekStrip({ days, onDaySelect }: { days: DayStatus[]; onDaySelect?: (date: string) => void }) {
  return (
    <View className="flex-row justify-between px-2 py-3 bg-dark-card rounded-2xl mb-4">
      {days.slice(-7).map((day, i) => {
        const pct = day.totalCount > 0 ? day.completedCount / day.totalCount : 0;
        const isToday = day.date === new Date().toISOString().split('T')[0];
        return (
          <Pressable
            key={day.date}
            className="items-center flex-1"
            onPress={() => onDaySelect?.(day.date)}
            accessibilityLabel={`${DAY_NAMES[new Date(day.date).getDay()]}, ${day.completedCount} of ${day.totalCount} completed`}
          >
            <Text className={`text-xs mb-1 ${isToday ? 'text-copper font-bold' : 'text-dark-border'}`}>
              {DAY_NAMES[new Date(day.date).getDay()]}
            </Text>
            <View className={`w-8 h-8 rounded-full items-center justify-center ${
              pct === 1 ? 'bg-green-500' : pct > 0 ? 'bg-yellow-500/50' : 'bg-dark-border/30'
            } ${isToday ? 'border-2 border-copper' : ''}`}>
              <Text className={`text-xs font-bold ${pct === 1 ? 'text-white' : 'text-gray-300'}`}>
                {new Date(day.date).getDate()}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Checklist Item ───────────────────────────────────────────────────────────

function CheckItem({
  item,
  onToggle,
  tokensPerCheck,
}: {
  item: ProtocolItemEntry;
  onToggle: (id: string, completed: boolean) => void;
  tokensPerCheck: number;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleToggle = useCallback(async () => {
    const newState = !item.completed;
    if (newState) {
      scale.value = withSequence(
        withTiming(1.1, { duration: 100 }),
        withTiming(1, { duration: 100 }),
      );
      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    }
    onToggle(item.id, newState);
  }, [item.completed, item.id, onToggle, scale]);

  const timeConfig = TIME_LABELS[item.timeOfDay];

  return (
    <Animated.View style={animStyle}>
      <Pressable
        className={`flex-row items-center p-4 rounded-2xl mb-2 border ${
          item.completed
            ? 'bg-green-500/5 border-green-500/20'
            : 'bg-dark-card border-dark-border'
        } active:opacity-80`}
        onPress={handleToggle}
        accessibilityLabel={`${item.productName}, ${item.dosage}, ${timeConfig.label}. ${item.completed ? 'Completed' : 'Not completed'}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.completed }}
      >
        {/* Checkbox */}
        <View className={`w-7 h-7 rounded-lg border-2 items-center justify-center mr-3 ${
          item.completed ? 'bg-green-500 border-green-500' : 'border-dark-border'
        }`}>
          {item.completed && <Text className="text-white text-sm">✓</Text>}
        </View>

        {/* Details */}
        <View className="flex-1">
          <Text className={`text-base font-semibold ${item.completed ? 'text-gray-400 line-through' : 'text-white'}`}>
            {item.productName}
          </Text>
          <Text className="text-dark-border text-xs mt-0.5">
            {item.dosage} · {timeConfig.icon} {timeConfig.label}
          </Text>
        </View>

        {/* Token reward */}
        {!item.completed && tokensPerCheck > 0 && (
          <View className="bg-yellow-500/10 rounded-full px-2 py-0.5">
            <Text className="text-yellow-400 text-xs font-mono">+{tokensPerCheck}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export function SupplementTracker({
  items,
  weekStreak,
  currentStreak,
  onToggle,
  onDaySelect,
  tokensPerCheck = 5,
}: SupplementTrackerProps) {
  const completedCount = items.filter((i) => i.completed).length;

  // Group by time of day
  const groups = ['morning', 'afternoon', 'evening', 'bedtime']
    .map((t) => ({ time: t, items: items.filter((i) => i.timeOfDay === t) }))
    .filter((g) => g.items.length > 0);

  return (
    <View className="flex-1 bg-dark-bg">
      <ScrollView className="flex-1 px-4 pt-4" contentContainerClassName="pb-8">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-white text-xl font-bold">Today's Protocol</Text>
            <Text className="text-dark-border text-sm">
              {completedCount}/{items.length} completed
            </Text>
          </View>
          <View className="bg-copper/10 rounded-xl px-3 py-2 items-center">
            <Text className="text-copper text-lg font-bold">{currentStreak}</Text>
            <Text className="text-copper/70 text-[10px]">day streak</Text>
          </View>
        </View>

        {/* Week Strip */}
        <WeekStrip days={weekStreak} onDaySelect={onDaySelect} />

        {/* Protocol Groups */}
        {groups.map((group) => (
          <Animated.View key={group.time} entering={FadeIn.duration(300)}>
            <Text className="text-sage text-sm font-semibold mb-2 mt-2">
              {TIME_LABELS[group.time].icon} {TIME_LABELS[group.time].label}
            </Text>
            {group.items.map((item) => (
              <CheckItem
                key={item.id}
                item={item}
                onToggle={onToggle}
                tokensPerCheck={tokensPerCheck}
              />
            ))}
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

export function SupplementTrackerSkeleton() {
  return (
    <View className="flex-1 bg-dark-bg px-4 pt-4">
      <View className="w-40 h-6 rounded bg-dark-border animate-pulse mb-4" />
      <View className="h-14 rounded-2xl bg-dark-border animate-pulse mb-4" />
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} className="h-16 rounded-2xl bg-dark-border/50 animate-pulse mb-2" />
      ))}
    </View>
  );
}
