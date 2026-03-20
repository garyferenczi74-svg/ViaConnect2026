/**
 * ViaConnect GeneX360 — Loading, Error, and Empty States
 *
 * Consistent feedback components used across all screens.
 */
import React, { useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeIn,
} from 'react-native-reanimated';

// ── Skeleton Shimmer ──────────────────────────────────────────────────────

interface SkeletonProps {
  /** Width class e.g. 'w-full', 'w-32' */
  width?: string;
  /** Height class e.g. 'h-4', 'h-12' */
  height?: string;
  /** Border radius class e.g. 'rounded-xl', 'rounded-full' */
  rounded?: string;
  className?: string;
}

export function Skeleton({
  width = 'w-full',
  height = 'h-4',
  rounded = 'rounded-xl',
  className = '',
}: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      className={`bg-dark-border ${width} ${height} ${rounded} ${className}`}
      style={animatedStyle}
    />
  );
}

// ── Card Skeleton (matches dashboard card layout) ─────────────────────────

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <View className={`bg-dark-card rounded-2xl p-4 border border-dark-border ${className}`}>
      <Skeleton width="w-20" height="h-3" className="mb-2" />
      <Skeleton width="w-16" height="h-8" className="mb-3" />
      <Skeleton width="w-full" height="h-3" />
    </View>
  );
}

// ── Screen Skeleton (full-screen loading placeholder) ─────────────────────

export function ScreenSkeleton() {
  return (
    <View className="flex-1 bg-dark-bg px-4 pt-12">
      {/* Header skeleton */}
      <Skeleton width="w-24" height="h-3" className="mb-2" />
      <Skeleton width="w-48" height="h-7" className="mb-1" />
      <Skeleton width="w-36" height="h-3" className="mb-6" />

      {/* Stats row */}
      <View className="flex-row gap-3 mb-6">
        <CardSkeleton className="flex-1" />
        <CardSkeleton className="flex-1" />
      </View>

      {/* Content cards */}
      <Skeleton width="w-32" height="h-5" className="mb-3" />
      {[0, 1, 2].map((i) => (
        <View key={i} className="bg-dark-card rounded-xl p-4 border border-dark-border mb-2">
          <View className="flex-row items-center">
            <Skeleton width="w-10" height="h-10" rounded="rounded-full" className="mr-3" />
            <View className="flex-1">
              <Skeleton width="w-32" height="h-4" className="mb-2" />
              <Skeleton width="w-24" height="h-3" />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Error State ───────────────────────────────────────────────────────────

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'We couldn\'t load this content. Please check your connection and try again.',
  onRetry,
  retryLabel = 'Try Again',
}: ErrorStateProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      className="flex-1 bg-dark-bg items-center justify-center px-8"
    >
      <View className="w-16 h-16 rounded-full bg-red-500/10 items-center justify-center mb-4">
        <Text className="text-3xl">⚠️</Text>
      </View>
      <Text className="text-white text-lg font-bold text-center mb-2">{title}</Text>
      <Text className="text-dark-border text-sm text-center mb-6">{message}</Text>
      {onRetry && (
        <Pressable
          className="bg-copper rounded-xl px-8 py-3 active:opacity-80"
          onPress={onRetry}
        >
          <Text className="text-white font-semibold">{retryLabel}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

// ── Network Error (full-screen) ───────────────────────────────────────────

interface NetworkErrorProps {
  onRetry?: () => void;
}

export function NetworkError({ onRetry }: NetworkErrorProps) {
  return (
    <ErrorState
      title="No Connection"
      message="Please check your internet connection and try again."
      onRetry={onRetry}
      retryLabel="Retry"
    />
  );
}

// ── Empty State ───────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = '📭',
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      className="items-center justify-center py-16 px-8"
    >
      <Text className="text-4xl mb-4">{icon}</Text>
      <Text className="text-white text-lg font-bold text-center mb-2">{title}</Text>
      {message && (
        <Text className="text-dark-border text-sm text-center mb-6">{message}</Text>
      )}
      {actionLabel && onAction && (
        <Pressable
          className="bg-teal rounded-xl px-6 py-3 active:opacity-80"
          onPress={onAction}
        >
          <Text className="text-white font-semibold">{actionLabel}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

// ── Inline Loading Spinner ────────────────────────────────────────────────

interface InlineLoaderProps {
  message?: string;
}

export function InlineLoader({ message = 'Loading...' }: InlineLoaderProps) {
  return (
    <View className="flex-row items-center justify-center py-8 gap-3">
      <ActivityIndicator color="#B75F19" size="small" />
      <Text className="text-dark-border text-sm">{message}</Text>
    </View>
  );
}
