import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, FlatList, ActivityIndicator } from 'react-native';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase/client';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PatientOption {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface CatalogProduct {
  id: string;
  sku: string;
  name: string;
  shortName: string;
  category: string;
  price: number;
}

export interface SelectedProduct {
  product: CatalogProduct;
  dosage: string;
  frequency: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'bedtime';
}

export interface InteractionWarning {
  pair: [string, string];
  severity: 'safe' | 'monitor' | 'contraindicated';
  message: string;
}

export interface ProtocolBuilderProps {
  /** consumer or practitioner mode */
  mode: 'consumer' | 'practitioner';
  userId: string;
  patients?: PatientOption[];
  catalog: CatalogProduct[];
  /** Auto-populated gene-based recommendations */
  geneticRecommendations?: CatalogProduct[];
  onSubmit: (data: {
    patientId: string;
    items: SelectedProduct[];
    notes: string;
  }) => void;
  isSubmitting?: boolean;
}

// ── Step Components ──────────────────────────────────────────────────────────

const STEPS = ['Patient', 'Auto-Fill', 'Products', 'Check', 'Review'] as const;
const CONSUMER_STEPS = ['Auto-Fill', 'Products', 'Check', 'Review'] as const;

function StepIndicator({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <View className="flex-row items-center px-4 py-3 gap-1" accessibilityRole="progressbar">
      {steps.map((step, i) => (
        <View key={step} className="flex-1 flex-row items-center">
          <View
            className={`h-1.5 flex-1 rounded-full ${i <= current ? 'bg-copper' : 'bg-dark-border'}`}
          />
        </View>
      ))}
    </View>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export function ProtocolBuilder({
  mode,
  userId,
  patients = [],
  catalog,
  geneticRecommendations = [],
  onSubmit,
  isSubmitting,
}: ProtocolBuilderProps) {
  const steps = mode === 'practitioner' ? STEPS : CONSUMER_STEPS;
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedPatient, setSelectedPatient] = useState<string>(
    mode === 'consumer' ? userId : '',
  );
  const [items, setItems] = useState<SelectedProduct[]>([]);
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [interactions, setInteractions] = useState<InteractionWarning[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const currentStep = steps[stepIndex];

  const addProduct = (product: CatalogProduct) => {
    if (items.some((i) => i.product.id === product.id)) return;
    setItems([...items, { product, dosage: '', frequency: 'daily', timeOfDay: 'morning' }]);
  };

  const removeProduct = (productId: string) => {
    setItems(items.filter((i) => i.product.id !== productId));
  };

  const updateItem = (productId: string, update: Partial<SelectedProduct>) => {
    setItems(items.map((i) => (i.product.id === productId ? { ...i, ...update } : i)));
  };

  const runInteractionCheck = async () => {
    setIsChecking(true);
    try {
      const { data } = await supabase.functions.invoke('check-interactions', {
        body: { supplements: items.map((i) => i.product.name) },
      });
      setInteractions(data?.interactions ?? []);
    } catch {
      setInteractions([]);
    } finally {
      setIsChecking(false);
    }
  };

  const canAdvance = () => {
    switch (currentStep) {
      case 'Patient': return !!selectedPatient;
      case 'Auto-Fill': return true;
      case 'Products': return items.length > 0;
      case 'Check': return !isChecking;
      case 'Review': return true;
      default: return true;
    }
  };

  const handleNext = () => {
    if (currentStep === 'Check' && interactions.length === 0) {
      runInteractionCheck();
      return;
    }
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      onSubmit({ patientId: selectedPatient, items, notes });
    }
  };

  const filteredCatalog = catalog.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <View className="flex-1 bg-dark-bg">
      <StepIndicator steps={steps} current={stepIndex} />

      <View className="px-4 mb-2">
        <Text className="text-white text-xl font-bold">{currentStep}</Text>
        <Text className="text-dark-border text-sm">
          Step {stepIndex + 1} of {steps.length}
        </Text>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-24">
        <Animated.View entering={FadeIn.duration(200)}>
          {/* Step: Patient (practitioner only) */}
          {currentStep === 'Patient' && (
            <View className="gap-2">
              {patients.map((p) => (
                <Pressable
                  key={p.id}
                  className={`p-4 rounded-2xl border ${
                    selectedPatient === p.id
                      ? 'bg-teal/20 border-teal'
                      : 'bg-dark-card border-dark-border'
                  } active:opacity-80`}
                  onPress={() => setSelectedPatient(p.id)}
                  accessibilityLabel={`Select patient ${p.name}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedPatient === p.id }}
                >
                  <Text className="text-white font-semibold">{p.name}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Step: Auto-Fill from genetics */}
          {currentStep === 'Auto-Fill' && (
            <View>
              <Text className="text-sage text-sm mb-3">
                Based on your genetic profile, we recommend:
              </Text>
              {geneticRecommendations.length === 0 ? (
                <Text className="text-dark-border text-center py-8">
                  No genetic data available. Skip to add products manually.
                </Text>
              ) : (
                geneticRecommendations.map((p) => {
                  const isAdded = items.some((i) => i.product.id === p.id);
                  return (
                    <View
                      key={p.id}
                      className="flex-row items-center bg-dark-card rounded-xl p-3 mb-2 border border-dark-border"
                    >
                      <View className="flex-1">
                        <Text className="text-white font-semibold">{p.name}</Text>
                        <Text className="text-dark-border text-xs">{p.sku}</Text>
                      </View>
                      <Pressable
                        className={`rounded-lg px-3 py-1.5 ${isAdded ? 'bg-sage/20' : 'bg-copper'}`}
                        onPress={() => (isAdded ? removeProduct(p.id) : addProduct(p))}
                        accessibilityLabel={isAdded ? `Remove ${p.name}` : `Add ${p.name}`}
                      >
                        <Text className={`text-sm font-semibold ${isAdded ? 'text-sage' : 'text-white'}`}>
                          {isAdded ? 'Added' : 'Add'}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* Step: Products Catalog */}
          {currentStep === 'Products' && (
            <View>
              <TextInput
                className="bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-white mb-3"
                placeholder="Search 56-SKU catalog..."
                placeholderTextColor="#374151"
                value={searchQuery}
                onChangeText={setSearchQuery}
                accessibilityLabel="Search products"
              />

              {/* Selected */}
              {items.length > 0 && (
                <View className="mb-4">
                  <Text className="text-copper text-sm font-semibold mb-2">
                    Selected ({items.length})
                  </Text>
                  {items.map((item) => (
                    <View
                      key={item.product.id}
                      className="flex-row items-center bg-copper/10 rounded-xl p-3 mb-2"
                    >
                      <View className="flex-1">
                        <Text className="text-white text-sm font-semibold">{item.product.name}</Text>
                        <TextInput
                          className="text-copper text-xs mt-1 bg-dark-card rounded px-2 py-1"
                          placeholder="Dosage (e.g. 1 cap)"
                          placeholderTextColor="#374151"
                          value={item.dosage}
                          onChangeText={(v) => updateItem(item.product.id, { dosage: v })}
                        />
                      </View>
                      <Pressable onPress={() => removeProduct(item.product.id)} className="ml-2 p-2">
                        <Text className="text-red-400 text-lg">×</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {/* Catalog */}
              {filteredCatalog.map((p) => {
                const isAdded = items.some((i) => i.product.id === p.id);
                return (
                  <Pressable
                    key={p.id}
                    className="flex-row items-center bg-dark-card rounded-xl p-3 mb-2 border border-dark-border active:opacity-80"
                    onPress={() => (isAdded ? removeProduct(p.id) : addProduct(p))}
                    accessibilityLabel={`${p.name}, $${p.price}`}
                  >
                    <View className="flex-1">
                      <Text className="text-white text-sm font-semibold">{p.name}</Text>
                      <Text className="text-dark-border text-xs">
                        {p.sku} · ${p.price}
                      </Text>
                    </View>
                    <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                      isAdded ? 'bg-copper border-copper' : 'border-dark-border'
                    }`}>
                      {isAdded && <Text className="text-white text-xs">✓</Text>}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Step: Interaction Check */}
          {currentStep === 'Check' && (
            <View>
              {isChecking ? (
                <View className="items-center py-12">
                  <ActivityIndicator color="#B75F19" size="large" />
                  <Text className="text-dark-border mt-4">Running interaction analysis...</Text>
                </View>
              ) : interactions.length > 0 ? (
                interactions.map((w, i) => {
                  const color =
                    w.severity === 'safe'
                      ? 'bg-green-500/10'
                      : w.severity === 'monitor'
                        ? 'bg-yellow-500/10'
                        : 'bg-red-500/10';
                  const dot =
                    w.severity === 'safe'
                      ? 'bg-green-500'
                      : w.severity === 'monitor'
                        ? 'bg-yellow-500'
                        : 'bg-red-500';
                  return (
                    <Animated.View
                      key={i}
                      entering={SlideInRight.delay(i * 100)}
                      className={`${color} rounded-2xl p-4 mb-3`}
                    >
                      <View className="flex-row items-center mb-1">
                        <View className={`w-2.5 h-2.5 rounded-full ${dot} mr-2`} />
                        <Text className="text-white font-semibold">
                          {w.pair[0]} × {w.pair[1]}
                        </Text>
                      </View>
                      <Text className="text-gray-300 text-sm">{w.message}</Text>
                    </Animated.View>
                  );
                })
              ) : (
                <View className="items-center py-12">
                  <Text className="text-green-400 text-lg font-bold mb-2">All Clear</Text>
                  <Text className="text-dark-border text-sm text-center">
                    No significant interactions detected between your selected supplements.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Step: Review */}
          {currentStep === 'Review' && (
            <View>
              <View className="bg-dark-card rounded-2xl p-4 mb-4 border border-dark-border">
                <Text className="text-copper text-sm font-semibold mb-2">
                  Protocol Summary ({items.length} products)
                </Text>
                {items.map((item) => (
                  <View key={item.product.id} className="flex-row items-center py-2 border-b border-dark-border/30">
                    <View className="flex-1">
                      <Text className="text-white text-sm">{item.product.name}</Text>
                      <Text className="text-dark-border text-xs">
                        {item.dosage || 'No dosage set'} · {item.timeOfDay}
                      </Text>
                    </View>
                    <Text className="text-copper text-sm">${item.product.price}</Text>
                  </View>
                ))}
              </View>

              <TextInput
                className="bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-white mb-4 min-h-[80px]"
                placeholder="Additional notes..."
                placeholderTextColor="#374151"
                value={notes}
                onChangeText={setNotes}
                multiline
                accessibilityLabel="Protocol notes"
              />
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View className="absolute bottom-0 left-0 right-0 bg-dark-bg border-t border-dark-border px-4 py-4 flex-row gap-3">
        {stepIndex > 0 && (
          <Pressable
            className="flex-1 bg-dark-card rounded-xl py-3.5 items-center active:opacity-80"
            onPress={() => setStepIndex(stepIndex - 1)}
            accessibilityLabel="Previous step"
          >
            <Text className="text-white font-semibold">Back</Text>
          </Pressable>
        )}
        <Pressable
          className={`flex-1 rounded-xl py-3.5 items-center active:opacity-80 ${
            canAdvance() ? 'bg-copper' : 'bg-dark-border'
          }`}
          onPress={handleNext}
          disabled={!canAdvance() || isSubmitting}
          accessibilityLabel={stepIndex === steps.length - 1 ? 'Submit protocol' : 'Next step'}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text className="text-white font-semibold">
              {stepIndex === steps.length - 1 ? 'Submit Protocol' : 'Next'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
