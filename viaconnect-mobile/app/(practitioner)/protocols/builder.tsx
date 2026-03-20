import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ProtocolBuilder } from '../../../src/components/shared';
import type { CatalogProduct, PatientOption, SelectedProduct } from '../../../src/components/shared';

// ── Seed Data ────────────────────────────────────────────────────────────────

const SEED_PATIENTS: PatientOption[] = [
  { id: 'p1', name: 'Sarah Chen' },
  { id: 'p2', name: 'Marcus Rivera' },
  { id: 'p3', name: 'Aisha Thompson' },
  { id: 'p4', name: 'James O\'Brien' },
  { id: 'p5', name: 'Priya Patel' },
];

const SEED_CATALOG: CatalogProduct[] = [
  { id: 'prod-1', sku: 'VC-MTHFR', name: 'MTHFR+', shortName: 'MTHFR+', category: 'supplement', price: 44.88 },
  { id: 'prod-2', sku: 'VC-COMT', name: 'COMT+', shortName: 'COMT+', category: 'supplement', price: 42.88 },
  { id: 'prod-3', sku: 'VC-FOCUS', name: 'FOCUS+', shortName: 'FOCUS+', category: 'supplement', price: 46.88 },
  { id: 'prod-4', sku: 'VC-BLAST', name: 'BLAST+', shortName: 'BLAST+', category: 'supplement', price: 48.88 },
  { id: 'prod-5', sku: 'VC-SHRED', name: 'SHRED+', shortName: 'SHRED+', category: 'supplement', price: 52.88 },
  { id: 'prod-6', sku: 'VC-NAD', name: 'NAD+', shortName: 'NAD+', category: 'supplement', price: 58.88 },
  { id: 'prod-7', sku: 'VC-COQ10', name: 'CoQ10+', shortName: 'CoQ10+', category: 'supplement', price: 38.88 },
  { id: 'prod-8', sku: 'VC-VIT-D3K2', name: 'Vitamin D3+K2', shortName: 'D3K2', category: 'supplement', price: 32.88 },
  { id: 'prod-9', sku: 'VC-OMEGA', name: 'Omega-3 Ultra', shortName: 'Omega3', category: 'supplement', price: 36.88 },
  { id: 'prod-10', sku: 'VC-MAGNESIUM', name: 'Magnesium Glycinate', shortName: 'MagGly', category: 'supplement', price: 28.88 },
];

const SEED_GENETIC_RECS: CatalogProduct[] = [
  { id: 'prod-1', sku: 'VC-MTHFR', name: 'MTHFR+ (C677T detected)', shortName: 'MTHFR+', category: 'supplement', price: 44.88 },
  { id: 'prod-6', sku: 'VC-NAD', name: 'NAD+ (CYP2D6 poor metabolizer)', shortName: 'NAD+', category: 'supplement', price: 58.88 },
  { id: 'prod-2', sku: 'VC-COMT', name: 'COMT+ (Val/Met intermediate)', shortName: 'COMT+', category: 'supplement', price: 42.88 },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function ProtocolBuilderScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: {
    patientId: string;
    items: SelectedProduct[];
    notes: string;
  }) => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);

    Alert.alert(
      'Protocol Submitted',
      `Protocol with ${data.items.length} products created for patient ${
        SEED_PATIENTS.find((p) => p.id === data.patientId)?.name ?? 'Unknown'
      }.`,
      [{ text: 'OK', onPress: () => router.back() }],
    );
  };

  return (
    <View className="flex-1 bg-dark-bg">
      <ProtocolBuilder
        mode="practitioner"
        userId="practitioner-1"
        patients={SEED_PATIENTS}
        catalog={SEED_CATALOG}
        geneticRecommendations={SEED_GENETIC_RECS}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </View>
  );
}
