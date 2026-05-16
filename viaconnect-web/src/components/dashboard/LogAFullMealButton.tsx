'use client';

// Prompt #169 section 4.3: blue gradient pill that deep-links to the
// /nutrition/log-meal full-page editor (the #168c architectural exception).
// Replaces the prior Teal-to-Orange gradient; new sky-blue-indigo palette
// is consistent with the page's primary CTA system.

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export interface LogAFullMealButtonProps {
  readonly disabled?: boolean;
  readonly onBeforeNavigate?: () => boolean | void;
}

export function LogAFullMealButton({ disabled = false, onBeforeNavigate }: LogAFullMealButtonProps) {
  // Spec section 4.3: route destination is unchanged. Caller can intercept
  // navigation via onBeforeNavigate (returning false blocks the click) so a
  // future "save your draft first" confirmation modal can plug in here.
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    if (onBeforeNavigate && onBeforeNavigate() === false) {
      event.preventDefault();
    }
  };

  return (
    <Link
      href="/nutrition/log-meal"
      onClick={handleClick}
      aria-disabled={disabled}
      className={`group inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-gradient-to-br from-[#1A2744]/60 to-[#2DA5A0]/30 px-3 py-2 text-[14px] font-medium text-white no-underline backdrop-blur-md transition-all duration-200 ease-out md:text-[16px] ${
        disabled
          ? 'cursor-not-allowed opacity-50'
          : 'hover:from-[#1A2744]/75 hover:to-[#2DA5A0]/45 hover:shadow-lg hover:shadow-black/10 active:scale-[0.98]'
      }`}
    >
      <span>Log a full meal</span>
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
    </Link>
  );
}

export default LogAFullMealButton;
