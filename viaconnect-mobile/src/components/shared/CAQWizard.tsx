import React, { useState, useCallback } from 'react';
import {
  View, Text, Pressable, ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase/client';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CAQWizardProps {
  userId: string;
  onComplete: (vitalityScore: number) => void;
}

type PhaseId = 0 | 1 | 2 | 3 | 4;

interface QuestionDef {
  key: string;
  label: string;
  type: 'text' | 'select' | 'slider' | 'multiselect' | 'number';
  options?: string[];
  min?: number;
  max?: number;
  required?: boolean;
}

// ── Questions ────────────────────────────────────────────────────────────────

const PHASES: { title: string; subtitle: string; questions: QuestionDef[] }[] = [
  {
    title: 'Demographics & Health History',
    subtitle: 'Phase 1 of 5 — 15 questions',
    questions: [
      { key: 'date_of_birth', label: 'Date of Birth', type: 'text', required: true },
      { key: 'biological_sex', label: 'Biological Sex', type: 'select', options: ['male', 'female', 'intersex', 'prefer_not_to_say'], required: true },
      { key: 'height_cm', label: 'Height (cm)', type: 'number', required: true },
      { key: 'weight_kg', label: 'Weight (kg)', type: 'number', required: true },
      { key: 'blood_type', label: 'Blood Type (if known)', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'] },
      { key: 'ethnicity', label: 'Ethnicity', type: 'text' },
      { key: 'family_history', label: 'Family Health History', type: 'multiselect', options: ['Heart Disease', 'Diabetes', 'Cancer', 'Alzheimer\'s', 'Autoimmune Disorders', 'Mental Health', 'Obesity', 'High Blood Pressure', 'None of the Above'] },
      { key: 'surgeries', label: 'Previous Surgeries', type: 'text' },
      { key: 'chronic_conditions', label: 'Chronic Conditions', type: 'multiselect', options: ['Diabetes', 'Hypertension', 'Thyroid', 'Autoimmune', 'Heart Disease', 'None'] },
      { key: 'allergies', label: 'Known Allergies', type: 'text' },
      { key: 'pregnant_nursing', label: 'Pregnant or Nursing?', type: 'select', options: ['No', 'Pregnant', 'Nursing', 'N/A'] },
      { key: 'smoker', label: 'Tobacco Use', type: 'select', options: ['Never', 'Former', 'Current'] },
      { key: 'alcohol', label: 'Alcohol Consumption', type: 'select', options: ['None', 'Occasional', 'Moderate', 'Heavy'] },
      { key: 'cannabis_use', label: 'Cannabis Use', type: 'select', options: ['None', 'Medical', 'Recreational', 'Both'] },
      { key: 'primary_physician', label: 'Primary Care Physician', type: 'text' },
    ],
  },
  {
    title: 'Symptom Assessment',
    subtitle: 'Phase 2 of 5 — Rate severity 0-10',
    questions: [
      { key: 'fatigue', label: 'Fatigue / Low Energy', type: 'slider', min: 0, max: 10 },
      { key: 'brain_fog', label: 'Brain Fog / Cognitive Issues', type: 'slider', min: 0, max: 10 },
      { key: 'sleep_quality', label: 'Poor Sleep Quality', type: 'slider', min: 0, max: 10 },
      { key: 'joint_pain', label: 'Joint / Muscle Pain', type: 'slider', min: 0, max: 10 },
      { key: 'digestive', label: 'Digestive Issues', type: 'slider', min: 0, max: 10 },
      { key: 'anxiety', label: 'Anxiety', type: 'slider', min: 0, max: 10 },
      { key: 'depression', label: 'Depression / Low Mood', type: 'slider', min: 0, max: 10 },
      { key: 'headaches', label: 'Headaches / Migraines', type: 'slider', min: 0, max: 10 },
      { key: 'skin_issues', label: 'Skin Issues', type: 'slider', min: 0, max: 10 },
      { key: 'weight_issues', label: 'Weight Management', type: 'slider', min: 0, max: 10 },
      { key: 'hormonal', label: 'Hormonal Imbalance', type: 'slider', min: 0, max: 10 },
      { key: 'immune', label: 'Frequent Illness', type: 'slider', min: 0, max: 10 },
      { key: 'inflammation', label: 'Chronic Inflammation', type: 'slider', min: 0, max: 10 },
      { key: 'libido', label: 'Low Libido', type: 'slider', min: 0, max: 10 },
      { key: 'hair_loss', label: 'Hair Loss / Thinning', type: 'slider', min: 0, max: 10 },
      { key: 'mood_swings', label: 'Mood Swings', type: 'slider', min: 0, max: 10 },
      { key: 'blood_sugar', label: 'Blood Sugar Issues', type: 'slider', min: 0, max: 10 },
      { key: 'cardiovascular', label: 'Heart / Circulation', type: 'slider', min: 0, max: 10 },
      { key: 'respiratory', label: 'Breathing / Respiratory', type: 'slider', min: 0, max: 10 },
      { key: 'vision', label: 'Vision Changes', type: 'slider', min: 0, max: 10 },
    ],
  },
  {
    title: 'Lifestyle Factors',
    subtitle: 'Phase 3 of 5',
    questions: [
      { key: 'diet_type', label: 'Diet Type', type: 'select', options: ['omnivore', 'vegetarian', 'vegan', 'keto', 'paleo', 'mediterranean', 'other'], required: true },
      { key: 'meals_per_day', label: 'Meals Per Day', type: 'select', options: ['1-2', '3', '4-5', '6+'] },
      { key: 'water_intake', label: 'Daily Water (glasses)', type: 'number' },
      { key: 'exercise_frequency', label: 'Exercise Frequency', type: 'select', options: ['none', '1-2_weekly', '3-4_weekly', '5+_weekly'], required: true },
      { key: 'exercise_type', label: 'Exercise Types', type: 'multiselect', options: ['Cardio', 'Strength', 'Yoga', 'Walking', 'Sports', 'None'] },
      { key: 'sleep_hours', label: 'Average Sleep (hours)', type: 'number', required: true },
      { key: 'sleep_schedule', label: 'Sleep Schedule', type: 'select', options: ['Consistent', 'Variable', 'Shift Worker'] },
      { key: 'stress_level', label: 'Stress Level', type: 'select', options: ['low', 'moderate', 'high', 'very_high'], required: true },
      { key: 'stress_management', label: 'Stress Management', type: 'multiselect', options: ['Meditation', 'Exercise', 'Therapy', 'Hobbies', 'None'] },
      { key: 'screen_time', label: 'Daily Screen Time (hours)', type: 'number' },
    ],
  },
  {
    title: 'Current Medications & Supplements',
    subtitle: 'Phase 4 of 5',
    questions: [
      { key: 'rx_medications', label: 'Prescription Medications', type: 'text' },
      { key: 'otc_medications', label: 'OTC Medications', type: 'text' },
      { key: 'current_supplements', label: 'Current Supplements', type: 'text' },
      { key: 'previous_supplements', label: 'Previous Supplements Tried', type: 'text' },
      { key: 'herbal_experience', label: 'Previous Herbal Experience?', type: 'select', options: ['Yes', 'No'] },
      { key: 'adverse_reactions', label: 'Known Adverse Reactions', type: 'text' },
    ],
  },
  {
    title: 'Goals & Preferences',
    subtitle: 'Phase 5 of 5',
    questions: [
      { key: 'primary_goals', label: 'Primary Health Goals', type: 'multiselect', options: ['Energy', 'Sleep', 'Focus', 'Weight Loss', 'Muscle', 'Longevity', 'Hormones', 'Gut Health', 'Immunity', 'Stress Relief'], required: true },
      { key: 'supplement_form', label: 'Preferred Supplement Form', type: 'multiselect', options: ['Capsule', 'Powder', 'Liquid', 'Gummy', 'No Preference'] },
      { key: 'budget', label: 'Monthly Budget', type: 'select', options: ['Under $50', '$50-100', '$100-200', '$200-500', '$500+'] },
      { key: 'timeline', label: 'Expected Timeline', type: 'select', options: ['1-3 months', '3-6 months', '6-12 months', 'Ongoing'] },
      { key: 'additional_notes', label: 'Anything else we should know?', type: 'text' },
    ],
  },
];

// ── Slider Component ─────────────────────────────────────────────────────────

function SimpleSlider({
  value,
  onChange,
  min = 0,
  max = 10,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <View className="flex-row items-center gap-1 mt-1">
      {Array.from({ length: max - min + 1 }).map((_, i) => {
        const v = min + i;
        const isActive = v <= value;
        return (
          <Pressable
            key={v}
            className={`flex-1 h-8 rounded items-center justify-center ${
              isActive ? (v <= 3 ? 'bg-green-500/30' : v <= 6 ? 'bg-yellow-500/30' : 'bg-red-500/30') : 'bg-dark-border/30'
            }`}
            onPress={() => onChange(v)}
            accessibilityLabel={`Severity ${v}`}
          >
            <Text className={`text-xs ${isActive ? 'text-white' : 'text-dark-border'}`}>{v}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export function CAQWizard({ userId, onComplete }: CAQWizardProps) {
  const [phase, setPhase] = useState<PhaseId>(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState(false);

  const currentPhase = PHASES[phase];

  const setAnswer = useCallback((key: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleMultiselect = useCallback((key: string, option: string) => {
    setAnswers((prev) => {
      const current = (prev[key] as string[]) ?? [];
      if (option === 'None of the Above') {
        // Toggle "None" — clears all others when selected
        const next = current.includes(option) ? [] : [option];
        return { ...prev, [key]: next };
      }
      // Selecting a condition removes "None of the Above"
      const filtered = current.filter((o) => o !== 'None of the Above');
      const next = filtered.includes(option)
        ? filtered.filter((o) => o !== option)
        : [...filtered, option];
      return { ...prev, [key]: next };
    });
  }, []);

  const calculateVitalityScore = (): number => {
    // Symptom phase average (lower is better) — inverted to 0-100
    const symptomKeys = PHASES[1].questions.map((q) => q.key);
    const symptomValues = symptomKeys.map((k) => Number(answers[k] ?? 0));
    const avgSymptom = symptomValues.reduce((a, b) => a + b, 0) / symptomValues.length;
    const symptomScore = Math.max(0, 100 - avgSymptom * 10); // 30% weight

    // Lifestyle score
    const exerciseScores: Record<string, number> = { 'none': 0, '1-2_weekly': 40, '3-4_weekly': 70, '5+_weekly': 100 };
    const stressScores: Record<string, number> = { 'low': 100, 'moderate': 70, 'high': 40, 'very_high': 10 };
    const sleepHours = Number(answers['sleep_hours'] ?? 7);
    const sleepScore = Math.min(100, Math.max(0, (sleepHours / 8) * 100));
    const exerciseScore = exerciseScores[String(answers['exercise_frequency'] ?? 'none')] ?? 50;
    const stressScore = stressScores[String(answers['stress_level'] ?? 'moderate')] ?? 50;
    const lifestyleScore = (sleepScore + exerciseScore + stressScore) / 3; // 20% weight

    // Goals engagement (having goals = better)
    const goalCount = ((answers['primary_goals'] as string[]) ?? []).length;
    const goalScore = Math.min(100, goalCount * 20); // 20% weight

    const totalScore = Math.round(
      symptomScore * 0.3 + symptomScore * 0.3 + lifestyleScore * 0.2 + goalScore * 0.2,
    );
    return Math.min(100, Math.max(0, totalScore));
  };

  const handleNext = async () => {
    if (phase < 4) {
      // Save phase progress
      setIsSaving(true);
      try {
        await supabase.from('clinical_assessments').upsert(
          {
            user_id: userId,
            ...Object.fromEntries(
              currentPhase.questions
                .filter((q) => answers[q.key] !== undefined)
                .map((q) => [q.key, answers[q.key]]),
            ),
          },
          { onConflict: 'user_id' },
        );
      } catch { /* save best-effort */ }
      setIsSaving(false);
      setPhase((phase + 1) as PhaseId);
    } else {
      // Complete
      setIsSaving(true);
      const score = calculateVitalityScore();
      try {
        await supabase.from('clinical_assessments').upsert(
          { user_id: userId, completed: true, completed_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        );
        await supabase.from('health_scores').insert({ user_id: userId, score });
      } catch { /* best-effort */ }
      setIsSaving(false);
      onComplete(score);
    }
  };

  const progress = ((phase + 1) / 5) * 100;

  return (
    <View className="flex-1 bg-dark-bg">
      {/* Progress Bar */}
      <View className="h-1.5 bg-dark-border mx-4 mt-2 rounded-full overflow-hidden">
        <View
          className="h-full bg-copper rounded-full"
          style={{ width: `${progress}%` }}
          accessibilityLabel={`Phase ${phase + 1} of 5`}
          accessibilityRole="progressbar"
        />
      </View>

      {/* Header */}
      <View className="px-4 pt-3 pb-2">
        <Text className="text-white text-xl font-bold">{currentPhase.title}</Text>
        <Text className="text-dark-border text-sm">{currentPhase.subtitle}</Text>
      </View>

      {/* Questions */}
      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-24">
        <Animated.View entering={FadeIn.duration(200)} className="gap-4 pt-2">
          {currentPhase.questions.map((q) => (
            <View key={q.key}>
              <Text className="text-white text-sm font-medium mb-1">
                {q.label}
                {q.required && <Text className="text-red-400"> *</Text>}
              </Text>

              {q.type === 'text' && (
                <TextInput
                  className="bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-white"
                  value={String(answers[q.key] ?? '')}
                  onChangeText={(v) => setAnswer(q.key, v)}
                  placeholderTextColor="#374151"
                  accessibilityLabel={q.label}
                />
              )}

              {q.type === 'number' && (
                <TextInput
                  className="bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-white"
                  value={String(answers[q.key] ?? '')}
                  onChangeText={(v) => setAnswer(q.key, v.replace(/[^0-9.]/g, ''))}
                  keyboardType="numeric"
                  placeholderTextColor="#374151"
                  accessibilityLabel={q.label}
                />
              )}

              {q.type === 'select' && (
                <View className="flex-row flex-wrap gap-2">
                  {q.options?.map((opt) => {
                    const isSelected = answers[q.key] === opt;
                    return (
                      <Pressable
                        key={opt}
                        className={`rounded-lg px-3 py-2 ${isSelected ? 'bg-teal' : 'bg-dark-card border border-dark-border'}`}
                        onPress={() => setAnswer(q.key, opt)}
                        accessibilityLabel={opt}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                      >
                        <Text className={`text-sm ${isSelected ? 'text-white font-semibold' : 'text-gray-300'}`}>
                          {opt}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {q.type === 'multiselect' && (
                <View className="flex-row flex-wrap gap-2">
                  {q.options?.map((opt) => {
                    const selected = ((answers[q.key] as string[]) ?? []).includes(opt);
                    return (
                      <Pressable
                        key={opt}
                        className={`rounded-lg px-3 py-2 ${selected ? 'bg-copper' : 'bg-dark-card border border-dark-border'}`}
                        onPress={() => toggleMultiselect(q.key, opt)}
                        accessibilityLabel={opt}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                      >
                        <Text className={`text-sm ${selected ? 'text-white font-semibold' : 'text-gray-300'}`}>
                          {opt}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {q.type === 'slider' && (
                <SimpleSlider
                  value={Number(answers[q.key] ?? 0)}
                  onChange={(v) => setAnswer(q.key, v)}
                  min={q.min ?? 0}
                  max={q.max ?? 10}
                />
              )}
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      {/* Navigation */}
      <View className="absolute bottom-0 left-0 right-0 bg-dark-bg border-t border-dark-border px-4 py-4 flex-row gap-3">
        {phase > 0 && (
          <Pressable
            className="flex-1 bg-dark-card rounded-xl py-3.5 items-center active:opacity-80"
            onPress={() => setPhase((phase - 1) as PhaseId)}
            accessibilityLabel="Previous phase"
          >
            <Text className="text-white font-semibold">Back</Text>
          </Pressable>
        )}
        <Pressable
          className="flex-1 bg-copper rounded-xl py-3.5 items-center active:opacity-80"
          onPress={handleNext}
          disabled={isSaving}
          accessibilityLabel={phase === 4 ? 'Complete assessment' : 'Next phase'}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text className="text-white font-semibold">{phase === 4 ? 'Complete' : 'Next'}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
