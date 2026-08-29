'use client';

// Prompt 183 Task 3 + Prompt 228 D4: My Nutrition Getting Started strip.
// Wires the action to /nutrition/guide (Gordon-owned genetics nutritional guide).

import Link from 'next/link';
import { getDisplayName } from '@/lib/getDisplayName';
import {
  CONSUMER_CARD_SUBHEAD,
  CONSUMER_CARD_TITLE,
  CONSUMER_METRIC_LABEL,
} from '@/lib/ui/consumerChrome';
import '@/components/body-tracker/hub/hub-card-frame.css';

const avatarSrc = '';

const LABEL = 'Getting Started';
const DESCRIPTION = `${getDisplayName('gordon')} walks you through My Nutrition with your genetics nutritional guide.`;
const ACTION_TEXT = `Open ${getDisplayName('gordon')} guide`;

export function NutritionGettingStartedStrip() {
  return (
    <section
      aria-labelledby="nutrition-hub-guide-title"
      className="hub-card-frame relative flex min-h-[88px] flex-col gap-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-4 backdrop-blur-md md:min-h-[96px] md:flex-row md:items-center md:gap-4 md:p-5"
      data-nutrition-hub-guidance
    >
      <div className="flex items-center gap-3 md:gap-4">
        <div className="flex-shrink-0">
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc}
              alt={`${getDisplayName('gordon')}, your My Nutrition guide`}
              className="h-12 w-12 rounded-full border-2 border-[#2DA5A0]/60 object-cover md:h-14 md:w-14"
            />
          ) : (
            <div
              aria-label={`${getDisplayName('gordon')} avatar`}
              role="img"
              className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#2DA5A0]/60 bg-[#1E3054]/60 backdrop-blur-sm md:h-14 md:w-14"
            >
              <span className={`${CONSUMER_METRIC_LABEL} font-medium tracking-widest text-[#2DA5A0]`}>
                {getDisplayName('gordon')}
              </span>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2
            id="nutrition-hub-guide-title"
            className={CONSUMER_CARD_TITLE}
          >
            {LABEL}
          </h2>
          <p className={CONSUMER_CARD_SUBHEAD}>
            {DESCRIPTION}
          </p>
        </div>
      </div>

      <div className="w-full md:ml-auto md:w-auto md:flex-shrink-0">
        <Link
          href="/nutrition/guide"
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-[#2DA5A0]/50 bg-[#2DA5A0]/15 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2DA5A0]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0] md:w-auto"
          data-nutrition-guide-cta
        >
          {ACTION_TEXT}
        </Link>
      </div>
    </section>
  );
}
