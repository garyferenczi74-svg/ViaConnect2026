import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase/client';

// ── Types ────────────────────────────────────────────────────────────────────

export type InteractionSeverity = 'safe' | 'monitor' | 'contraindicated';

export interface InteractionResult {
  id: string;
  supplementName: string;
  severity: InteractionSeverity;
  rationale: string;
  cyp450Pathway?: string;
}

export interface InteractionCheckerProps {
  /** Current protocol supplements to check against */
  protocolSupplements: Array<{ id: string; name: string }>;
  /** Optional CYP2D6 metabolizer status from genetic profile */
  cyp2d6Status?: string | null;
  onResultSelect?: (result: InteractionResult) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<InteractionSeverity, { bg: string; dot: string; text: string; label: string }> = {
  safe: { bg: 'bg-green-500/10', dot: 'bg-green-500', text: 'text-green-400', label: 'Safe' },
  monitor: { bg: 'bg-yellow-500/10', dot: 'bg-yellow-500', text: 'text-yellow-400', label: 'Monitor' },
  contraindicated: { bg: 'bg-red-500/10', dot: 'bg-red-500', text: 'text-red-400', label: 'Contraindicated' },
};

// ── Component ────────────────────────────────────────────────────────────────

export function InteractionChecker({
  protocolSupplements,
  cyp2d6Status,
  onResultSelect,
}: InteractionCheckerProps) {
  const [medication, setMedication] = useState('');
  const [results, setResults] = useState<InteractionResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    if (!medication.trim()) return;
    setIsChecking(true);
    setError(null);
    setResults([]);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('check-interactions', {
        body: {
          medication: medication.trim(),
          supplements: protocolSupplements.map((s) => s.name),
          cyp2d6Status,
        },
      });

      if (fnError) throw fnError;

      const parsed: InteractionResult[] = (data?.interactions ?? []).map(
        (r: Record<string, unknown>, i: number) => ({
          id: `interaction-${i}`,
          supplementName: String(r.supplement ?? ''),
          severity: (['safe', 'monitor', 'contraindicated'].includes(String(r.severity))
            ? String(r.severity)
            : 'safe') as InteractionSeverity,
          rationale: String(r.rationale ?? ''),
          cyp450Pathway: r.cyp450Pathway ? String(r.cyp450Pathway) : undefined,
        }),
      );

      setResults(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to check interactions');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <View className="flex-1 bg-dark-bg">
      {/* Search Input */}
      <View className="px-4 pt-4 pb-2">
        <Text className="text-white text-lg font-bold mb-1">Interaction Checker</Text>
        <Text className="text-dark-border text-sm mb-3">
          Enter a medication to check against your current protocol
        </Text>

        <View className="flex-row gap-2">
          <TextInput
            className="flex-1 bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-white"
            placeholder="Enter medication name..."
            placeholderTextColor="#374151"
            value={medication}
            onChangeText={setMedication}
            onSubmitEditing={handleCheck}
            autoCapitalize="none"
            accessibilityLabel="Medication name input"
          />
          <Pressable
            className="bg-teal rounded-xl px-5 py-3 items-center justify-center active:opacity-80"
            onPress={handleCheck}
            disabled={isChecking || !medication.trim()}
            accessibilityLabel="Check interactions"
            accessibilityRole="button"
          >
            {isChecking ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white font-semibold">Check</Text>
            )}
          </Pressable>
        </View>

        {cyp2d6Status && (
          <View className="flex-row items-center mt-2">
            <View className="w-1.5 h-1.5 rounded-full bg-plum mr-2" />
            <Text className="text-plum text-xs">CYP2D6: {cyp2d6Status}</Text>
          </View>
        )}
      </View>

      {/* Checking Supplements */}
      {protocolSupplements.length > 0 && (
        <View className="px-4 py-2">
          <Text className="text-dark-border text-xs mb-1">Checking against:</Text>
          <View className="flex-row flex-wrap gap-1">
            {protocolSupplements.map((s) => (
              <View key={s.id} className="bg-dark-card rounded-full px-2 py-0.5">
                <Text className="text-sage text-xs">{s.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Error */}
      {error && (
        <View className="mx-4 mt-2 bg-red-500/10 rounded-xl p-3">
          <Text className="text-red-400 text-sm">{error}</Text>
        </View>
      )}

      {/* Results */}
      <ScrollView className="flex-1 px-4 pt-2" contentContainerClassName="pb-8">
        {results.map((result, index) => {
          const config = SEVERITY_CONFIG[result.severity];
          return (
            <Animated.View
              key={result.id}
              entering={FadeInDown.delay(index * 80).duration(300)}
            >
              <Pressable
                className={`${config.bg} rounded-2xl p-4 mb-3 border border-dark-border/50 active:opacity-80`}
                onPress={() => onResultSelect?.(result)}
                accessibilityLabel={`${result.supplementName}: ${config.label}. ${result.rationale}`}
                accessibilityRole="button"
              >
                <View className="flex-row items-center mb-2">
                  <View className={`w-3 h-3 rounded-full ${config.dot} mr-2`} />
                  <Text className="text-white font-semibold flex-1">{result.supplementName}</Text>
                  <View className={`rounded-full px-2.5 py-0.5 ${config.bg}`}>
                    <Text className={`text-xs font-bold ${config.text}`}>{config.label}</Text>
                  </View>
                </View>
                <Text className="text-gray-300 text-sm leading-5">{result.rationale}</Text>
                {result.cyp450Pathway && (
                  <Text className="text-plum text-xs mt-2 font-mono">
                    Pathway: {result.cyp450Pathway}
                  </Text>
                )}
              </Pressable>
            </Animated.View>
          );
        })}

        {results.length === 0 && !isChecking && medication.trim() !== '' && !error && (
          <Text className="text-dark-border text-center py-8">
            Press "Check" to analyze interactions
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

export function InteractionCheckerSkeleton() {
  return (
    <View className="flex-1 bg-dark-bg px-4 pt-4">
      <View className="w-48 h-6 rounded bg-dark-border animate-pulse mb-2" />
      <View className="w-full h-12 rounded-xl bg-dark-border animate-pulse mb-4" />
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} className="w-full h-24 rounded-2xl bg-dark-border/50 animate-pulse mb-3" />
      ))}
    </View>
  );
}
