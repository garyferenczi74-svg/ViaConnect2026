import { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable } from 'react-native';
import { useBreakpoint } from '../../src/components/shared/ResponsiveLayout';

const MOCK_HERBS = [
  { id: '1', name: 'Ashwagandha', latin: 'Withania somnifera', category: 'Adaptogen', safetyRating: 'A' },
  { id: '2', name: 'Turmeric', latin: 'Curcuma longa', category: 'Anti-inflammatory', safetyRating: 'A' },
  { id: '3', name: 'Rhodiola', latin: 'Rhodiola rosea', category: 'Adaptogen', safetyRating: 'A' },
  { id: '4', name: 'Milk Thistle', latin: 'Silybum marianum', category: 'Hepatoprotective', safetyRating: 'A' },
  { id: '5', name: "Lion's Mane", latin: 'Hericium erinaceus', category: 'Nootropic', safetyRating: 'A' },
  { id: '6', name: 'Berberine', latin: 'Berberis vulgaris', category: 'Metabolic', safetyRating: 'B' },
];

function HerbDetail({ herb }: { herb: (typeof MOCK_HERBS)[0] | null }) {
  if (!herb) {
    return (
      <View className="bg-dark-card rounded-2xl p-6 border border-dark-border items-center justify-center min-h-[300px]">
        <Text className="text-sage">Select an herb to view details</Text>
      </View>
    );
  }

  return (
    <View className="bg-dark-card rounded-2xl p-6 border border-dark-border">
      <Text className="text-white text-xl font-bold mb-1">{herb.name}</Text>
      <Text className="text-sage text-sm italic mb-4">{herb.latin}</Text>

      <View className="flex-row gap-2 mb-4">
        <View className="bg-plum/20 px-3 py-1 rounded-full">
          <Text className="text-plum-light text-xs">{herb.category}</Text>
        </View>
        <View className="bg-portal-green/20 px-3 py-1 rounded-full">
          <Text className="text-portal-green text-xs">
            Safety: {herb.safetyRating}
          </Text>
        </View>
      </View>

      <Text className="text-sage text-sm mb-2 font-semibold">
        Traditional Uses
      </Text>
      <Text className="text-white text-sm mb-4">
        Commonly used in naturopathic practice for stress adaptation, immune
        modulation, and cognitive support. Pairs well with gene-specific
        formulations.
      </Text>

      <Text className="text-sage text-sm mb-2 font-semibold">
        Gene Interactions
      </Text>
      <Text className="text-white text-sm">
        May support COMT and MTHFR pathways. Consult genetic profile for
        personalized dosing recommendations.
      </Text>
    </View>
  );
}

function FormulaBuilderPanel() {
  return (
    <View className="bg-dark-card rounded-2xl p-5 border border-dark-border">
      <Text className="text-white font-semibold mb-3">Formula Builder</Text>
      <Text className="text-sage text-sm mb-4">
        Drag herbs here to build a custom formula
      </Text>
      <View className="border border-dashed border-dark-border rounded-xl p-6 items-center">
        <Text className="text-dark-border text-sm">No herbs added yet</Text>
      </View>
      <Pressable className="bg-plum rounded-xl py-3 mt-4 items-center active:opacity-80">
        <Text className="text-white font-medium">Check Interactions</Text>
      </Pressable>
    </View>
  );
}

export default function NaturopathDashboard() {
  const breakpoint = useBreakpoint();
  const isDesktop = breakpoint === 'desktop';
  const [selectedHerb, setSelectedHerb] = useState<
    (typeof MOCK_HERBS)[0] | null
  >(null);
  const [search, setSearch] = useState('');

  const filtered = MOCK_HERBS.filter(
    (h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.latin.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <ScrollView className="flex-1 bg-dark-bg p-4">
      <Text className="text-white text-2xl font-bold mb-1">
        Botanical Search
      </Text>
      <Text className="text-sage text-sm mb-4">
        Search herbs and build gene-targeted formulas
      </Text>

      <TextInput
        className="bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-white mb-4"
        placeholder="Search herbs by name or Latin name..."
        placeholderTextColor="#76866F"
        value={search}
        onChangeText={setSearch}
      />

      {isDesktop ? (
        // Desktop: split view — search left, detail + formula right
        <View className="flex-row gap-4">
          <View className="flex-1">
            <Text className="text-white font-semibold mb-3">Results</Text>
            {filtered.map((herb) => (
              <Pressable
                key={herb.id}
                onPress={() => setSelectedHerb(herb)}
                className={`bg-dark-card rounded-xl p-4 mb-2 border active:opacity-80 ${
                  selectedHerb?.id === herb.id
                    ? 'border-plum'
                    : 'border-dark-border'
                }`}
              >
                <Text className="text-white font-medium">{herb.name}</Text>
                <Text className="text-sage text-xs italic">{herb.latin}</Text>
                <Text className="text-plum-light text-xs mt-1">
                  {herb.category}
                </Text>
              </Pressable>
            ))}
          </View>
          <View className="flex-1 gap-4">
            <HerbDetail herb={selectedHerb} />
            <FormulaBuilderPanel />
          </View>
        </View>
      ) : (
        // Mobile: stacked list with expandable detail
        <View className="gap-3">
          {filtered.map((herb) => (
            <Pressable
              key={herb.id}
              onPress={() =>
                setSelectedHerb(
                  selectedHerb?.id === herb.id ? null : herb,
                )
              }
              className="bg-dark-card rounded-xl p-4 border border-dark-border"
            >
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-white font-medium">{herb.name}</Text>
                  <Text className="text-sage text-xs italic">{herb.latin}</Text>
                </View>
                <View className="bg-plum/20 px-2 py-0.5 rounded-full">
                  <Text className="text-plum-light text-xs">
                    {herb.category}
                  </Text>
                </View>
              </View>
              {selectedHerb?.id === herb.id && (
                <View className="mt-3 pt-3 border-t border-dark-border">
                  <Text className="text-sage text-sm">
                    Safety Rating: {herb.safetyRating} — Supports COMT and
                    MTHFR pathways
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
