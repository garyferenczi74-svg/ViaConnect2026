import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { ConstitutionalType } from '../../../src/components/shared';
import type { AyurvedicScores, TCMScores } from '../../../src/components/shared';

// ── Seed Data ────────────────────────────────────────────────────────────────

const SEED_AYURVEDIC: AyurvedicScores = { vata: 72, pitta: 45, kapha: 33 };
const SEED_TCM: TCMScores = { wood: 55, fire: 42, earth: 68, metal: 38, water: 72 };

const GENETIC_CORRELATIONS = [
  { gene: 'MTHFR C677T', constitution: 'Vata', correlation: 'Elevated homocysteine → nervous system sensitivity', strength: 'strong' },
  { gene: 'COMT Met/Met', constitution: 'Pitta', correlation: 'Slow catecholamine clearance → excess fire/intensity', strength: 'moderate' },
  { gene: 'CYP2D6 PM', constitution: 'Kapha', correlation: 'Poor metabolism → accumulation tendency', strength: 'moderate' },
  { gene: 'VDR FokI', constitution: 'Water (TCM)', correlation: 'Vitamin D receptor variant → kidney/water element', strength: 'weak' },
  { gene: 'SOD2 Ala16Val', constitution: 'Wood (TCM)', correlation: 'Reduced antioxidant defense → liver/wood imbalance', strength: 'moderate' },
];

const THERAPEUTIC_ORDER = [
  {
    level: 1,
    title: 'Establish Conditions for Health',
    description: 'Diet, sleep, exercise, stress management, relationships, spiritual fulfillment',
    interventions: ['Sleep hygiene protocol', 'Anti-inflammatory diet plan', 'Daily movement prescription'],
    status: 'active',
  },
  {
    level: 2,
    title: 'Stimulate the Vis Medicatrix Naturae',
    description: 'Support the body\'s inherent self-healing mechanisms',
    interventions: ['Hydrotherapy', 'Constitutional remedy', 'Breathing exercises'],
    status: 'active',
  },
  {
    level: 3,
    title: 'Address Weakened or Damaged Systems',
    description: 'Strengthen organs, tissues, and physiological processes',
    interventions: ['Adaptogenic formula', 'Nervine tonic blend', 'Hepatic support'],
    status: 'active',
  },
  {
    level: 4,
    title: 'Correct Structural Integrity',
    description: 'Physical medicine, bodywork, therapeutic exercise',
    interventions: ['Referral to osteopath', 'Yoga therapy prescription'],
    status: 'planned',
  },
  {
    level: 5,
    title: 'Address Pathology — Natural Substances',
    description: 'Botanical medicine, clinical nutrition, homeopathy',
    interventions: ['Botanical formula (custom blend)', 'Targeted supplementation'],
    status: 'active',
  },
  {
    level: 6,
    title: 'Address Pathology — Pharmacologic',
    description: 'Prescription medications when needed',
    interventions: ['Monitor current Rx', 'Drug-herb interaction check'],
    status: 'monitoring',
  },
  {
    level: 7,
    title: 'Suppress or Surgically Remove',
    description: 'Last resort — high-force intervention',
    interventions: ['Not indicated at this time'],
    status: 'not-indicated',
  },
];

const TCM_PATTERNS = [
  { pattern: 'Kidney Yin Deficiency', symptoms: 'Night sweats, lower back pain, tinnitus', strength: 78 },
  { pattern: 'Liver Qi Stagnation', symptoms: 'Irritability, sighing, rib-side tension', strength: 62 },
  { pattern: 'Spleen Qi Deficiency', symptoms: 'Fatigue after eating, loose stools, worry', strength: 45 },
];

type TabKey = 'ayurvedic' | 'tcm' | 'genetics' | 'therapeutic';

// ── Component ────────────────────────────────────────────────────────────────

export default function ConstitutionalScreen() {
  const [tab, setTab] = useState<TabKey>('ayurvedic');

  return (
    <ScrollView className="flex-1 bg-dark-bg" contentContainerClassName="pb-8">
      {/* Header */}
      <View className="px-4 pt-12 pb-2">
        <Text className="text-plum text-sm font-semibold">Integrative Assessment</Text>
        <Text className="text-white text-2xl font-bold">Constitutional Analysis</Text>
        <Text className="text-dark-border text-sm">Patient: Elena Rodriguez</Text>
      </View>

      {/* Tab Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-2">
        <View className="flex-row gap-2">
          {([
            { key: 'ayurvedic', label: 'Ayurvedic' },
            { key: 'tcm', label: 'TCM' },
            { key: 'genetics', label: 'Genetic Correlations' },
            { key: 'therapeutic', label: 'Therapeutic Order' },
          ] as const).map((t) => (
            <Pressable
              key={t.key}
              className={`rounded-full px-4 py-1.5 ${
                tab === t.key ? 'bg-plum' : 'bg-white/5 border border-white/10'
              }`}
              onPress={() => setTab(t.key)}
            >
              <Text className={`text-sm font-semibold ${tab === t.key ? 'text-white' : 'text-dark-border'}`}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Ayurvedic Tab */}
      {tab === 'ayurvedic' && (
        <View className="px-4 mt-4">
          <ConstitutionalType system="ayurvedic" scores={SEED_AYURVEDIC} />

          <View className="bg-white/5 rounded-2xl p-4 border border-white/10 mt-4">
            <Text className="text-plum text-sm font-bold mb-2">Prakriti Analysis</Text>
            <Text className="text-white text-sm leading-5 mb-3">
              Primary Constitution: <Text className="text-copper font-bold">Vata</Text> (72%)
            </Text>
            <Text className="text-dark-border text-sm leading-5">
              This patient presents with a dominant Vata constitution characterized by nervous system
              sensitivity, variable digestion, and tendency toward anxiety. The MTHFR C677T variant
              correlates with elevated homocysteine, reinforcing the Vata nervous system pattern.
            </Text>

            <View className="mt-3 pt-3 border-t border-white/10">
              <Text className="text-sage text-sm font-semibold mb-1">Recommended Approach</Text>
              <Text className="text-dark-border text-sm">
                • Warming, grounding herbs (Ashwagandha, Ginger){'\n'}
                • Nervine tonics (Skullcap, Lemon Balm){'\n'}
                • Consistent daily routine (dinacharya){'\n'}
                • Warm, cooked, well-spiced foods
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* TCM Tab */}
      {tab === 'tcm' && (
        <View className="px-4 mt-4">
          <ConstitutionalType system="tcm" scores={SEED_TCM} />

          <View className="mt-4">
            <Text className="text-white text-lg font-bold mb-3">TCM Pattern Identification</Text>
            {TCM_PATTERNS.map((pattern) => (
              <View key={pattern.pattern} className="bg-white/5 rounded-xl p-4 mb-3 border border-white/10">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-white font-bold">{pattern.pattern}</Text>
                  <Text className="text-plum text-sm font-bold">{pattern.strength}%</Text>
                </View>
                <View className="h-2 bg-dark-border/30 rounded-full overflow-hidden mb-2">
                  <View
                    className="h-full rounded-full bg-plum"
                    style={{ width: `${pattern.strength}%` }}
                  />
                </View>
                <Text className="text-dark-border text-xs">{pattern.symptoms}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Genetic Correlations Tab */}
      {tab === 'genetics' && (
        <View className="px-4 mt-4">
          <View className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-4">
            <Text className="text-plum text-sm font-bold mb-2">Gene-Constitution Correlations</Text>
            <Text className="text-dark-border text-sm">
              Mapping genetic variants to constitutional patterns for integrative assessment
            </Text>
          </View>

          {GENETIC_CORRELATIONS.map((corr, i) => {
            const strengthColor = corr.strength === 'strong' ? 'text-copper' : corr.strength === 'moderate' ? 'text-sage' : 'text-dark-border';
            const strengthBg = corr.strength === 'strong' ? 'bg-copper/10' : corr.strength === 'moderate' ? 'bg-sage/10' : 'bg-dark-border/10';
            return (
              <View key={i} className="bg-white/5 rounded-xl p-4 mb-3 border border-white/10">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="bg-plum/20 rounded-lg px-2 py-1">
                    <Text className="text-plum text-xs font-bold">{corr.gene}</Text>
                  </View>
                  <View className={`${strengthBg} rounded-full px-2 py-0.5`}>
                    <Text className={`text-xs font-bold ${strengthColor}`}>{corr.strength}</Text>
                  </View>
                </View>
                <Text className="text-white font-semibold text-sm mb-1">→ {corr.constitution}</Text>
                <Text className="text-dark-border text-xs">{corr.correlation}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Therapeutic Order Tab */}
      {tab === 'therapeutic' && (
        <View className="px-4 mt-4">
          <View className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-4">
            <Text className="text-sage text-sm font-bold mb-1">Naturopathic Therapeutic Order</Text>
            <Text className="text-dark-border text-xs">
              Hierarchical framework — treat with least force first
            </Text>
          </View>

          {THERAPEUTIC_ORDER.map((level) => {
            const statusLookup: Record<string, { bg: string; text: string; label: string }> = {
              active: { bg: 'bg-sage/10', text: 'text-sage', label: 'Active' },
              planned: { bg: 'bg-plum/10', text: 'text-plum', label: 'Planned' },
              monitoring: { bg: 'bg-copper/10', text: 'text-copper', label: 'Monitoring' },
              'not-indicated': { bg: 'bg-dark-border/10', text: 'text-dark-border', label: 'N/A' },
            };
            const statusConfig = statusLookup[level.status] ?? statusLookup['not-indicated'];

            const levelColors = ['bg-sage', 'bg-sage/80', 'bg-plum', 'bg-plum/80', 'bg-copper', 'bg-copper/80', 'bg-rose'];

            return (
              <View key={level.level} className="bg-white/5 rounded-xl p-4 mb-3 border border-white/10">
                <View className="flex-row items-start mb-2">
                  <View className={`w-8 h-8 rounded-full ${levelColors[level.level - 1]} items-center justify-center mr-3 mt-0.5`}>
                    <Text className="text-white text-sm font-bold">{level.level}</Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-white font-bold text-sm flex-1">{level.title}</Text>
                      <View className={`${statusConfig.bg} rounded-full px-2 py-0.5 ml-2`}>
                        <Text className={`text-[10px] font-bold ${statusConfig.text}`}>{statusConfig.label}</Text>
                      </View>
                    </View>
                    <Text className="text-dark-border text-xs mt-1">{level.description}</Text>
                  </View>
                </View>

                <View className="ml-11 mt-1">
                  {level.interventions.map((intervention, i) => (
                    <View key={i} className="flex-row items-center mb-0.5">
                      <View className="w-1.5 h-1.5 rounded-full bg-sage/50 mr-2" />
                      <Text className="text-white text-xs">{intervention}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
