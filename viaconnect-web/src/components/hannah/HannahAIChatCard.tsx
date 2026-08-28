'use client';

// Glass hub card that embeds the consumer AdvisorChat window on hub pages.
// Standalone /wellness/advisor stays full-page and does not use this card.

import { useEffect } from 'react';
import { MessageCircleHeart } from 'lucide-react';
import AdvisorChat from '@/components/advisor/AdvisorChat';
import { getDisplayName } from '@/lib/getDisplayName';
import { HANNAH_CONSUMER_SUBTITLE } from '@/lib/jeffery/hannah-persona';
import { HANNAH_AI_CHAT_ID } from '@/components/hannah/HannahAIGuidedByChip';
import '@/components/body-tracker/hub/hub-card-frame.css';

export const CONSUMER_HANNAH_SUGGESTED_PROMPTS = [
  'How can I improve my Bio Optimization Score?',
  'Should I take my supplements with food?',
  'What does my MTHFR result mean?',
  'Which genetic test should I take next?',
] as const;

const ACCENT = '#2DA5A0';

export function HannahAIChatCard() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash !== `#${HANNAH_AI_CHAT_ID}`) return;
    document.getElementById(HANNAH_AI_CHAT_ID)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, []);

  return (
    <section
      id={HANNAH_AI_CHAT_ID}
      className="hub-card-frame relative isolate scroll-mt-24 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 backdrop-blur-md"
    >
      <AdvisorChat
        embedded
        role="consumer"
        accentColor={ACCENT}
        title={`${getDisplayName('hannahai')} Wellness Assistant`}
        subtitle={HANNAH_CONSUMER_SUBTITLE}
        icon={
          <MessageCircleHeart
            className="w-5 h-5"
            strokeWidth={1.5}
            style={{ color: ACCENT }}
          />
        }
        suggestedPrompts={[...CONSUMER_HANNAH_SUGGESTED_PROMPTS]}
      />
    </section>
  );
}

export default HannahAIChatCard;
