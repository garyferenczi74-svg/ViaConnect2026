import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import Animated, { FadeIn } from 'react-native-reanimated';

// ── Types ────────────────────────────────────────────────────────────────────

export interface BiometricAuthProps {
  onAuthenticated: (sessionToken: string) => void;
  onFallbackLogin?: () => void;
}

type AuthState = 'checking' | 'biometric' | 'pin' | 'authenticated' | 'error';

const SESSION_KEY = 'viaconnect_session_token';
const PIN_KEY = 'viaconnect_pin';

// ── Component ────────────────────────────────────────────────────────────────

export function BiometricAuth({ onAuthenticated, onFallbackLogin }: BiometricAuthProps) {
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [biometricType, setBiometricType] = useState<string>('Biometrics');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasStoredSession, setHasStoredSession] = useState(false);

  useEffect(() => {
    checkCapabilities();
  }, []);

  const checkCapabilities = async () => {
    try {
      // Check for stored session
      const storedToken = await SecureStore.getItemAsync(SESSION_KEY);
      setHasStoredSession(!!storedToken);

      // Check biometric availability
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('Face ID');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('Touch ID');
      }

      if (hasHardware && isEnrolled && storedToken) {
        setAuthState('biometric');
        attemptBiometric();
      } else if (storedToken) {
        setAuthState('pin');
      } else {
        // No stored session — fallback to login
        setAuthState('error');
        setError('No saved session. Please log in.');
      }
    } catch {
      setAuthState('pin');
    }
  };

  const attemptBiometric = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to ViaConnect',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: true,
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        const token = await SecureStore.getItemAsync(SESSION_KEY);
        if (token) {
          setAuthState('authenticated');
          onAuthenticated(token);
        } else {
          setAuthState('pin');
        }
      } else {
        setAuthState('pin');
      }
    } catch {
      setAuthState('pin');
    }
  }, [onAuthenticated]);

  const handlePinSubmit = useCallback(async () => {
    if (pin.length < 4) return;

    try {
      const storedPin = await SecureStore.getItemAsync(PIN_KEY);
      if (storedPin === pin) {
        const token = await SecureStore.getItemAsync(SESSION_KEY);
        if (token) {
          setAuthState('authenticated');
          onAuthenticated(token);
          return;
        }
      }
      setError('Invalid PIN');
      setPin('');
    } catch {
      setError('Authentication failed');
    }
  }, [pin, onAuthenticated]);

  // Save session token (call from auth flow)
  const saveSession = async (token: string, pinCode?: string) => {
    await SecureStore.setItemAsync(SESSION_KEY, token);
    if (pinCode) {
      await SecureStore.setItemAsync(PIN_KEY, pinCode);
    }
  };

  return (
    <View className="flex-1 bg-dark-bg items-center justify-center px-8">
      {/* Checking */}
      {authState === 'checking' && (
        <View className="items-center">
          <ActivityIndicator color="#B75F19" size="large" />
          <Text className="text-dark-border text-sm mt-4">Checking authentication...</Text>
        </View>
      )}

      {/* Biometric */}
      {authState === 'biometric' && (
        <Animated.View entering={FadeIn} className="items-center">
          <Text className="text-5xl mb-6">{biometricType === 'Face ID' ? '👤' : '👆'}</Text>
          <Text className="text-white text-xl font-bold mb-2">{biometricType}</Text>
          <Text className="text-dark-border text-sm text-center mb-8">
            Authenticate with {biometricType} to securely access ViaConnect
          </Text>
          <Pressable
            className="bg-copper rounded-xl px-8 py-3.5 active:opacity-80 mb-4"
            onPress={attemptBiometric}
            accessibilityLabel={`Authenticate with ${biometricType}`}
            accessibilityRole="button"
          >
            <Text className="text-white font-semibold">Use {biometricType}</Text>
          </Pressable>
          <Pressable
            className="py-2"
            onPress={() => setAuthState('pin')}
            accessibilityLabel="Use PIN instead"
          >
            <Text className="text-copper text-sm">Use PIN instead</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* PIN */}
      {authState === 'pin' && (
        <Animated.View entering={FadeIn} className="items-center w-full">
          <Text className="text-3xl mb-4">🔒</Text>
          <Text className="text-white text-xl font-bold mb-2">Enter PIN</Text>
          <Text className="text-dark-border text-sm mb-6">
            Enter your 4-6 digit PIN to continue
          </Text>

          <TextInput
            className="bg-dark-card border border-dark-border rounded-xl px-6 py-4 text-white text-center text-2xl font-mono tracking-[12px] w-48 mb-4"
            value={pin}
            onChangeText={(v) => {
              setPin(v.replace(/[^0-9]/g, '').slice(0, 6));
              setError(null);
            }}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            autoFocus
            accessibilityLabel="PIN input"
          />

          {error && <Text className="text-red-400 text-sm mb-4">{error}</Text>}

          <Pressable
            className={`rounded-xl px-12 py-3.5 active:opacity-80 ${
              pin.length >= 4 ? 'bg-copper' : 'bg-dark-border'
            }`}
            onPress={handlePinSubmit}
            disabled={pin.length < 4}
            accessibilityLabel="Submit PIN"
          >
            <Text className="text-white font-semibold">Unlock</Text>
          </Pressable>

          {onFallbackLogin && (
            <Pressable className="mt-6 py-2" onPress={onFallbackLogin}>
              <Text className="text-copper text-sm">Log in with email</Text>
            </Pressable>
          )}
        </Animated.View>
      )}

      {/* Authenticated */}
      {authState === 'authenticated' && (
        <Animated.View entering={FadeIn} className="items-center">
          <Text className="text-5xl mb-4">✅</Text>
          <Text className="text-white text-xl font-bold">Authenticated</Text>
        </Animated.View>
      )}

      {/* Error - no session */}
      {authState === 'error' && (
        <Animated.View entering={FadeIn} className="items-center">
          <Text className="text-3xl mb-4">🔑</Text>
          <Text className="text-white text-lg font-bold mb-2">Login Required</Text>
          <Text className="text-dark-border text-sm text-center mb-6">{error}</Text>
          {onFallbackLogin && (
            <Pressable
              className="bg-copper rounded-xl px-8 py-3.5 active:opacity-80"
              onPress={onFallbackLogin}
              accessibilityLabel="Log in with email"
            >
              <Text className="text-white font-semibold">Log In</Text>
            </Pressable>
          )}
        </Animated.View>
      )}
    </View>
  );
}
