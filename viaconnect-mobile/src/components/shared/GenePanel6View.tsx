import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { FadeIn } from 'react-native-reanimated';
import { GeneCard, GeneCardSkeleton } from './GeneCard';
import type { RiskLevel } from './SNPVariantBadge';

// ── Types ────────────────────────────────────────────────────────────────────

export type PanelId = 'GENEX-M' | 'GENEX-N' | 'GENEX-C' | 'GENEX-D' | 'GENEX-I' | 'Complete';

export interface PanelVariant {
  geneName: string;
  variant: string;
  rsid: string;
  riskLevel: RiskLevel;
  category: string;
  productName?: string;
  productSku?: string;
}

export interface PanelData {
  panelId: PanelId;
  label: string;
  riskScore: number; // 0-100
  variants: PanelVariant[];
}

export interface GenePanel6ViewProps {
  panels: PanelData[];
  isLoading?: boolean;
  onVariantPress?: (variant: PanelVariant) => void;
  onProductPress?: (sku: string) => void;
}

// ── Risk Gauge ───────────────────────────────────────────────────────────────

function RiskGauge({ score, size = 120 }: { score: number; size?: number }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  const color = score <= 33 ? '#4ADE80' : score <= 66 ? '#FBBF24' : '#EF4444';

  return (
    <View className="items-center" accessibilityLabel={`Risk score ${score} out of 100`}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#374151"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${progress} ${circumference - progress}`}
          strokeDashoffset={circumference / 4}
          strokeLinecap="round"
        />
      </Svg>
      <View className="absolute inset-0 items-center justify-center" style={{ width: size, height: size }}>
        <Text className="text-white text-2xl font-bold">{score}</Text>
        <Text className="text-dark-border text-xs">Risk Score</Text>
      </View>
    </View>
  );
}

// ── Panel Tabs ───────────────────────────────────────────────────────────────

const PANEL_SHORT: Record<PanelId, string> = {
  'GENEX-M': 'M',
  'GENEX-N': 'N',
  'GENEX-C': 'C',
  'GENEX-D': 'D',
  'GENEX-I': 'I',
  'Complete': 'All',
};

// ── Component ────────────────────────────────────────────────────────────────

export function GenePanel6View({
  panels,
  isLoading,
  onVariantPress,
  onProductPress,
}: GenePanel6ViewProps) {
  const [activePanel, setActivePanel] = useState<PanelId>(panels[0]?.panelId ?? 'GENEX-M');
  const current = panels.find((p) => p.panelId === activePanel);

  if (isLoading) return <GenePanel6ViewSkeleton />;

  return (
    <View className="flex-1">
      {/* Tab Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-4"
        contentContainerClassName="px-1 gap-2"
      >
        {panels.map((panel) => {
          const isActive = panel.panelId === activePanel;
          return (
            <Pressable
              key={panel.panelId}
              className={`px-4 py-2 rounded-full ${isActive ? 'bg-teal' : 'bg-dark-card'}`}
              onPress={() => setActivePanel(panel.panelId)}
              accessibilityLabel={`${panel.label} panel tab`}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-dark-border'}`}>
                {PANEL_SHORT[panel.panelId]} — {panel.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Panel Content */}
      {current && (
        <Animated.View entering={FadeIn.duration(300)} className="flex-1">
          {/* Gauge */}
          <View className="items-center mb-6">
            <RiskGauge score={current.riskScore} />
          </View>

          {/* Variant List */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {current.variants.map((v, i) => (
              <GeneCard
                key={`${v.rsid}-${i}`}
                geneName={v.geneName}
                variant={v.variant}
                rsid={v.rsid}
                riskLevel={v.riskLevel}
                category={v.category}
                productName={v.productName}
                productSku={v.productSku}
                onPress={() => onVariantPress?.(v)}
                onProductPress={onProductPress}
              />
            ))}
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

export function GenePanel6ViewSkeleton() {
  return (
    <View className="flex-1">
      <View className="flex-row gap-2 mb-4 px-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} className="w-20 h-9 rounded-full bg-dark-border animate-pulse" />
        ))}
      </View>
      <View className="items-center mb-6">
        <View className="w-[120px] h-[120px] rounded-full bg-dark-border animate-pulse" />
      </View>
      {Array.from({ length: 3 }).map((_, i) => (
        <GeneCardSkeleton key={i} />
      ))}
    </View>
  );
}
