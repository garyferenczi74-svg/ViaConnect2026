import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Animated, { FadeIn } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase/client';

// ── Types ────────────────────────────────────────────────────────────────────

export interface BarcodeScannerProps {
  userId: string;
  onKitRegistered: (kitBarcode: string) => void;
  onClose?: () => void;
}

type ScanStatus = 'scanning' | 'validating' | 'registering' | 'success' | 'error';

// ── Helpers ──────────────────────────────────────────────────────────────────

const GENEX_BARCODE_REGEX = /^GNX-\d{6,12}$/;

// ── Component ────────────────────────────────────────────────────────────────

export function BarcodeScanner({ userId, onKitRegistered, onClose }: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [status, setStatus] = useState<ScanStatus>('scanning');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (status !== 'scanning') return;

    setScannedCode(data);
    setStatus('validating');

    // Validate format
    if (!GENEX_BARCODE_REGEX.test(data)) {
      setStatus('error');
      setErrorMessage('Invalid barcode format. Expected GENEX360 kit barcode (GNX-XXXXXX).');
      return;
    }

    // Register kit
    setStatus('registering');
    try {
      const { error } = await supabase.from('kit_registrations').insert({
        user_id: userId,
        kit_barcode: data,
        panel_type: 'GENEX-M', // Default, updated by lab
        status: 'registered',
      });

      if (error) {
        if (error.code === '23505') {
          setStatus('error');
          setErrorMessage('This kit has already been registered.');
          return;
        }
        throw error;
      }

      setStatus('success');
      onKitRegistered(data);
    } catch (e) {
      setStatus('error');
      setErrorMessage(e instanceof Error ? e.message : 'Registration failed');
    }
  };

  const resetScanner = () => {
    setScannedCode(null);
    setStatus('scanning');
    setErrorMessage(null);
  };

  // Permission not yet determined
  if (!permission) {
    return (
      <View className="flex-1 bg-dark-bg items-center justify-center">
        <ActivityIndicator color="#B75F19" size="large" />
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View className="flex-1 bg-dark-bg items-center justify-center px-8">
        <Text className="text-3xl mb-4">📷</Text>
        <Text className="text-white text-lg font-bold text-center mb-2">Camera Access Required</Text>
        <Text className="text-dark-border text-sm text-center mb-6">
          We need camera access to scan your GENEX360 test kit barcode.
        </Text>
        <Pressable
          className="bg-copper rounded-xl px-8 py-3.5 active:opacity-80"
          onPress={requestPermission}
          accessibilityLabel="Grant camera permission"
          accessibilityRole="button"
        >
          <Text className="text-white font-semibold">Enable Camera</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-dark-bg">
      {/* Camera View */}
      {status === 'scanning' && (
        <View className="flex-1">
          <CameraView
            className="flex-1"
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['code128', 'qr', 'ean13'] }}
            onBarcodeScanned={handleBarcodeScanned}
          >
            {/* Overlay */}
            <View className="flex-1 items-center justify-center">
              <View className="w-64 h-64 border-2 border-copper rounded-3xl" />
              <Text className="text-white text-sm mt-4 bg-dark-bg/70 rounded-lg px-3 py-1">
                Align barcode within the frame
              </Text>
            </View>
          </CameraView>
        </View>
      )}

      {/* Validating / Registering */}
      {(status === 'validating' || status === 'registering') && (
        <View className="flex-1 items-center justify-center px-8">
          <ActivityIndicator color="#B75F19" size="large" />
          <Text className="text-white text-lg font-semibold mt-4">
            {status === 'validating' ? 'Validating barcode...' : 'Registering kit...'}
          </Text>
          {scannedCode && (
            <Text className="text-copper font-mono text-sm mt-2">{scannedCode}</Text>
          )}
        </View>
      )}

      {/* Success */}
      {status === 'success' && (
        <Animated.View entering={FadeIn} className="flex-1 items-center justify-center px-8">
          <Text className="text-5xl mb-4">✅</Text>
          <Text className="text-white text-xl font-bold mb-2">Kit Registered!</Text>
          <Text className="text-copper font-mono text-sm mb-6">{scannedCode}</Text>
          <Text className="text-dark-border text-sm text-center mb-8">
            Your GENEX360 kit has been registered. We'll notify you when lab processing begins.
          </Text>
          <Pressable
            className="bg-teal rounded-xl px-8 py-3.5 active:opacity-80"
            onPress={onClose}
            accessibilityLabel="Done"
          >
            <Text className="text-white font-semibold">Done</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Error */}
      {status === 'error' && (
        <Animated.View entering={FadeIn} className="flex-1 items-center justify-center px-8">
          <Text className="text-5xl mb-4">⚠️</Text>
          <Text className="text-white text-xl font-bold mb-2">Scan Error</Text>
          <Text className="text-red-400 text-sm text-center mb-2">{errorMessage}</Text>
          {scannedCode && (
            <Text className="text-dark-border font-mono text-xs mb-6">{scannedCode}</Text>
          )}
          <Pressable
            className="bg-copper rounded-xl px-8 py-3.5 active:opacity-80"
            onPress={resetScanner}
            accessibilityLabel="Try again"
          >
            <Text className="text-white font-semibold">Scan Again</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Close Button */}
      {onClose && status === 'scanning' && (
        <Pressable
          className="absolute top-12 right-4 bg-dark-bg/70 rounded-full w-10 h-10 items-center justify-center"
          onPress={onClose}
          accessibilityLabel="Close scanner"
        >
          <Text className="text-white text-lg">✕</Text>
        </Pressable>
      )}
    </View>
  );
}
