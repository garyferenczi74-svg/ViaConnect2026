import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';

type WebBarcodeUploadProps = {
  onBarcodeDetected?: (barcode: string) => void;
};

/**
 * Web replacement for expo-camera barcode scanner.
 * On web, webcam barcode scanning is unreliable on desktop,
 * so we use a file upload input instead.
 */
export default function WebBarcodeUpload({
  onBarcodeDetected,
}: WebBarcodeUploadProps) {
  if (Platform.OS !== 'web') return null;

  const handleFileSelect = () => {
    if (Platform.OS !== 'web') return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        // In production, decode barcode from image using a JS library
        // like @nicolo-ribaudo/quagga2 or zxing-wasm
        onBarcodeDetected?.(`GENEX-${Date.now()}`);
      }
    };
    input.click();
  };

  return (
    <View className="bg-dark-card rounded-2xl p-6 border border-dark-border items-center">
      <Text className="text-white text-lg font-semibold mb-2">
        Scan GENEX360 Kit
      </Text>
      <Text className="text-sage text-sm text-center mb-4">
        Upload a photo of your test kit barcode
      </Text>
      <Pressable
        onPress={handleFileSelect}
        className="bg-copper rounded-xl px-6 py-3 active:opacity-80"
      >
        <Text className="text-white font-medium">Upload Barcode Image</Text>
      </Pressable>
    </View>
  );
}
