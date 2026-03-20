import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, FlatList } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

// ── Types ────────────────────────────────────────────────────────────────────

export type TierLevel = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface TokenLedgerEntry {
  id: string;
  type: 'EARN' | 'REDEEM' | 'BONUS' | 'ADJUSTMENT';
  amount: number;
  description: string;
  createdAt: string;
}

export interface ViaTokenBadgeProps {
  balance: number;
  tier: TierLevel;
  ledger?: TokenLedgerEntry[];
  isLoading?: boolean;
  onPress?: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<TierLevel, { icon: string; color: string; bg: string }> = {
  BRONZE: { icon: '🥉', color: 'text-orange-400', bg: 'bg-orange-400/10' },
  SILVER: { icon: '🥈', color: 'text-gray-300', bg: 'bg-gray-300/10' },
  GOLD: { icon: '🥇', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  PLATINUM: { icon: '💎', color: 'text-purple-400', bg: 'bg-purple-400/10' },
};

const TYPE_COLORS: Record<TokenLedgerEntry['type'], string> = {
  EARN: 'text-green-400',
  REDEEM: 'text-red-400',
  BONUS: 'text-yellow-400',
  ADJUSTMENT: 'text-blue-400',
};

// ── Counter Animation ────────────────────────────────────────────────────────

function AnimatedCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const animValue = useSharedValue(0);

  useEffect(() => {
    const start = display;
    const diff = value - start;
    const steps = 20;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      setDisplay(Math.round(start + (diff * step) / steps));
      if (step >= steps) {
        clearInterval(interval);
        setDisplay(value);
      }
    }, 30);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Text className="text-white text-2xl font-bold font-mono">{display.toLocaleString()}</Text>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export function ViaTokenBadge({ balance, tier, ledger = [], isLoading, onPress }: ViaTokenBadgeProps) {
  const [showHistory, setShowHistory] = useState(false);
  const config = TIER_CONFIG[tier];

  if (isLoading) return <ViaTokenBadgeSkeleton />;

  return (
    <>
      <Pressable
        className={`flex-row items-center rounded-2xl p-4 ${config.bg} border border-dark-border active:opacity-80`}
        onPress={onPress ?? (() => setShowHistory(true))}
        accessibilityLabel={`${balance} ViaTokens, ${tier} tier. Tap to view history`}
        accessibilityRole="button"
      >
        <Text className="text-2xl mr-3">{config.icon}</Text>
        <View className="flex-1">
          <Text className="text-xs text-dark-border mb-0.5">ViaTokens</Text>
          <AnimatedCounter value={balance} />
        </View>
        <View className={`rounded-full px-3 py-1 ${config.bg}`}>
          <Text className={`text-xs font-bold ${config.color}`}>{tier}</Text>
        </View>
      </Pressable>

      {/* History Modal */}
      <Modal
        visible={showHistory}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHistory(false)}
      >
        <View className="flex-1 bg-dark-bg">
          <View className="flex-row items-center justify-between p-4 border-b border-dark-border">
            <Text className="text-white text-lg font-bold">Token History</Text>
            <Pressable onPress={() => setShowHistory(false)} accessibilityLabel="Close" accessibilityRole="button">
              <Text className="text-copper text-base font-semibold">Done</Text>
            </Pressable>
          </View>
          <FlatList
            data={ledger}
            keyExtractor={(item) => item.id}
            contentContainerClassName="p-4"
            renderItem={({ item }) => (
              <View className="flex-row items-center py-3 border-b border-dark-border/50">
                <View className="flex-1">
                  <Text className="text-white text-sm">{item.description}</Text>
                  <Text className="text-dark-border text-xs mt-0.5">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text className={`text-base font-mono font-bold ${TYPE_COLORS[item.type]}`}>
                  {item.amount > 0 ? '+' : ''}
                  {item.amount}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <Text className="text-dark-border text-center py-8">No transactions yet</Text>
            }
          />
        </View>
      </Modal>
    </>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

export function ViaTokenBadgeSkeleton() {
  return (
    <View className="flex-row items-center rounded-2xl p-4 bg-dark-card border border-dark-border">
      <View className="w-10 h-10 rounded-full bg-dark-border animate-pulse mr-3" />
      <View className="flex-1">
        <View className="w-16 h-3 rounded bg-dark-border animate-pulse mb-1" />
        <View className="w-24 h-6 rounded bg-dark-border animate-pulse" />
      </View>
      <View className="w-20 h-6 rounded-full bg-dark-border animate-pulse" />
    </View>
  );
}
