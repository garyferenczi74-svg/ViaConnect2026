import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { StaggerItem, AnimatedSection, GlassCard, hapticLight } from '../../src/components/ui';

// ── Seed Data ────────────────────────────────────────────────────────────────

const SCHEDULE = [
  { id: '1', time: '9:00 AM', patient: 'Sarah Chen', type: 'Follow-up', status: 'confirmed' },
  { id: '2', time: '10:30 AM', patient: 'Marcus Rivera', type: 'Genetic Review', status: 'confirmed' },
  { id: '3', time: '1:00 PM', patient: 'Aisha Thompson', type: 'Protocol Adjustment', status: 'pending' },
  { id: '4', time: '3:00 PM', patient: 'James O\'Brien', type: 'Initial Consult', status: 'confirmed' },
];

const ALERTS = [
  { id: '1', type: 'interaction', message: 'CYP2D6 poor metabolizer flagged — Marcus Rivera', time: '2h ago' },
  { id: '2', type: 'adherence', message: 'Sarah Chen adherence dropped below 60%', time: '4h ago' },
  { id: '3', type: 'lab', message: 'New lab results available — Aisha Thompson', time: '1d ago' },
];

const STATS = [
  { label: 'Patients This Week', value: '24', color: 'bg-portal-green/10', textColor: 'text-portal-green' },
  { label: 'Protocols Approved', value: '8', color: 'bg-portal-purple/10', textColor: 'text-portal-purple' },
  { label: 'Interaction Flags', value: '3', color: 'bg-portal-yellow/10', textColor: 'text-portal-yellow' },
  { label: 'Avg Adherence', value: '78%', color: 'bg-portal-pink/10', textColor: 'text-portal-pink' },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function PractitionerDashboard() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-dark-bg" contentContainerClassName="pb-8">
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} className="px-4 pt-4 pb-2">
        <Text className="text-portal-green text-sm font-semibold">Practitioner Portal</Text>
        <Text className="text-white text-2xl font-bold">Good Morning, Dr.</Text>
        <Text className="text-dark-border text-sm">March 20, 2026 — 4 appointments today</Text>
      </Animated.View>

      {/* Quick Stats — glass cards with stagger */}
      <View className="flex-row flex-wrap px-3 py-2">
        {STATS.map((stat, i) => (
          <StaggerItem key={stat.label} index={i} stagger={80} className="w-1/2 p-1">
            <GlassCard className={`p-4 ${stat.color}`}>
              <Text className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</Text>
              <Text className="text-dark-border text-xs mt-1">{stat.label}</Text>
            </GlassCard>
          </StaggerItem>
        ))}
      </View>

      {/* Quick Actions */}
      <AnimatedSection delay={350} className="flex-row px-4 py-2 gap-2">
        <Pressable
          className="flex-1 bg-portal-green rounded-xl py-3 items-center active:opacity-80"
          onPress={() => { hapticLight(); router.push('/(practitioner)/genomics'); }}
        >
          <Text className="text-dark-bg font-semibold text-sm">Genomics</Text>
        </Pressable>
        <Pressable
          className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 items-center active:opacity-80"
          onPress={() => { hapticLight(); router.push('/(practitioner)/interactions'); }}
        >
          <Text className="text-white font-semibold text-sm">Interactions</Text>
        </Pressable>
        <Pressable
          className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 items-center active:opacity-80"
          onPress={() => { hapticLight(); router.push('/(practitioner)/ai'); }}
        >
          <Text className="text-white font-semibold text-sm">AI Support</Text>
        </Pressable>
      </AnimatedSection>

      {/* Today's Schedule */}
      <AnimatedSection delay={450} className="px-4 mt-4">
        <Text className="text-white text-lg font-bold mb-3">Today's Schedule</Text>
        {SCHEDULE.map((appt, i) => (
          <StaggerItem key={appt.id} index={i} stagger={60}>
            <Pressable
              className="bg-white/5 rounded-xl p-4 mb-2 border border-white/10 flex-row items-center active:opacity-80"
              onPress={() => { hapticLight(); router.push('/(practitioner)/patients'); }}
            >
              <View className="mr-3">
                <Text className="text-portal-green text-sm font-bold">{appt.time}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold">{appt.patient}</Text>
                <Text className="text-dark-border text-xs">{appt.type}</Text>
              </View>
              <View className={`rounded-full px-2 py-0.5 ${appt.status === 'confirmed' ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                <Text className={`text-xs ${appt.status === 'confirmed' ? 'text-green-400' : 'text-yellow-400'}`}>
                  {appt.status}
                </Text>
              </View>
            </Pressable>
          </StaggerItem>
        ))}
      </AnimatedSection>

      {/* Pending Reviews */}
      <AnimatedSection delay={600} className="px-4 mt-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-white text-lg font-bold">Pending Reviews</Text>
          <View className="bg-portal-yellow/20 rounded-full px-2.5 py-0.5">
            <Text className="text-portal-yellow text-xs font-bold">5</Text>
          </View>
        </View>
        <GlassCard className="p-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-white font-semibold">Protocol Reviews</Text>
            <Text className="text-portal-yellow text-sm font-bold">3</Text>
          </View>
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-white font-semibold">Lab Result Reviews</Text>
            <Text className="text-portal-yellow text-sm font-bold">2</Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-white font-semibold">Consent Requests</Text>
            <Text className="text-portal-green text-sm font-bold">0</Text>
          </View>
        </GlassCard>
      </AnimatedSection>

      {/* Recent Alerts */}
      <AnimatedSection delay={700} className="px-4 mt-4">
        <Text className="text-white text-lg font-bold mb-3">Recent Alerts</Text>
        {ALERTS.map((alert, i) => {
          const isInteraction = alert.type === 'interaction';
          const isAdherence = alert.type === 'adherence';
          return (
            <StaggerItem key={alert.id} index={i} stagger={60}>
              <View
                className={`rounded-xl p-3 mb-2 ${
                  isInteraction ? 'bg-red-500/10' : isAdherence ? 'bg-yellow-500/10' : 'bg-portal-purple/10'
                }`}
              >
                <View className="flex-row items-center">
                  <View
                    className={`w-2 h-2 rounded-full mr-2 ${
                      isInteraction ? 'bg-red-500' : isAdherence ? 'bg-yellow-500' : 'bg-portal-purple'
                    }`}
                  />
                  <Text className="text-white text-sm flex-1">{alert.message}</Text>
                  <Text className="text-dark-border text-xs ml-2">{alert.time}</Text>
                </View>
              </View>
            </StaggerItem>
          );
        })}
      </AnimatedSection>

      {/* Active Patient Count */}
      <AnimatedSection delay={800} className="px-4 mt-4">
        <GlassCard className="p-4" style={{ backgroundColor: 'rgba(34, 72, 82, 0.2)' }}>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-teal-light text-sm">Active Patients</Text>
              <Text className="text-white text-3xl font-bold">47</Text>
            </View>
            <View className="items-end">
              <Text className="text-portal-green text-sm font-semibold">+3 this week</Text>
              <Text className="text-dark-border text-xs">12 with active protocols</Text>
            </View>
          </View>
        </GlassCard>
      </AnimatedSection>
    </ScrollView>
  );
}
