import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, Pressable, FlatList } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase/client';
import type { Herb } from '../../lib/supabase/types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface BotanicalSearchProps {
  onSelect: (herb: Herb) => void;
  selectedIds?: string[];
}

// ── Component ────────────────────────────────────────────────────────────────

export function BotanicalSearch({ onSelect, selectedIds = [] }: BotanicalSearchProps) {
  const [query, setQuery] = useState('');

  const { data: herbs = [], isLoading } = useQuery({
    queryKey: ['herbs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('herbs')
        .select('*')
        .order('common_name');
      if (error) throw error;
      return data as Herb[];
    },
  });

  const filtered = useMemo(() => {
    if (!query.trim()) return herbs;
    const q = query.toLowerCase();
    return herbs.filter(
      (h) =>
        h.common_name.toLowerCase().includes(q) ||
        (h.scientific_name?.toLowerCase().includes(q)) ||
        (h.category?.toLowerCase().includes(q)),
    );
  }, [herbs, query]);

  const renderItem = ({ item, index }: { item: Herb; index: number }) => {
    const isSelected = selectedIds.includes(item.id);
    return (
      <Animated.View entering={FadeInDown.delay(index * 30).duration(200)}>
        <Pressable
          className={`p-4 rounded-2xl mb-2 border active:opacity-80 ${
            isSelected ? 'bg-sage/10 border-sage' : 'bg-dark-card border-dark-border'
          }`}
          onPress={() => onSelect(item)}
          accessibilityLabel={`${item.common_name}, ${item.scientific_name ?? ''}, ${item.category ?? ''}`}
          accessibilityRole="button"
        >
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-white text-base font-semibold">{item.common_name}</Text>
            {item.category && (
              <View className="bg-sage/20 rounded-full px-2 py-0.5">
                <Text className="text-sage text-xs">{item.category}</Text>
              </View>
            )}
          </View>

          {item.scientific_name && (
            <Text className="text-sage text-xs italic mb-2">{item.scientific_name}</Text>
          )}

          {item.description && (
            <Text className="text-gray-400 text-sm" numberOfLines={2}>
              {item.description}
            </Text>
          )}

          {item.contraindications && (
            <View className="flex-row items-center mt-2">
              <Text className="text-red-400 text-xs">⚠ {item.contraindications}</Text>
            </View>
          )}

          {isSelected && (
            <View className="absolute top-3 right-3">
              <Text className="text-sage text-sm">✓</Text>
            </View>
          )}
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View className="flex-1 bg-dark-bg">
      {/* Search */}
      <View className="px-4 pt-4 pb-2">
        <TextInput
          className="bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-white"
          placeholder="Search botanicals..."
          placeholderTextColor="#374151"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          accessibilityLabel="Search botanical database"
        />
        <Text className="text-dark-border text-xs mt-1.5">
          {filtered.length} of {herbs.length} botanicals
        </Text>
      </View>

      {/* Results */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerClassName="px-4 pb-8"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text className="text-dark-border text-center py-8">
            {isLoading ? 'Loading botanicals...' : 'No results found'}
          </Text>
        }
      />
    </View>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

export function BotanicalSearchSkeleton() {
  return (
    <View className="flex-1 bg-dark-bg px-4 pt-4">
      <View className="w-full h-12 rounded-xl bg-dark-border animate-pulse mb-4" />
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} className="w-full h-24 rounded-2xl bg-dark-border/50 animate-pulse mb-2" />
      ))}
    </View>
  );
}
