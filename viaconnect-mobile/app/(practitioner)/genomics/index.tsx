import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, Pressable } from 'react-native';
import { useEntitlements } from '../../../src/hooks/useEntitlements';
import { LockedFeatureOverlay } from '../../../src/components/shared';

// ── Seed Data ────────────────────────────────────────────────────────────────

interface PatientVariant {
  patientName: string;
  patientId: string;
  variant: string;
  status: string;
  riskLevel: 'low' | 'moderate' | 'high';
}

interface GeneEntry {
  gene: string;
  fullName: string;
  category: string;
  patientCount: number;
  variants: PatientVariant[];
  clinicalNote: string;
}

const GENE_DATABASE: GeneEntry[] = [
  {
    gene: 'MTHFR',
    fullName: 'Methylenetetrahydrofolate Reductase',
    category: 'Methylation',
    patientCount: 24,
    variants: [
      { patientName: 'Sarah Chen', patientId: 'p1', variant: 'C677T', status: 'Homozygous', riskLevel: 'high' },
      { patientName: 'Marcus Rivera', patientId: 'p2', variant: 'A1298C', status: 'Heterozygous', riskLevel: 'moderate' },
      { patientName: 'Priya Patel', patientId: 'p5', variant: 'C677T', status: 'Homozygous', riskLevel: 'high' },
    ],
    clinicalNote: 'Impaired folate metabolism. Consider methylfolate supplementation (MTHFR+). Monitor homocysteine levels.',
  },
  {
    gene: 'CYP2D6',
    fullName: 'Cytochrome P450 2D6',
    category: 'Pharmacogenomics',
    patientCount: 18,
    variants: [
      { patientName: 'Sarah Chen', patientId: 'p1', variant: '*4/*4', status: 'Poor Metabolizer', riskLevel: 'high' },
      { patientName: 'Marcus Rivera', patientId: 'p2', variant: '*5/*5', status: 'Poor Metabolizer', riskLevel: 'high' },
    ],
    clinicalNote: 'Key drug metabolism enzyme. Poor metabolizers require dose adjustments for ~25% of pharmaceuticals.',
  },
  {
    gene: 'COMT',
    fullName: 'Catechol-O-Methyltransferase',
    category: 'Neurotransmitters',
    patientCount: 15,
    variants: [
      { patientName: 'Sarah Chen', patientId: 'p1', variant: 'Val/Met', status: 'Intermediate', riskLevel: 'moderate' },
      { patientName: 'Aisha Thompson', patientId: 'p3', variant: 'Met/Met', status: 'Slow', riskLevel: 'moderate' },
      { patientName: 'Marcus Rivera', patientId: 'p2', variant: 'Val/Val', status: 'Fast', riskLevel: 'low' },
    ],
    clinicalNote: 'Affects dopamine/norepinephrine breakdown. Met/Met = slow clearance, higher catecholamine sensitivity.',
  },
  {
    gene: 'VDR',
    fullName: 'Vitamin D Receptor',
    category: 'Nutrient Metabolism',
    patientCount: 12,
    variants: [
      { patientName: 'Priya Patel', patientId: 'p5', variant: 'FokI', status: 'Variant', riskLevel: 'moderate' },
    ],
    clinicalNote: 'Affects vitamin D utilization. May require higher D3 supplementation for optimal levels.',
  },
  {
    gene: 'SOD2',
    fullName: 'Superoxide Dismutase 2',
    category: 'Antioxidant Defense',
    patientCount: 8,
    variants: [
      { patientName: 'Marcus Rivera', patientId: 'p2', variant: 'Ala16Val', status: 'Variant', riskLevel: 'moderate' },
      { patientName: 'Priya Patel', patientId: 'p5', variant: 'Ala16Val', status: 'Variant', riskLevel: 'moderate' },
    ],
    clinicalNote: 'Mitochondrial antioxidant enzyme. Variant may reduce oxidative stress defense. Consider CoQ10+/NAD+.',
  },
  {
    gene: 'APOE',
    fullName: 'Apolipoprotein E',
    category: 'Lipid Metabolism',
    patientCount: 6,
    variants: [
      { patientName: 'Marcus Rivera', patientId: 'p2', variant: 'ε3/ε4', status: 'One ε4 allele', riskLevel: 'moderate' },
    ],
    clinicalNote: 'Lipid transport gene. ε4 carriers have increased cardiovascular and neurodegenerative risk.',
  },
];

const RISK_CONFIG = {
  low: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'LOW' },
  moderate: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'MOD' },
  high: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'HIGH' },
};

// ── Component ────────────────────────────────────────────────────────────────

export default function GenomicsPanel() {
  const { canViewFullGenetics } = useEntitlements();
  const [search, setSearch] = useState('');
  const [expandedGene, setExpandedGene] = useState<string | null>(null);

  if (!canViewFullGenetics) {
    return (
      <LockedFeatureOverlay
        requiredTier="gold"
        featureName="Full Genomics Panel"
        description="View all 6 genetic panels with variant details. Free users can preview up to 3 variants."
      />
    );
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return GENE_DATABASE;
    const q = search.toLowerCase();
    return GENE_DATABASE.filter(
      (g) =>
        g.gene.toLowerCase().includes(q) ||
        g.fullName.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        g.variants.some((v) => v.patientName.toLowerCase().includes(q)),
    );
  }, [search]);

  return (
    <ScrollView className="flex-1 bg-dark-bg" contentContainerClassName="pb-8">
      {/* Header */}
      <View className="px-4 pt-12 pb-2">
        <Text className="text-portal-purple text-sm font-semibold">Genomics Deep Dive</Text>
        <Text className="text-white text-2xl font-bold">Gene & Variant Explorer</Text>
        <Text className="text-dark-border text-sm">Search across all patient genetic data</Text>
      </View>

      {/* Search */}
      <View className="px-4 py-2">
        <TextInput
          className="bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-white"
          placeholder="Search gene, variant, or patient..."
          placeholderTextColor="#6B7280"
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Search genomics"
        />
      </View>

      {/* Population Stats */}
      <View className="px-4 py-2">
        <View className="bg-portal-purple/10 rounded-2xl p-4 border border-portal-purple/20">
          <Text className="text-portal-purple text-sm font-bold mb-2">Practice Population Stats</Text>
          <View className="flex-row justify-between">
            <View className="items-center">
              <Text className="text-white text-lg font-bold">47</Text>
              <Text className="text-dark-border text-xs">Total Patients</Text>
            </View>
            <View className="items-center">
              <Text className="text-white text-lg font-bold">38</Text>
              <Text className="text-dark-border text-xs">Genotyped</Text>
            </View>
            <View className="items-center">
              <Text className="text-white text-lg font-bold">6</Text>
              <Text className="text-dark-border text-xs">Genes Tracked</Text>
            </View>
            <View className="items-center">
              <Text className="text-red-400 text-lg font-bold">12</Text>
              <Text className="text-dark-border text-xs">High Risk</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Gene List */}
      <View className="px-4 mt-2">
        {filtered.map((gene) => {
          const isExpanded = expandedGene === gene.gene;
          return (
            <View key={gene.gene} className="mb-3">
              <Pressable
                className="bg-dark-card rounded-2xl p-4 border border-dark-border active:opacity-80"
                onPress={() => setExpandedGene(isExpanded ? null : gene.gene)}
              >
                <View className="flex-row items-center justify-between mb-1">
                  <View className="flex-row items-center">
                    <View className="bg-portal-purple/20 rounded-lg px-2 py-1 mr-2">
                      <Text className="text-portal-purple font-bold text-sm">{gene.gene}</Text>
                    </View>
                    <Text className="text-dark-border text-xs">{gene.category}</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Text className="text-white text-sm font-bold mr-1">{gene.patientCount}</Text>
                    <Text className="text-dark-border text-xs">patients</Text>
                    <Text className="text-dark-border text-lg ml-2">{isExpanded ? '▲' : '▼'}</Text>
                  </View>
                </View>
                <Text className="text-dark-border text-xs" numberOfLines={isExpanded ? undefined : 1}>
                  {gene.fullName}
                </Text>
              </Pressable>

              {isExpanded && (
                <View className="bg-dark-card/50 rounded-b-2xl mx-2 p-4 border-x border-b border-dark-border">
                  {/* Clinical Note */}
                  <View className="bg-portal-purple/5 rounded-xl p-3 mb-3">
                    <Text className="text-portal-purple text-xs font-semibold mb-1">Clinical Note</Text>
                    <Text className="text-white text-sm">{gene.clinicalNote}</Text>
                  </View>

                  {/* Patient Variants */}
                  <Text className="text-white text-sm font-semibold mb-2">Patient Variants</Text>
                  {gene.variants.map((v, i) => {
                    const risk = RISK_CONFIG[v.riskLevel];
                    return (
                      <View
                        key={i}
                        className={`flex-row items-center justify-between rounded-xl p-3 mb-1.5 ${risk.bg}`}
                      >
                        <View className="flex-1">
                          <Text className="text-white text-sm font-semibold">{v.patientName}</Text>
                          <Text className="text-dark-border text-xs">
                            {v.variant} · {v.status}
                          </Text>
                        </View>
                        <View className={`rounded-full px-2 py-0.5 ${risk.bg}`}>
                          <Text className={`text-xs font-bold ${risk.text}`}>{risk.label}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Evidence Links */}
      <View className="px-4 mt-4">
        <Text className="text-white text-lg font-bold mb-3">Clinical Evidence Library</Text>
        {[
          { title: 'MTHFR C677T and Folate Metabolism', source: 'PubMed', year: '2024' },
          { title: 'CYP2D6 Pharmacogenomics Guidelines', source: 'CPIC', year: '2025' },
          { title: 'COMT Val158Met and Catecholamine Sensitivity', source: 'Nature Genetics', year: '2024' },
        ].map((ref, i) => (
          <View key={i} className="bg-dark-card rounded-xl p-3 mb-2 border border-dark-border">
            <Text className="text-white text-sm font-semibold">{ref.title}</Text>
            <Text className="text-dark-border text-xs">
              {ref.source} · {ref.year}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
