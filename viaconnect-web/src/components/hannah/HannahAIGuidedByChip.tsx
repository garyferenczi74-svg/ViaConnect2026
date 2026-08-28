'use client';

// In-page HannahAI chrome. Clicking expands/scrolls to #hannah-ai-chat
// on the same page. Never navigates to /wellness/advisor.
// Visible on mobile and desktop together (no hidden md:inline-flex).

import { Sparkles } from 'lucide-react';
import { getDisplayName } from '@/lib/getDisplayName';

export const HANNAH_AI_CHAT_ID = 'hannah-ai-chat';

export function scrollToHannahAIChat(): void {
  const el = document.getElementById(HANNAH_AI_CHAT_ID);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}

export function HannahAIGuidedByChip() {
  return (
    <button
      type="button"
      onClick={scrollToHannahAIChat}
      className="inline-flex min-h-[44px] flex-shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/75 backdrop-blur-sm"
      aria-label={`Open chat guided by ${getDisplayName('hannahai')}`}
    >
      <Sparkles className="h-3 w-3 text-[#2DA5A0]" strokeWidth={1.5} />
      Guided by {getDisplayName('hannahai')}
    </button>
  );
}

export default HannahAIGuidedByChip;
