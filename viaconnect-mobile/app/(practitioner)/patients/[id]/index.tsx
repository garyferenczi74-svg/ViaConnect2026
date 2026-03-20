import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AnimatedSection, AnimatedProgressBar, GlassCard, StaggerItem, hapticLight } from '../../../../src/components/ui';

// ── Seed patient details keyed by ID ─────────────────────────────────────────

const PATIENT_DATA: Record<string, {
  name: string;
  dob: string;
  sex: string;
  consentStatus: string;
  membership: string;
  vitalityScore: number;
  adherence: number;
  genetics: {
    mthfr: string;
    cyp2d6: string;
    comt: string;
    vdr: string;
    sod2: string;
    apoe: string;
  };
  protocols: Array<{
    id: string;
    name: string;
    status: string;
    items: string[];
    startDate: string;
  }>;
  labs: Array<{
    id: string;
    name: string;
    date: string;
    status: string;
  }>;
  messages: Array<{
    id: string;
    from: string;
    preview: string;
    time: string;
  }>;
  caqScores: { vata: number; pitta: number; kapha: number };
}> = {
  p1: {
    name: 'Sarah Chen',
    dob: '1988-04-12',
    sex: 'Female',
    consentStatus: 'granted',
    membership: 'Platinum',
    vitalityScore: 78,
    adherence: 92,
    genetics: {
      mthfr: 'C677T Homozygous',
      cyp2d6: '*4/*4 Poor Metabolizer',
      comt: 'Val/Met Intermediate',
      vdr: 'FokI Normal',
      sod2: 'Normal',
      apoe: 'ε3/ε3',
    },
    protocols: [
      { id: 'pr1', name: 'MTHFR Support Protocol', status: 'ACTIVE', items: ['MTHFR+', 'CoQ10+', 'NAD+'], startDate: '2026-02-01' },
      { id: 'pr2', name: 'Stress Recovery', status: 'COMPLETED', items: ['COMT+', 'FOCUS+'], startDate: '2025-11-15' },
    ],
    labs: [
      { id: 'l1', name: 'Methylation Panel', date: '2026-03-10', status: 'Complete' },
      { id: 'l2', name: 'Hormone Panel', date: '2026-02-15', status: 'Complete' },
    ],
    messages: [
      { id: 'm1', from: 'Sarah Chen', preview: 'Feeling much better on the new dosage...', time: '2h ago' },
      { id: 'm2', from: 'You', preview: 'Great to hear. Let\'s review at your next visit.', time: '3h ago' },
    ],
    caqScores: { vata: 72, pitta: 45, kapha: 33 },
  },
  p2: {
    name: 'Marcus Rivera',
    dob: '1975-09-28',
    sex: 'Male',
    consentStatus: 'granted',
    membership: 'Gold',
    vitalityScore: 61,
    adherence: 64,
    genetics: {
      mthfr: 'A1298C Heterozygous',
      cyp2d6: '*5/*5 Poor Metabolizer',
      comt: 'Val/Val Fast',
      vdr: 'Normal',
      sod2: 'Ala16Val',
      apoe: 'ε3/ε4',
    },
    protocols: [
      { id: 'pr3', name: 'Detox Support', status: 'ACTIVE', items: ['NAD+', 'BLAST+'], startDate: '2026-03-01' },
    ],
    labs: [
      { id: 'l3', name: 'Pharmacogenomics Panel', date: '2026-03-05', status: 'Complete' },
    ],
    messages: [
      { id: 'm3', from: 'Marcus Rivera', preview: 'Having trouble remembering evening dose...', time: '1d ago' },
    ],
    caqScores: { vata: 38, pitta: 68, kapha: 44 },
  },
};

const DEFAULT_PATIENT = {
  name: 'Unknown Patient',
  dob: 'N/A',
  sex: 'N/A',
  consentStatus: 'pending',
  membership: 'Free',
  vitalityScore: 0,
  adherence: 0,
  genetics: { mthfr: 'N/A', cyp2d6: 'N/A', comt: 'N/A', vdr: 'N/A', sod2: 'N/A', apoe: 'N/A' },
  protocols: [],
  labs: [],
  messages: [],
  caqScores: { vata: 0, pitta: 0, kapha: 0 },
};

type TabKey = 'overview' | 'genetics' | 'protocol' | 'labs' | 'messages' | 'assessment';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'genetics', label: 'Genetics' },
  { key: 'protocol', label: 'Protocol' },
  { key: 'labs', label: 'Labs' },
  { key: 'messages', label: 'Messages' },
  { key: 'assessment', label: 'Assessment' },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function PatientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const patient = PATIENT_DATA[id ?? ''] ?? DEFAULT_PATIENT;
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  return (
    <View className="flex-1 bg-dark-bg">
      {/* Patient Header */}
      <Animated.View entering={FadeIn.duration(300)} className="px-4 pt-4 pb-3 border-b border-dark-border">
        <View className="flex-row items-center">
          <View className="w-14 h-14 rounded-full bg-portal-green/20 items-center justify-center mr-3">
            <Text className="text-portal-green text-xl font-bold">{patient.name.charAt(0)}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-white text-xl font-bold">{patient.name}</Text>
            <Text className="text-dark-border text-sm">
              DOB: {patient.dob} · {patient.sex} · {patient.membership}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-white text-2xl font-bold">{patient.vitalityScore}</Text>
            <Text className="text-dark-border text-[10px]">Vitality</Text>
          </View>
        </View>
      </Animated.View>

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="border-b border-dark-border">
        <View className="flex-row px-2">
          {TABS.map((tab) => (
            <Pressable
              key={tab.key}
              className={`px-4 py-3 ${activeTab === tab.key ? 'border-b-2 border-portal-green' : ''}`}
              onPress={() => { hapticLight(); setActiveTab(tab.key); }}
            >
              <Text
                className={`text-sm font-semibold ${
                  activeTab === tab.key ? 'text-portal-green' : 'text-dark-border'
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Tab Content */}
      <ScrollView className="flex-1 px-4 pt-4" contentContainerClassName="pb-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <View>
            <View className="bg-dark-card rounded-2xl p-4 mb-3 border border-dark-border">
              <Text className="text-portal-green text-sm font-semibold mb-2">Quick Summary</Text>
              <View className="flex-row justify-between mb-2">
                <Text className="text-dark-border text-sm">Consent</Text>
                <Text className="text-green-400 text-sm font-semibold">{patient.consentStatus}</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-dark-border text-sm">Active Protocols</Text>
                <Text className="text-white text-sm font-semibold">
                  {patient.protocols.filter((p) => p.status === 'ACTIVE').length}
                </Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-dark-border text-sm">Adherence</Text>
                <Text className="text-white text-sm font-semibold">{patient.adherence}%</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-dark-border text-sm">Membership</Text>
                <Text className="text-copper text-sm font-semibold">{patient.membership}</Text>
              </View>
            </View>

            {/* Adherence Bar */}
            <GlassCard className="p-4 mb-3">
              <Text className="text-white text-sm font-semibold mb-2">Protocol Adherence</Text>
              <AnimatedProgressBar
                progress={patient.adherence}
                color={patient.adherence >= 80 ? 'bg-portal-green' : patient.adherence >= 50 ? 'bg-portal-yellow' : 'bg-red-500'}
                height="h-3"
              />
              <Text className="text-dark-border text-xs mt-1">{patient.adherence}% this month</Text>
            </GlassCard>

            {/* Recent Activity */}
            <View className="bg-dark-card rounded-2xl p-4 border border-dark-border">
              <Text className="text-white text-sm font-semibold mb-2">Recent Activity</Text>
              {patient.messages.slice(0, 2).map((msg) => (
                <View key={msg.id} className="flex-row items-center py-2 border-b border-dark-border/30">
                  <View className="w-2 h-2 rounded-full bg-portal-green mr-2" />
                  <Text className="text-white text-sm flex-1" numberOfLines={1}>{msg.preview}</Text>
                  <Text className="text-dark-border text-xs ml-2">{msg.time}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Genetics Tab */}
        {activeTab === 'genetics' && (
          <View>
            <Text className="text-portal-purple text-lg font-bold mb-3">Genetic Profile</Text>
            {Object.entries(patient.genetics).map(([gene, status]) => {
              const isRisk = status.includes('Poor') || status.includes('Homozygous');
              const isModerate = status.includes('Intermediate') || status.includes('Heterozygous') || status.includes('ε3/ε4');
              return (
                <View
                  key={gene}
                  className={`rounded-xl p-4 mb-2 border ${
                    isRisk
                      ? 'bg-red-500/10 border-red-500/30'
                      : isModerate
                        ? 'bg-yellow-500/10 border-yellow-500/30'
                        : 'bg-dark-card border-dark-border'
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-white font-bold text-base uppercase">{gene}</Text>
                    <View
                      className={`rounded-full px-2 py-0.5 ${
                        isRisk ? 'bg-red-500/20' : isModerate ? 'bg-yellow-500/20' : 'bg-green-500/20'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isRisk ? 'text-red-400' : isModerate ? 'text-yellow-400' : 'text-green-400'
                        }`}
                      >
                        {isRisk ? 'HIGH' : isModerate ? 'MODERATE' : 'NORMAL'}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-dark-border text-sm mt-1">{status}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Protocol Tab */}
        {activeTab === 'protocol' && (
          <View>
            <Text className="text-white text-lg font-bold mb-3">Protocols</Text>
            {patient.protocols.length === 0 ? (
              <Text className="text-dark-border text-center py-8">No protocols assigned</Text>
            ) : (
              patient.protocols.map((proto) => (
                <View key={proto.id} className="bg-dark-card rounded-2xl p-4 mb-3 border border-dark-border">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-white font-bold">{proto.name}</Text>
                    <View
                      className={`rounded-full px-2 py-0.5 ${
                        proto.status === 'ACTIVE' ? 'bg-portal-green/20' : 'bg-dark-border'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          proto.status === 'ACTIVE' ? 'text-portal-green' : 'text-dark-border'
                        }`}
                      >
                        {proto.status}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-dark-border text-xs mb-2">Started: {proto.startDate}</Text>
                  <View className="flex-row flex-wrap gap-1">
                    {proto.items.map((item) => (
                      <View key={item} className="bg-copper/10 rounded-full px-2 py-0.5">
                        <Text className="text-copper text-xs font-semibold">{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Labs Tab */}
        {activeTab === 'labs' && (
          <View>
            <Text className="text-white text-lg font-bold mb-3">Lab Results</Text>
            {patient.labs.length === 0 ? (
              <Text className="text-dark-border text-center py-8">No lab results</Text>
            ) : (
              patient.labs.map((lab) => (
                <View key={lab.id} className="bg-dark-card rounded-2xl p-4 mb-3 border border-dark-border">
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-white font-semibold">{lab.name}</Text>
                      <Text className="text-dark-border text-xs">{lab.date}</Text>
                    </View>
                    <View className="bg-portal-green/20 rounded-full px-2 py-0.5">
                      <Text className="text-portal-green text-xs font-bold">{lab.status}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <View>
            <Text className="text-white text-lg font-bold mb-3">Secure Messages</Text>
            {patient.messages.length === 0 ? (
              <Text className="text-dark-border text-center py-8">No messages</Text>
            ) : (
              patient.messages.map((msg) => (
                <View
                  key={msg.id}
                  className={`rounded-2xl p-4 mb-2 ${
                    msg.from === 'You' ? 'bg-portal-green/10 ml-8' : 'bg-dark-card mr-8'
                  } border border-dark-border`}
                >
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-portal-green text-xs font-semibold">{msg.from}</Text>
                    <Text className="text-dark-border text-xs">{msg.time}</Text>
                  </View>
                  <Text className="text-white text-sm">{msg.preview}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* Assessment Tab */}
        {activeTab === 'assessment' && (
          <View>
            <Text className="text-white text-lg font-bold mb-3">Constitutional Assessment</Text>
            <View className="bg-dark-card rounded-2xl p-4 border border-dark-border">
              <Text className="text-portal-purple text-sm font-semibold mb-3">Ayurvedic Dosha Scores</Text>
              {Object.entries(patient.caqScores).map(([dosha, score]) => (
                <View key={dosha} className="mb-3">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-white text-sm capitalize">{dosha}</Text>
                    <Text className="text-white text-sm font-bold">{score}%</Text>
                  </View>
                  <View className="h-2 bg-dark-border/30 rounded-full overflow-hidden">
                    <View
                      className={`h-full rounded-full ${
                        dosha === 'vata'
                          ? 'bg-portal-purple'
                          : dosha === 'pitta'
                            ? 'bg-portal-yellow'
                            : 'bg-portal-green'
                      }`}
                      style={{ width: `${score}%` }}
                    />
                  </View>
                </View>
              ))}
              <Text className="text-dark-border text-xs mt-2">
                Primary Constitution: {
                  patient.caqScores.vata >= patient.caqScores.pitta && patient.caqScores.vata >= patient.caqScores.kapha
                    ? 'Vata'
                    : patient.caqScores.pitta >= patient.caqScores.kapha
                      ? 'Pitta'
                      : 'Kapha'
                }
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
