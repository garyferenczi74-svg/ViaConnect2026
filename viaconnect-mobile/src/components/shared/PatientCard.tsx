import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SNPVariantBadge, type RiskLevel } from './SNPVariantBadge';

// ── Types ────────────────────────────────────────────────────────────────────

export interface GeneticFlag {
  gene: string;
  variant: string;
  riskLevel: RiskLevel;
}

export interface PatientCardProps {
  id: string;
  name: string;
  avatarUrl?: string;
  consentStatus: 'granted' | 'pending' | 'revoked';
  lastVisit: string | null;
  geneticFlags: GeneticFlag[];
  adherencePercent: number;
  vitalityScore: number;
  vitalityTrend: 'up' | 'down' | 'stable';
  onPress: (patientId: string) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const CONSENT_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  granted: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Consented' },
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'Pending' },
  revoked: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Revoked' },
};

const TREND_ICONS: Record<string, { icon: string; color: string }> = {
  up: { icon: '↑', color: 'text-green-400' },
  down: { icon: '↓', color: 'text-red-400' },
  stable: { icon: '→', color: 'text-yellow-400' },
};

// ── Component ────────────────────────────────────────────────────────────────

export function PatientCard({
  id,
  name,
  consentStatus,
  lastVisit,
  geneticFlags,
  adherencePercent,
  vitalityScore,
  vitalityTrend,
  onPress,
}: PatientCardProps) {
  const consent = CONSENT_CONFIG[consentStatus];
  const trend = TREND_ICONS[vitalityTrend];

  return (
    <Pressable
      className="bg-dark-card rounded-2xl p-4 mb-3 border border-dark-border active:opacity-80"
      onPress={() => onPress(id)}
      accessibilityLabel={`Patient ${name}, vitality score ${vitalityScore}, adherence ${adherencePercent}%`}
      accessibilityRole="button"
    >
      {/* Header Row */}
      <View className="flex-row items-center mb-3">
        {/* Avatar */}
        <View className="w-12 h-12 rounded-full bg-teal items-center justify-center mr-3">
          <Text className="text-white text-lg font-bold">{name.charAt(0).toUpperCase()}</Text>
        </View>

        <View className="flex-1">
          <Text className="text-white text-base font-semibold">{name}</Text>
          <View className="flex-row items-center mt-0.5">
            <View className={`rounded-full px-2 py-0.5 mr-2 ${consent.bg}`}>
              <Text className={`text-xs ${consent.text}`}>{consent.label}</Text>
            </View>
            {lastVisit && (
              <Text className="text-dark-border text-xs">
                Last: {new Date(lastVisit).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>

        {/* Vitality Score */}
        <View className="items-center">
          <View className="flex-row items-center">
            <Text className="text-white text-xl font-bold">{vitalityScore}</Text>
            <Text className={`text-sm ml-0.5 ${trend.color}`}>{trend.icon}</Text>
          </View>
          <Text className="text-dark-border text-[10px]">Vitality</Text>
        </View>
      </View>

      {/* Genetic Flags */}
      {geneticFlags.length > 0 && (
        <View className="flex-row gap-1.5 mb-3">
          {geneticFlags.slice(0, 3).map((flag, i) => (
            <SNPVariantBadge
              key={`${flag.gene}-${i}`}
              gene={flag.gene}
              variant={flag.variant}
              riskLevel={flag.riskLevel}
              compact
            />
          ))}
          {geneticFlags.length > 3 && (
            <View className="bg-dark-border/30 rounded-full px-2 py-0.5">
              <Text className="text-dark-border text-xs">+{geneticFlags.length - 3}</Text>
            </View>
          )}
        </View>
      )}

      {/* Adherence Bar */}
      <View>
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-dark-border text-xs">Protocol Adherence</Text>
          <Text className="text-white text-xs font-semibold">{adherencePercent}%</Text>
        </View>
        <View className="h-1.5 bg-dark-border/30 rounded-full overflow-hidden">
          <View
            className={`h-full rounded-full ${
              adherencePercent >= 80 ? 'bg-green-500' : adherencePercent >= 50 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(100, adherencePercent)}%` }}
          />
        </View>
      </View>
    </Pressable>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

export function PatientCardSkeleton() {
  return (
    <View className="bg-dark-card rounded-2xl p-4 mb-3 border border-dark-border">
      <View className="flex-row items-center mb-3">
        <View className="w-12 h-12 rounded-full bg-dark-border animate-pulse mr-3" />
        <View className="flex-1">
          <View className="w-32 h-4 rounded bg-dark-border animate-pulse mb-1" />
          <View className="w-20 h-3 rounded bg-dark-border animate-pulse" />
        </View>
        <View className="w-10 h-8 rounded bg-dark-border animate-pulse" />
      </View>
      <View className="flex-row gap-1.5 mb-3">
        <View className="w-16 h-5 rounded-full bg-dark-border animate-pulse" />
        <View className="w-16 h-5 rounded-full bg-dark-border animate-pulse" />
      </View>
      <View className="w-full h-1.5 rounded-full bg-dark-border animate-pulse" />
    </View>
  );
}
