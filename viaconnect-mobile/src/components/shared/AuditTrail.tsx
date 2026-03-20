import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase/client';
import type { AuditLog } from '../../lib/supabase/types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AuditTrailProps {
  /** Restrict to a specific user (practitioner viewing patient) */
  filterUserId?: string;
}

type FilterAction = 'all' | 'INSERT' | 'UPDATE' | 'DELETE';

// ── Component ────────────────────────────────────────────────────────────────

export function AuditTrail({ filterUserId }: AuditTrailProps) {
  const [actionFilter, setActionFilter] = useState<FilterAction>('all');
  const [tableFilter, setTableFilter] = useState('');
  const [searchUser, setSearchUser] = useState('');

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['audit_logs', filterUserId, actionFilter, tableFilter],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filterUserId) query = query.eq('user_id', filterUserId);
      if (actionFilter !== 'all') query = query.eq('action', actionFilter);
      if (tableFilter.trim()) query = query.eq('table_name', tableFilter.trim());

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  const actionButtons: FilterAction[] = ['all', 'INSERT', 'UPDATE', 'DELETE'];

  const renderItem = ({ item }: { item: AuditLog }) => {
    const actionColor =
      item.action === 'INSERT' ? 'text-green-400'
      : item.action === 'UPDATE' ? 'text-yellow-400'
      : item.action === 'DELETE' ? 'text-red-400'
      : 'text-gray-400';

    return (
      <View
        className="bg-dark-card rounded-xl p-3 mb-2 border border-dark-border"
        accessibilityLabel={`${item.action} on ${item.table_name} at ${item.created_at}`}
      >
        <View className="flex-row items-center justify-between mb-1">
          <View className="flex-row items-center">
            <Text className={`text-xs font-mono font-bold mr-2 ${actionColor}`}>{item.action}</Text>
            <Text className="text-sage text-xs">{item.table_name}</Text>
          </View>
          <Text className="text-dark-border text-[10px]">
            {new Date(item.created_at).toLocaleString()}
          </Text>
        </View>

        <View className="flex-row items-center">
          <Text className="text-dark-border text-xs mr-1">Record:</Text>
          <Text className="text-gray-400 text-xs font-mono" numberOfLines={1}>
            {item.record_id}
          </Text>
        </View>

        {item.user_id && (
          <Text className="text-plum text-[10px] mt-0.5 font-mono" numberOfLines={1}>
            User: {item.user_id}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-dark-bg">
      {/* Header */}
      <View className="px-4 pt-4 pb-2">
        <Text className="text-white text-lg font-bold mb-1">Audit Trail</Text>
        <Text className="text-dark-border text-xs mb-3">HIPAA-compliant activity log</Text>

        {/* Action filter */}
        <View className="flex-row gap-2 mb-3">
          {actionButtons.map((action) => (
            <Pressable
              key={action}
              className={`rounded-lg px-3 py-1.5 ${
                actionFilter === action ? 'bg-teal' : 'bg-dark-card border border-dark-border'
              }`}
              onPress={() => setActionFilter(action)}
              accessibilityLabel={`Filter by ${action}`}
            >
              <Text className={`text-xs ${actionFilter === action ? 'text-white font-semibold' : 'text-gray-400'}`}>
                {action === 'all' ? 'All' : action}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Table filter */}
        <TextInput
          className="bg-dark-card border border-dark-border rounded-xl px-4 py-2.5 text-white text-sm"
          placeholder="Filter by table name..."
          placeholderTextColor="#374151"
          value={tableFilter}
          onChangeText={setTableFilter}
          accessibilityLabel="Filter by table"
        />
      </View>

      {/* List */}
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerClassName="px-4 pb-8"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text className="text-dark-border text-center py-8">
            {isLoading ? 'Loading audit logs...' : 'No audit entries found'}
          </Text>
        }
        refreshing={isLoading}
        onRefresh={refetch}
      />
    </View>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

export function AuditTrailSkeleton() {
  return (
    <View className="flex-1 bg-dark-bg px-4 pt-4">
      <View className="w-32 h-5 rounded bg-dark-border animate-pulse mb-3" />
      <View className="flex-row gap-2 mb-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} className="w-16 h-8 rounded-lg bg-dark-border animate-pulse" />
        ))}
      </View>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} className="w-full h-16 rounded-xl bg-dark-border/50 animate-pulse mb-2" />
      ))}
    </View>
  );
}
