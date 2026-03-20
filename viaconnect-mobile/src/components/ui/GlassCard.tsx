/**
 * ViaConnect GeneX360 — Glass-morphism Card
 *
 * Translucent card with blur backdrop, used across all portals.
 * Falls back to semi-transparent View on web where BlurView isn't available.
 */
import React from 'react';
import { View, Platform, type ViewStyle } from 'react-native';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  /** Blur intensity (1-100). Default 40. */
  intensity?: number;
  /** Additional inline styles */
  style?: ViewStyle;
}

export function GlassCard({
  children,
  className = '',
  intensity = 40,
  style,
}: GlassCardProps) {
  // On native, try to use expo-blur. On web, fall back to plain View.
  if (Platform.OS === 'web') {
    return (
      <View
        className={`bg-white/5 rounded-2xl border border-white/10 overflow-hidden ${className}`}
        style={style}
      >
        {children}
      </View>
    );
  }

  // Native: use BlurView
  try {
    const { BlurView } = require('expo-blur');
    return (
      <View
        className={`rounded-2xl border border-white/10 overflow-hidden ${className}`}
        style={style}
      >
        <BlurView
          intensity={intensity}
          tint="dark"
          style={{
            flex: 1,
            padding: 0,
          }}
        >
          {children}
        </BlurView>
      </View>
    );
  } catch {
    // Fallback if expo-blur isn't available
    return (
      <View
        className={`bg-white/5 rounded-2xl border border-white/10 overflow-hidden ${className}`}
        style={style}
      >
        {children}
      </View>
    );
  }
}
