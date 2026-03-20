import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, Pressable, FlatList } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useProducts } from '../../lib/supabase/hooks';
import type { Product } from '../../lib/supabase/types';

// ── Types ────────────────────────────────────────────────────────────────────

export type CatalogCategory = Product['category'] | 'all';

export interface ProductCatalogProps {
  onAddToProtocol?: (product: Product) => void;
  onProductPress?: (product: Product) => void;
  selectedIds?: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<CatalogCategory, string> = {
  all: 'All',
  supplement: 'Core',
  test_kit: 'Test Kits',
  peptide: 'Peptides',
  cannabis: 'Cannabis',
};

const CATEGORY_COLORS: Record<string, string> = {
  supplement: 'bg-teal/20 text-teal-light',
  test_kit: 'bg-copper/20 text-copper',
  peptide: 'bg-plum/20 text-plum',
  cannabis: 'bg-sage/20 text-sage',
};

// ── Component ────────────────────────────────────────────────────────────────

export function ProductCatalog({
  onAddToProtocol,
  onProductPress,
  selectedIds = [],
}: ProductCatalogProps) {
  const [category, setCategory] = useState<CatalogCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: products = [], isLoading } = useProducts(
    category === 'all' ? undefined : category,
  );

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.short_name.toLowerCase().includes(q),
    );
  }, [products, searchQuery]);

  const categories: CatalogCategory[] = ['all', 'supplement', 'test_kit', 'peptide', 'cannabis'];

  const renderItem = ({ item }: { item: Product }) => {
    const isSelected = selectedIds.includes(item.id);
    const catStyle = CATEGORY_COLORS[item.category] ?? 'bg-dark-border/20 text-gray-400';
    const [bgClass, textClass] = catStyle.split(' ');

    return (
      <Pressable
        className={`bg-dark-card rounded-2xl p-4 mb-3 border active:opacity-80 ${
          isSelected ? 'border-copper' : 'border-dark-border'
        }`}
        onPress={() => onProductPress?.(item)}
        accessibilityLabel={`${item.name}, ${item.category}, $${item.price}`}
        accessibilityRole="button"
      >
        <View className="flex-row items-start">
          {/* Product Image Placeholder */}
          <View className="w-14 h-14 rounded-xl bg-dark-border/30 items-center justify-center mr-3">
            <Text className="text-2xl">💊</Text>
          </View>

          <View className="flex-1">
            <Text className="text-white text-base font-semibold">{item.name}</Text>
            <Text className="text-dark-border text-xs mt-0.5">{item.sku}</Text>

            <View className="flex-row items-center mt-2 gap-2">
              <View className={`rounded-full px-2 py-0.5 ${bgClass}`}>
                <Text className={`text-xs ${textClass}`}>{item.category.replace('_', ' ')}</Text>
              </View>
              <Text className="text-copper text-sm font-bold">${item.price}</Text>
            </View>
          </View>

          {/* Add to Protocol CTA */}
          {onAddToProtocol && (
            <Pressable
              className={`rounded-xl px-3 py-2 ${isSelected ? 'bg-sage/20' : 'bg-copper'} active:opacity-70`}
              onPress={() => onAddToProtocol(item)}
              accessibilityLabel={isSelected ? `Remove ${item.name}` : `Add ${item.name} to protocol`}
            >
              <Text className={`text-sm font-semibold ${isSelected ? 'text-sage' : 'text-white'}`}>
                {isSelected ? 'Added' : 'Add'}
              </Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-dark-bg">
      {/* Search */}
      <View className="px-4 pt-4 pb-2">
        <TextInput
          className="bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-white mb-3"
          placeholder="Search 56 products..."
          placeholderTextColor="#374151"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          accessibilityLabel="Search product catalog"
        />

        {/* Category Filters */}
        <FlatList
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerClassName="gap-2"
          renderItem={({ item: cat }) => (
            <Pressable
              className={`rounded-full px-4 py-2 ${
                category === cat ? 'bg-copper' : 'bg-dark-card border border-dark-border'
              }`}
              onPress={() => setCategory(cat)}
              accessibilityLabel={`Filter by ${CATEGORY_LABELS[cat]}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: category === cat }}
            >
              <Text className={`text-sm ${category === cat ? 'text-white font-semibold' : 'text-gray-400'}`}>
                {CATEGORY_LABELS[cat]}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Product Count */}
      <View className="px-4 py-1">
        <Text className="text-dark-border text-xs">{filtered.length} products</Text>
      </View>

      {/* Grid */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerClassName="px-4 pb-8"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text className="text-dark-border text-center py-8">
            {isLoading ? 'Loading products...' : 'No products found'}
          </Text>
        }
      />
    </View>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

export function ProductCatalogSkeleton() {
  return (
    <View className="flex-1 bg-dark-bg px-4 pt-4">
      <View className="w-full h-12 rounded-xl bg-dark-border animate-pulse mb-3" />
      <View className="flex-row gap-2 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} className="w-20 h-9 rounded-full bg-dark-border animate-pulse" />
        ))}
      </View>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} className="w-full h-24 rounded-2xl bg-dark-border/50 animate-pulse mb-3" />
      ))}
    </View>
  );
}
