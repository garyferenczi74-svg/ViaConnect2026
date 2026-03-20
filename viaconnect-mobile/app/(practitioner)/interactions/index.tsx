import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';

// ── CYP450 Reference Data ────────────────────────────────────────────────────

interface CYP450Entry {
  enzyme: string;
  substrates: string[];
  inhibitors: string[];
  inducers: string[];
  relevantSupplements: string[];
}

const CYP450_TABLE: CYP450Entry[] = [
  {
    enzyme: 'CYP2D6',
    substrates: ['Codeine', 'Fluoxetine', 'Metoprolol', 'Tamoxifen', 'Tramadol'],
    inhibitors: ['Bupropion', 'Fluoxetine', 'Paroxetine', 'Quinidine'],
    inducers: ['Dexamethasone', 'Rifampin'],
    relevantSupplements: ['St. John\'s Wort', 'Curcumin'],
  },
  {
    enzyme: 'CYP3A4',
    substrates: ['Atorvastatin', 'Cyclosporine', 'Diazepam', 'Felodipine', 'Midazolam'],
    inhibitors: ['Ketoconazole', 'Erythromycin', 'Grapefruit juice'],
    inducers: ['Carbamazepine', 'Phenytoin', 'Rifampin', 'St. John\'s Wort'],
    relevantSupplements: ['Berberine', 'Quercetin', 'Resveratrol'],
  },
  {
    enzyme: 'CYP1A2',
    substrates: ['Caffeine', 'Clozapine', 'Theophylline', 'Melatonin'],
    inhibitors: ['Ciprofloxacin', 'Fluvoxamine'],
    inducers: ['Smoking', 'Cruciferous vegetables', 'Charbroiled food'],
    relevantSupplements: ['Green Tea Extract', 'Quercetin'],
  },
  {
    enzyme: 'CYP2C19',
    substrates: ['Omeprazole', 'Clopidogrel', 'Diazepam', 'Citalopram'],
    inhibitors: ['Fluvoxamine', 'Fluconazole', 'Omeprazole'],
    inducers: ['Rifampin', 'St. John\'s Wort'],
    relevantSupplements: ['Curcumin', 'Ginkgo biloba'],
  },
];

// ── Drug-Supplement Matrix ───────────────────────────────────────────────────

interface MatrixEntry {
  drug: string;
  supplement: string;
  severity: 'safe' | 'monitor' | 'caution' | 'avoid';
  mechanism: string;
}

const INTERACTION_MATRIX: MatrixEntry[] = [
  { drug: 'Warfarin', supplement: 'CoQ10+', severity: 'monitor', mechanism: 'May reduce anticoagulant effect' },
  { drug: 'Warfarin', supplement: 'Omega-3 Ultra', severity: 'caution', mechanism: 'Additive anticoagulant effect' },
  { drug: 'Metformin', supplement: 'NAD+', severity: 'safe', mechanism: 'Complementary metabolic pathways' },
  { drug: 'Levothyroxine', supplement: 'Magnesium Glycinate', severity: 'caution', mechanism: 'Separate by 4 hours — absorption interference' },
  { drug: 'SSRIs', supplement: 'COMT+', severity: 'monitor', mechanism: 'May alter serotonin metabolism via COMT pathway' },
  { drug: 'SSRIs', supplement: 'FOCUS+', severity: 'caution', mechanism: 'Potential serotonergic interaction' },
  { drug: 'Statins', supplement: 'CoQ10+', severity: 'safe', mechanism: 'Recommended — statins deplete CoQ10' },
  { drug: 'Blood Thinners', supplement: 'BLAST+', severity: 'avoid', mechanism: 'Contains compounds that may affect clotting' },
  { drug: 'Immunosuppressants', supplement: 'MTHFR+', severity: 'monitor', mechanism: 'Methylation support may interact with immune modulation' },
  { drug: 'Benzodiazepines', supplement: 'FOCUS+', severity: 'caution', mechanism: 'Additive sedative effects possible' },
];

const SEVERITY_CONFIG = {
  safe: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'SAFE' },
  monitor: { bg: 'bg-portal-yellow/10', text: 'text-portal-yellow', label: 'MONITOR' },
  caution: { bg: 'bg-orange-500/10', text: 'text-orange-400', label: 'CAUTION' },
  avoid: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'AVOID' },
};

type ViewMode = 'checker' | 'cyp450' | 'matrix';

// ── Component ────────────────────────────────────────────────────────────────

export default function InteractionsScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('checker');
  const [medication, setMedication] = useState('');
  const [expandedEnzyme, setExpandedEnzyme] = useState<string | null>(null);
  const [matrixFilter, setMatrixFilter] = useState('');

  const filteredMatrix = INTERACTION_MATRIX.filter(
    (entry) =>
      !matrixFilter.trim() ||
      entry.drug.toLowerCase().includes(matrixFilter.toLowerCase()) ||
      entry.supplement.toLowerCase().includes(matrixFilter.toLowerCase()),
  );

  return (
    <ScrollView className="flex-1 bg-dark-bg" contentContainerClassName="pb-8">
      {/* Header */}
      <View className="px-4 pt-12 pb-2">
        <Text className="text-white text-2xl font-bold">Interaction Checker</Text>
        <Text className="text-dark-border text-sm">Drug-supplement interactions & CYP450 reference</Text>
      </View>

      {/* View Mode Tabs */}
      <View className="flex-row px-4 py-2 gap-2">
        {([
          { key: 'checker', label: 'Quick Check' },
          { key: 'cyp450', label: 'CYP450 Table' },
          { key: 'matrix', label: 'Drug-Supp Matrix' },
        ] as const).map((tab) => (
          <Pressable
            key={tab.key}
            className={`flex-1 rounded-xl py-2.5 items-center ${
              viewMode === tab.key ? 'bg-portal-green' : 'bg-dark-card border border-dark-border'
            }`}
            onPress={() => setViewMode(tab.key)}
          >
            <Text className={`text-sm font-semibold ${viewMode === tab.key ? 'text-dark-bg' : 'text-white'}`}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Quick Checker */}
      {viewMode === 'checker' && (
        <View className="px-4 mt-4">
          <View className="flex-row gap-2 mb-4">
            <TextInput
              className="flex-1 bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-white"
              placeholder="Enter medication name..."
              placeholderTextColor="#6B7280"
              value={medication}
              onChangeText={setMedication}
              accessibilityLabel="Medication name"
            />
            <Pressable className="bg-portal-green rounded-xl px-5 py-3 items-center justify-center active:opacity-80">
              <Text className="text-dark-bg font-bold">Check</Text>
            </Pressable>
          </View>

          <View className="bg-dark-card rounded-2xl p-4 border border-dark-border mb-3">
            <Text className="text-white font-semibold mb-2">Checking against current protocol:</Text>
            <View className="flex-row flex-wrap gap-1">
              {['MTHFR+', 'CoQ10+', 'NAD+', 'COMT+', 'Omega-3 Ultra'].map((supp) => (
                <View key={supp} className="bg-copper/10 rounded-full px-2.5 py-1">
                  <Text className="text-copper text-xs font-semibold">{supp}</Text>
                </View>
              ))}
            </View>
          </View>

          <Text className="text-dark-border text-center py-8 text-sm">
            Enter a medication above and tap "Check" to analyze interactions with the current protocol
          </Text>
        </View>
      )}

      {/* CYP450 Reference Table */}
      {viewMode === 'cyp450' && (
        <View className="px-4 mt-4">
          <View className="bg-portal-purple/10 rounded-xl p-3 mb-4">
            <Text className="text-portal-purple text-sm font-semibold">CYP450 Metabolizer Phenotype Reference</Text>
            <Text className="text-dark-border text-xs mt-1">
              Tap an enzyme to see substrates, inhibitors, and inducers
            </Text>
          </View>

          {CYP450_TABLE.map((entry) => {
            const isExpanded = expandedEnzyme === entry.enzyme;
            return (
              <View key={entry.enzyme} className="mb-3">
                <Pressable
                  className="bg-dark-card rounded-xl p-4 border border-dark-border active:opacity-80"
                  onPress={() => setExpandedEnzyme(isExpanded ? null : entry.enzyme)}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="bg-portal-purple/20 rounded-lg px-2 py-1 mr-2">
                        <Text className="text-portal-purple font-bold text-sm">{entry.enzyme}</Text>
                      </View>
                      <Text className="text-dark-border text-xs">
                        {entry.substrates.length} substrates
                      </Text>
                    </View>
                    <Text className="text-dark-border">{isExpanded ? '▲' : '▼'}</Text>
                  </View>
                </Pressable>

                {isExpanded && (
                  <View className="bg-dark-card/50 mx-2 p-4 rounded-b-xl border-x border-b border-dark-border">
                    {[
                      { label: 'Substrates', items: entry.substrates, color: 'text-white' },
                      { label: 'Inhibitors', items: entry.inhibitors, color: 'text-red-400' },
                      { label: 'Inducers', items: entry.inducers, color: 'text-portal-yellow' },
                      { label: 'Related Supplements', items: entry.relevantSupplements, color: 'text-copper' },
                    ].map((section) => (
                      <View key={section.label} className="mb-3">
                        <Text className="text-dark-border text-xs font-semibold mb-1">{section.label}</Text>
                        <View className="flex-row flex-wrap gap-1">
                          {section.items.map((item) => (
                            <View key={item} className="bg-dark-border/20 rounded-full px-2 py-0.5">
                              <Text className={`text-xs ${section.color}`}>{item}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Drug-Supplement Matrix */}
      {viewMode === 'matrix' && (
        <View className="px-4 mt-4">
          <TextInput
            className="bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-white mb-3"
            placeholder="Filter by drug or supplement..."
            placeholderTextColor="#6B7280"
            value={matrixFilter}
            onChangeText={setMatrixFilter}
            accessibilityLabel="Filter matrix"
          />

          {filteredMatrix.map((entry, i) => {
            const config = SEVERITY_CONFIG[entry.severity];
            return (
              <View key={i} className={`${config.bg} rounded-xl p-3 mb-2 border border-dark-border/30`}>
                <View className="flex-row items-center justify-between mb-1">
                  <View className="flex-row items-center flex-1">
                    <Text className="text-white font-semibold text-sm">{entry.drug}</Text>
                    <Text className="text-dark-border text-sm mx-2">×</Text>
                    <Text className="text-copper font-semibold text-sm">{entry.supplement}</Text>
                  </View>
                  <View className={`${config.bg} rounded-full px-2 py-0.5`}>
                    <Text className={`text-xs font-bold ${config.text}`}>{config.label}</Text>
                  </View>
                </View>
                <Text className="text-dark-border text-xs">{entry.mechanism}</Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
