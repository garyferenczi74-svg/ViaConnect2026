import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';

// ── Types ────────────────────────────────────────────────────────────────────

export type MembershipTierLevel = 'free' | 'gold' | 'platinum' | 'practitioner';

export interface MembershipBenefit {
  label: string;
  included: boolean;
}

export interface MembershipTierProps {
  tier: MembershipTierLevel;
  status: 'active' | 'cancelled' | 'expired';
  nextBillingDate?: string;
  benefits: MembershipBenefit[];
  onUpgrade?: () => void;
  onManage?: () => void;
  isUpgrading?: boolean;
  isLoading?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<MembershipTierLevel, {
  label: string;
  price: string;
  badge: string;
  gradient: string;
  border: string;
}> = {
  free: { label: 'Free', price: '$0', badge: '🆓', gradient: 'bg-dark-card', border: 'border-dark-border' },
  gold: { label: 'Gold', price: '$8.88/mo', badge: '🥇', gradient: 'bg-yellow-500/5', border: 'border-yellow-500/30' },
  platinum: { label: 'Platinum', price: '$28.88/mo', badge: '💎', gradient: 'bg-purple-500/5', border: 'border-purple-500/30' },
  practitioner: { label: 'Practitioner', price: '$128.88/mo', badge: '⚕️', gradient: 'bg-portal-green/5', border: 'border-portal-green/30' },
};

// ── Component ────────────────────────────────────────────────────────────────

export function MembershipTier({
  tier,
  status,
  nextBillingDate,
  benefits,
  onUpgrade,
  onManage,
  isUpgrading,
  isLoading,
}: MembershipTierProps) {
  if (isLoading) return <MembershipTierSkeleton />;

  const config = TIER_CONFIG[tier];

  return (
    <View
      className={`rounded-2xl p-5 border ${config.gradient} ${config.border}`}
      accessibilityLabel={`${config.label} membership, ${config.price}`}
    >
      {/* Header */}
      <View className="flex-row items-center mb-4">
        <Text className="text-3xl mr-3">{config.badge}</Text>
        <View className="flex-1">
          <Text className="text-white text-xl font-bold">{config.label}</Text>
          <Text className="text-copper text-sm font-semibold">{config.price}</Text>
        </View>
        <View className={`rounded-full px-2.5 py-1 ${
          status === 'active' ? 'bg-green-500/10' : 'bg-red-500/10'
        }`}>
          <Text className={`text-xs font-semibold ${
            status === 'active' ? 'text-green-400' : 'text-red-400'
          }`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Text>
        </View>
      </View>

      {/* Benefits */}
      <View className="mb-4">
        {benefits.map((b, i) => (
          <View key={i} className="flex-row items-center py-1.5">
            <Text className={`text-sm mr-2 ${b.included ? 'text-green-400' : 'text-dark-border'}`}>
              {b.included ? '✓' : '✗'}
            </Text>
            <Text className={`text-sm ${b.included ? 'text-white' : 'text-dark-border line-through'}`}>
              {b.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Billing Info */}
      {nextBillingDate && status === 'active' && (
        <View className="bg-dark-bg/50 rounded-xl p-3 mb-4">
          <Text className="text-dark-border text-xs">Next billing</Text>
          <Text className="text-white text-sm font-semibold">
            {new Date(nextBillingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View className="flex-row gap-3">
        {tier !== 'practitioner' && onUpgrade && (
          <Pressable
            className="flex-1 bg-copper rounded-xl py-3.5 items-center active:opacity-80"
            onPress={onUpgrade}
            disabled={isUpgrading}
            accessibilityLabel="Upgrade membership"
            accessibilityRole="button"
          >
            {isUpgrading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white font-semibold">Upgrade</Text>
            )}
          </Pressable>
        )}
        {onManage && status === 'active' && (
          <Pressable
            className="flex-1 bg-dark-card border border-dark-border rounded-xl py-3.5 items-center active:opacity-80"
            onPress={onManage}
            accessibilityLabel="Manage subscription"
            accessibilityRole="button"
          >
            <Text className="text-white font-semibold">Manage</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

export function MembershipTierSkeleton() {
  return (
    <View className="rounded-2xl p-5 border border-dark-border bg-dark-card">
      <View className="flex-row items-center mb-4">
        <View className="w-10 h-10 rounded-full bg-dark-border animate-pulse mr-3" />
        <View className="flex-1">
          <View className="w-24 h-5 rounded bg-dark-border animate-pulse mb-1" />
          <View className="w-16 h-4 rounded bg-dark-border animate-pulse" />
        </View>
      </View>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} className="w-full h-4 rounded bg-dark-border/50 animate-pulse mb-2" />
      ))}
      <View className="w-full h-12 rounded-xl bg-dark-border animate-pulse mt-4" />
    </View>
  );
}
