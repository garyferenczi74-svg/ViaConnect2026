import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Switch } from 'react-native';
import { CustomerCenterButton } from '../../../src/components/shared';

// ── Seed Data ────────────────────────────────────────────────────────────────

const PRACTICE_PROFILE = {
  name: 'Dr. Elena Vasquez, ND',
  npi: '1234567890',
  licenseState: 'New York',
  licenseNumber: 'ND-2021-4892',
  licenseExpiry: '2027-06-30',
  practice: 'Precision Wellness Center',
  specialty: 'Functional Medicine / Nutrigenomics',
  memberSince: '2025-08-15',
  tier: 'Practitioner',
};

const API_USAGE = {
  aiCalls: { used: 847, limit: 2000 },
  interactionChecks: { used: 312, limit: 1000 },
  labImports: { used: 89, limit: 500 },
};

interface AuditEntry {
  id: string;
  action: string;
  table: string;
  recordId: string;
  timestamp: string;
  detail: string;
}

const RECENT_AUDIT: AuditEntry[] = [
  { id: 'a1', action: 'UPDATE', table: 'protocols', recordId: 'pr1', timestamp: '2026-03-20 09:15', detail: 'Updated MTHFR Support Protocol status to ACTIVE' },
  { id: 'a2', action: 'INSERT', table: 'ai_insights', recordId: 'ins-42', timestamp: '2026-03-20 09:16', detail: 'Generated clinical insight for Sarah Chen' },
  { id: 'a3', action: 'UPDATE', table: 'profiles', recordId: 'p2', timestamp: '2026-03-19 14:30', detail: 'Updated Marcus Rivera consent status' },
  { id: 'a4', action: 'INSERT', table: 'protocols', recordId: 'pr5', timestamp: '2026-03-19 11:00', detail: 'Created Metabolic Optimization protocol draft' },
  { id: 'a5', action: 'UPDATE', table: 'health_metrics', recordId: 'hm-88', timestamp: '2026-03-18 08:00', detail: 'Synced wearable data for Aisha Thompson' },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function PractitionerSettings() {
  const [notifications, setNotifications] = useState({
    newPatient: true,
    protocolReview: true,
    interactionAlert: true,
    labResults: true,
    adherenceDrops: false,
    weeklyDigest: true,
  });

  const toggleNotif = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <ScrollView className="flex-1 bg-dark-bg" contentContainerClassName="pb-8">
      {/* Header */}
      <View className="px-4 pt-12 pb-2">
        <Text className="text-white text-2xl font-bold">Settings</Text>
        <Text className="text-dark-border text-sm">Practice profile & preferences</Text>
      </View>

      {/* Practice Profile */}
      <View className="px-4 mt-4">
        <Text className="text-white text-lg font-bold mb-3">Practice Profile</Text>
        <View className="bg-dark-card rounded-2xl p-4 border border-dark-border">
          <View className="flex-row items-center mb-4">
            <View className="w-14 h-14 rounded-full bg-portal-green/20 items-center justify-center mr-3">
              <Text className="text-portal-green text-xl font-bold">EV</Text>
            </View>
            <View>
              <Text className="text-white font-bold text-lg">{PRACTICE_PROFILE.name}</Text>
              <Text className="text-dark-border text-sm">{PRACTICE_PROFILE.practice}</Text>
            </View>
          </View>

          {[
            { label: 'NPI', value: PRACTICE_PROFILE.npi },
            { label: 'Specialty', value: PRACTICE_PROFILE.specialty },
            { label: 'Membership', value: `${PRACTICE_PROFILE.tier} — $128.88/mo` },
            { label: 'Member Since', value: PRACTICE_PROFILE.memberSince },
          ].map((item) => (
            <View key={item.label} className="flex-row justify-between py-2 border-b border-dark-border/30">
              <Text className="text-dark-border text-sm">{item.label}</Text>
              <Text className="text-white text-sm font-semibold">{item.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* License Verification */}
      <View className="px-4 mt-4">
        <Text className="text-white text-lg font-bold mb-3">License Verification</Text>
        <View className="bg-portal-green/10 rounded-2xl p-4 border border-portal-green/20">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-portal-green font-bold">License Verified</Text>
            <View className="bg-portal-green/20 rounded-full px-2.5 py-0.5">
              <Text className="text-portal-green text-xs font-bold">ACTIVE</Text>
            </View>
          </View>
          <View className="flex-row justify-between mb-1">
            <Text className="text-dark-border text-sm">State</Text>
            <Text className="text-white text-sm">{PRACTICE_PROFILE.licenseState}</Text>
          </View>
          <View className="flex-row justify-between mb-1">
            <Text className="text-dark-border text-sm">License #</Text>
            <Text className="text-white text-sm font-mono">{PRACTICE_PROFILE.licenseNumber}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-dark-border text-sm">Expires</Text>
            <Text className="text-white text-sm">{PRACTICE_PROFILE.licenseExpiry}</Text>
          </View>
        </View>
      </View>

      {/* Notification Preferences */}
      <View className="px-4 mt-4">
        <Text className="text-white text-lg font-bold mb-3">Notification Preferences</Text>
        <View className="bg-dark-card rounded-2xl border border-dark-border">
          {([
            { key: 'newPatient' as const, label: 'New Patient Registration' },
            { key: 'protocolReview' as const, label: 'Protocol Review Requests' },
            { key: 'interactionAlert' as const, label: 'Interaction Alerts' },
            { key: 'labResults' as const, label: 'Lab Results Available' },
            { key: 'adherenceDrops' as const, label: 'Adherence Drops (<60%)' },
            { key: 'weeklyDigest' as const, label: 'Weekly Practice Digest' },
          ]).map((item, i, arr) => (
            <View
              key={item.key}
              className={`flex-row items-center justify-between px-4 py-3 ${
                i < arr.length - 1 ? 'border-b border-dark-border/30' : ''
              }`}
            >
              <Text className="text-white text-sm">{item.label}</Text>
              <Switch
                value={notifications[item.key]}
                onValueChange={() => toggleNotif(item.key)}
                trackColor={{ false: '#374151', true: '#4ADE80' }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>
      </View>

      {/* API Usage */}
      <View className="px-4 mt-4">
        <Text className="text-white text-lg font-bold mb-3">API Usage</Text>
        <View className="bg-dark-card rounded-2xl p-4 border border-dark-border">
          {[
            { label: 'AI Clinical Calls', ...API_USAGE.aiCalls, color: 'bg-portal-purple' },
            { label: 'Interaction Checks', ...API_USAGE.interactionChecks, color: 'bg-portal-green' },
            { label: 'Lab Imports', ...API_USAGE.labImports, color: 'bg-copper' },
          ].map((item) => (
            <View key={item.label} className="mb-3">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-white text-sm">{item.label}</Text>
                <Text className="text-dark-border text-xs">
                  {item.used} / {item.limit}
                </Text>
              </View>
              <View className="h-2 bg-dark-border/30 rounded-full overflow-hidden">
                <View
                  className={`h-full rounded-full ${item.color}`}
                  style={{ width: `${(item.used / item.limit) * 100}%` }}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Audit Trail */}
      <View className="px-4 mt-4">
        <Text className="text-white text-lg font-bold mb-3">Audit Trail</Text>
        {RECENT_AUDIT.map((entry) => (
          <View key={entry.id} className="bg-dark-card rounded-xl p-3 mb-2 border border-dark-border">
            <View className="flex-row items-center justify-between mb-1">
              <View className="flex-row items-center">
                <View
                  className={`rounded px-1.5 py-0.5 mr-2 ${
                    entry.action === 'INSERT' ? 'bg-portal-green/20' : 'bg-portal-yellow/20'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold font-mono ${
                      entry.action === 'INSERT' ? 'text-portal-green' : 'text-portal-yellow'
                    }`}
                  >
                    {entry.action}
                  </Text>
                </View>
                <Text className="text-dark-border text-xs font-mono">{entry.table}</Text>
              </View>
              <Text className="text-dark-border text-xs">{entry.timestamp}</Text>
            </View>
            <Text className="text-white text-sm">{entry.detail}</Text>
          </View>
        ))}
      </View>

      {/* Manage Subscription */}
      <View className="px-4 mt-4">
        <Text className="text-white text-lg font-bold mb-3">Subscription</Text>
        <CustomerCenterButton />
      </View>

      {/* Sign Out */}
      <View className="px-4 mt-6">
        <Pressable className="bg-red-500/10 border border-red-500/30 rounded-xl py-3 items-center active:opacity-80">
          <Text className="text-red-400 font-semibold">Sign Out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
