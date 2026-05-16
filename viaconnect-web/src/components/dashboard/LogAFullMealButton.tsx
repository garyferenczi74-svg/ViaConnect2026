'use client';

// Prompt #169 section 4.3: blue gradient pill that deep-links to the
// /nutrition/log-meal full-page editor (the #168c architectural exception).
// Replaces the prior Teal-to-Orange gradient; new sky-blue-indigo palette
// is consistent with the page's primary CTA system.

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
      className={`group inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-white/10 bg-gradient-to-br from-[#1A2744]/60 to-[#2DA5A0]/30 px-3 py-2 text-[14px] font-medium text-white backdrop-blur-md transition-all duration-200 ease-out md:text-[16px] ${
        disabled
          ? 'cursor-not-allowed opacity-50'
          : 'hover:from-[#1A2744]/75 hover:to-[#2DA5A0]/45 hover:shadow-lg hover:shadow-black/10'
      }`}
    >
      <Link
        href="/nutrition/photo-ai"
        onClick={handleCameraClick}
        aria-label="Open Photo AI"
        aria-disabled={disabled}
        className="inline-flex items-center text-white no-underline transition-colors hover:text-[#2DA5A0]"
      >
        <Camera className="h-4 w-4" strokeWidth={1.5} />
      </Link>
      <Link
        href="/nutrition/log-meal"
        onClick={handleClick}
        aria-disabled={disabled}
        className={`inline-flex items-center gap-1.5 text-white no-underline ${
          disabled ? '' : 'active:scale-[0.98]'
        }`}
      >
        <span>Log a full meal</span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
      </Link>
    </div>
  );
}

export default LogAFullMealButton;
