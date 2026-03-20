import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

// ── Seed Data ────────────────────────────────────────────────────────────────

type ProtocolStatus = 'DRAFT' | 'PENDING' | 'ACTIVE' | 'COMPLETED';

const SEED_PROTOCOLS: Array<{
  id: string;
  name: string;
  patientName: string;
  patientId: string;
  status: ProtocolStatus;
  items: string[];
  createdAt: string;
  adherence: number;
}> = [
  {
    id: 'pr1', name: 'MTHFR Support Protocol', patientName: 'Sarah Chen', patientId: 'p1',
    status: 'ACTIVE', items: ['MTHFR+', 'CoQ10+', 'NAD+'], createdAt: '2026-02-01', adherence: 92,
  },
  {
    id: 'pr2', name: 'Stress Recovery', patientName: 'Sarah Chen', patientId: 'p1',
    status: 'COMPLETED', items: ['COMT+', 'FOCUS+'], createdAt: '2025-11-15', adherence: 88,
  },
  {
    id: 'pr3', name: 'Detox Support', patientName: 'Marcus Rivera', patientId: 'p2',
    status: 'ACTIVE', items: ['NAD+', 'BLAST+'], createdAt: '2026-03-01', adherence: 64,
  },
  {
    id: 'pr4', name: 'Cognitive Enhancement', patientName: 'Aisha Thompson', patientId: 'p3',
    status: 'PENDING', items: ['FOCUS+', 'COMT+', 'NAD+'], createdAt: '2026-03-18', adherence: 0,
  },
  {
    id: 'pr5', name: 'Metabolic Optimization', patientName: 'Priya Patel', patientId: 'p5',
    status: 'DRAFT', items: ['SHRED+', 'NAD+'], createdAt: '2026-03-19', adherence: 0,
  },
  {
    id: 'pr6', name: 'Inflammation Reduction', patientName: 'James O\'Brien', patientId: 'p4',
    status: 'PENDING', items: ['MTHFR+', 'CoQ10+'], createdAt: '2026-03-17', adherence: 0,
  },
];

const STATUS_FILTERS: { key: ProtocolStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'COMPLETED', label: 'Completed' },
];

const STATUS_CONFIG: Record<ProtocolStatus, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-dark-border/30', text: 'text-dark-border' },
  PENDING: { bg: 'bg-portal-yellow/20', text: 'text-portal-yellow' },
  ACTIVE: { bg: 'bg-portal-green/20', text: 'text-portal-green' },
  COMPLETED: { bg: 'bg-portal-purple/20', text: 'text-portal-purple' },
};

// ── Component ────────────────────────────────────────────────────────────────

export default function ProtocolsList() {
  const router = useRouter();
  const [filter, setFilter] = useState<ProtocolStatus | 'ALL'>('ALL');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (filter === 'ALL') return SEED_PROTOCOLS;
    return SEED_PROTOCOLS.filter((p) => p.status === filter);
  }, [filter]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <View className="flex-1 bg-dark-bg">
      {/* Header */}
      <View className="px-4 pt-12 pb-2 flex-row items-center justify-between">
        <View>
          <Text className="text-white text-2xl font-bold">Protocols</Text>
          <Text className="text-dark-border text-sm">{SEED_PROTOCOLS.length} total protocols</Text>
        </View>
        <Pressable
          className="bg-portal-green rounded-xl px-4 py-2 active:opacity-80"
          onPress={() => router.push('/(practitioner)/protocols/builder')}
        >
          <Text className="text-dark-bg font-bold text-sm">+ New</Text>
        </Pressable>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-2">
        <View className="flex-row gap-2">
          {STATUS_FILTERS.map((f) => (
            <Pressable
              key={f.key}
              className={`rounded-full px-4 py-1.5 ${
                filter === f.key ? 'bg-portal-green' : 'bg-dark-card border border-dark-border'
              }`}
              onPress={() => setFilter(f.key)}
            >
              <Text className={`text-sm font-semibold ${filter === f.key ? 'text-dark-bg' : 'text-white'}`}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <View className="px-4 py-2 flex-row gap-2">
          <View className="bg-portal-green/10 rounded-xl px-3 py-2 flex-row items-center">
            <Text className="text-portal-green text-sm font-semibold">{selected.size} selected</Text>
          </View>
          <Pressable className="bg-portal-green rounded-xl px-3 py-2 active:opacity-80">
            <Text className="text-dark-bg text-sm font-semibold">Approve</Text>
          </Pressable>
          <Pressable className="bg-dark-card border border-dark-border rounded-xl px-3 py-2 active:opacity-80">
            <Text className="text-white text-sm font-semibold">Archive</Text>
          </Pressable>
          <Pressable onPress={() => setSelected(new Set())}>
            <Text className="text-dark-border text-sm py-2 px-2">Clear</Text>
          </Pressable>
        </View>
      )}

      {/* Protocol List */}
      <ScrollView className="flex-1 px-4 pt-2" contentContainerClassName="pb-8">
        {filtered.map((proto) => {
          const config = STATUS_CONFIG[proto.status];
          const isSelected = selected.has(proto.id);
          return (
            <Pressable
              key={proto.id}
              className={`bg-dark-card rounded-2xl p-4 mb-3 border ${
                isSelected ? 'border-portal-green' : 'border-dark-border'
              } active:opacity-80`}
              onPress={() => toggleSelect(proto.id)}
              onLongPress={() => router.push(`/(practitioner)/patients/${proto.patientId}`)}
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center flex-1">
                  <View
                    className={`w-5 h-5 rounded-md border-2 items-center justify-center mr-2 ${
                      isSelected ? 'bg-portal-green border-portal-green' : 'border-dark-border'
                    }`}
                  >
                    {isSelected && <Text className="text-dark-bg text-xs">✓</Text>}
                  </View>
                  <Text className="text-white font-bold flex-1" numberOfLines={1}>{proto.name}</Text>
                </View>
                <View className={`${config.bg} rounded-full px-2 py-0.5 ml-2`}>
                  <Text className={`text-xs font-bold ${config.text}`}>{proto.status}</Text>
                </View>
              </View>

              <Text className="text-dark-border text-sm mb-2">
                Patient: {proto.patientName} · Created: {proto.createdAt}
              </Text>

              <View className="flex-row flex-wrap gap-1 mb-2">
                {proto.items.map((item) => (
                  <View key={item} className="bg-copper/10 rounded-full px-2 py-0.5">
                    <Text className="text-copper text-xs font-semibold">{item}</Text>
                  </View>
                ))}
              </View>

              {proto.status === 'ACTIVE' && (
                <View>
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-dark-border text-xs">Adherence</Text>
                    <Text className="text-white text-xs font-semibold">{proto.adherence}%</Text>
                  </View>
                  <View className="h-1.5 bg-dark-border/30 rounded-full overflow-hidden">
                    <View
                      className={`h-full rounded-full ${
                        proto.adherence >= 80 ? 'bg-portal-green' : proto.adherence >= 50 ? 'bg-portal-yellow' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, proto.adherence)}%` }}
                    />
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
