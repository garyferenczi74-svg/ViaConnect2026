import React, { useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { CAQWizard } from '../../../src/components/shared/CAQWizard';
import { useAuthStore } from '../../../src/lib/auth/store';
import { supabase } from '../../../src/lib/supabase/client';

/**
 * Onboarding step screen for the CAQ (Clinical Assessment Questionnaire).
 *
 * The CAQ has 5 phases internally. This route wraps the CAQWizard component
 * and provides the animated progress indicator plus completion logic.
 *
 * Routes:
 *   /(auth)/onboarding/1  — Start the 5-phase assessment
 *   /(auth)/onboarding/complete — Results + redirect
 */

export default function OnboardingStepScreen() {
  const { step } = useLocalSearchParams<{ step: string }>();
  const router = useRouter();
  const { user, profile } = useAuthStore();

  const isComplete = step === 'complete';

  const handleCAQComplete = useCallback(
    async (vitalityScore: number) => {
      if (!user) return;

      // Mark onboarding as completed in profile
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      // Navigate to completion screen with score
      router.replace({
        pathname: '/(auth)/onboarding/complete',
        params: { score: String(vitalityScore) },
      });
    },
    [user, router],
  );

  // Loading state
  if (!user) {
    return (
      <View className="flex-1 bg-dark-bg items-center justify-center">
        <ActivityIndicator color="#B75F19" size="large" />
      </View>
    );
  }

  // Completion screen
  if (isComplete) {
    return <CompletionScreen />;
  }

  // CAQ Wizard
  return (
    <View className="flex-1 bg-dark-bg">
      {/* Animated header with EverMe.ai-inspired visual */}
      <Animated.View
        entering={FadeIn.duration(600)}
        className="px-4 pt-4 pb-2"
      >
        <View className="flex-row items-center gap-3 mb-2">
          <View className="w-10 h-10 rounded-full bg-copper/20 items-center justify-center">
            <Text className="text-copper text-lg font-bold">
              {profile?.full_name?.[0]?.toUpperCase() ?? 'V'}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-white text-base font-semibold">
              Welcome, {profile?.full_name?.split(' ')[0] ?? 'there'}
            </Text>
            <Text className="text-gray-400 text-xs">
              Let's personalize your wellness journey
            </Text>
          </View>
        </View>

        {/* Animated progress dots */}
        <View className="flex-row items-center justify-center gap-2 py-2">
          {[1, 2, 3, 4, 5].map((phase) => (
            <Animated.View
              key={phase}
              entering={FadeIn.duration(300).delay(phase * 100)}
              className="items-center"
            >
              <View
                className={`w-2.5 h-2.5 rounded-full ${
                  phase === 1 ? 'bg-copper' : 'bg-dark-border'
                }`}
              />
              <Text className="text-dark-border text-[9px] mt-1">
                {phase}
              </Text>
            </Animated.View>
          ))}
        </View>
      </Animated.View>

      {/* CAQ Wizard */}
      <CAQWizard userId={user.id} onComplete={handleCAQComplete} />
    </View>
  );
}

function CompletionScreen() {
  const router = useRouter();
  const { score } = useLocalSearchParams<{ score?: string }>();
  const vitalityScore = parseInt(score ?? '0', 10);

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-portal-green';
    if (s >= 60) return 'text-copper';
    if (s >= 40) return 'text-portal-yellow';
    return 'text-rose';
  };

  const getScoreLabel = (s: number) => {
    if (s >= 80) return 'Excellent';
    if (s >= 60) return 'Good';
    if (s >= 40) return 'Fair';
    return 'Needs Attention';
  };

  return (
    <View className="flex-1 bg-dark-bg items-center justify-center px-6">
      <Animated.View entering={FadeIn.duration(600)} className="items-center">
        {/* Score Circle */}
        <View className="w-36 h-36 rounded-full border-4 border-copper items-center justify-center mb-6">
          <Text className={`text-4xl font-bold ${getScoreColor(vitalityScore)}`}>
            {vitalityScore}
          </Text>
          <Text className="text-gray-400 text-xs">Vitality Score</Text>
        </View>

        <Text className={`text-xl font-bold ${getScoreColor(vitalityScore)} mb-2`}>
          {getScoreLabel(vitalityScore)}
        </Text>

        <Text className="text-gray-400 text-sm text-center mb-2">
          Your personalized assessment is complete.
        </Text>
        <Text className="text-gray-500 text-xs text-center mb-8">
          We're generating your initial supplement recommendations
          based on your responses.
        </Text>

        <Pressable
          className="bg-copper rounded-xl px-10 py-4 active:opacity-80"
          onPress={() => router.replace('/(consumer)')}
          accessibilityLabel="Go to dashboard"
        >
          <Text className="text-white text-base font-semibold">
            Go to Dashboard
          </Text>
        </Pressable>

        <Text className="text-dark-border text-xs mt-8">
          ViaConnect GeneX360
        </Text>
      </Animated.View>
    </View>
  );
}
