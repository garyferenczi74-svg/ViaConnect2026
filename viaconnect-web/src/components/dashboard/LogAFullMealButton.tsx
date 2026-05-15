'use client';

// Prompt #168c section 2.3: gradient pill button (Teal -> Orange) that
// navigates from Dashboard Quick Logs to the Nutrition section's Log a Meal
// tab. Mounted top-right of each entry container.

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export interface LogAFullMealButtonProps {
  readonly disabled?: boolean;
  readonly onBeforeNavigate?: () => boolean | void;
}

export function LogAFullMealButton({ disabled = false, onBeforeNavigate }: LogAFullMealButtonProps) {
  // Spec section 2.3: navigate to /nutrition; the page defaults to the
  // Log a Meal tab. State preservation hook (transient store) deferred
  // to a follow-up; caller can intercept via onBeforeNavigate to block.
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
      href="/nutrition"
      onClick={handleClick}
      aria-disabled={disabled}
      className={`group inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[14px] font-medium text-white no-underline transition-all md:text-[16px] ${
        disabled
          ? 'cursor-not-allowed opacity-50'
          : 'hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]'
      }`}
      style={{
        background: 'linear-gradient(90deg, #2DA5A0 0%, #B75E18 100%)',
      }}
    >
      <span>Log a full meal</span>
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
    </Link>
  );
}

export default LogAFullMealButton;
