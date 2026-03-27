'use client';

import React from 'react';
import type { LucideProps } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Icon Wrapper — glow container for earn/redeem cards               */
/* ------------------------------------------------------------------ */

interface HelixIconWrapperProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  glow?: 'teal' | 'orange';
  className?: string;
}

const WRAPPER_SIZES = {
  sm: 'w-8 h-8 rounded-xl',
  md: 'w-12 h-12 rounded-[14px]',
  lg: 'w-14 h-14 rounded-2xl',
  xl: 'w-16 h-16 rounded-2xl',
};

const GLOW_STYLES = {
  teal: {
    background: 'radial-gradient(circle at center, rgba(45,165,160,0.15) 0%, rgba(45,165,160,0.03) 70%)',
    border: '1px solid rgba(45,165,160,0.1)',
  },
  orange: {
    background: 'radial-gradient(circle at center, rgba(183,94,24,0.15) 0%, rgba(183,94,24,0.03) 70%)',
    border: '1px solid rgba(183,94,24,0.1)',
  },
};

export function HelixIconWrapper({ children, size = 'lg', glow = 'teal', className = '' }: HelixIconWrapperProps) {
  return (
    <div
      className={`flex-shrink-0 flex items-center justify-center ${WRAPPER_SIZES[size]} ${className}`}
      style={GLOW_STYLES[glow]}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Custom SVG Icons                                                   */
/* ------------------------------------------------------------------ */

interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export function ConsultIcon({ size = 24, className = '', strokeWidth = 1.5 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="7" r="4" />
      <path d="M5.5 21v-2a5.5 5.5 0 0 1 11 0v2" />
      <path d="M17 11.5c1.5 0 2.5 1 2.5 2.5s-1 2.5-2.5 2.5" />
      <circle cx="17" cy="16.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

export function StreakFlameIcon({ size = 24, className = '', strokeWidth = 1.5 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 2c0 4-4 6-4 10a6 6 0 0 0 12 0c0-4-4-6-4-10" />
      <path
        d="M12 18a2.5 2.5 0 0 1-2.5-2.5c0-2 2.5-3.5 2.5-3.5s2.5 1.5 2.5 3.5A2.5 2.5 0 0 1 12 18z"
        strokeWidth={1.25}
        opacity={0.5}
      />
    </svg>
  );
}
