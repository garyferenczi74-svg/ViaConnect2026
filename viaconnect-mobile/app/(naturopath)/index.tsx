import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

// ── Seed Data ────────────────────────────────────────────────────────────────

const STATS = [
  { label: 'Active Patients', value: '32', color: 'bg-plum/10', textColor: 'text-plum' },
  { label: 'Formulas Active', value: '18', color: 'bg-sage/10', textColor: 'text-sage' },
  { label: 'Assessments Due', value: '5', color: 'bg-copper/10', textColor: 'text-copper' },
  { label: 'Herbs in Formulary', value: '142', color: 'bg-teal/10', textColor: 'text-teal-light' },
];

const TODAY_APPOINTMENTS = [
  { id: '1', time: '9:00 AM', patient: 'Elena Rodriguez', type: 'Constitutional Assessment', status: 'confirmed' },
  { id: '2', time: '10:30 AM', patient: 'David Park', type: 'Formula Review', status: 'confirmed' },
  { id: '3', time: '1:00 PM', patient: 'Fatima Al-Rashid', type: 'Follow-up — Digestive Protocol', status: 'pending' },
  { id: '4', time: '3:30 PM', patient: 'Oliver Chen', type: 'Initial Intake', status: 'confirmed' },
];

const RECENT_FORMULAS = [
  { id: 'f1', name: 'Nervine Tonic Blend', patient: 'Elena Rodriguez', preparation: 'Tincture', herbs: 3, status: 'active' },
  { id: 'f2', name: 'Digestive Bitters Complex', patient: 'Fatima Al-Rashid', preparation: 'Tea', herbs: 5, status: 'active' },
  { id: 'f3', name: 'Adaptogen Recovery', patient: 'David Park', preparation: 'Capsule', herbs: 4, status: 'draft' },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function NaturopathDashboard() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-dark-bg" contentContainerClassName="pb-8">
      {/* Header — glass-morphism style */}
      <View className="px-4 pt-4 pb-3">
        <Text className="text-plum text-sm font-semibold">Naturopath Portal</Text>
        <Text className="text-white text-2xl font-bold">Good Morning, Dr.</Text>
        <Text className="text-dark-border text-sm">March 20, 2026 — Sonar Health</Text>
      </View>

      {/* Quick Stats — glass cards */}
      <View className="flex-row flex-wrap px-3 py-2">
        {STATS.map((stat) => (
          <View key={stat.label} className="w-1/2 p-1">
            <View className={`${stat.color} rounded-2xl p-4 border border-white/5`}>
              <Text className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</Text>
              <Text className="text-dark-border text-xs mt-1">{stat.label}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <View className="flex-row px-4 py-2 gap-2">
        <Pressable
          className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 items-center active:opacity-80"
          onPress={() => router.push('/(naturopath)/botanical')}
        >
          <Text className="text-sage font-semibold text-sm">Herb Search</Text>
        </Pressable>
        <Pressable
          className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 items-center active:opacity-80"
          onPress={() => router.push('/(naturopath)/botanical/formula-builder')}
        >
          <Text className="text-plum font-semibold text-sm">New Formula</Text>
        </Pressable>
        <Pressable
          className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 items-center active:opacity-80"
          onPress={() => router.push('/(naturopath)/constitutional')}
        >
          <Text className="text-copper font-semibold text-sm">Assess</Text>
        </Pressable>
      </View>

      {/* Therapeutic Order */}
      <View className="px-4 mt-4">
        <Text className="text-white text-lg font-bold mb-3">Therapeutic Order</Text>
        <View className="bg-white/5 rounded-2xl p-4 border border-white/10">
          {[
            { level: 1, label: 'Establish conditions for health', color: 'bg-sage' },
            { level: 2, label: 'Stimulate the healing power of nature', color: 'bg-sage/80' },
            { level: 3, label: 'Address weakened systems', color: 'bg-plum' },
            { level: 4, label: 'Correct structural integrity', color: 'bg-plum/80' },
            { level: 5, label: 'Address pathology — natural substances', color: 'bg-copper' },
            { level: 6, label: 'Address pathology — pharmacologic', color: 'bg-copper/80' },
            { level: 7, label: 'Suppress or surgically remove pathology', color: 'bg-rose' },
          ].map((item) => (
            <View key={item.level} className="flex-row items-center mb-2">
              <View className={`w-6 h-6 rounded-full ${item.color} items-center justify-center mr-3`}>
                <Text className="text-white text-xs font-bold">{item.level}</Text>
              </View>
              <Text className="text-white text-sm flex-1">{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Today's Schedule */}
      <View className="px-4 mt-4">
        <Text className="text-white text-lg font-bold mb-3">Today's Schedule</Text>
        {TODAY_APPOINTMENTS.map((appt) => (
          <View
            key={appt.id}
            className="bg-white/5 rounded-xl p-4 mb-2 border border-white/10 flex-row items-center"
          >
            <View className="mr-3">
              <Text className="text-plum text-sm font-bold">{appt.time}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold">{appt.patient}</Text>
              <Text className="text-dark-border text-xs">{appt.type}</Text>
            </View>
            <View className={`rounded-full px-2 py-0.5 ${appt.status === 'confirmed' ? 'bg-sage/20' : 'bg-copper/20'}`}>
              <Text className={`text-xs ${appt.status === 'confirmed' ? 'text-sage' : 'text-copper'}`}>
                {appt.status}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Recent Formulas */}
      <View className="px-4 mt-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-white text-lg font-bold">Recent Formulas</Text>
          <Pressable onPress={() => router.push('/(naturopath)/botanical')}>
            <Text className="text-plum text-sm font-semibold">View All</Text>
          </Pressable>
        </View>
        {RECENT_FORMULAS.map((formula) => (
          <View
            key={formula.id}
            className="bg-white/5 rounded-xl p-4 mb-2 border border-white/10"
          >
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-white font-semibold">{formula.name}</Text>
              <View className={`rounded-full px-2 py-0.5 ${formula.status === 'active' ? 'bg-sage/20' : 'bg-dark-border/30'}`}>
                <Text className={`text-xs font-bold ${formula.status === 'active' ? 'text-sage' : 'text-dark-border'}`}>
                  {formula.status}
                </Text>
              </View>
            </View>
            <Text className="text-dark-border text-xs">
              {formula.patient} · {formula.preparation} · {formula.herbs} herbs
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
