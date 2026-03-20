import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { PatientCard } from '../../../src/components/shared';
import type { GeneticFlag } from '../../../src/components/shared';

// ── Seed Data ────────────────────────────────────────────────────────────────

type RiskLevel = 'low' | 'moderate' | 'high';

const SEED_PATIENTS: Array<{
  id: string;
  name: string;
  consentStatus: 'granted' | 'pending' | 'revoked';
  lastVisit: string;
  geneticFlags: GeneticFlag[];
  adherencePercent: number;
  vitalityScore: number;
  vitalityTrend: 'up' | 'down' | 'stable';
  riskLevel: RiskLevel;
}> = [
  {
    id: 'p1',
    name: 'Sarah Chen',
    consentStatus: 'granted',
    lastVisit: '2026-03-18',
    geneticFlags: [
      { gene: 'MTHFR', variant: 'C677T', riskLevel: 'high' },
      { gene: 'CYP2D6', variant: '*4/*4', riskLevel: 'high' },
      { gene: 'COMT', variant: 'Val/Met', riskLevel: 'moderate' },
    ],
    adherencePercent: 92,
    vitalityScore: 78,
    vitalityTrend: 'up',
    riskLevel: 'high',
  },
  {
    id: 'p2',
    name: 'Marcus Rivera',
    consentStatus: 'granted',
    lastVisit: '2026-03-15',
    geneticFlags: [
      { gene: 'CYP2D6', variant: '*5/*5', riskLevel: 'high' },
      { gene: 'MTHFR', variant: 'A1298C', riskLevel: 'moderate' },
    ],
    adherencePercent: 64,
    vitalityScore: 61,
    vitalityTrend: 'down',
    riskLevel: 'high',
  },
  {
    id: 'p3',
    name: 'Aisha Thompson',
    consentStatus: 'granted',
    lastVisit: '2026-03-12',
    geneticFlags: [
      { gene: 'COMT', variant: 'Met/Met', riskLevel: 'moderate' },
    ],
    adherencePercent: 88,
    vitalityScore: 85,
    vitalityTrend: 'up',
    riskLevel: 'moderate',
  },
  {
    id: 'p4',
    name: 'James O\'Brien',
    consentStatus: 'pending',
    lastVisit: '2026-03-10',
    geneticFlags: [],
    adherencePercent: 45,
    vitalityScore: 52,
    vitalityTrend: 'down',
    riskLevel: 'low',
  },
  {
    id: 'p5',
    name: 'Priya Patel',
    consentStatus: 'granted',
    lastVisit: '2026-03-08',
    geneticFlags: [
      { gene: 'MTHFR', variant: 'C677T', riskLevel: 'high' },
      { gene: 'VDR', variant: 'FokI', riskLevel: 'moderate' },
      { gene: 'COMT', variant: 'Val/Val', riskLevel: 'low' },
      { gene: 'SOD2', variant: 'Ala16Val', riskLevel: 'moderate' },
    ],
    adherencePercent: 95,
    vitalityScore: 91,
    vitalityTrend: 'up',
    riskLevel: 'moderate',
  },
  {
    id: 'p6',
    name: 'Daniel Kim',
    consentStatus: 'revoked',
    lastVisit: '2026-02-28',
    geneticFlags: [
      { gene: 'CYP1A2', variant: '*1F/*1F', riskLevel: 'low' },
    ],
    adherencePercent: 30,
    vitalityScore: 44,
    vitalityTrend: 'stable',
    riskLevel: 'low',
  },
];

type FilterKey = 'all' | 'granted' | 'pending' | 'revoked' | 'high' | 'moderate' | 'low';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'granted', label: 'Consented' },
  { key: 'pending', label: 'Pending' },
  { key: 'high', label: 'High Risk' },
  { key: 'moderate', label: 'Moderate' },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function PatientRoster() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  const filtered = useMemo(() => {
    return SEED_PATIENTS.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (filter === 'all') return true;
      if (filter === 'granted' || filter === 'pending' || filter === 'revoked')
        return p.consentStatus === filter;
      return p.riskLevel === filter;
    });
  }, [search, filter]);

  return (
    <View className="flex-1 bg-dark-bg">
      {/* Header */}
      <View className="px-4 pt-12 pb-2">
        <Text className="text-white text-2xl font-bold">Patients</Text>
        <Text className="text-dark-border text-sm">{SEED_PATIENTS.length} total patients</Text>
      </View>

      {/* Search */}
      <View className="px-4 py-2">
        <TextInput
          className="bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-white"
          placeholder="Search patients..."
          placeholderTextColor="#6B7280"
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Search patients"
        />
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-1">
        <View className="flex-row gap-2">
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              className={`rounded-full px-4 py-1.5 ${
                filter === f.key ? 'bg-portal-green' : 'bg-dark-card border border-dark-border'
              }`}
              onPress={() => setFilter(f.key)}
            >
              <Text
                className={`text-sm font-semibold ${
                  filter === f.key ? 'text-dark-bg' : 'text-white'
                }`}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Patient List */}
      <ScrollView className="flex-1 px-4 pt-3" contentContainerClassName="pb-8">
        {filtered.length === 0 ? (
          <View className="items-center py-12">
            <Text className="text-dark-border text-base">No patients match your search</Text>
          </View>
        ) : (
          filtered.map((patient) => (
            <PatientCard
              key={patient.id}
              id={patient.id}
              name={patient.name}
              consentStatus={patient.consentStatus}
              lastVisit={patient.lastVisit}
              geneticFlags={patient.geneticFlags}
              adherencePercent={patient.adherencePercent}
              vitalityScore={patient.vitalityScore}
              vitalityTrend={patient.vitalityTrend}
              onPress={(id) => router.push(`/(practitioner)/patients/${id}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
