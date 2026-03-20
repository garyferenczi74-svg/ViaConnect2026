import React from 'react';
import { View, Text } from 'react-native';

// ── Types ────────────────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'moderate' | 'high';

export interface SNPVariantBadgeProps {
  gene: string;
  variant: string;
  riskLevel: RiskLevel;
  /** Optional compact mode for inline use */
  compact?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const RISK_STYLES: Record<RiskLevel, { bg: string; text: string; label: string }> = {
  low: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Normal' },
  moderate: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Heterozygous' },
  high: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Homozygous' },
};

// ── Component ────────────────────────────────────────────────────────────────

export function SNPVariantBadge({ gene, variant, riskLevel, compact }: SNPVariantBadgeProps) {
  const style = RISK_STYLES[riskLevel];

  if (compact) {
    return (
      <View
        className={`flex-row items-center rounded-full px-2 py-0.5 ${style.bg}`}
        accessibilityLabel={`${gene} ${variant} ${style.label} risk`}
        accessibilityRole="text"
      >
        <Text className={`text-xs font-mono font-semibold ${style.text}`}>
          {gene}:{variant}
        </Text>
      </View>
    );
  }

  return (
    <View
      className={`flex-row items-center rounded-full px-3 py-1.5 ${style.bg}`}
      accessibilityLabel={`${gene} variant ${variant}, risk level ${style.label}`}
      accessibilityRole="text"
    >
      <View className={`w-2 h-2 rounded-full mr-2 ${style.text.replace('text-', 'bg-')}`} />
      <Text className={`text-sm font-mono font-semibold ${style.text}`}>
        {gene}:{variant}
      </Text>
      <Text className={`text-xs ml-2 ${style.text} opacity-70`}>{style.label}</Text>
    </View>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

export function SNPVariantBadgeSkeleton() {
  return (
    <View className="flex-row items-center rounded-full px-3 py-1.5 bg-dark-border/30">
      <View className="w-2 h-2 rounded-full mr-2 bg-dark-border animate-pulse" />
      <View className="w-16 h-3 rounded bg-dark-border animate-pulse" />
    </View>
  );
}
