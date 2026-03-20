import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import type { Herb } from '../../../src/lib/supabase/types';

// ── 500+ Herb Seed Database (representative subset for rendering) ────────────

const HERB_DATABASE: Array<Herb & { actions: string }> = [
  { id: 'h1', common_name: 'Ashwagandha', scientific_name: 'Withania somnifera', category: 'ADAPTOGEN', rating: 5, description: 'Adaptogenic herb for stress resilience and thyroid support', typical_ratio: '1:3', contraindications: 'Nightshade allergy, hyperthyroidism', created_at: '', actions: 'Adaptogenic, Anxiolytic, Thyroid-stimulating, Immunomodulatory' },
  { id: 'h2', common_name: 'Turmeric', scientific_name: 'Curcuma longa', category: 'OTHER', rating: 5, description: 'Potent anti-inflammatory with broad clinical applications', typical_ratio: '1:4', contraindications: 'Gallbladder obstruction, anticoagulant therapy', created_at: '', actions: 'Anti-inflammatory, Antioxidant, Hepatoprotective, Cholagogue' },
  { id: 'h3', common_name: 'Valerian', scientific_name: 'Valeriana officinalis', category: 'NERVINE', rating: 4, description: 'Sedative nervine for insomnia and anxiety', typical_ratio: '1:2', contraindications: 'May potentiate sedatives', created_at: '', actions: 'Sedative, Anxiolytic, Antispasmodic, Hypnotic' },
  { id: 'h4', common_name: 'Milk Thistle', scientific_name: 'Silybum marianum', category: 'HEPATIC', rating: 5, description: 'Premier hepatoprotective herb with regenerative properties', typical_ratio: '1:3', contraindications: 'Ragweed allergy (rare cross-reactivity)', created_at: '', actions: 'Hepatoprotective, Antioxidant, Cholagogue, Galactagogue' },
  { id: 'h5', common_name: 'Echinacea', scientific_name: 'Echinacea purpurea', category: 'TONIC', rating: 4, description: 'Immune stimulant for acute upper respiratory infections', typical_ratio: '1:2', contraindications: 'Autoimmune conditions, progressive systemic diseases', created_at: '', actions: 'Immunostimulant, Anti-inflammatory, Antimicrobial, Vulnerary' },
  { id: 'h6', common_name: 'Chamomile', scientific_name: 'Matricaria chamomilla', category: 'NERVINE', rating: 5, description: 'Gentle nervine and anti-inflammatory for digestive and nervous systems', typical_ratio: '1:4', contraindications: 'Asteraceae allergy', created_at: '', actions: 'Nervine, Carminative, Anti-inflammatory, Antispasmodic' },
  { id: 'h7', common_name: 'Ginger', scientific_name: 'Zingiber officinale', category: 'CARMINATIVE', rating: 5, description: 'Warming carminative for nausea, digestion, and circulation', typical_ratio: '1:3', contraindications: 'Gallstones, high-dose with anticoagulants', created_at: '', actions: 'Carminative, Anti-emetic, Circulatory stimulant, Anti-inflammatory' },
  { id: 'h8', common_name: 'Licorice', scientific_name: 'Glycyrrhiza glabra', category: 'DEMULCENT', rating: 4, description: 'Adrenal supportive demulcent and harmonizing herb', typical_ratio: '1:3', contraindications: 'Hypertension, hypokalemia, pregnancy, liver disease', created_at: '', actions: 'Demulcent, Adrenal tonic, Anti-inflammatory, Expectorant' },
  { id: 'h9', common_name: 'Dandelion Root', scientific_name: 'Taraxacum officinale', category: 'BITTER', rating: 4, description: 'Bitter digestive tonic and gentle hepatic', typical_ratio: '1:3', contraindications: 'Bile duct obstruction, gallstones', created_at: '', actions: 'Bitter tonic, Hepatic, Diuretic, Cholagogue' },
  { id: 'h10', common_name: 'Passionflower', scientific_name: 'Passiflora incarnata', category: 'NERVINE', rating: 4, description: 'Anxiolytic nervine for nervous insomnia and tension', typical_ratio: '1:3', contraindications: 'May potentiate sedatives and MAOIs', created_at: '', actions: 'Anxiolytic, Sedative, Antispasmodic, Hypnotic' },
  { id: 'h11', common_name: 'Holy Basil (Tulsi)', scientific_name: 'Ocimum tenuiflorum', category: 'ADAPTOGEN', rating: 5, description: 'Sacred adaptogen for stress, cognition, and blood sugar', typical_ratio: '1:3', contraindications: 'Anticoagulant therapy', created_at: '', actions: 'Adaptogenic, Nootropic, Hypoglycemic, Immunomodulatory' },
  { id: 'h12', common_name: 'Rhodiola', scientific_name: 'Rhodiola rosea', category: 'ADAPTOGEN', rating: 5, description: 'Arctic adaptogen for mental stamina and physical endurance', typical_ratio: '1:4', contraindications: 'Bipolar disorder (may trigger mania)', created_at: '', actions: 'Adaptogenic, Nootropic, Antifatigue, Cardioprotective' },
  { id: 'h13', common_name: 'Elderberry', scientific_name: 'Sambucus nigra', category: 'TONIC', rating: 4, description: 'Immune-supportive berry for viral infections', typical_ratio: '1:3', contraindications: 'Raw berries toxic, caution with immunosuppressants', created_at: '', actions: 'Antiviral, Immunostimulant, Diaphoretic, Antioxidant' },
  { id: 'h14', common_name: 'Hawthorn', scientific_name: 'Crataegus monogyna', category: 'TONIC', rating: 5, description: 'Premier cardiovascular tonic for heart and circulation', typical_ratio: '1:3', contraindications: 'May potentiate cardiac glycosides', created_at: '', actions: 'Cardiotonic, Hypotensive, Antioxidant, Anxiolytic' },
  { id: 'h15', common_name: 'Skullcap', scientific_name: 'Scutellaria lateriflora', category: 'NERVINE', rating: 4, description: 'Restorative nervine for nervous exhaustion and tension', typical_ratio: '1:2', contraindications: 'Hepatotoxicity with adulterated product', created_at: '', actions: 'Nervine tonic, Anxiolytic, Antispasmodic, Sedative' },
  { id: 'h16', common_name: 'Nettle Leaf', scientific_name: 'Urtica dioica', category: 'TONIC', rating: 5, description: 'Nutritive tonic rich in minerals and chlorophyll', typical_ratio: '1:3', contraindications: 'Caution with anticoagulants, hypoglycemics', created_at: '', actions: 'Nutritive, Diuretic, Anti-allergic, Hemostatic' },
  { id: 'h17', common_name: 'Saw Palmetto', scientific_name: 'Serenoa repens', category: 'TONIC', rating: 4, description: 'Hormonal modulator for prostate and urinary health', typical_ratio: '1:4', contraindications: 'Hormonal therapies, pregnancy', created_at: '', actions: 'Anti-androgenic, Diuretic, Anti-inflammatory, Tonic' },
  { id: 'h18', common_name: 'Marshmallow Root', scientific_name: 'Althaea officinalis', category: 'DEMULCENT', rating: 5, description: 'Soothing demulcent for GI and respiratory mucosa', typical_ratio: '1:4', contraindications: 'May delay drug absorption — separate by 2 hours', created_at: '', actions: 'Demulcent, Emollient, Diuretic, Vulnerary' },
  { id: 'h19', common_name: 'Lemon Balm', scientific_name: 'Melissa officinalis', category: 'NERVINE', rating: 5, description: 'Calming nervine with antiviral and carminative properties', typical_ratio: '1:3', contraindications: 'Thyroid medication (may reduce TSH)', created_at: '', actions: 'Nervine, Carminative, Antiviral, Antispasmodic' },
  { id: 'h20', common_name: 'Astragalus', scientific_name: 'Astragalus membranaceus', category: 'ADAPTOGEN', rating: 5, description: 'Deep immune tonic for long-term immune resilience', typical_ratio: '1:4', contraindications: 'Active infection (use Echinacea instead), immunosuppressants', created_at: '', actions: 'Immunomodulatory, Adaptogenic, Cardioprotective, Hepatoprotective' },
  { id: 'h21', common_name: 'Peppermint', scientific_name: 'Mentha piperita', category: 'CARMINATIVE', rating: 5, description: 'Cooling carminative for IBS, headaches, and nausea', typical_ratio: '1:3', contraindications: 'GERD, hiatal hernia, gallstones', created_at: '', actions: 'Carminative, Antispasmodic, Diaphoretic, Analgesic' },
  { id: 'h22', common_name: 'Black Cohosh', scientific_name: 'Actaea racemosa', category: 'OTHER', rating: 4, description: 'Hormonal herb for menopausal symptoms', typical_ratio: '1:3', contraindications: 'Liver disease, estrogen-sensitive cancers, pregnancy', created_at: '', actions: 'Antispasmodic, Anti-inflammatory, Estrogenic-modulating' },
  { id: 'h23', common_name: 'Oregano', scientific_name: 'Origanum vulgare', category: 'OTHER', rating: 4, description: 'Potent antimicrobial for GI and respiratory infections', typical_ratio: '1:4', contraindications: 'Pregnancy (high dose), iron absorption', created_at: '', actions: 'Antimicrobial, Antifungal, Antioxidant, Carminative' },
  { id: 'h24', common_name: 'Gentian Root', scientific_name: 'Gentiana lutea', category: 'BITTER', rating: 4, description: 'Classic bitter for digestive insufficiency', typical_ratio: '1:5', contraindications: 'Gastric/duodenal ulcers, GERD', created_at: '', actions: 'Bitter tonic, Cholagogue, Sialagogue, Appetite stimulant' },
  { id: 'h25', common_name: 'Reishi', scientific_name: 'Ganoderma lucidum', category: 'ADAPTOGEN', rating: 5, description: 'Mushroom adaptogen for immune, liver, and spirit', typical_ratio: '1:4', contraindications: 'Anticoagulants, pre-surgery, organ transplant meds', created_at: '', actions: 'Immunomodulatory, Hepatoprotective, Adaptogenic, Cardioprotective' },
];

const CATEGORIES = ['All', 'ADAPTOGEN', 'NERVINE', 'HEPATIC', 'BITTER', 'CARMINATIVE', 'DEMULCENT', 'TONIC', 'OTHER'];

// ── Component ────────────────────────────────────────────────────────────────

export default function BotanicalSearchScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const filtered = useMemo(() => {
    return HERB_DATABASE.filter((h) => {
      const matchesCategory = category === 'All' || h.category === category;
      if (!matchesCategory) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        h.common_name.toLowerCase().includes(q) ||
        (h.scientific_name?.toLowerCase().includes(q)) ||
        h.actions.toLowerCase().includes(q)
      );
    });
  }, [search, category]);

  return (
    <View className="flex-1 bg-dark-bg">
      {/* Header */}
      <View className="px-4 pt-12 pb-2">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sage text-sm font-semibold">Botanical Database</Text>
            <Text className="text-white text-2xl font-bold">Herb Search</Text>
          </View>
          <Pressable
            className="bg-plum rounded-xl px-4 py-2 active:opacity-80"
            onPress={() => router.push('/(naturopath)/botanical/formula-builder')}
          >
            <Text className="text-white font-bold text-sm">+ Formula</Text>
          </Pressable>
        </View>
        <Text className="text-dark-border text-sm mt-1">{HERB_DATABASE.length} herbs in formulary</Text>
      </View>

      {/* Search */}
      <View className="px-4 py-2">
        <TextInput
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
          placeholder="Search herb, Latin name, or action..."
          placeholderTextColor="#6B7280"
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Search botanicals"
        />
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-1">
        <View className="flex-row gap-2">
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              className={`rounded-full px-3 py-1.5 ${
                category === cat ? 'bg-plum' : 'bg-white/5 border border-white/10'
              }`}
              onPress={() => setCategory(cat)}
            >
              <Text className={`text-xs font-semibold ${category === cat ? 'text-white' : 'text-dark-border'}`}>
                {cat === 'All' ? 'All' : cat.charAt(0) + cat.slice(1).toLowerCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Results */}
      <ScrollView className="flex-1 px-4 pt-3" contentContainerClassName="pb-8">
        {filtered.length === 0 ? (
          <Text className="text-dark-border text-center py-12">No herbs match your search</Text>
        ) : (
          filtered.map((herb) => (
            <View
              key={herb.id}
              className="bg-white/5 rounded-2xl p-4 mb-3 border border-white/10"
            >
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-white text-base font-bold">{herb.common_name}</Text>
                {herb.category && (
                  <View className="bg-sage/20 rounded-full px-2 py-0.5">
                    <Text className="text-sage text-[10px] font-semibold">{herb.category}</Text>
                  </View>
                )}
              </View>

              {herb.scientific_name && (
                <Text className="text-sage text-xs italic mb-2">{herb.scientific_name}</Text>
              )}

              {/* Actions */}
              <View className="flex-row flex-wrap gap-1 mb-2">
                {herb.actions.split(', ').map((action) => (
                  <View key={action} className="bg-plum/10 rounded-full px-2 py-0.5">
                    <Text className="text-plum text-[10px]">{action}</Text>
                  </View>
                ))}
              </View>

              {herb.description && (
                <Text className="text-gray-400 text-sm mb-2">{herb.description}</Text>
              )}

              {/* Contraindications */}
              {herb.contraindications && (
                <View className="bg-red-500/5 rounded-lg p-2 mt-1">
                  <Text className="text-red-400 text-xs">⚠ {herb.contraindications}</Text>
                </View>
              )}

              {/* Quick add + ratio */}
              <View className="flex-row items-center justify-between mt-3 pt-2 border-t border-white/5">
                <Text className="text-dark-border text-xs">
                  Ratio: {herb.typical_ratio ?? 'N/A'} · Rating: {'★'.repeat(herb.rating ?? 0)}
                </Text>
                <Pressable className="bg-sage/20 rounded-lg px-3 py-1 active:opacity-80">
                  <Text className="text-sage text-xs font-semibold">+ Add to Formula</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
