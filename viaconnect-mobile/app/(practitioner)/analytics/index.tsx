import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useEntitlements } from '../../../src/hooks/useEntitlements';
import { LockedFeatureOverlay } from '../../../src/components/shared';
import { StaggerItem, AnimatedSection, GlassCard, hapticLight } from '../../../src/components/ui';

const SCREEN_WIDTH = Dimensions.get('window').width - 32;

const CHART_CONFIG = {
  backgroundColor: '#1F2937',
  backgroundGradientFrom: '#1F2937',
  backgroundGradientTo: '#1F2937',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(74, 222, 128, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
  style: { borderRadius: 16 },
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#4ADE80' },
};

// ── Seed Chart Data ──────────────────────────────────────────────────────────

const ADHERENCE_DATA = {
  labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
  datasets: [
    {
      data: [62, 68, 71, 75, 78, 82],
      color: (opacity = 1) => `rgba(74, 222, 128, ${opacity})`,
      strokeWidth: 2,
    },
  ],
};

const OUTCOMES_DATA = {
  labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
  datasets: [
    {
      data: [55, 60, 64, 70, 74, 78],
      color: (opacity = 1) => `rgba(167, 139, 250, ${opacity})`,
      strokeWidth: 2,
    },
  ],
};

const TOP_SUPPLEMENTS = {
  labels: ['MTHFR+', 'NAD+', 'CoQ10+', 'COMT+', 'FOCUS+'],
  datasets: [{ data: [38, 32, 28, 24, 18] }],
};

const VARIANT_DISTRIBUTION = [
  { name: 'MTHFR', count: 24, color: '#F87171', legendFontColor: '#9CA3AF', legendFontSize: 12 },
  { name: 'CYP2D6', count: 18, color: '#A78BFA', legendFontColor: '#9CA3AF', legendFontSize: 12 },
  { name: 'COMT', count: 15, color: '#FBBF24', legendFontColor: '#9CA3AF', legendFontSize: 12 },
  { name: 'VDR', count: 12, color: '#4ADE80', legendFontColor: '#9CA3AF', legendFontSize: 12 },
  { name: 'SOD2', count: 8, color: '#F472B6', legendFontColor: '#9CA3AF', legendFontSize: 12 },
];

type ChartTab = 'outcomes' | 'adherence' | 'supplements' | 'variants';

const TABS: { key: ChartTab; label: string }[] = [
  { key: 'outcomes', label: 'Outcomes' },
  { key: 'adherence', label: 'Adherence' },
  { key: 'supplements', label: 'Top Supps' },
  { key: 'variants', label: 'Variants' },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const { canViewFullAnalytics } = useEntitlements();
  const [tab, setTab] = useState<ChartTab>('outcomes');

  if (!canViewFullAnalytics) {
    return (
      <LockedFeatureOverlay
        requiredTier="platinum"
        featureName="Practice Analytics"
        description="Full practice analytics with outcome tracking, adherence rates, and variant distribution. Requires Platinum or higher."
      />
    );
  }

  return (
    <ScrollView className="flex-1 bg-dark-bg" contentContainerClassName="pb-8">
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} className="px-4 pt-12 pb-2">
        <Text className="text-white text-2xl font-bold">Practice Analytics</Text>
        <Text className="text-dark-border text-sm">Last 6 months · 47 active patients</Text>
      </Animated.View>

      {/* Summary Cards */}
      <View className="flex-row flex-wrap px-3 py-2">
        {[
          { label: 'Avg Vitality', value: '74', change: '+6', color: 'text-portal-green' },
          { label: 'Avg Adherence', value: '78%', change: '+12%', color: 'text-portal-green' },
          { label: 'Protocols Active', value: '12', change: '+3', color: 'text-portal-purple' },
          { label: 'Interaction Alerts', value: '3', change: '-2', color: 'text-portal-yellow' },
        ].map((stat, i) => (
          <StaggerItem key={stat.label} index={i} stagger={80} className="w-1/2 p-1">
            <GlassCard className="p-3">
              <Text className="text-white text-xl font-bold">{stat.value}</Text>
              <Text className="text-dark-border text-xs">{stat.label}</Text>
              <Text className={`text-xs font-semibold mt-1 ${stat.color}`}>{stat.change}</Text>
            </GlassCard>
          </StaggerItem>
        ))}
      </View>

      {/* Tab Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-2">
        <View className="flex-row gap-2">
          {TABS.map((t) => (
            <Pressable
              key={t.key}
              className={`rounded-full px-4 py-1.5 ${
                tab === t.key ? 'bg-portal-green' : 'bg-dark-card border border-dark-border'
              }`}
              onPress={() => { hapticLight(); setTab(t.key); }}
            >
              <Text className={`text-sm font-semibold ${tab === t.key ? 'text-dark-bg' : 'text-white'}`}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Charts */}
      <View className="px-4 mt-2">
        {tab === 'outcomes' && (
          <View className="bg-dark-card rounded-2xl p-4 border border-dark-border">
            <Text className="text-white font-bold mb-3">Patient Outcomes Over Time</Text>
            <Text className="text-dark-border text-xs mb-2">Average Vitality Score</Text>
            <LineChart
              data={OUTCOMES_DATA}
              width={SCREEN_WIDTH - 32}
              height={220}
              chartConfig={{
                ...CHART_CONFIG,
                color: (opacity = 1) => `rgba(167, 139, 250, ${opacity})`,
                propsForDots: { r: '4', strokeWidth: '2', stroke: '#A78BFA' },
              }}
              bezier
              style={{ borderRadius: 12 }}
            />
          </View>
        )}

        {tab === 'adherence' && (
          <View className="bg-dark-card rounded-2xl p-4 border border-dark-border">
            <Text className="text-white font-bold mb-3">Protocol Adherence Rates</Text>
            <Text className="text-dark-border text-xs mb-2">Average across all patients (%)</Text>
            <LineChart
              data={ADHERENCE_DATA}
              width={SCREEN_WIDTH - 32}
              height={220}
              chartConfig={CHART_CONFIG}
              bezier
              style={{ borderRadius: 12 }}
            />
          </View>
        )}

        {tab === 'supplements' && (
          <View className="bg-dark-card rounded-2xl p-4 border border-dark-border">
            <Text className="text-white font-bold mb-3">Top Prescribed Supplements</Text>
            <Text className="text-dark-border text-xs mb-2">Number of active protocols</Text>
            <BarChart
              data={TOP_SUPPLEMENTS}
              width={SCREEN_WIDTH - 32}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                ...CHART_CONFIG,
                color: (opacity = 1) => `rgba(183, 95, 25, ${opacity})`,
                barPercentage: 0.6,
              }}
              style={{ borderRadius: 12 }}
            />
          </View>
        )}

        {tab === 'variants' && (
          <View className="bg-dark-card rounded-2xl p-4 border border-dark-border">
            <Text className="text-white font-bold mb-3">Genetic Variant Distribution</Text>
            <Text className="text-dark-border text-xs mb-2">Across your patient population</Text>
            <PieChart
              data={VARIANT_DISTRIBUTION}
              width={SCREEN_WIDTH - 32}
              height={220}
              chartConfig={CHART_CONFIG}
              accessor="count"
              backgroundColor="transparent"
              paddingLeft="15"
            />
          </View>
        )}
      </View>

      {/* Insights */}
      <View className="px-4 mt-4">
        <Text className="text-white text-lg font-bold mb-3">Insights</Text>
        {[
          { text: 'Adherence rates increased 12% since implementing ViaToken rewards', type: 'positive' },
          { text: '3 patients with CYP2D6 poor metabolizer status need dosage review', type: 'warning' },
          { text: 'MTHFR+ is the most effective supplement by patient-reported outcomes', type: 'info' },
        ].map((insight, i) => (
          <View
            key={i}
            className={`rounded-xl p-3 mb-2 ${
              insight.type === 'positive'
                ? 'bg-portal-green/10'
                : insight.type === 'warning'
                  ? 'bg-portal-yellow/10'
                  : 'bg-portal-purple/10'
            }`}
          >
            <View className="flex-row items-center">
              <View
                className={`w-2 h-2 rounded-full mr-2 ${
                  insight.type === 'positive'
                    ? 'bg-portal-green'
                    : insight.type === 'warning'
                      ? 'bg-portal-yellow'
                      : 'bg-portal-purple'
                }`}
              />
              <Text className="text-white text-sm flex-1">{insight.text}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
