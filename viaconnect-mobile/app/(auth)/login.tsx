import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { supabase } from '../../src/lib/supabase/client';
import { useAuthStore } from '../../src/lib/auth/store';
import { BiometricAuth } from '../../src/components/shared/BiometricAuth';
import { redirectToPortal } from '../../src/lib/auth/useAuthGuard';

export default function LoginScreen() {
  const router = useRouter();
  const { role, profile } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBiometric, setShowBiometric] = useState(false);

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      // Auth state change will be picked up by AuthProvider,
      // which sets the session/profile/role in the store.
      // The useAuthGuard in the root layout will handle redirect.
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [email, password]);

  const handleSocialAuth = useCallback(
    async (provider: 'google' | 'apple') => {
      setError(null);
      setIsLoading(true);
      try {
        const { error: authError } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: 'viaconnect://login',
          },
        });
        if (authError) setError(authError.message);
      } catch {
        setError('Social authentication failed.');
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const handleBiometricSuccess = useCallback(
    (_token: string) => {
      // Biometric authenticated using stored session — redirect
      redirectToPortal(router, role);
    },
    [router, role],
  );

  // Show biometric for returning users
  if (showBiometric) {
    return (
      <BiometricAuth
        onAuthenticated={handleBiometricSuccess}
        onFallbackLogin={() => setShowBiometric(false)}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-dark-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow justify-center px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / Header */}
        <Animated.View entering={FadeIn.duration(400)} className="items-center mb-10">
          <Text className="text-4xl font-bold text-white mb-1">ViaConnect</Text>
          <Text className="text-lg text-copper font-semibold">GeneX360</Text>
          <Text className="text-sm text-sage mt-2 text-center">
            One Genome. One Formulation. One Life at a Time.
          </Text>
        </Animated.View>

        {/* Form */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)} className="gap-4">
          {/* Email */}
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
              autoCorrect={false}
              accessibilityLabel="Email address"
            />
          </View>

          {/* Password */}
          <View>
            <Text className="text-gray-300 text-sm font-medium mb-1.5">Password</Text>
            <TextInput
              className="bg-dark-card border border-dark-border rounded-xl px-4 py-3.5 text-white text-base"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                setError(null);
              }}
              placeholder="Enter your password"
              placeholderTextColor="#4B5563"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              accessibilityLabel="Password"
            />
          </View>

          {/* Remember Me + Forgot */}
          <View className="flex-row items-center justify-between">
            <Pressable
              className="flex-row items-center gap-2"
              onPress={() => setRememberMe(!rememberMe)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: rememberMe }}
            >
              <View
                className={`w-5 h-5 rounded border ${
                  rememberMe ? 'bg-copper border-copper' : 'border-dark-border'
                } items-center justify-center`}
              >
                {rememberMe && <Text className="text-white text-xs">✓</Text>}
              </View>
              <Text className="text-gray-300 text-sm">Remember me</Text>
            </Pressable>

            <Link href="/(auth)/forgot-password" asChild>
              <Pressable>
                <Text className="text-copper text-sm font-medium">Forgot password?</Text>
              </Pressable>
            </Link>
          </View>

          {/* Error */}
          {error && (
            <Animated.View entering={FadeIn.duration(200)}>
              <Text className="text-red-400 text-sm text-center">{error}</Text>
            </Animated.View>
          )}

          {/* Login Button */}
          <Pressable
            className={`rounded-xl py-4 items-center active:opacity-80 ${
              isLoading ? 'bg-copper/60' : 'bg-copper'
            }`}
            onPress={handleLogin}
            disabled={isLoading}
            accessibilityLabel="Sign in"
            accessibilityRole="button"
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white text-base font-semibold">Sign In</Text>
            )}
          </Pressable>

          {/* Biometric shortcut */}
          <Pressable
            className="items-center py-2"
            onPress={() => setShowBiometric(true)}
            accessibilityLabel="Use biometric login"
          >
            <Text className="text-copper text-sm">Use Face ID / Touch ID</Text>
          </Pressable>
        </Animated.View>

        {/* Divider */}
        <View className="flex-row items-center my-6">
          <View className="flex-1 h-px bg-dark-border" />
          <Text className="text-dark-border text-xs mx-4">OR CONTINUE WITH</Text>
          <View className="flex-1 h-px bg-dark-border" />
        </View>

        {/* Social Auth */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)} className="gap-3">
          <Pressable
            className="flex-row items-center justify-center gap-3 bg-white rounded-xl py-3.5 active:opacity-80"
            onPress={() => handleSocialAuth('google')}
            disabled={isLoading}
            accessibilityLabel="Continue with Google"
          >
            <Text className="text-xl">G</Text>
            <Text className="text-gray-800 font-semibold">Continue with Google</Text>
          </Pressable>

          {Platform.OS === 'ios' && (
            <Pressable
              className="flex-row items-center justify-center gap-3 bg-black border border-dark-border rounded-xl py-3.5 active:opacity-80"
              onPress={() => handleSocialAuth('apple')}
              disabled={isLoading}
              accessibilityLabel="Continue with Apple"
            >
              <Text className="text-white text-xl">⌘</Text>
              <Text className="text-white font-semibold">Continue with Apple</Text>
            </Pressable>
          )}
        </Animated.View>

        {/* Sign up link */}
        <View className="flex-row justify-center mt-8">
          <Text className="text-gray-400 text-sm">Don't have an account? </Text>
          <Link href="/(auth)/signup" asChild>
            <Pressable>
              <Text className="text-copper text-sm font-semibold">Sign Up</Text>
            </Pressable>
          </Link>
        </View>

        <Text className="text-dark-border text-xs text-center mt-8">
          FarmCeutica Wellness LLC — Buffalo, NY
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
