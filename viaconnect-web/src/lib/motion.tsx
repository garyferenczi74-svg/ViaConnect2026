"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { HTMLMotionProps, Variants } from "framer-motion";
import { forwardRef } from "react";

// ─── Animation variants ──────────────────────────────────────────────────────

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
};

export const slideRight: Variants = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 60 },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

export const tableRowVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2, ease: "easeOut" },
  },
};

// ─── Page wrapper ────────────────────────────────────────────────────────────

export function PageTransition({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Stagger child wrapper ───────────────────────────────────────────────────

export function StaggerChild({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

// ─── Animated card with hover ────────────────────────────────────────────────

export const MotionCard = forwardRef<
  HTMLDivElement,
  HTMLMotionProps<"div"> & { hover?: boolean }
>(({ children, hover = true, className = "", ...props }, ref) => (
  <motion.div
    ref={ref}
    variants={staggerItem}
    whileHover={
      hover
        ? {
            scale: 1.01,
            boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
            borderColor: "rgba(255,255,255,0.12)",
          }
        : undefined
    }
    transition={{ duration: 0.2, ease: "easeOut" }}
    className={`rounded-xl glass ${className}`}
    {...props}
  >
    {children}
  </motion.div>
));
MotionCard.displayName = "MotionCard";

// ─── Spring counter (ViaTokens, scores) ──────────────────────────────────────

export function AnimatedCounter({
  value,
  className = "",
  prefix = "",
  suffix = "",
}: {
  value: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={className}
    >
      {prefix}
      {value.toLocaleString()}
      {suffix}
    </motion.span>
  );
}

// ─── Animated gauge (Vitality Score) ─────────────────────────────────────────

export function AnimatedGauge({
  score,
  max = 100,
  size = 160,
  strokeWidth = 10,
  color = "#22D3EE",
}: {
  score: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(score / max, 1);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Animated progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: 1.2, type: "spring", stiffness: 60, damping: 15 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-3xl font-bold text-white font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-xs text-gray-500">/ {max}</span>
      </div>
    </div>
  );
}

// ─── Chart draw-in wrapper ───────────────────────────────────────────────────

export function ChartReveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Toast slide-in wrapper ──────────────────────────────────────────────────

export function ToastSlide({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      {children}
    </motion.div>
  );
}

// ─── Re-exports for convenience ──────────────────────────────────────────────

export { motion, AnimatePresence };
