import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Image } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import Animated, { FadeIn } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase/client';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ParsedLabResult {
  marker: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'low' | 'high';
}

export interface LabResultUploaderProps {
  userId: string;
  onUploadComplete?: (results: ParsedLabResult[]) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function LabResultUploader({ userId, onUploadComplete }: LabResultUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedResults, setParsedResults] = useState<ParsedLabResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const pickAndUpload = async () => {
    try {
      setError(null);

      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      setFileName(file.name);
      setIsUploading(true);
      setProgress(0);

      // Simulate progress (Supabase upload doesn't provide progress natively)
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 10, 90));
      }, 200);

      const filePath = `lab-results/${userId}/${Date.now()}-${file.name}`;
      const response = await fetch(file.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('lab-results')
        .upload(filePath, blob, {
          contentType: file.mimeType ?? 'application/octet-stream',
        });

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      setProgress(100);
      setIsUploading(false);

      // Trigger parsing Edge Function
      setIsParsing(true);
      const { data, error: fnError } = await supabase.functions.invoke('parse-lab-results', {
        body: { filePath, userId },
      });

      if (fnError) throw fnError;

      const parsed: ParsedLabResult[] = (data?.results ?? []).map(
        (r: Record<string, unknown>) => ({
          marker: String(r.marker ?? ''),
          value: String(r.value ?? ''),
          unit: String(r.unit ?? ''),
          referenceRange: String(r.referenceRange ?? ''),
          status: (['normal', 'low', 'high'].includes(String(r.status))
            ? String(r.status)
            : 'normal') as ParsedLabResult['status'],
        }),
      );

      setParsedResults(parsed);
      onUploadComplete?.(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setIsParsing(false);
    }
  };

  const statusColor: Record<string, string> = {
    normal: 'text-green-400',
    low: 'text-yellow-400',
    high: 'text-red-400',
  };

  return (
    <View className="bg-dark-card rounded-2xl p-5 border border-dark-border">
      <Text className="text-white text-lg font-bold mb-1">Lab Results</Text>
      <Text className="text-dark-border text-sm mb-4">Upload PDF or image for AI parsing</Text>

      {/* Upload Area */}
      {!fileName && (
        <Pressable
          className="border-2 border-dashed border-dark-border rounded-2xl py-10 items-center active:opacity-80"
          onPress={pickAndUpload}
          accessibilityLabel="Upload lab results file"
          accessibilityRole="button"
        >
          <Text className="text-3xl mb-2">📄</Text>
          <Text className="text-copper font-semibold">Tap to Upload</Text>
          <Text className="text-dark-border text-xs mt-1">PDF, JPEG, or PNG</Text>
        </Pressable>
      )}

      {/* Progress */}
      {(isUploading || fileName) && (
        <Animated.View entering={FadeIn} className="mb-4">
          <View className="flex-row items-center mb-2">
            <Text className="text-white text-sm flex-1" numberOfLines={1}>
              {fileName}
            </Text>
            {isUploading && (
              <Text className="text-copper text-sm font-mono">{progress}%</Text>
            )}
          </View>

          <View className="h-2 bg-dark-border/30 rounded-full overflow-hidden">
            <View
              className="h-full bg-copper rounded-full"
              style={{ width: `${progress}%` }}
            />
          </View>
        </Animated.View>
      )}

      {/* Parsing */}
      {isParsing && (
        <View className="items-center py-6">
          <ActivityIndicator color="#B75F19" size="large" />
          <Text className="text-dark-border text-sm mt-3">Parsing lab results with AI...</Text>
        </View>
      )}

      {/* Parsed Results Preview */}
      {parsedResults.length > 0 && (
        <Animated.View entering={FadeIn} className="mt-2">
          <Text className="text-copper text-sm font-semibold mb-2">
            Parsed Results ({parsedResults.length} markers)
          </Text>
          {parsedResults.map((r, i) => (
            <View key={i} className="flex-row items-center py-2 border-b border-dark-border/30">
              <View className="flex-1">
                <Text className="text-white text-sm">{r.marker}</Text>
                <Text className="text-dark-border text-xs">Ref: {r.referenceRange}</Text>
              </View>
              <Text className="text-white text-sm font-mono mr-1">
                {r.value} {r.unit}
              </Text>
              <Text className={`text-xs font-semibold ${statusColor[r.status]}`}>
                {r.status.toUpperCase()}
              </Text>
            </View>
          ))}
        </Animated.View>
      )}

      {/* Error */}
      {error && (
        <View className="bg-red-500/10 rounded-xl p-3 mt-2">
          <Text className="text-red-400 text-sm">{error}</Text>
        </View>
      )}

      {/* Re-upload */}
      {fileName && !isUploading && !isParsing && (
        <Pressable
          className="mt-3 py-2 items-center"
          onPress={() => {
            setFileName(null);
            setParsedResults([]);
            setProgress(0);
            pickAndUpload();
          }}
          accessibilityLabel="Upload different file"
        >
          <Text className="text-copper text-sm font-semibold">Upload Different File</Text>
        </Pressable>
      )}
    </View>
  );
}
