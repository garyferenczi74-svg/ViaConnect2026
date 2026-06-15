'use client';

// Prompt #169 section 4.3: blue gradient pill for the "Log a full meal"
// CTA. Re-pointed by Prompt 173a to /nutrition/photo-ai (the NutriVision
// scored hub) so meals captured here write a Gordon-scored row and feed
// Today's Meals, Daily Macros, and the Dashboard Nutrition gauge. The
// legacy /nutrition/log-meal editor and analyze-text endpoint remain
// frozen per the permanent 168c/168d exception and are still reachable
// by direct URL.

import Link from 'next/link';
import { ArrowRight, Camera } from 'lucide-react';

export interface LogAFullMealButtonProps {
  readonly disabled?: boolean;
  readonly onBeforeNavigate?: () => boolean | void;
}

export function LogAFullMealButton({ disabled = false, onBeforeNavigate }: LogAFullMealButtonProps) {
  // Spec section 4.3: route destination is unchanged. Caller can intercept
  // navigation via onBeforeNavigate (returning false blocks the click) so a
  // future "save your draft first" confirmation modal can plug in here.
  // Camera icon prepended to the text navigates to /nutrition/photo-ai
  // (Photo AI channel on the Nutrition Log). Implemented as a sibling Link
  // inside a wrapping div so the icon and the text/arrow can target
  // different routes while still rendering as a single visual pill.
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    if (onBeforeNavigate && onBeforeNavigate() === false) {
      event.preventDefault();
    }
  };

  const handleCameraClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (disabled) event.preventDefault();
  };

  return (
    <div
      aria-disabled={disabled}
      className={`group flex w-full min-h-[44px] items-center gap-1.5 rounded-lg border border-white/10 bg-gradient-to-br from-[#1A2744]/60 to-[#2DA5A0]/30 px-3 py-2 text-[14px] font-medium text-white backdrop-blur-md transition-all duration-200 ease-out md:flex md:w-auto md:text-[16px] ${
        disabled
          ? 'cursor-not-allowed opacity-50'
          : 'hover:from-[#1A2744]/75 hover:to-[#2DA5A0]/45 hover:shadow-lg hover:shadow-black/10'
      }`}
    >
      {/* Prompt 175 audit (2026-06-05): Lucide Camera at strokeWidth 1.5,
          h-5 w-5. The icon-only Link is now aria-hidden + tabIndex -1
          so screen readers do not announce two interactive elements
          that both target /nutrition/photo-ai; the text Link below
          owns the accessible name. The icon still receives pointer
          taps for muscle-memory users who hit the camera glyph
          directly. */}
      <Link
        href="/nutrition/photo-ai"
        onClick={handleCameraClick}
        aria-hidden="true"
        tabIndex={-1}
        aria-disabled={disabled}
        className="inline-flex items-center text-white no-underline transition-colors hover:text-[#2DA5A0]"
      >
        <Camera className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
      </Link>
      <Link
        href="/nutrition/photo-ai"
        onClick={handleClick}
        aria-label="Log a full meal via Photo AI"
        aria-disabled={disabled}
        className={`flex flex-1 items-center justify-between gap-1.5 text-white no-underline md:flex-initial md:justify-start ${
          disabled ? '' : 'active:scale-[0.98]'
        }`}
      >
        <span className="whitespace-nowrap">Log a full meal</span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} aria-hidden="true" />
      </Link>
    </div>
  );
}

export default LogAFullMealButton;
