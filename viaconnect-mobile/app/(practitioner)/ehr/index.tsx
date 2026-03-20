import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';

// ── Seed Data ────────────────────────────────────────────────────────────────

interface LabSystem {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'syncing';
  lastSync: string | null;
  recordCount: number;
}

interface LabImport {
  id: string;
  patientName: string;
  testName: string;
  labSystem: string;
  importDate: string;
  status: 'processed' | 'pending' | 'failed';
  values: Array<{ marker: string; value: string; range: string; flag: 'normal' | 'high' | 'low' }>;
}

const LAB_SYSTEMS: LabSystem[] = [
  { id: 'ls1', name: 'Quest Diagnostics', type: 'Reference Lab', status: 'connected', lastSync: '2026-03-20T08:00:00Z', recordCount: 156 },
  { id: 'ls2', name: 'LabCorp', type: 'Reference Lab', status: 'connected', lastSync: '2026-03-19T22:00:00Z', recordCount: 89 },
  { id: 'ls3', name: 'GENEX360 Lab', type: 'Genetic Panel', status: 'connected', lastSync: '2026-03-20T06:30:00Z', recordCount: 47 },
  { id: 'ls4', name: 'ZRT Laboratory', type: 'Hormone Panel', status: 'disconnected', lastSync: null, recordCount: 0 },
  { id: 'ls5', name: 'Doctor\'s Data', type: 'Specialty Lab', status: 'syncing', lastSync: '2026-03-20T09:15:00Z', recordCount: 23 },
];

const RECENT_IMPORTS: LabImport[] = [
  {
    id: 'li1', patientName: 'Sarah Chen', testName: 'Methylation Panel', labSystem: 'Quest Diagnostics',
    importDate: '2026-03-20', status: 'processed',
    values: [
      { marker: 'Homocysteine', value: '12.4', range: '5-15 μmol/L', flag: 'normal' },
      { marker: 'Folate (serum)', value: '8.2', range: '3.1-17.5 ng/mL', flag: 'normal' },
      { marker: 'B12', value: '320', range: '200-1100 pg/mL', flag: 'normal' },
    ],
  },
  {
    id: 'li2', patientName: 'Marcus Rivera', testName: 'Hormone Panel', labSystem: 'LabCorp',
    importDate: '2026-03-19', status: 'processed',
    values: [
      { marker: 'Testosterone (Total)', value: '280', range: '300-1000 ng/dL', flag: 'low' },
      { marker: 'Free T', value: '5.2', range: '5.0-21.0 pg/mL', flag: 'normal' },
      { marker: 'DHEA-S', value: '180', range: '120-520 μg/dL', flag: 'normal' },
      { marker: 'Cortisol (AM)', value: '22.5', range: '6.2-19.4 μg/dL', flag: 'high' },
    ],
  },
  {
    id: 'li3', patientName: 'Aisha Thompson', testName: 'Comprehensive Metabolic Panel', labSystem: 'Quest Diagnostics',
    importDate: '2026-03-18', status: 'pending',
    values: [],
  },
];

const STATUS_CONFIG = {
  connected: { bg: 'bg-portal-green/10', text: 'text-portal-green', dot: 'bg-portal-green' },
  disconnected: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-500' },
  syncing: { bg: 'bg-portal-yellow/10', text: 'text-portal-yellow', dot: 'bg-portal-yellow' },
};

const FLAG_CONFIG = {
  normal: { text: 'text-green-400' },
  high: { text: 'text-red-400' },
  low: { text: 'text-portal-yellow' },
};

// ── Component ────────────────────────────────────────────────────────────────

export default function EHRIntegration() {
  const [expandedImport, setExpandedImport] = useState<string | null>(null);

  return (
    <ScrollView className="flex-1 bg-dark-bg" contentContainerClassName="pb-8">
      {/* Header */}
      <View className="px-4 pt-12 pb-2">
        <Text className="text-white text-2xl font-bold">EHR Integration Hub</Text>
        <Text className="text-dark-border text-sm">Lab imports & connected systems</Text>
      </View>

      {/* Connected Lab Systems */}
      <View className="px-4 mt-4">
        <Text className="text-white text-lg font-bold mb-3">Connected Lab Systems</Text>
        {LAB_SYSTEMS.map((system) => {
          const config = STATUS_CONFIG[system.status];
          return (
            <View key={system.id} className="bg-dark-card rounded-xl p-4 mb-2 border border-dark-border">
              <View className="flex-row items-center justify-between mb-1">
                <View className="flex-1">
                  <Text className="text-white font-semibold">{system.name}</Text>
                  <Text className="text-dark-border text-xs">{system.type}</Text>
                </View>
                <View className={`flex-row items-center ${config.bg} rounded-full px-2.5 py-0.5`}>
                  <View className={`w-1.5 h-1.5 rounded-full ${config.dot} mr-1.5`} />
                  <Text className={`text-xs font-semibold ${config.text}`}>{system.status}</Text>
                </View>
              </View>
              {system.lastSync && (
                <View className="flex-row items-center justify-between mt-1">
                  <Text className="text-dark-border text-xs">
                    Last sync: {new Date(system.lastSync).toLocaleString()}
                  </Text>
                  <Text className="text-dark-border text-xs">{system.recordCount} records</Text>
                </View>
              )}
            </View>
          );
        })}

        <Pressable className="bg-dark-card border border-dashed border-dark-border rounded-xl p-4 items-center active:opacity-80 mt-1">
          <Text className="text-portal-green font-semibold text-sm">+ Connect New Lab System</Text>
        </Pressable>
      </View>

      {/* Upload Section */}
      <View className="px-4 mt-6">
        <Text className="text-white text-lg font-bold mb-3">Manual Upload</Text>
        <Pressable className="bg-portal-green/10 border border-portal-green/30 rounded-2xl p-6 items-center active:opacity-80">
          <Text className="text-portal-green text-lg mb-1">📄</Text>
          <Text className="text-portal-green font-semibold">Upload Lab Report</Text>
          <Text className="text-dark-border text-xs mt-1">PDF, PNG, or JPG — AI-powered extraction</Text>
        </Pressable>
      </View>

      {/* Recent Imports */}
      <View className="px-4 mt-6">
        <Text className="text-white text-lg font-bold mb-3">Recent Lab Imports</Text>
        {RECENT_IMPORTS.map((imp) => {
          const isExpanded = expandedImport === imp.id;
          return (
            <View key={imp.id} className="mb-3">
              <Pressable
                className="bg-dark-card rounded-xl p-4 border border-dark-border active:opacity-80"
                onPress={() => setExpandedImport(isExpanded ? null : imp.id)}
              >
                <View className="flex-row items-center justify-between mb-1">
                  <View className="flex-1">
                    <Text className="text-white font-semibold">{imp.testName}</Text>
                    <Text className="text-dark-border text-xs">
                      {imp.patientName} · {imp.labSystem} · {imp.importDate}
                    </Text>
                  </View>
                  <View
                    className={`rounded-full px-2 py-0.5 ${
                      imp.status === 'processed' ? 'bg-portal-green/20' : imp.status === 'pending' ? 'bg-portal-yellow/20' : 'bg-red-500/20'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        imp.status === 'processed' ? 'text-portal-green' : imp.status === 'pending' ? 'text-portal-yellow' : 'text-red-400'
                      }`}
                    >
                      {imp.status}
                    </Text>
                  </View>
                </View>
              </Pressable>

              {isExpanded && imp.values.length > 0 && (
                <View className="bg-dark-card/50 mx-2 p-3 rounded-b-xl border-x border-b border-dark-border">
                  {/* Header */}
                  <View className="flex-row mb-2 pb-1 border-b border-dark-border">
                    <Text className="text-dark-border text-xs font-semibold flex-1">Marker</Text>
                    <Text className="text-dark-border text-xs font-semibold w-16 text-right">Value</Text>
                    <Text className="text-dark-border text-xs font-semibold w-28 text-right">Range</Text>
                  </View>
                  {imp.values.map((val, i) => (
                    <View key={i} className="flex-row py-1.5">
                      <Text className="text-white text-sm flex-1">{val.marker}</Text>
                      <Text className={`text-sm w-16 text-right font-mono font-bold ${FLAG_CONFIG[val.flag].text}`}>
                        {val.value}
                      </Text>
                      <Text className="text-dark-border text-xs w-28 text-right">{val.range}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
