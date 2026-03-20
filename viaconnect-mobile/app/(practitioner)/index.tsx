import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

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
      <View className="px-4 pt-4 pb-2">
        <Text className="text-portal-green text-sm font-semibold">Practitioner Portal</Text>
        <Text className="text-white text-2xl font-bold">Good Morning, Dr.</Text>
        <Text className="text-dark-border text-sm">March 20, 2026 — 4 appointments today</Text>
      </View>

      {/* Quick Stats */}
      <View className="flex-row flex-wrap px-3 py-2">
        {STATS.map((stat) => (
          <View key={stat.label} className="w-1/2 p-1">
            <View className={`${stat.color} rounded-2xl p-4`}>
              <Text className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</Text>
              <Text className="text-dark-border text-xs mt-1">{stat.label}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <View className="flex-row px-4 py-2 gap-2">
        <Pressable
          className="flex-1 bg-portal-green rounded-xl py-3 items-center active:opacity-80"
          onPress={() => router.push('/(practitioner)/genomics')}
        >
          <Text className="text-dark-bg font-semibold text-sm">Genomics</Text>
        </Pressable>
        <Pressable
          className="flex-1 bg-dark-card border border-dark-border rounded-xl py-3 items-center active:opacity-80"
          onPress={() => router.push('/(practitioner)/interactions')}
        >
          <Text className="text-white font-semibold text-sm">Interactions</Text>
        </Pressable>
        <Pressable
          className="flex-1 bg-dark-card border border-dark-border rounded-xl py-3 items-center active:opacity-80"
          onPress={() => router.push('/(practitioner)/ai')}
        >
          <Text className="text-white font-semibold text-sm">AI Support</Text>
        </Pressable>
      </View>

      {/* Today's Schedule */}
      <View className="px-4 mt-4">
        <Text className="text-white text-lg font-bold mb-3">Today's Schedule</Text>
        {SCHEDULE.map((appt) => (
          <Pressable
            key={appt.id}
            className="bg-dark-card rounded-xl p-4 mb-2 border border-dark-border flex-row items-center active:opacity-80"
            onPress={() => router.push('/(practitioner)/patients')}
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
        ))}
      </View>

      {/* Pending Reviews */}
      <View className="px-4 mt-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-white text-lg font-bold">Pending Reviews</Text>
          <View className="bg-portal-yellow/20 rounded-full px-2.5 py-0.5">
            <Text className="text-portal-yellow text-xs font-bold">5</Text>
          </View>
        </View>
        <View className="bg-dark-card rounded-xl p-4 border border-dark-border">
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
        </View>
      </View>

      {/* Recent Alerts */}
      <View className="px-4 mt-4">
        <Text className="text-white text-lg font-bold mb-3">Recent Alerts</Text>
        {ALERTS.map((alert) => {
          const isInteraction = alert.type === 'interaction';
          const isAdherence = alert.type === 'adherence';
          return (
            <View
              key={alert.id}
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
          );
        })}
      </View>

      {/* Active Patient Count */}
      <View className="px-4 mt-4">
        <View className="bg-teal/20 rounded-2xl p-4 border border-teal/30">
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
        </View>
      </View>
    </ScrollView>
  );
}
