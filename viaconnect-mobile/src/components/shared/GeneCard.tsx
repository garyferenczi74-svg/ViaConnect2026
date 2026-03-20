import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SNPVariantBadge, type RiskLevel } from './SNPVariantBadge';

// ── Types ────────────────────────────────────────────────────────────────────

export interface GeneCardProps {
  geneName: string;
  variant: string;
  rsid: string;
  riskLevel: RiskLevel;
  category: string;
  /** Linked FarmCeutica product recommendation */
  productName?: string;
  productSku?: string;
  onProductPress?: (sku: string) => void;
  onPress?: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function GeneCard({
  geneName,
  variant,
  rsid,
  riskLevel,
  category,
  productName,
  productSku,
  onProductPress,
  onPress,
}: GeneCardProps) {
  return (
    <Pressable
      className="bg-dark-card rounded-2xl p-4 mb-3 border border-dark-border active:opacity-80"
      onPress={onPress}
      accessibilityLabel={`${geneName} gene card, ${riskLevel} risk`}
      accessibilityRole="button"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <Text className="text-white text-lg font-bold mr-2">{geneName}</Text>
          <SNPVariantBadge gene={geneName} variant={variant} riskLevel={riskLevel} compact />
        </View>
        <Text className="text-dark-border text-xs font-mono">{rsid}</Text>
      </View>

      {/* Category */}
      <View className="flex-row items-center mb-3">
        <View className="bg-teal/20 rounded-full px-2.5 py-0.5">
          <Text className="text-teal-light text-xs">{category}</Text>
        </View>
      </View>

      {/* Product Recommendation */}
      {productName && (
        <Pressable
          className="flex-row items-center bg-copper/10 rounded-xl p-3 active:opacity-70"
          onPress={() => productSku && onProductPress?.(productSku)}
          accessibilityLabel={`Recommended product: ${productName}`}
          accessibilityRole="button"
        >
          <View className="w-8 h-8 rounded-lg bg-copper/20 items-center justify-center mr-3">
            <Text className="text-copper text-sm">Rx</Text>
          </View>
          <View className="flex-1">
            <Text className="text-xs text-copper/70">Recommended</Text>
            <Text className="text-white text-sm font-semibold">{productName}</Text>
          </View>
          <Text className="text-copper text-lg">&rsaquo;</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

export function GeneCardSkeleton() {
  return (
    <View className="bg-dark-card rounded-2xl p-4 mb-3 border border-dark-border">
      <View className="flex-row items-center justify-between mb-2">
        <View className="w-24 h-5 rounded bg-dark-border animate-pulse" />
        <View className="w-16 h-3 rounded bg-dark-border animate-pulse" />
      </View>
      <View className="w-20 h-4 rounded-full bg-dark-border animate-pulse mb-3" />
      <View className="w-full h-14 rounded-xl bg-dark-border/50 animate-pulse" />
    </View>
  );
}
