import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { supabase } from '../../src/lib/supabase/client';

type ForgotStep = 'email' | 'sent';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<ForgotStep>('email');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = useCallback(async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: 'viaconnect://reset-password' },
      );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setStep('sent');
    } catch {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-dark-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-6">
        {step === 'email' && (
          <Animated.View entering={FadeIn.duration(400)} className="gap-5">
            <View className="items-center mb-4">
              <Text className="text-4xl mb-4">🔐</Text>
              <Text className="text-white text-2xl font-bold">Reset Password</Text>
              <Text className="text-gray-400 text-sm mt-2 text-center">
                Enter the email associated with your account and we'll send a
                password reset link.
              </Text>
            </View>

            <View>
              <Text className="text-gray-300 text-sm font-medium mb-1.5">Email</Text>
              <TextInput
                className="bg-dark-card border border-dark-border rounded-xl px-4 py-3.5 text-white text-base"
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setError(null);
                }}
                placeholder="you@example.com"
                placeholderTextColor="#4B5563"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoFocus
                accessibilityLabel="Email address"
              />
            </View>

            {error && (
              <Animated.View entering={FadeIn.duration(200)}>
                <Text className="text-red-400 text-sm text-center">{error}</Text>
              </Animated.View>
            )}

            <Pressable
              className={`rounded-xl py-4 items-center active:opacity-80 ${
                isLoading ? 'bg-copper/60' : 'bg-copper'
              }`}
              onPress={handleReset}
              disabled={isLoading}
              accessibilityLabel="Send reset link"
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-white text-base font-semibold">
                  Send Reset Link
                </Text>
              )}
            </Pressable>

            <Pressable
              className="items-center py-2"
              onPress={() => router.back()}
              accessibilityLabel="Back to login"
            >
              <Text className="text-copper text-sm">Back to Login</Text>
            </Pressable>
          </Animated.View>
        )}

        {step === 'sent' && (
          <Animated.View entering={FadeInDown.duration(400)} className="items-center gap-4">
            <Text className="text-5xl">📧</Text>
            <Text className="text-white text-2xl font-bold">Check Your Email</Text>
            <Text className="text-gray-400 text-sm text-center">
              We sent a password reset link to{'\n'}
              <Text className="text-copper font-semibold">{email}</Text>
            </Text>
            <Text className="text-gray-500 text-xs text-center mt-2">
              If you don't see it, check your spam folder.
            </Text>

            <Pressable
              className="bg-copper rounded-xl px-8 py-3.5 mt-4 active:opacity-80"
              onPress={() => router.replace('/(auth)/login')}
              accessibilityLabel="Return to login"
            >
              <Text className="text-white font-semibold">Return to Login</Text>
            </Pressable>

            <Pressable
              className="py-2 mt-2"
              onPress={() => {
                setStep('email');
                setError(null);
              }}
              accessibilityLabel="Resend email"
            >
              <Text className="text-copper text-sm">Resend Email</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
