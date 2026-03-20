/**
 * ViaConnect GeneX360 — Shared Animation Primitives
 *
 * Reusable animated wrappers built on react-native-reanimated.
 * Used across all portals for consistent motion design.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// ── Staggered FadeInUp for lists ──────────────────────────────────────────

interface StaggerItemProps {
  index: number;
  /** Delay between each item in ms */
  stagger?: number;
  /** Base duration in ms */
  duration?: number;
  children: React.ReactNode;
  className?: string;
}

export function StaggerItem({
  index,
  stagger = 80,
  duration = 400,
  children,
  className,
}: StaggerItemProps) {
  return (
    <Animated.View
      entering={FadeInUp.duration(duration).delay(index * stagger).springify().damping(18)}
      className={className}
    >
      {children}
    </Animated.View>
  );
}

// ── Screen entrance animation ─────────────────────────────────────────────

interface ScreenFadeProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function ScreenFade({ children, className, delay = 0 }: ScreenFadeProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(300).delay(delay)}
      className={className}
    >
      {children}
    </Animated.View>
  );
}

export function ScreenSlideIn({ children, className, delay = 0 }: ScreenFadeProps) {
  return (
    <Animated.View
      entering={FadeInRight.duration(300).delay(delay)}
      className={className}
    >
      {children}
    </Animated.View>
  );
}

// ── Animated progress bar ─────────────────────────────────────────────────

interface AnimatedProgressBarProps {
  /** 0-100 */
  progress: number;
  /** Bar color class e.g. 'bg-portal-green' */
  color?: string;
  /** Track color class */
  trackColor?: string;
  /** Height class e.g. 'h-2' */
  height?: string;
  /** Duration in ms */
  duration?: number;
}

export function AnimatedProgressBar({
  progress,
  color = 'bg-portal-green',
  trackColor = 'bg-dark-border/30',
  height = 'h-2',
  duration = 800,
}: AnimatedProgressBarProps) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(progress, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View className={`${trackColor} rounded-full overflow-hidden ${height}`}>
      <Animated.View
        className={`${height} rounded-full ${color}`}
        style={animatedStyle}
      />
    </View>
  );
}

// ── Spring counter (for token counts, scores) ─────────────────────────────

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function AnimatedCounter({
  value,
  className = 'text-white text-2xl font-bold',
  prefix = '',
  suffix = '',
}: AnimatedCounterProps) {
  return (
    <Animated.Text entering={FadeIn.duration(300)} className={className}>
      {prefix}{Math.round(value)}{suffix}
    </Animated.Text>
  );
}

// ── Card appearance with fade + slide ─────────────────────────────────────

interface AnimatedCardProps {
  index?: number;
  stagger?: number;
  children: React.ReactNode;
  className?: string;
}

export function AnimatedCard({
  index = 0,
  stagger = 80,
  children,
  className,
}: AnimatedCardProps) {
  return (
    <Animated.View
      entering={FadeInUp.duration(400).delay(index * stagger).springify().damping(18)}
      className={className}
    >
      {children}
    </Animated.View>
  );
}

// ── Section header with fade-in ───────────────────────────────────────────

interface AnimatedSectionProps {
  delay?: number;
  children: React.ReactNode;
  className?: string;
}

export function AnimatedSection({ delay = 0, children, className }: AnimatedSectionProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(delay)}
      className={className}
    >
      {children}
    </Animated.View>
  );
}
